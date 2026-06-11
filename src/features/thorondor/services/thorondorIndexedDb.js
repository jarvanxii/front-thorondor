import { isProxy, toRaw } from 'vue'

const DB_NAME = 'thorondor-siem-db'
const DB_VERSION = 1
const STORE_NAMES = {
  agents: 'agents',
  snapshots: 'snapshots',
  logs: 'logs',
  events: 'events',
  alerts: 'alerts',
  rules: 'rules',
  history: 'history',
  meta: 'meta',
}

let dbPromise = null

export function openThorondorDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAMES.agents)) {
        db.createObjectStore(STORE_NAMES.agents, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.snapshots)) {
        const store = db.createObjectStore(STORE_NAMES.snapshots, { keyPath: 'id' })
        store.createIndex('agentId', 'agentId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.logs)) {
        const store = db.createObjectStore(STORE_NAMES.logs, { keyPath: 'id' })
        store.createIndex('agentId', 'agentId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.events)) {
        const store = db.createObjectStore(STORE_NAMES.events, { keyPath: 'id' })
        store.createIndex('agentId', 'agentId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.alerts)) {
        const store = db.createObjectStore(STORE_NAMES.alerts, { keyPath: 'id' })
        store.createIndex('agentId', 'agentId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.rules)) {
        db.createObjectStore(STORE_NAMES.rules, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.history)) {
        const store = db.createObjectStore(STORE_NAMES.history, { keyPath: 'id' })
        store.createIndex('agentId', 'agentId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.meta)) {
        db.createObjectStore(STORE_NAMES.meta, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

export async function putMany(storeName, values) {
  if (!Array.isArray(values) || !values.length) return
  const db = await openThorondorDb()

  await runTransaction(db, storeName, 'readwrite', (store) => {
    values.forEach((value) => store.put(prepareForIndexedDb(value)))
  })
}

export async function putOne(storeName, value) {
  if (!value) return
  const db = await openThorondorDb()
  await runTransaction(db, storeName, 'readwrite', (store) => {
    store.put(prepareForIndexedDb(value))
  })
}

export async function deleteOne(storeName, key) {
  const db = await openThorondorDb()
  await runTransaction(db, storeName, 'readwrite', (store) => {
    store.delete(key)
  })
}

export async function clearStore(storeName) {
  const db = await openThorondorDb()
  await runTransaction(db, storeName, 'readwrite', (store) => {
    store.clear()
  })
}

export async function deleteByIndex(storeName, indexName, matchValue) {
  if (matchValue === undefined || matchValue === null) return

  const db = await openThorondorDb()
  const keys = await runReadByIndex(db, storeName, indexName, matchValue)

  if (!keys.length) return

  await runTransaction(db, storeName, 'readwrite', (store) => {
    keys.forEach((key) => store.delete(key))
  })
}

export async function getAll(storeName) {
  const db = await openThorondorDb()
  return runRead(db, storeName, () => true)
}

export async function getMeta(key, fallback = null) {
  const db = await openThorondorDb()
  const result = await runReadSingle(db, STORE_NAMES.meta, key)
  return result?.value ?? fallback
}

export async function setMeta(key, value) {
  await putOne(STORE_NAMES.meta, { key, value })
}

export async function loadThorondorPersistence() {
  const [
    agents,
    snapshots,
    logs,
    events,
    alerts,
    rules,
    history,
    lastSweepAt,
    generatorDraft,
    casesByAgent,
    smartResponses,
  ] = await Promise.all([
    getAll(STORE_NAMES.agents),
    getAll(STORE_NAMES.snapshots),
    getAll(STORE_NAMES.logs),
    getAll(STORE_NAMES.events),
    getAll(STORE_NAMES.alerts),
    getAll(STORE_NAMES.rules),
    getAll(STORE_NAMES.history),
    getMeta('lastSweepAt', null),
    getMeta('generatorDraft', null),
    getMeta('casesByAgent', {}),
    getMeta('smartResponses', null),
  ])

  return {
    agents,
    snapshots,
    logs,
    events,
    alerts,
    rules,
    history,
    lastSweepAt,
    generatorDraft,
    casesByAgent,
    smartResponses,
  }
}

export async function sweepThorondorPersistence(cutoffIso, agentIds = [], perAgentLimits = {}) {
  const db = await openThorondorDb()
  const timestampStores = [
    STORE_NAMES.snapshots,
    STORE_NAMES.logs,
    STORE_NAMES.events,
    STORE_NAMES.history,
  ]

  for (const storeName of timestampStores) {
    await sweepStoreByTimestampCursor(db, storeName, cutoffIso)
  }

  if (agentIds.length) {
    const limitEntries = Object.entries(perAgentLimits)
    for (const agentId of agentIds) {
      for (const [storeKey, maxCount] of limitEntries) {
        const storeName = STORE_NAMES[storeKey]
        if (storeName) {
          await trimStoreByAgentCount(db, storeName, agentId, maxCount)
        }
      }
    }
  }

  await setMeta('lastSweepAt', new Date().toISOString())
}

function sweepStoreByTimestampCursor(db, storeName, cutoffIso) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)

    if (!store.indexNames.contains('timestamp')) {
      tx.abort()
      resolve()
      return
    }

    const index = store.index('timestamp')
    const range = IDBKeyRange.upperBound(cutoffIso, false)
    const req = index.openCursor(range)

    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
    req.onerror = () => reject(req.error)

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'))
  })
}

async function trimStoreByAgentCount(db, storeName, agentId, maxCount) {
  const items = await readAllByAgentIndex(db, storeName, agentId)
  if (items.length <= maxCount) return

  const sorted = items.slice().sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
  const toDelete = sorted.slice(0, sorted.length - maxCount)

  await runTransaction(db, storeName, 'readwrite', (store) => {
    toDelete.forEach((item) => store.delete(item.id))
  })
}

function readAllByAgentIndex(db, storeName, agentId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)

    if (!store.indexNames.contains('agentId')) {
      resolve([])
      return
    }

    const index = store.index('agentId')
    const req = index.getAll(agentId)
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

function runTransaction(db, storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    let settled = false

    const rejectOnce = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    transaction.oncomplete = () => {
      if (settled) return
      settled = true
      resolve()
    }
    transaction.onabort = () =>
      rejectOnce(
        transaction.error || new Error(`La transacción de IndexedDB sobre ${storeName} se abortó.`),
      )
    transaction.onerror = () =>
      rejectOnce(
        transaction.error || new Error(`La transacción de IndexedDB sobre ${storeName} falló.`),
      )

    try {
      callback(store)
    } catch (error) {
      rejectOnce(error)
      try {
        transaction.abort()
      } catch {
        // Ignore secondary abort failures after surfacing the original error.
      }
    }
  })
}

function runRead(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function runReadSingle(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runReadByIndex(db, storeName, indexName, matchValue) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAllKeys(matchValue)
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function prepareForIndexedDb(value, seen = new WeakMap()) {
  if (value === null || value === undefined) return value
  if (typeof value === 'function' || typeof value === 'symbol') return undefined
  if (typeof value !== 'object') return value

  const rawValue = isProxy(value) ? toRaw(value) : value

  if (rawValue instanceof Date) {
    return new Date(rawValue.getTime())
  }

  if (rawValue instanceof RegExp) {
    return new RegExp(rawValue)
  }

  if (rawValue instanceof ArrayBuffer) {
    return rawValue.slice(0)
  }

  if (ArrayBuffer.isView(rawValue)) {
    return rawValue.slice ? rawValue.slice() : rawValue
  }

  if (seen.has(rawValue)) {
    return seen.get(rawValue)
  }

  if (Array.isArray(rawValue)) {
    const arrayClone = []
    seen.set(rawValue, arrayClone)
    rawValue.forEach((item) => {
      const prepared = prepareForIndexedDb(item, seen)
      if (prepared !== undefined) {
        arrayClone.push(prepared)
      }
    })
    return arrayClone
  }

  const objectClone = {}
  seen.set(rawValue, objectClone)
  Object.keys(rawValue).forEach((key) => {
    const prepared = prepareForIndexedDb(rawValue[key], seen)
    if (prepared !== undefined) {
      objectClone[key] = prepared
    }
  })
  return objectClone
}

export { STORE_NAMES, prepareForIndexedDb }
