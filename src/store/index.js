import { createStore } from 'vuex'
import {
  THORONDOR_CONNECTION_LIMIT,
  THORONDOR_HISTORY_LIMIT,
  THORONDOR_IDB_EVENT_LIMIT,
  THORONDOR_IDB_LOG_LIMIT,
  THORONDOR_IDB_SNAPSHOT_LIMIT,
  THORONDOR_LOG_LIMIT,
  THORONDOR_RETENTION_DAYS,
  THORONDOR_SECURITY_LIMIT,
  THORONDOR_SWEEP_INTERVAL_MS,
  buildThorondorAgentDraft,
  buildDefaultThorondorRuleSet,
  normalizeThorondorNetworkScope,
} from '@/features/thorondor/data/thorondorDefaults'
import {
  STORE_NAMES,
  clearStore,
  deleteByIndex,
  deleteOne,
  getThorondorPersistenceStatus,
  loadThorondorPersistence,
  openThorondorPersistence,
  putMany,
  putOne,
  setThorondorCloudPersistenceAccess,
  setMeta,
  setThorondorPersistenceMode as saveThorondorPersistenceMode,
  sweepThorondorPersistence,
} from '@/features/thorondor/services/thorondorPersistence'
import {
  buildThorondorRequestRules,
} from '@/features/thorondor/services/thorondorApi'
import {
  createThorondorCentralCommand,
  fetchThorondorCentralSnapshot,
  isThorondorCentralConfigured,
} from '@/features/thorondor/services/thorondorCentralApi'
import {
  clearThorondorJwtToken,
  fetchThorondorJwtToken,
  fetchThorondorSession,
  getStoredThorondorJwtToken,
  getStoredThorondorSession,
  isThorondorJwtTokenValid,
} from '@/features/thorondor/services/thorondorAuth'
import {
  deriveThorondorAgentStatus,
} from '@/features/thorondor/services/thorondorRules'

const VIRTUAL_FSTYPES = new Set([
  'tmpfs',
  'squashfs',
  'devtmpfs',
  'proc',
  'sysfs',
  'cgroup',
  'cgroup2',
  'pstore',
  'debugfs',
  'tracefs',
  'securityfs',
  'binfmt_misc',
  'overlay',
  'aufs',
  'ramfs',
  'hugetlbfs',
  'fusectl',
  'bpf',
  'nsfs',
  'configfs',
  'rpc_pipefs',
  'mqueue',
  'efivarfs',
])

let thorondorPollPromise = null

function createThorondorState() {
  return {
    initialized: false,
    bootstrapping: false,
    persistence: getThorondorPersistenceStatus(),
    retentionDays: THORONDOR_RETENTION_DAYS,
    lastSweepAt: null,
    agents: [],
    rules: [],
    alerts: [],
    selectedAgentId: null,
    snapshotsByAgent: {},
    logsByAgent: {},
    securityEventsByAgent: {},
    connectionHistoryByAgent: {},
    requestRulesByAgent: {},
    blockedIpsByAgent: {},
    whitelistIpsByAgent: {},
    ipBlockOperationsByAgent: {},
    casesByAgent: {},
    responseActions: [],
    generatorDraft: buildThorondorAgentDraft(),
    errors: [],
    session: getStoredThorondorSession(),
    token: getStoredThorondorJwtToken(),
    lastPollAt: null,
    central: {
      enabled: isThorondorCentralConfigured(),
      status: isThorondorCentralConfigured() ? 'ready' : 'disabled',
      lastSyncAt: null,
      lastError: '',
    },
  }
}

function limitItems(items, limit) {
  return items.slice(Math.max(items.length - limit, 0))
}

function mapByAgent(items, keyName = 'agentId') {
  return (items || []).reduce((acc, item) => {
    const agentId = item?.[keyName]
    if (!agentId) return acc
    if (!acc[agentId]) acc[agentId] = []
    acc[agentId].push(item)
    return acc
  }, {})
}

function toSummarySnapshot(agentId, telemetry) {
  const metrics = telemetry?.metrics || {}
  const system = telemetry?.system || {}
  const allDisks = Array.isArray(metrics.disks) ? metrics.disks : []
  const disks = allDisks.filter((d) => d.fstype && !VIRTUAL_FSTYPES.has(d.fstype))
  const topDisk = disks.reduce((max, item) => Math.max(max, Number(item.percent) || 0), 0)

  return {
    id: `${agentId}-${telemetry.heartbeat || new Date().toISOString()}`,
    agentId,
    timestamp: telemetry.heartbeat || new Date().toISOString(),
    hostname: system.hostname || telemetry?.agent?.hostLabel || '-',
    localIp: system.localIp || '-',
    distro: telemetry?.agent?.distro || '-',
    kernel: system.kernel || '-',
    uptimeSeconds: system.uptimeSeconds || 0,
    connectedUsers: system.connectedUsers || [],
    cpuTotal: Number(metrics.cpuTotal) || 0,
    cpuPerCore: metrics.cpuPerCore || [],
    memoryPercent: Number(metrics.memoryPercent) || 0,
    memoryUsed: Number(metrics.memoryUsed) || 0,
    memoryTotal: Number(metrics.memoryTotal) || 0,
    swapPercent: Number(metrics.swapPercent) || 0,
    disks,
    diskPercent: topDisk,
    processes: metrics.processes || [],
    interfaces: metrics.interfaces || [],
    temperatures: metrics.temperatures || [],
    openPorts: metrics.openPorts || [],
    networkRates: metrics.networkRates || [],
    establishedConnections: metrics.establishedConnections || [],
    failedServices: metrics.failedServices || [],
    fans: metrics.fans || [],
    battery: metrics.battery || null,
    gpu: metrics.gpu || [],
    hardware: metrics.hardware || {},
    docker: metrics.docker || [],
    dns: metrics.dns || [],
    smartData: metrics.smartData || [],
    loginHistory: metrics.loginHistory || [],
    pendingUpdates: metrics.pendingUpdates || { count: 0, updates: [] },
    loadAverage: system.loadAverage || [],
  }
}

function flattenLogs(agentId, telemetry) {
  const logs = telemetry?.logs || {}
  const entries = []
  const timestamp = telemetry?.heartbeat || new Date().toISOString()
  const seenMessages = new Set()

  const pushLines = (source, lines, level = 'INFO') => {
    ;(lines || []).forEach((line) => {
      const normalizedMessage = normalizeLogMessage(line)
      if (!normalizedMessage) return
      const duplicateKey = `${String(agentId || '').trim().toLowerCase()}|${normalizedMessage.toLowerCase()}`
      if (seenMessages.has(duplicateKey)) return
      seenMessages.add(duplicateKey)

      entries.push({
        id: stableLogId(agentId, normalizedMessage),
        agentId,
        source,
        level: inferLogLevel(normalizedMessage, level),
        message: line,
        timestamp,
      })
    })
  }

  pushLines('syslog', logs.syslogTail)
  pushLines('journal', logs.journalTail)
  pushLines('kernel', logs.kernelErrors, 'ERROR')
  ;(logs.customLogs || []).forEach((customLog) => pushLines(customLog.path || 'custom', customLog.lines))

  return limitItems(entries, THORONDOR_LOG_LIMIT)
}

function flattenSecurityEvents(agentId, telemetry) {
  return limitItems(
    (telemetry?.security?.events || []).map((event, index) => ({
      id: stableSecurityEventId(agentId, event, index),
      agentId,
      timestamp: event.timestamp || telemetry?.heartbeat || new Date().toISOString(),
      ...event,
    })),
    THORONDOR_SECURITY_LIMIT,
  )
}

function inferLogLevel(line, fallback) {
  const lower = String(line || '').toLowerCase()
  if (lower.includes('critical')) return 'CRITICAL'
  if (lower.includes('error')) return 'ERROR'
  if (lower.includes('warn')) return 'WARNING'
  return fallback
}

function hashCode(text) {
  return Array.from(String(text || '')).reduce(
    (hash, char) => (hash << 5) - hash + char.charCodeAt(0),
    0,
  )
}

function normalizeLogMessage(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function stableLogId(agentId, message) {
  return `${agentId}-${hashCode(
    `${String(agentId || '').trim().toLowerCase()}|log|${normalizeLogMessage(message).toLowerCase()}`,
  )}`
}

function stableSecurityEventId(agentId, event, fallbackIndex = 0) {
  const source = event || {}
  const fingerprint = [
    source.kind,
    source.user,
    source.subject,
    source.sourceIp,
    source.runAs,
    source.tty,
    source.cwd,
    source.command,
    source.process,
    source.file,
    source.oldHash,
    source.newHash,
    source.message,
  ]
    .map((value) => normalizeLogMessage(value))
    .filter(Boolean)
    .join('|')
    .toLowerCase()

  return `${agentId}-event-${hashCode(
    `${String(agentId || '').trim().toLowerCase()}|event|${fingerprint || fallbackIndex}`,
  )}`
}

function normalizeAgentRecord(agent) {
  const source = agent || {}
  const hostIp = String(source.hostIp || '').trim()
  const receiverUrlSource = String(source.receiverUrl || source.endpoint || '').trim()
  const portFromEndpoint = (() => {
    try {
      return receiverUrlSource ? Number(new URL(receiverUrlSource).port) : 0
    } catch {
      return 0
    }
  })()
  const port = Number(source.port || source.listenPort) || portFromEndpoint || 8765
  const receiverUrl =
    receiverUrlSource || (hostIp ? `http://${hostIp}:${port}` : '')
  const systemName = String(source.systemName || source.displayName || 'thorondor-host').trim()
  const targetOsText = String(source.targetOs || source.os || '').toLowerCase()
  const targetOs = targetOsText.includes('win') ? 'windows' : 'linux'
  const lastHeartbeatAt = source.lastHeartbeatAt || source.heartbeat || null
  const statusText = String(source.lastStatus || source.status || '').toLowerCase()
  const lastStatus = ['ok', 'online', 'success'].includes(statusText)
    ? 'ok'
    : ['error', 'offline', 'failed', 'danger'].includes(statusText)
      ? 'error'
      : lastHeartbeatAt
        ? 'ok'
        : ''
  const record = {
    id: String(source.id || `${systemName}-${hostIp || '127.0.0.1'}-${port}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-'),
    displayName: String(source.displayName || systemName).trim(),
    systemName,
    hostIp,
    lastSeenIp: String(source.lastSeenIp || '').trim(),
    port,
    receiverUrl,
    targetOs,
    distro: String(source.distro || 'Otra').trim(),
    osVersion: String(source.osVersion || '').trim(),
    agentVersion: String(source.agentVersion || source.version || '').trim(),
    networkScope: normalizeThorondorNetworkScope(source.networkScope),
    corsOrigin: String(source.corsOrigin || '*').trim() || '*',
    autoStart: source.autoStart !== false,
    generateSystemd:
      source.targetOs !== 'windows' && source.generateSystemd !== false && source.autoStart !== false,
    intervalSeconds: Math.max(10, Number(source.intervalSeconds) || 30),
    additionalLogPaths: String(source.additionalLogPaths || ''),
    modules: { ...source.modules },
    installUser: String(source.installUser || '').trim(),
    serviceName: String(source.serviceName || '').trim(),
    createdAt: source.createdAt || new Date().toISOString(),
    lastHeartbeatAt,
    lastStatus,
    lastError: source.lastError || null,
    requestTimeoutMs: Math.max(3000, Number(source.requestTimeoutMs) || 10000),
    updatedAt: source.updatedAt || new Date().toISOString(),
  }

  return {
    ...record,
    requestRules: buildThorondorRequestRules(record),
  }
}

function buildThorondorRulesForAgent(agentId, sourceRules = buildDefaultThorondorRuleSet()) {
  return (sourceRules || []).map((rule) => {
    const templateId = rule.templateId || rule.id || `rule-${rule.type}`
    return {
      ...rule,
      id: `${agentId}-${templateId}`,
      templateId,
      scope: agentId,
      createdAt: rule.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })
}

function normalizeThorondorRulesForAgents(rules, agents) {
  const agentIds = new Set((agents || []).map((agent) => agent.id))
  const scopedRules = (rules || [])
    .filter((rule) => rule?.scope && agentIds.has(rule.scope))
    .map((rule) => ({
      ...rule,
      updatedAt: rule.updatedAt || new Date().toISOString(),
    }))

  ;(agents || []).forEach((agent) => {
    const hasRules = scopedRules.some((rule) => rule.scope === agent.id)
    if (!hasRules) {
      scopedRules.push(...buildThorondorRulesForAgent(agent.id))
    }
  })

  return scopedRules
}

function normalizeThorondorCasesByAgent(casesByAgent, agents) {
  const agentIds = new Set((agents || []).map((agent) => agent.id))
  return Object.entries(casesByAgent || {}).reduce((acc, [agentId, cases]) => {
    if (!agentIds.has(agentId)) return acc
    acc[agentId] = Array.isArray(cases) ? cases : []
    return acc
  }, {})
}

function mapCentralIpListByAgent(items, type) {
  return (items || [])
    .filter((item) => String(item?.type || '').toUpperCase() === type)
    .filter((item) => item.active !== false)
    .reduce((acc, item) => {
      const agentId = item.agentId || 'global'
      if (!acc[agentId]) acc[agentId] = []
      acc[agentId].push({
        id: String(item.id || `${agentId}-${item.ip}-${type}`),
        agentId,
        ip: item.ip,
        provider: 'thorondor-back',
        rule: item.reason || type,
        enabled: true,
        reason: item.reason || '',
        actor: item.actor || '',
        createdAt: item.createdAt || '',
      })
      return acc
    }, {})
}

function mapCentralAuditToResponseActions(items) {
  return (items || [])
    .filter((item) => ['BLOCK_IP', 'UNBLOCK_IP', 'BLOCK_IP_RESULT', 'UNBLOCK_IP_RESULT'].includes(item.actionType))
    .map((item) => ({
      id: `central-audit-${item.id}`,
      agentId: item.agentId,
      action: String(item.actionType || '').includes('UNBLOCK') ? 'unblock' : 'block',
      ip: item.ip,
      ok: !['FAILED', 'DENIED'].includes(String(item.status || '').toUpperCase()),
      actor: item.actor || 'back',
      message: item.message || item.status || '',
      detail: item.reason || '',
      timestamp: item.createdAt,
    }))
}

function normalizeErrorDetails(error) {
  return {
    message: error?.message || 'Error desconocido',
    detail: error?.detail || '',
    status: Number(error?.status) || 0,
    statusText: error?.statusText || '',
    method: error?.method || '',
    endpoint: error?.endpoint || '',
    code: error?.code || '',
    hints: Array.isArray(error?.hints) ? error.hints : [],
    payload: error?.payload || null,
  }
}

function hasThorondorApiToken(token) {
  return isThorondorJwtTokenValid(token)
}

async function refreshThorondorTokenForSession(session) {
  if (!session?.authenticated) {
    clearThorondorJwtToken()
    return null
  }

  try {
    return await fetchThorondorJwtToken()
  } catch {
    clearThorondorJwtToken()
    return null
  }
}

function configureThorondorCloudAccess(session, token) {
  const authenticated = Boolean(session?.authenticated)
  const authorized = Boolean(session?.user?.canUseCloudPersistence || session?.user?.usuarioAutorizado)

  if (!authenticated) {
    setThorondorCloudPersistenceAccess(false, 'Inicia sesion para usar persistencia cloud.')
    return
  }

  if (!hasThorondorApiToken(token)) {
    setThorondorCloudPersistenceAccess(false, 'Token JWT requerido para usar BBDD por API.')
    return
  }

  if (!authorized) {
    setThorondorCloudPersistenceAccess(
      false,
      'Un usuario admin debe autorizar esta cuenta para usar BBDD por API.',
    )
    return
  }

  setThorondorCloudPersistenceAccess(true, '')
}

function requireThorondorApiToken(state) {
  if (hasThorondorApiToken(state.thorondor.token)) {
    return true
  }

  throw new Error('Token JWT requerido para usar servicios de monitorizacion.')
}

export default createStore({
  state: {
    thorondor: createThorondorState(),
  },

  getters: {
    thorondorAgents(state) {
      return state.thorondor.agents
    },

    thorondorSelectedAgent(state) {
      return (
        state.thorondor.agents.find((item) => item.id === state.thorondor.selectedAgentId) || null
      )
    },

    thorondorSnapshots(state) {
      return state.thorondor.snapshotsByAgent
    },

    thorondorDashboardCards(state) {
      return state.thorondor.agents.map((agent) => {
        const snapshots = state.thorondor.snapshotsByAgent[agent.id] || []
        const latest = snapshots[snapshots.length - 1] || null
        const status = deriveThorondorAgentStatus(agent)
        const alerts = state.thorondor.alerts.filter(
          (alert) => alert.agentId === agent.id && alert.status === 'active',
        )

        return {
          ...agent,
          latestSnapshot: latest,
          status,
          alertCount: alerts.length,
        }
      })
    },

    thorondorSecurityEventsFlat(state) {
      return Object.values(state.thorondor.securityEventsByAgent).flat()
    },

    thorondorLogsFlat(state) {
      return Object.values(state.thorondor.logsByAgent).flat()
    },

    thorondorResponseActions(state) {
      return state.thorondor.responseActions || []
    },
  },

  mutations: {
    setThorondorBootstrapping(state, value) {
      state.thorondor.bootstrapping = value
    },

    setThorondorLastSweepAt(state, value) {
      state.thorondor.lastSweepAt = value
    },

    setThorondorPersistenceStatus(state, value) {
      state.thorondor.persistence = {
        ...state.thorondor.persistence,
        ...value,
      }
    },

    setThorondorCentralStatus(state, value) {
      state.thorondor.central = {
        ...state.thorondor.central,
        enabled: isThorondorCentralConfigured(),
        ...value,
      }
    },

    setThorondorSession(state, value) {
      state.thorondor.session = {
        authenticated: false,
        user: null,
        providers: [],
        ...value,
      }
    },

    setThorondorToken(state, value) {
      state.thorondor.token = value || null
    },

    hydrateThorondorState(state, payload) {
      state.thorondor.initialized = true
      state.thorondor.persistence = {
        ...state.thorondor.persistence,
        ...payload.persistence,
      }
      state.thorondor.lastSweepAt = payload.lastSweepAt || null
      state.thorondor.agents = (payload.agents || []).map((agent) => normalizeAgentRecord(agent))
      state.thorondor.rules = normalizeThorondorRulesForAgents(
        payload.rules || [],
        state.thorondor.agents,
      )
      state.thorondor.alerts = payload.alerts || []
      state.thorondor.generatorDraft = payload.generatorDraft || buildThorondorAgentDraft()
      state.thorondor.snapshotsByAgent = mapByAgent(payload.snapshots)
      state.thorondor.logsByAgent = mapByAgent(payload.logs)
      state.thorondor.securityEventsByAgent = mapByAgent(payload.events)
      state.thorondor.connectionHistoryByAgent = mapByAgent(payload.history)
      state.thorondor.requestRulesByAgent = state.thorondor.agents.reduce((acc, agent) => {
        acc[agent.id] = buildThorondorRequestRules(agent)
        return acc
      }, {})
      state.thorondor.blockedIpsByAgent = mapCentralIpListByAgent(payload.ipList, 'BLOCK')
      state.thorondor.whitelistIpsByAgent = mapCentralIpListByAgent(payload.ipList, 'WHITELIST')
      state.thorondor.ipBlockOperationsByAgent = {}
      state.thorondor.casesByAgent = normalizeThorondorCasesByAgent(
        payload.casesByAgent,
        state.thorondor.agents,
      )
      state.thorondor.responseActions = mapCentralAuditToResponseActions(payload.audit)
      if (!state.thorondor.agents.some((agent) => agent.id === state.thorondor.selectedAgentId)) {
        state.thorondor.selectedAgentId = state.thorondor.agents[0]?.id || null
      }
    },

    registerThorondorAgent(state, agent) {
      const record = normalizeAgentRecord(agent)
      const index = state.thorondor.agents.findIndex((item) => item.id === record.id)

      if (index >= 0) {
        state.thorondor.agents.splice(index, 1, {
          ...state.thorondor.agents[index],
          ...record,
        })
      } else {
        state.thorondor.agents.push(record)
      }

      state.thorondor.requestRulesByAgent[record.id] = buildThorondorRequestRules(record)
      if (!state.thorondor.rules.some((rule) => rule.scope === record.id)) {
        state.thorondor.rules.push(...buildThorondorRulesForAgent(record.id))
      }
      if (!state.thorondor.casesByAgent[record.id]) {
        state.thorondor.casesByAgent[record.id] = []
      }
      if (!state.thorondor.selectedAgentId) {
        state.thorondor.selectedAgentId = record.id
      }
    },

    removeThorondorAgent(state, agentId) {
      state.thorondor.agents = state.thorondor.agents.filter((agent) => agent.id !== agentId)
      delete state.thorondor.snapshotsByAgent[agentId]
      delete state.thorondor.logsByAgent[agentId]
      delete state.thorondor.securityEventsByAgent[agentId]
      delete state.thorondor.connectionHistoryByAgent[agentId]
      delete state.thorondor.requestRulesByAgent[agentId]
      delete state.thorondor.blockedIpsByAgent[agentId]
      delete state.thorondor.ipBlockOperationsByAgent[agentId]
      delete state.thorondor.casesByAgent[agentId]
      state.thorondor.rules = state.thorondor.rules.filter((rule) => rule.scope !== agentId)
      state.thorondor.alerts = state.thorondor.alerts.filter((alert) => alert.agentId !== agentId)
      state.thorondor.responseActions = state.thorondor.responseActions.filter(
        (action) => action.agentId !== agentId,
      )
      if (state.thorondor.selectedAgentId === agentId) {
        state.thorondor.selectedAgentId = state.thorondor.agents[0]?.id || null
      }
    },

    setThorondorSelectedAgent(state, agentId) {
      state.thorondor.selectedAgentId = agentId
    },

    setThorondorGeneratorDraft(state, draft) {
      state.thorondor.generatorDraft = draft
    },

    clearThorondorGeneratorDraft(state) {
      state.thorondor.generatorDraft = buildThorondorAgentDraft()
    },

    ingestThorondorTelemetry(state, payload) {
      const { agentId, telemetry } = payload
      const snapshot = toSummarySnapshot(agentId, telemetry)
      const logs = flattenLogs(agentId, telemetry)
      const events = flattenSecurityEvents(agentId, telemetry)

      if (!state.thorondor.snapshotsByAgent[agentId]) state.thorondor.snapshotsByAgent[agentId] = []
      if (!state.thorondor.logsByAgent[agentId]) state.thorondor.logsByAgent[agentId] = []
      if (!state.thorondor.securityEventsByAgent[agentId])
        state.thorondor.securityEventsByAgent[agentId] = []

      state.thorondor.snapshotsByAgent[agentId].push(snapshot)
      state.thorondor.snapshotsByAgent[agentId] = limitItems(
        state.thorondor.snapshotsByAgent[agentId],
        THORONDOR_HISTORY_LIMIT,
      )

      const existingLogs = state.thorondor.logsByAgent[agentId]
      const logMap = new Map(existingLogs.map((item) => [item.id, item]))
      logs.forEach((item) => logMap.set(item.id, item))
      state.thorondor.logsByAgent[agentId] = limitItems(
        Array.from(logMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
        THORONDOR_LOG_LIMIT,
      )

      const existingEvents = state.thorondor.securityEventsByAgent[agentId]
      const eventMap = new Map(existingEvents.map((item) => [item.id, item]))
      events.forEach((item) => eventMap.set(item.id, item))
      state.thorondor.securityEventsByAgent[agentId] = limitItems(
        Array.from(eventMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
        THORONDOR_SECURITY_LIMIT,
      )

      const agentIndex = state.thorondor.agents.findIndex((item) => item.id === agentId)
      if (agentIndex >= 0) {
        state.thorondor.agents.splice(agentIndex, 1, {
          ...state.thorondor.agents[agentIndex],
          lastHeartbeatAt: telemetry.heartbeat || new Date().toISOString(),
          lastStatus: 'ok',
          lastSnapshotSummary: {
            cpuTotal: snapshot.cpuTotal,
            memoryPercent: snapshot.memoryPercent,
            diskPercent: snapshot.diskPercent,
          },
          updatedAt: new Date().toISOString(),
        })
      }

      state.thorondor.lastPollAt = new Date().toISOString()
    },

    recordThorondorConnection(state, payload) {
      const historyEntry = {
        id: `${payload.agentId}-${payload.timestamp}-${payload.kind}`,
        ...payload,
      }

      if (!state.thorondor.connectionHistoryByAgent[payload.agentId]) {
        state.thorondor.connectionHistoryByAgent[payload.agentId] = []
      }

      state.thorondor.connectionHistoryByAgent[payload.agentId].push(historyEntry)
      state.thorondor.connectionHistoryByAgent[payload.agentId] = limitItems(
        state.thorondor.connectionHistoryByAgent[payload.agentId],
        THORONDOR_CONNECTION_LIMIT,
      )

      const agentIndex = state.thorondor.agents.findIndex((item) => item.id === payload.agentId)
      if (agentIndex >= 0) {
        state.thorondor.agents.splice(agentIndex, 1, {
          ...state.thorondor.agents[agentIndex],
          lastStatus: payload.kind === 'success' ? 'ok' : 'error',
          lastError: payload.error || null,
          updatedAt: new Date().toISOString(),
        })
      }
    },

    upsertThorondorAlerts(state, alerts) {
      const map = new Map(state.thorondor.alerts.map((item) => [item.id, item]))

      alerts.forEach((alert) => {
        const existing = map.get(alert.id)
        map.set(alert.id, {
          ...existing,
          ...alert,
          status:
            existing?.status === 'resolved'
              ? 'resolved'
              : existing?.status || alert.status || 'active',
        })
      })

      state.thorondor.alerts = Array.from(map.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )
    },

    updateThorondorRule(state, rule) {
      const index = state.thorondor.rules.findIndex((item) => item.id === rule.id)
      if (index >= 0) {
        state.thorondor.rules.splice(index, 1, {
          ...state.thorondor.rules[index],
          ...rule,
        })
      } else {
        state.thorondor.rules.push(rule)
      }
    },

    removeThorondorRule(state, ruleId) {
      state.thorondor.rules = state.thorondor.rules.filter((item) => item.id !== ruleId)
    },

    resetThorondorRulesForAgent(state, agentId) {
      if (!agentId) return
      state.thorondor.rules = state.thorondor.rules.filter((rule) => rule.scope !== agentId)
      state.thorondor.rules.push(...buildThorondorRulesForAgent(agentId))
    },

    setThorondorAlertStatus(state, payload) {
      const index = state.thorondor.alerts.findIndex((item) => item.id === payload.id)
      if (index >= 0) {
        state.thorondor.alerts.splice(index, 1, {
          ...state.thorondor.alerts[index],
          status: payload.status,
          reviewedAt: payload.status !== 'active' ? new Date().toISOString() : null,
        })
      }
    },

    setThorondorBlockedIps(state, payload) {
      state.thorondor.blockedIpsByAgent[payload.agentId] = (payload.blocked || []).map(
        (item, index) => ({
          id: `${payload.agentId}-${item.ip || index}-${item.provider || 'firewall'}`,
          agentId: payload.agentId,
          ...item,
        }),
      )
    },

    setThorondorIpBlockOperation(state, payload) {
      if (!payload?.agentId) return
      state.thorondor.ipBlockOperationsByAgent[payload.agentId] = {
        status: 'idle',
        action: '',
        ip: '',
        message: '',
        detail: '',
        statusCode: 0,
        statusText: '',
        method: '',
        endpoint: '',
        code: '',
        hints: [],
        payload: null,
        updatedAt: new Date().toISOString(),
        ...payload,
      }
    },

    recordThorondorResponseAction(state, payload) {
      state.thorondor.responseActions.unshift({
        id: `${payload.agentId}-${payload.action}-${payload.ip}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: 'frontend',
        ...payload,
      })
      state.thorondor.responseActions = state.thorondor.responseActions.slice(0, 80)
    },

    upsertThorondorCase(state, payload) {
      if (!payload?.agentId) return
      if (!state.thorondor.casesByAgent[payload.agentId]) {
        state.thorondor.casesByAgent[payload.agentId] = []
      }

      const cases = state.thorondor.casesByAgent[payload.agentId]
      const index = cases.findIndex((item) => item.id === payload.id)
      const record = {
        ...payload,
        updatedAt: new Date().toISOString(),
      }

      if (index >= 0) {
        cases.splice(index, 1, {
          ...cases[index],
          ...record,
        })
      } else {
        cases.unshift({
          createdAt: new Date().toISOString(),
          status: 'new',
          severity: 'medium',
          alerts: [],
          notes: [],
          tasks: [],
          ...record,
        })
      }
    },

    pushThorondorError(state, errorMessage) {
      state.thorondor.errors.unshift({
        id: `${Date.now()}-${Math.random()}`,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      })
      state.thorondor.errors = state.thorondor.errors.slice(0, 20)
    },
  },

  actions: {
    async bootstrapThorondor({ commit, state }) {
      if (state.thorondor.initialized || state.thorondor.bootstrapping) return

      commit('setThorondorBootstrapping', true)
      try {
        let session
        try {
          session = await fetchThorondorSession()
        } catch {
          session = getStoredThorondorSession()
        }
        const token = await refreshThorondorTokenForSession(session)
        configureThorondorCloudAccess(session, token)
        commit('setThorondorSession', session)
        commit('setThorondorToken', token)

        const persistenceStatus = await openThorondorPersistence()
        commit('setThorondorPersistenceStatus', persistenceStatus)
        const persisted = await loadThorondorPersistence()
        commit('setThorondorPersistenceStatus', persisted.persistence)
        commit('hydrateThorondorState', persisted)
        const cutoff = new Date(Date.now() - state.thorondor.retentionDays * 86400000).toISOString()
        await sweepThorondorPersistence(cutoff)
        const sweepTime = new Date().toISOString()
        await setMeta('lastSweepAt', sweepTime)
        commit('setThorondorLastSweepAt', sweepTime)
      } catch (error) {
        commit('pushThorondorError', `No se pudo inicializar Thorondor: ${error.message}`)
        commit('hydrateThorondorState', {
          agents: [],
          snapshots: [],
          logs: [],
          events: [],
          alerts: [],
          rules: [],
          history: [],
          lastSweepAt: null,
          generatorDraft: buildThorondorAgentDraft(),
          casesByAgent: {},
          persistence: getThorondorPersistenceStatus({
            syncStatus: 'error',
            lastError: error.message,
          }),
        })
      } finally {
        commit('setThorondorBootstrapping', false)
      }
    },

    async refreshThorondorSession({ commit }) {
      const session = await fetchThorondorSession()
      const token = await refreshThorondorTokenForSession(session)
      configureThorondorCloudAccess(session, token)
      commit('setThorondorSession', session)
      commit('setThorondorToken', token)
      commit('setThorondorPersistenceStatus', getThorondorPersistenceStatus())
      return session
    },

    async syncThorondorCentralConsole({ commit, state }) {
      if (!isThorondorCentralConfigured()) {
        commit('setThorondorCentralStatus', {
          status: 'disabled',
          lastError: '',
        })
        return false
      }

      if (!hasThorondorApiToken(state.thorondor.token)) {
        commit('setThorondorCentralStatus', {
          status: 'auth-required',
          lastError: 'Token JWT requerido para consultar la consola central.',
        })
        return false
      }

      commit('setThorondorCentralStatus', {
        status: 'syncing',
        lastError: '',
      })

      try {
        const snapshot = await fetchThorondorCentralSnapshot()
        commit('hydrateThorondorState', {
          ...snapshot,
          generatorDraft: state.thorondor.generatorDraft,
          casesByAgent: state.thorondor.casesByAgent,
          persistence: {
            ...state.thorondor.persistence,
            effectiveMode: 'cloud',
            syncStatus: 'central-siem',
            lastSyncAt: new Date().toISOString(),
          },
        })
        commit('setThorondorCentralStatus', {
          status: 'synced',
          lastSyncAt: new Date().toISOString(),
          lastError: '',
        })
        return true
      } catch (error) {
        commit('setThorondorCentralStatus', {
          status: 'error',
          lastError: error.message,
        })
        commit('pushThorondorError', `No se pudo sincronizar con el SIEM central: ${error.message}`)
        throw error
      }
    },

    async setThorondorPersistenceMode({ commit, state }, mode) {
      const nextMode = mode === 'cloud' ? 'cloud' : 'local'
      const currentDraft = state.thorondor.generatorDraft || buildThorondorAgentDraft()

      saveThorondorPersistenceMode(nextMode)

      try {
        const openedStatus = await openThorondorPersistence()
        commit('setThorondorPersistenceStatus', {
          ...openedStatus,
          lastError: null,
        })

        const persisted = await loadThorondorPersistence()
        commit('hydrateThorondorState', {
          ...persisted,
          generatorDraft: currentDraft,
        })
        await setMeta('generatorDraft', currentDraft)
        return persisted.persistence
      } catch (error) {
        const fallbackStatus = getThorondorPersistenceStatus({
          syncStatus: 'error',
          lastError: error.message,
        })
        commit('setThorondorPersistenceStatus', fallbackStatus)
        commit('pushThorondorError', `No se pudo cambiar la persistencia: ${error.message}`)
        throw error
      }
    },

    async registerThorondorAgent({ commit, dispatch }, agent) {
      const record = normalizeAgentRecord({
        ...agent,
        createdAt: agent.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      commit('registerThorondorAgent', record)
      await putOne(STORE_NAMES.agents, record)
      await dispatch('persistThorondorRules')
      await dispatch('persistThorondorCases')
    },

    async removeThorondorAgent({ commit, dispatch }, agentId) {
      commit('removeThorondorAgent', agentId)
      await Promise.all([
        deleteOne(STORE_NAMES.agents, agentId),
        deleteByIndex(STORE_NAMES.snapshots, 'agentId', agentId),
        deleteByIndex(STORE_NAMES.logs, 'agentId', agentId),
        deleteByIndex(STORE_NAMES.events, 'agentId', agentId),
        deleteByIndex(STORE_NAMES.history, 'agentId', agentId),
        deleteByIndex(STORE_NAMES.alerts, 'agentId', agentId),
      ])
      await Promise.all([
        dispatch('persistThorondorRules'),
        dispatch('persistThorondorCases'),
        dispatch('persistThorondorAlerts'),
      ])
    },

    async saveThorondorGeneratorDraft({ commit }, draft) {
      commit('setThorondorGeneratorDraft', draft)
      await setMeta('generatorDraft', draft)
    },

    async clearThorondorGeneratorDraft({ commit }) {
      const draft = buildThorondorAgentDraft()
      commit('clearThorondorGeneratorDraft')
      await setMeta('generatorDraft', draft)
    },

    async pollThorondorAgents({ state, commit, dispatch }) {
      if (thorondorPollPromise) {
        return thorondorPollPromise
      }

      thorondorPollPromise = (async () => {
        if (!hasThorondorApiToken(state.thorondor.token)) {
          commit('setThorondorCentralStatus', {
            status: 'auth-required',
            lastError: 'Token JWT requerido para monitorizar hosts.',
          })
          return false
        }

        if (isThorondorCentralConfigured()) {
          await dispatch('syncThorondorCentralConsole')
          return true
        }

        commit('setThorondorCentralStatus', {
          status: 'disabled',
          lastError: 'API central requerida para validar el JWT antes de monitorizar hosts.',
        })
        return false
      })().finally(() => {
        thorondorPollPromise = null
      })

      return thorondorPollPromise
    },

    async refreshThorondorBlockedIps({ state, commit, dispatch }, agentId) {
      const targetAgentId = agentId || state.thorondor.selectedAgentId
      const agent = state.thorondor.agents.find((item) => item.id === targetAgentId)
      if (!agent) {
        throw new Error('Agente no encontrado')
      }

      requireThorondorApiToken(state)

      if (!isThorondorCentralConfigured()) {
        throw new Error('API central requerida para consultar bloqueos con validacion JWT.')
      }

      if (isThorondorCentralConfigured()) {
        commit('setThorondorIpBlockOperation', {
          agentId: agent.id,
          status: 'loading',
          action: 'refresh',
          message: 'Sincronizando bloqueos desde el back central...',
          endpoint: '/thorondor/api/console/snapshot',
          method: 'GET',
        })
        await dispatch('syncThorondorCentralConsole')
        const blocked = state.thorondor.blockedIpsByAgent[agent.id] || []
        commit('setThorondorIpBlockOperation', {
          agentId: agent.id,
          status: 'success',
          action: 'refresh',
          message: `${blocked.length} bloqueo(s) activos en el back central.`,
          endpoint: '/thorondor/api/console/snapshot',
          method: 'GET',
        })
        return blocked
      }
    },

    async blockThorondorIp({ state, commit, dispatch }, payload) {
      const targetAgentId = payload?.agentId || state.thorondor.selectedAgentId
      const agent = state.thorondor.agents.find((item) => item.id === targetAgentId)
      if (!agent) {
        throw new Error('Agente no encontrado')
      }

      requireThorondorApiToken(state)

      if (!isThorondorCentralConfigured()) {
        throw new Error('API central requerida para bloquear IPs con validacion JWT.')
      }

      if (isThorondorCentralConfigured()) {
        const endpoint = `/thorondor/api/console/agents/${agent.id}/commands`
        commit('setThorondorIpBlockOperation', {
          agentId: agent.id,
          status: 'loading',
          action: 'block',
          ip: payload.ip,
          message: `Encolando bloqueo de ${payload.ip} en el back central...`,
          endpoint,
          method: 'POST',
        })

        try {
          const command = await createThorondorCentralCommand(agent.id, {
            type: 'block-ip',
            requestedBy: 'frontend',
            reason: payload.reason || 'manual',
            payload: {
              ip: payload.ip,
              reason: payload.reason || 'manual',
            },
          })
          commit('recordThorondorResponseAction', {
            agentId: agent.id,
            agentName: agent.displayName,
            action: 'block',
            ip: payload.ip,
            ok: true,
            message: 'Comando encolado en el back central.',
            detail: command.id,
          })
          commit('setThorondorIpBlockOperation', {
            agentId: agent.id,
            status: 'success',
            action: 'block',
            ip: payload.ip,
            message: 'Comando de bloqueo encolado. El agente lo ejecutará al consultar la cola.',
            endpoint,
            method: 'POST',
            payload: command,
          })
          await dispatch('syncThorondorCentralConsole')
          return {
            ok: true,
            queued: true,
            command,
            message: 'Comando de bloqueo encolado en el back central.',
          }
        } catch (error) {
          const details = normalizeErrorDetails(error)
          commit('recordThorondorResponseAction', {
            agentId: agent.id,
            agentName: agent.displayName,
            action: 'block',
            ip: payload.ip,
            ok: false,
            message: details.message,
            detail: details.detail,
          })
          commit('setThorondorIpBlockOperation', {
            agentId: agent.id,
            status: 'error',
            action: 'block',
            ip: payload.ip,
            message: details.message,
            detail: details.detail,
            statusCode: details.status,
            endpoint,
            method: 'POST',
            payload: details.payload,
          })
          throw error
        }
      }
    },

    async unblockThorondorIp({ state, commit, dispatch }, payload) {
      const targetAgentId = payload?.agentId || state.thorondor.selectedAgentId
      const agent = state.thorondor.agents.find((item) => item.id === targetAgentId)
      if (!agent) {
        throw new Error('Agente no encontrado')
      }

      requireThorondorApiToken(state)

      if (!isThorondorCentralConfigured()) {
        throw new Error('API central requerida para desbloquear IPs con validacion JWT.')
      }

      if (isThorondorCentralConfigured()) {
        const endpoint = `/thorondor/api/console/agents/${agent.id}/commands`
        commit('setThorondorIpBlockOperation', {
          agentId: agent.id,
          status: 'loading',
          action: 'unblock',
          ip: payload.ip,
          message: `Encolando desbloqueo de ${payload.ip} en el back central...`,
          endpoint,
          method: 'POST',
        })

        try {
          const command = await createThorondorCentralCommand(agent.id, {
            type: 'unblock-ip',
            requestedBy: 'frontend',
            reason: payload.reason || 'manual',
            payload: {
              ip: payload.ip,
              reason: payload.reason || 'manual',
            },
          })
          commit('recordThorondorResponseAction', {
            agentId: agent.id,
            agentName: agent.displayName,
            action: 'unblock',
            ip: payload.ip,
            ok: true,
            message: 'Comando encolado en el back central.',
            detail: command.id,
          })
          commit('setThorondorIpBlockOperation', {
            agentId: agent.id,
            status: 'success',
            action: 'unblock',
            ip: payload.ip,
            message: 'Comando de desbloqueo encolado. El agente lo ejecutará al consultar la cola.',
            endpoint,
            method: 'POST',
            payload: command,
          })
          await dispatch('syncThorondorCentralConsole')
          return {
            ok: true,
            queued: true,
            command,
            message: 'Comando de desbloqueo encolado en el back central.',
          }
        } catch (error) {
          const details = normalizeErrorDetails(error)
          commit('recordThorondorResponseAction', {
            agentId: agent.id,
            agentName: agent.displayName,
            action: 'unblock',
            ip: payload.ip,
            ok: false,
            message: details.message,
            detail: details.detail,
          })
          commit('setThorondorIpBlockOperation', {
            agentId: agent.id,
            status: 'error',
            action: 'unblock',
            ip: payload.ip,
            message: details.message,
            detail: details.detail,
            statusCode: details.status,
            endpoint,
            method: 'POST',
            payload: details.payload,
          })
          throw error
        }
      }
    },

    async persistThorondorAgentData({ state }, agentId) {
      const snapshots = state.thorondor.snapshotsByAgent[agentId] || []
      const logs = state.thorondor.logsByAgent[agentId] || []
      const events = state.thorondor.securityEventsByAgent[agentId] || []
      const history = state.thorondor.connectionHistoryByAgent[agentId] || []
      const agent = state.thorondor.agents.find((item) => item.id === agentId)

      if (agent) {
        await putOne(STORE_NAMES.agents, agent)
      }

      await Promise.all([
        putMany(STORE_NAMES.snapshots, snapshots),
        putMany(STORE_NAMES.logs, logs),
        putMany(STORE_NAMES.events, events),
        putMany(STORE_NAMES.history, history),
      ])
    },

    async persistThorondorAlerts({ state }) {
      await putMany(STORE_NAMES.alerts, state.thorondor.alerts)
    },

    async persistThorondorRules({ state }) {
      await clearStore(STORE_NAMES.rules)
      await putMany(STORE_NAMES.rules, state.thorondor.rules)
    },

    async persistThorondorCases({ state }) {
      await setMeta('casesByAgent', state.thorondor.casesByAgent || {})
    },

    async saveThorondorRule({ commit, dispatch }, rule) {
      commit('updateThorondorRule', rule)
      await dispatch('persistThorondorRules')
    },

    async resetThorondorRulesForAgent({ commit, dispatch }, agentId) {
      commit('resetThorondorRulesForAgent', agentId)
      await dispatch('persistThorondorRules')
    },

    async deleteThorondorRule({ commit, dispatch }, ruleId) {
      commit('removeThorondorRule', ruleId)
      await deleteOne(STORE_NAMES.rules, ruleId)
      await dispatch('persistThorondorRules')
    },

    async setThorondorAlertStatus({ commit, dispatch }, payload) {
      commit('setThorondorAlertStatus', payload)
      await dispatch('persistThorondorAlerts')
    },

    async saveThorondorCase({ commit, dispatch }, payload) {
      const record = {
        id: payload.id || `case-${Date.now()}`,
        ...payload,
      }
      commit('upsertThorondorCase', record)
      await dispatch('persistThorondorCases')
      return record
    },

    async sweepThorondorData({ state, commit }) {
      const lastSweep = state.thorondor.lastSweepAt
        ? new Date(state.thorondor.lastSweepAt).getTime()
        : 0
      if (Date.now() - lastSweep < THORONDOR_SWEEP_INTERVAL_MS) return

      const cutoff = new Date(Date.now() - state.thorondor.retentionDays * 86400000).toISOString()
      const agentIds = state.thorondor.agents.map((a) => a.id)

      await sweepThorondorPersistence(cutoff, agentIds, {
        snapshots: THORONDOR_IDB_SNAPSHOT_LIMIT,
        logs: THORONDOR_IDB_LOG_LIMIT,
        events: THORONDOR_IDB_EVENT_LIMIT,
      })

      const sweepTime = new Date().toISOString()
      await setMeta('lastSweepAt', sweepTime)
      commit('setThorondorLastSweepAt', sweepTime)
    },
  },

  modules: {},
})
