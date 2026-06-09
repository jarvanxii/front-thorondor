import {
  STORE_NAMES,
  clearStore as clearLocalStore,
  deleteByIndex as deleteLocalByIndex,
  deleteOne as deleteLocalOne,
  loadThorondorPersistence as loadLocalThorondorPersistence,
  openThorondorDb as openLocalThorondorDb,
  putMany as putLocalMany,
  putOne as putLocalOne,
  setMeta as setLocalMeta,
  sweepThorondorPersistence as sweepLocalThorondorPersistence,
} from '@/features/thorondor/services/thorondorIndexedDb'
import {
  clearThorondorCloudStore,
  deleteThorondorCloudRecord,
  deleteThorondorCloudRecordsByIndex,
  fetchThorondorCloudDataset,
  getThorondorCloudPersistenceConfig,
  replaceThorondorCloudDataset,
  runThorondorCloudRetentionSweep,
  setThorondorCloudMeta,
  upsertThorondorCloudRecords,
} from '@/features/thorondor/services/thorondorCloudPersistence'

export const THORONDOR_PERSISTENCE_MODES = {
  local: 'local',
  cloud: 'cloud',
}

export const THORONDOR_PERSISTENCE_MODE_KEY = 'thorondor.persistence.mode'
export const THORONDOR_CLOUD_SYNC_META_KEY = 'cloudSyncState'

let cloudPersistenceAccess = {
  allowed: false,
  reason: 'Sesión no verificada para persistencia cloud.',
}

function getEnvValue(key) {
  return import.meta.env[key]?.trim?.() || ''
}

function getStoredMode() {
  if (typeof window === 'undefined') return ''

  try {
    return window.localStorage.getItem(THORONDOR_PERSISTENCE_MODE_KEY)?.trim?.() || ''
  } catch {
    return ''
  }
}

function normalizePersistenceMode(value) {
  return value === THORONDOR_PERSISTENCE_MODES.cloud || value === 'cloud'
    ? THORONDOR_PERSISTENCE_MODES.cloud
    : THORONDOR_PERSISTENCE_MODES.local
}

export function setThorondorPersistenceMode(mode) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(THORONDOR_PERSISTENCE_MODE_KEY, normalizePersistenceMode(mode))
  } catch {
    // Local storage can be unavailable in hardened browsers; the env fallback still works.
  }
}

export function setThorondorCloudPersistenceAccess(allowed, reason = '') {
  cloudPersistenceAccess = {
    allowed: Boolean(allowed),
    reason: String(reason || ''),
  }
}

export function getThorondorPersistenceStatus(overrides = {}) {
  const requestedMode = normalizePersistenceMode(
    getStoredMode() || getEnvValue('VITE_THORONDOR_PERSISTENCE_MODE'),
  )
  const cloudConfig = getThorondorCloudPersistenceConfig()
  const cloudAllowed = Boolean(cloudPersistenceAccess.allowed)
  const effectiveMode =
    requestedMode === THORONDOR_PERSISTENCE_MODES.cloud && cloudConfig.enabled && cloudAllowed
      ? THORONDOR_PERSISTENCE_MODES.cloud
      : THORONDOR_PERSISTENCE_MODES.local
  const syncStatus =
    requestedMode === THORONDOR_PERSISTENCE_MODES.cloud && cloudConfig.enabled && !cloudAllowed
      ? 'cloud-blocked'
      : effectiveMode === THORONDOR_PERSISTENCE_MODES.cloud
        ? 'cloud-ready'
        : 'local-only'

  return {
    requestedMode,
    effectiveMode,
    cloudConfigured: cloudConfig.enabled,
    cloudAllowed,
    cloudAccessReason: cloudPersistenceAccess.reason,
    workspaceId: cloudConfig.workspaceId,
    syncStatus,
    lastSyncAt: null,
    lastError: null,
    ...overrides,
  }
}

function shouldUseCloudPersistence() {
  return getThorondorPersistenceStatus().effectiveMode === THORONDOR_PERSISTENCE_MODES.cloud
}

function normalizePersistencePayload(payload = {}) {
  return {
    agents: Array.isArray(payload.agents) ? payload.agents : [],
    snapshots: Array.isArray(payload.snapshots) ? payload.snapshots : [],
    logs: Array.isArray(payload.logs) ? payload.logs : [],
    events: Array.isArray(payload.events) ? payload.events : [],
    alerts: Array.isArray(payload.alerts) ? payload.alerts : [],
    rules: Array.isArray(payload.rules) ? payload.rules : [],
    history: Array.isArray(payload.history) ? payload.history : [],
    lastSweepAt: payload.lastSweepAt || null,
    generatorDraft: payload.generatorDraft || null,
    casesByAgent: payload.casesByAgent || {},
  }
}

function hasPortableThorondorData(payload = {}) {
  const data = normalizePersistencePayload(payload)

  return [
    data.agents,
    data.snapshots,
    data.logs,
    data.events,
    data.alerts,
    data.rules,
    data.history,
  ].some((items) => items.length > 0)
}

async function cacheDatasetLocally(payload) {
  const data = normalizePersistencePayload(payload)

  await Promise.all([
    clearLocalStore(STORE_NAMES.agents),
    clearLocalStore(STORE_NAMES.snapshots),
    clearLocalStore(STORE_NAMES.logs),
    clearLocalStore(STORE_NAMES.events),
    clearLocalStore(STORE_NAMES.alerts),
    clearLocalStore(STORE_NAMES.rules),
    clearLocalStore(STORE_NAMES.history),
  ])

  await Promise.all([
    putLocalMany(STORE_NAMES.agents, data.agents),
    putLocalMany(STORE_NAMES.snapshots, data.snapshots),
    putLocalMany(STORE_NAMES.logs, data.logs),
    putLocalMany(STORE_NAMES.events, data.events),
    putLocalMany(STORE_NAMES.alerts, data.alerts),
    putLocalMany(STORE_NAMES.rules, data.rules),
    putLocalMany(STORE_NAMES.history, data.history),
    setLocalMeta('lastSweepAt', data.lastSweepAt),
    setLocalMeta('generatorDraft', data.generatorDraft),
    setLocalMeta('casesByAgent', data.casesByAgent),
  ])
}

async function recordCloudSyncState(syncState) {
  const value = {
    timestamp: new Date().toISOString(),
    ...syncState,
  }

  await setLocalMeta(THORONDOR_CLOUD_SYNC_META_KEY, value)
}

async function runCloudWrite(operation) {
  if (!shouldUseCloudPersistence()) return

  try {
    await operation()
    await recordCloudSyncState({
      status: 'ok',
      message: '',
    })
  } catch (error) {
    await recordCloudSyncState({
      status: 'error',
      message: error.message,
    })
    console.warn('[Thorondor] No se pudo sincronizar con persistencia cloud:', error)
  }
}

export async function openThorondorPersistence() {
  await openLocalThorondorDb()
  return getThorondorPersistenceStatus()
}

export async function loadThorondorPersistence() {
  await openLocalThorondorDb()
  const localData = normalizePersistencePayload(await loadLocalThorondorPersistence())

  if (!shouldUseCloudPersistence()) {
    return {
      ...localData,
      persistence: getThorondorPersistenceStatus(),
    }
  }

  try {
    const remoteData = normalizePersistencePayload(await fetchThorondorCloudDataset())

    if (hasPortableThorondorData(remoteData)) {
      await cacheDatasetLocally(remoteData)

      return {
        ...remoteData,
        persistence: getThorondorPersistenceStatus({
          syncStatus: 'cloud-synced',
          lastSyncAt: new Date().toISOString(),
        }),
      }
    }

    if (hasPortableThorondorData(localData)) {
      await replaceThorondorCloudDataset(localData)

      return {
        ...localData,
        persistence: getThorondorPersistenceStatus({
          syncStatus: 'cloud-migrated',
          lastSyncAt: new Date().toISOString(),
        }),
      }
    }

    return {
      ...remoteData,
      persistence: getThorondorPersistenceStatus({
        syncStatus: 'cloud-empty',
        lastSyncAt: new Date().toISOString(),
      }),
    }
  } catch (error) {
    await recordCloudSyncState({
      status: 'error',
      message: error.message,
    })

    return {
      ...localData,
      persistence: getThorondorPersistenceStatus({
        effectiveMode: THORONDOR_PERSISTENCE_MODES.local,
        syncStatus: 'cloud-degraded',
        lastError: error.message,
      }),
    }
  }
}

export async function putMany(storeName, values) {
  await putLocalMany(storeName, values)
  await runCloudWrite(() => upsertThorondorCloudRecords(storeName, values))
}

export async function putOne(storeName, value) {
  await putLocalOne(storeName, value)
  await runCloudWrite(() => upsertThorondorCloudRecords(storeName, value ? [value] : []))
}

export async function deleteOne(storeName, key) {
  await deleteLocalOne(storeName, key)
  await runCloudWrite(() => deleteThorondorCloudRecord(storeName, key))
}

export async function deleteByIndex(storeName, indexName, matchValue) {
  if (matchValue === undefined || matchValue === null) return

  await deleteLocalByIndex(storeName, indexName, matchValue)
  await runCloudWrite(() => deleteThorondorCloudRecordsByIndex(storeName, indexName, matchValue))
}

export async function clearStore(storeName) {
  await clearLocalStore(storeName)
  await runCloudWrite(() => clearThorondorCloudStore(storeName))
}

export async function setMeta(key, value) {
  await setLocalMeta(key, value)
  await runCloudWrite(() => setThorondorCloudMeta(key, value))
}

export async function sweepThorondorPersistence(cutoffIso, agentIds = [], perAgentLimits = {}) {
  await sweepLocalThorondorPersistence(cutoffIso, agentIds, perAgentLimits)
  await runCloudWrite(() =>
    runThorondorCloudRetentionSweep({
      cutoffIso,
      agentIds,
      perAgentLimits,
    }),
  )
}

export { STORE_NAMES }
