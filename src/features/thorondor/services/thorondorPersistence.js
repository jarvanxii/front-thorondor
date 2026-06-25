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
  reason: 'Sesión no verificada para BBDD por API.',
}

export function clearThorondorPersistenceModePreference() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(THORONDOR_PERSISTENCE_MODE_KEY)
  } catch {
    // Local storage can be unavailable in hardened browsers; the automatic mode still works.
  }
}

export function setThorondorCloudPersistenceAccess(allowed, reason = '') {
  cloudPersistenceAccess = {
    allowed: Boolean(allowed),
    reason: String(reason || ''),
  }
}

export function getThorondorPersistenceStatus(overrides = {}) {
  const cloudConfig = getThorondorCloudPersistenceConfig()
  const cloudAllowed = Boolean(cloudPersistenceAccess.allowed)
  const effectiveMode = cloudConfig.enabled && cloudAllowed
    ? THORONDOR_PERSISTENCE_MODES.cloud
    : THORONDOR_PERSISTENCE_MODES.local
  const requestedMode = effectiveMode
  const syncStatus =
    cloudAllowed && !cloudConfig.enabled
      ? 'cloud-unconfigured'
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
    smartResponses: Array.isArray(payload.smartResponses) ? payload.smartResponses : null,
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
    data.smartResponses || [],
  ].some((items) => items.length > 0)
}

function recordTimestamp(value = {}) {
  return Date.parse(
    value.updatedAt ||
      value.timestamp ||
      value.lastHeartbeatAt ||
      value.createdAt ||
      value.heartbeat ||
      '',
  ) || 0
}

function recordMergeKey(value = {}) {
  const explicitKey = value.id || value._id || value.key
  if (explicitKey) return String(explicitKey).trim()

  return [
    value.agentId || value.agent_id,
    value.timestamp || value.createdAt || value.updatedAt || value.lastHeartbeatAt,
    value.kind || value.type || value.source || value.name || value.message,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('|')
}

function mergeRecordArrays(localItems = [], remoteItems = []) {
  const records = new Map()

  ;[...localItems, ...remoteItems].forEach((item) => {
    if (!item || typeof item !== 'object') return
    const key = recordMergeKey(item)
    if (!key) return
    const existing = records.get(key)
    if (!existing || recordTimestamp(item) >= recordTimestamp(existing)) {
      records.set(key, {
        ...existing,
        ...item,
      })
    }
  })

  return Array.from(records.values())
}

function mergeCasesByAgent(localCases = {}, remoteCases = {}) {
  const merged = { ...(localCases || {}) }
  Object.entries(remoteCases || {}).forEach(([agentId, cases]) => {
    merged[agentId] = mergeRecordArrays(merged[agentId] || [], Array.isArray(cases) ? cases : [])
  })
  return merged
}

function mergePersistencePayload(localPayload = {}, remotePayload = {}) {
  const localData = normalizePersistencePayload(localPayload)
  const remoteData = normalizePersistencePayload(remotePayload)

  return {
    agents: mergeRecordArrays(localData.agents, remoteData.agents),
    snapshots: mergeRecordArrays(localData.snapshots, remoteData.snapshots),
    logs: mergeRecordArrays(localData.logs, remoteData.logs),
    events: mergeRecordArrays(localData.events, remoteData.events),
    alerts: mergeRecordArrays(localData.alerts, remoteData.alerts),
    rules: mergeRecordArrays(localData.rules, remoteData.rules),
    history: mergeRecordArrays(localData.history, remoteData.history),
    lastSweepAt: [localData.lastSweepAt, remoteData.lastSweepAt].filter(Boolean).sort().pop() || null,
    generatorDraft: remoteData.generatorDraft || localData.generatorDraft || null,
    casesByAgent: mergeCasesByAgent(localData.casesByAgent, remoteData.casesByAgent),
    smartResponses: mergeRecordArrays(localData.smartResponses || [], remoteData.smartResponses || []),
  }
}

async function cacheDatasetLocally(payload) {
  const data = normalizePersistencePayload(payload)

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
    setLocalMeta('smartResponses', data.smartResponses),
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
    console.warn('[Thorondor] No se pudo sincronizar con BBDD por API:', error)
  }
}

async function runCloudWriteStrict(operation) {
  if (!shouldUseCloudPersistence()) return true

  try {
    await operation()
    await recordCloudSyncState({
      status: 'ok',
      message: '',
    })
    return true
  } catch (error) {
    await recordCloudSyncState({
      status: 'error',
      message: error.message,
    })
    console.warn('[Thorondor] No se pudo sincronizar con BBDD por API:', error)
    return false
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
      const mergedData = mergePersistencePayload(localData, remoteData)
      await cacheDatasetLocally(mergedData)
      if (hasPortableThorondorData(localData)) {
        await replaceThorondorCloudDataset(mergedData)
      }

      return {
        ...mergedData,
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
      ...localData,
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
  const cloudSweepOk = await runCloudWriteStrict(() =>
    runThorondorCloudRetentionSweep({
      cutoffIso,
      agentIds,
      perAgentLimits,
    }),
  )

  if (!cloudSweepOk) return

  await sweepLocalThorondorPersistence(cutoffIso, agentIds, perAgentLimits)
}

export { STORE_NAMES }
