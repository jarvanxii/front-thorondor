import { createStore } from 'vuex'
import {
  THORONDOR_AGENT_FIXED_PORT,
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
  executeThorondorAgentSafeAction,
  fetchThorondorTelemetry,
  manageThorondorAgentService,
} from '@/features/thorondor/services/thorondorApi'
import {
  createThorondorCentralCommand,
  deleteThorondorSmartResponse as requestDeleteThorondorSmartResponse,
  fetchThorondorCentralSnapshot,
  saveThorondorSmartResponse as requestSaveThorondorSmartResponse,
  isThorondorCentralConfigured,
  updateThorondorCentralAgent,
} from '@/features/thorondor/services/thorondorCentralApi'
import {
  clearThorondorJwtToken,
  fetchThorondorJwtToken,
  fetchThorondorSession,
  getStoredThorondorJwtToken,
  getStoredThorondorSession,
  isThorondorJwtTokenValid,
  logoutThorondorSession as requestThorondorLogout,
  saveThorondorSession,
  updateThorondorKeyAgents as requestThorondorKeyAgentsUpdate,
} from '@/features/thorondor/services/thorondorAuth'
import {
  evaluateThorondorRules,
  deriveThorondorAgentStatus,
  isThorondorAgentAlertsPaused,
  isThorondorAgentPaused,
} from '@/features/thorondor/services/thorondorRules'
import {
  buildDefaultThorondorSmartResponses,
  evaluateThorondorSmartResponses,
  normalizeThorondorSmartResponses,
  smartActionLabel,
} from '@/features/thorondor/services/thorondorSmartResponses'

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

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function textOrEmpty(value) {
  return String(value ?? '').trim()
}

function normalizeProcessList(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      ...item,
      pid: numberOrZero(item?.pid),
      ppid: numberOrZero(item?.ppid),
      name: textOrEmpty(item?.name || item?.process) || 'N/D',
      user: textOrEmpty(item?.user || item?.username),
      status: textOrEmpty(item?.status),
      cpuPercent: numberOrZero(item?.cpuPercent),
      memoryPercent: numberOrZero(item?.memoryPercent),
      memoryRss: numberOrZero(item?.memoryRss || item?.rss),
      memoryVms: numberOrZero(item?.memoryVms || item?.vms),
      threads: numberOrZero(item?.threads),
      createdAt: textOrEmpty(item?.createdAt),
      exe: textOrEmpty(item?.exe),
      cmdline: textOrEmpty(item?.cmdline),
    }))
    .sort((a, b) =>
      b.cpuPercent - a.cpuPercent ||
      b.memoryPercent - a.memoryPercent ||
      b.memoryRss - a.memoryRss,
    )
}

function normalizeOpenPorts(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const proto = textOrEmpty(item?.proto || item?.protocol || 'tcp').toLowerCase()
      const port = numberOrZero(item?.port || item?.localPort)
      const ip = textOrEmpty(item?.ip || item?.localIp)
      return {
        ...item,
        ip,
        port,
        proto,
        family: textOrEmpty(item?.family || (ip.includes(':') ? 'IPv6' : 'IPv4')),
        status: textOrEmpty(item?.status || (proto === 'udp' ? 'OPEN' : 'LISTEN')),
        pid: numberOrZero(item?.pid),
        process: textOrEmpty(item?.process || item?.name),
        user: textOrEmpty(item?.user || item?.username),
        cmdline: textOrEmpty(item?.cmdline),
      }
    })
    .filter((item) => item.port > 0)
    .sort((a, b) => a.proto.localeCompare(b.proto) || a.port - b.port || a.ip.localeCompare(b.ip))
}

function normalizeEstablishedConnections(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      ...item,
      pid: numberOrZero(item?.pid),
      process: textOrEmpty(item?.process || item?.name),
      user: textOrEmpty(item?.user || item?.username),
      proto: textOrEmpty(item?.proto || 'tcp').toLowerCase(),
      family: textOrEmpty(item?.family),
      localIp: textOrEmpty(item?.localIp),
      localPort: numberOrZero(item?.localPort),
      remoteIp: textOrEmpty(item?.remoteIp),
      remotePort: numberOrZero(item?.remotePort),
      localAddr: textOrEmpty(item?.localAddr),
      remoteAddr: textOrEmpty(item?.remoteAddr),
      status: textOrEmpty(item?.status || 'ESTABLISHED'),
      cmdline: textOrEmpty(item?.cmdline),
    }))
    .sort((a, b) =>
      a.process.localeCompare(b.process) ||
      a.pid - b.pid ||
      a.remoteAddr.localeCompare(b.remoteAddr),
    )
}

function createThorondorState() {
  return {
    initialized: false,
    bootstrapping: false,
    persistence: getThorondorPersistenceStatus(),
    retentionDays: THORONDOR_RETENTION_DAYS,
    lastSweepAt: null,
    agents: [],
    rules: [],
    smartResponses: buildDefaultThorondorSmartResponses(),
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
  const disks = allDisks
    .filter((d) => d.fstype && !VIRTUAL_FSTYPES.has(d.fstype))
    .map((disk) => {
      const total = Number(disk.total) || 0
      const used = Number(disk.used) || 0
      const free = Number(disk.free) || Math.max(total - used, 0)
      const usedPercent = Number(disk.usedPercent ?? disk.percent) || 0
      return {
        ...disk,
        total,
        used,
        free,
        percent: usedPercent,
        usedPercent,
        freePercent: Number(disk.freePercent) || (total ? Math.max(100 - usedPercent, 0) : 0),
      }
    })
  const topDisk = disks.reduce((max, item) => Math.max(max, Number(item.percent) || 0), 0)
  const memoryTotal = Number(metrics.memoryTotal) || 0
  const memoryUsed = Number(metrics.memoryUsed) || 0
  const processes = normalizeProcessList(metrics.processes)
  const openPorts = normalizeOpenPorts(metrics.openPorts)
  const establishedConnections = normalizeEstablishedConnections(metrics.establishedConnections)
  const agentStatus = {
    ...(metrics.agentStatus || {}),
    requestLatencyMs: Number(telemetry?.__request?.latencyMs) || Number(metrics.agentStatus?.requestLatencyMs) || null,
    requestEndpoint: telemetry?.__request?.endpoint || metrics.agentStatus?.requestEndpoint || '',
  }

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
    memoryUsed,
    memoryAvailable: Number(metrics.memoryAvailable) || Math.max(memoryTotal - memoryUsed, 0),
    memoryFree: Number(metrics.memoryFree) || 0,
    memoryTotal,
    swapPercent: Number(metrics.swapPercent) || 0,
    swapUsed: Number(metrics.swapUsed) || 0,
    swapTotal: Number(metrics.swapTotal) || 0,
    disks,
    diskPercent: topDisk,
    processes,
    processCount: Number(metrics.processCount) || processes.length,
    processSampleLimit: Number(metrics.processSampleLimit) || processes.length,
    interfaces: metrics.interfaces || [],
    temperatures: metrics.temperatures || [],
    openPorts,
    networkRates: metrics.networkRates || [],
    establishedConnections,
    failedServices: metrics.failedServices || [],
    serviceInventory: Array.isArray(metrics.serviceInventory) ? metrics.serviceInventory : [],
    scheduledTasks: Array.isArray(metrics.scheduledTasks) ? metrics.scheduledTasks : [],
    firewallRules: Array.isArray(metrics.firewallRules) ? metrics.firewallRules : [],
    firewallSummary: metrics.firewallSummary || { total: 0, thorondor: 0, system: 0, blockedIps: [] },
    fans: metrics.fans || [],
    battery: metrics.battery || null,
    gpu: metrics.gpu || [],
    hardware: metrics.hardware || {},
    userInventory: metrics.userInventory || {
      collectedAt: telemetry?.heartbeat || new Date().toISOString(),
      os: telemetry?.agent?.targetOs || '',
      users: [],
      groups: [],
      privilegedGroups: [],
    },
    docker: metrics.docker || [],
    dns: metrics.dns || [],
    smartData: metrics.smartData || [],
    loginHistory: metrics.loginHistory || [],
    pendingUpdates: metrics.pendingUpdates || { count: 0, updates: [] },
    inventoryChanges: metrics.inventoryChanges || { initialized: true, events: [], counts: {} },
    hostBaseline: metrics.hostBaseline || metrics.inventoryChanges || { initialized: true, events: [], importantEvents: [], counts: {} },
    securityAccess: metrics.securityAccess || { failedLogins: 0, successfulLogins: 0, repeatedIps: [], attackedUsers: [], protocols: [], recommendation: '' },
    agentStatus,
    collectionStatus: metrics.collectionStatus || {
      os: telemetry?.agent?.targetOs || '',
      modules: telemetry?.agent?.modules || {},
      errors: [],
      counts: {},
    },
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

function parseAgentEndpoint(value) {
  const raw = String(value || '').trim()
  if (!raw) return { host: '', port: 0 }

  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `http://${raw}`)
    return {
      host: url.hostname || '',
      port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
    }
  } catch {
    return { host: '', port: 0 }
  }
}

function buildAgentReceiverUrl(hostIp, port, fallback = '') {
  const rawFallback = String(fallback || '').trim()
  const normalizedHost = String(hostIp || '').trim()
  const normalizedPort = Number(port) || 0

  if (!normalizedHost && rawFallback) {
    return rawFallback
  }
  if (!normalizedHost) {
    return ''
  }

  const base = normalizedHost.startsWith('http://') || normalizedHost.startsWith('https://')
    ? normalizedHost.replace(/\/+$/, '')
    : `http://${normalizedHost}`
  return normalizedPort > 0 && !/:\d+$/.test(base)
    ? `${base}:${normalizedPort}`
    : base
}

function normalizeAgentRecord(agent) {
  const source = agent || {}
  const receiverUrlSource = String(source.receiverUrl || source.endpoint || '').trim()
  const endpointParts = parseAgentEndpoint(receiverUrlSource)
  const hostIp = String(source.hostIp || source.ipAddress || source.ip || endpointParts.host || '').trim()
  const portFromEndpoint = endpointParts.port
  const port = Number(source.port || source.listenPort) || portFromEndpoint || THORONDOR_AGENT_FIXED_PORT
  const receiverUrl = buildAgentReceiverUrl(hostIp, port, receiverUrlSource)
  const systemName = String(source.systemName || source.displayName || 'thorondor-host').trim()
  const targetOsText = String(source.targetOs || source.os || '').toLowerCase()
  const targetOs = targetOsText.includes('win') ? 'windows' : 'linux'
  const lastHeartbeatAt = source.lastHeartbeatAt || source.heartbeat || null
  const siemPaused = isThorondorAgentPaused(source)
  const alertsPausedUntil = String(
    source.alertsPausedUntil || source.alerts_paused_until || source.maintenanceUntil || '',
  ).trim()
  const alertsPaused = isThorondorAgentAlertsPaused({
    ...source,
    alertsPausedUntil,
  })
  const statusText = String(source.lastStatus || source.status || '').toLowerCase()
  const lastStatus = siemPaused
    ? 'paused'
    : ['ok', 'online', 'success'].includes(statusText)
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
    lastError: siemPaused ? null : source.lastError || null,
    siemPaused,
    pollingPaused: siemPaused,
    alertsPaused,
    alertsPausedUntil,
    maintenanceReason: String(source.maintenanceReason || source.maintenance_reason || '').trim(),
    requestTimeoutMs: Math.max(3000, Number(source.requestTimeoutMs) || 10000),
    keyAgents: String(source.keyAgents || source.key_agents || source.agentToken || source.token || '').trim(),
    agentToken: String(source.keyAgents || source.key_agents || source.agentToken || source.token || '').trim(),
    centralEnrollmentToken: String(source.centralEnrollmentToken || '').trim(),
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
    acc[agentId] = Array.isArray(cases)
      ? cases.map((item) => normalizeThorondorCase(item, agentId)).filter(Boolean)
      : []
    return acc
  }, {})
}

function normalizeCaseSeverity(value) {
  const severity = String(value || '').trim().toLowerCase()
  return ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium'
}

function normalizeCaseStatus(value) {
  const status = String(value || '').trim().toLowerCase()
  return ['new', 'triage', 'contained', 'resolved', 'false_positive'].includes(status)
    ? status
    : 'new'
}

function normalizeCaseTimelineEntry(entry, fallbackTimestamp, index) {
  if (!entry) return null
  const title = textOrEmpty(entry.title || entry.label)
  const copy = textOrEmpty(entry.copy || entry.note || entry.message || entry.description)
  if (!title && !copy) return null

  return {
    id: textOrEmpty(entry.id) || `case-entry-${fallbackTimestamp}-${index}`,
    type: textOrEmpty(entry.type) || 'note',
    title: title || 'Nota registrada',
    copy,
    actor: textOrEmpty(entry.actor) || 'Thorondor',
    tone: textOrEmpty(entry.tone) || 'timeline-info',
    timestamp: textOrEmpty(entry.timestamp || entry.createdAt || entry.updatedAt) || fallbackTimestamp,
    pinned: Boolean(entry.pinned),
  }
}

function normalizeThorondorCase(caseItem, fallbackAgentId = '') {
  if (!caseItem) return null
  const now = new Date().toISOString()
  const id = textOrEmpty(caseItem.id) || `case-${Date.now()}`
  const agentId = textOrEmpty(caseItem.agentId || fallbackAgentId)
  if (!agentId) return null

  const createdAt = textOrEmpty(caseItem.createdAt) || now
  const initialNote = textOrEmpty(caseItem.note)
  const timeline = (Array.isArray(caseItem.timeline) ? caseItem.timeline : [])
    .map((entry, index) => normalizeCaseTimelineEntry(entry, createdAt, index))
    .filter(Boolean)

  if (!timeline.some((entry) => entry.type === 'created')) {
    timeline.unshift({
      id: `${id}-created`,
      type: 'created',
      title: 'Caso creado',
      copy: 'Investigacion abierta para este host.',
      actor: 'Thorondor',
      tone: 'timeline-info',
      timestamp: createdAt,
    })
  }

  if (initialNote && !timeline.some((entry) => entry.id === `${id}-initial-note`)) {
    timeline.push({
      id: `${id}-initial-note`,
      type: 'note',
      title: 'Nota inicial',
      copy: initialNote,
      actor: textOrEmpty(caseItem.owner) || 'Operador',
      tone: 'timeline-note',
      timestamp: createdAt,
    })
  }

  const legacyNotes = Array.isArray(caseItem.notes) ? caseItem.notes : []
  legacyNotes.forEach((note, index) => {
    const normalized = normalizeCaseTimelineEntry(
      typeof note === 'string' ? { copy: note, title: 'Nota' } : note,
      createdAt,
      index,
    )
    if (normalized && !timeline.some((entry) => entry.id === normalized.id)) {
      timeline.push({
        ...normalized,
        type: normalized.type || 'note',
        tone: normalized.tone || 'timeline-note',
      })
    }
  })

  return {
    ...caseItem,
    id,
    agentId,
    title: textOrEmpty(caseItem.title) || 'Investigacion del host',
    status: normalizeCaseStatus(caseItem.status),
    severity: normalizeCaseSeverity(caseItem.severity),
    owner: textOrEmpty(caseItem.owner),
    summary: textOrEmpty(caseItem.summary),
    note: initialNote,
    alerts: Array.isArray(caseItem.alerts) ? caseItem.alerts.filter(Boolean) : [],
    evidence: Array.isArray(caseItem.evidence) ? caseItem.evidence.filter(Boolean) : [],
    tasks: (Array.isArray(caseItem.tasks) ? caseItem.tasks : []).map((task, index) => ({
      id: textOrEmpty(task.id) || `task-${index + 1}`,
      label: textOrEmpty(task.label || task.title) || 'Tarea pendiente',
      done: Boolean(task.done),
    })),
    timeline: timeline.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))),
    createdAt,
    updatedAt: textOrEmpty(caseItem.updatedAt) || createdAt,
  }
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

function buildAnonymousThorondorSession() {
  return {
    authenticated: false,
    user: null,
    providers: [],
  }
}

function isThorondorUserAuthorizedForCloudPersistence(user) {
  return Boolean(user?.canUseCloudPersistence || user?.usuarioAutorizado || user?.usuario_autorizado)
}

function isThorondorUserAdmin(user) {
  return Boolean(
    user?.usuarioAdmin ||
      user?.usuario_admin ||
      user?.isAdmin ||
      user?.is_admin ||
      user?.admin,
  )
}

function disableThorondorCloudPersistence(reason) {
  setThorondorCloudPersistenceAccess(false, reason)
  saveThorondorPersistenceMode('local')
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
  const authorized = isThorondorUserAuthorizedForCloudPersistence(session?.user)

  if (!authenticated) {
    disableThorondorCloudPersistence('Inicia sesión para usar BBDD por API.')
    return
  }

  if (!hasThorondorApiToken(token)) {
    disableThorondorCloudPersistence('Token JWT requerido para usar BBDD por API.')
    return
  }

  if (!authorized) {
    disableThorondorCloudPersistence('Un usuario admin debe autorizar esta cuenta para usar BBDD por API.')
    return
  }

  setThorondorCloudPersistenceAccess(true, '')
}

function requireThorondorApiToken(state) {
  if (hasThorondorApiToken(state.thorondor.token)) {
    return true
  }

  throw new Error('Token JWT requerido para usar servicios de monitorización.')
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
      state.thorondor.smartResponses = normalizeThorondorSmartResponses(
        payload.smartResponses || [],
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

    updateThorondorAgent(state, agent) {
      const source = agent || {}
      const agentId = source.id || source.agentId
      if (!agentId) return

      const index = state.thorondor.agents.findIndex((item) => item.id === agentId)
      const existing = index >= 0 ? state.thorondor.agents[index] : {}
      const record = normalizeAgentRecord({
        ...existing,
        ...source,
        id: agentId,
        updatedAt: new Date().toISOString(),
      })

      if (index >= 0) {
        state.thorondor.agents.splice(index, 1, record)
      } else {
        state.thorondor.agents.push(record)
      }
      state.thorondor.requestRulesByAgent[record.id] = buildThorondorRequestRules(record)
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
      state.thorondor.smartResponses = state.thorondor.smartResponses.filter(
        (policy) => policy.scope !== agentId,
      )
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
        const detectedModules =
          telemetry?.agent?.modules && typeof telemetry.agent.modules === 'object'
            ? { ...telemetry.agent.modules }
            : state.thorondor.agents[agentIndex].modules
        state.thorondor.agents.splice(agentIndex, 1, {
          ...state.thorondor.agents[agentIndex],
          modules: detectedModules,
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
        let lastStatus = state.thorondor.agents[agentIndex].lastStatus
        if (payload.kind === 'success') {
          lastStatus = 'ok'
        } else if (payload.kind === 'error') {
          lastStatus = 'error'
        } else if (payload.kind === 'paused') {
          lastStatus = 'paused'
        } else if (payload.kind === 'resumed') {
          lastStatus = state.thorondor.agents[agentIndex].lastHeartbeatAt ? 'ok' : ''
        }

        state.thorondor.agents.splice(agentIndex, 1, {
          ...state.thorondor.agents[agentIndex],
          lastStatus,
          lastError: payload.kind === 'error' ? payload.error || null : null,
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

    updateThorondorSmartResponse(state, policy) {
      const record = {
        ...policy,
        id: policy.id || `smart-response-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      }
      const index = state.thorondor.smartResponses.findIndex((item) => item.id === record.id)
      if (index >= 0) {
        state.thorondor.smartResponses.splice(index, 1, {
          ...state.thorondor.smartResponses[index],
          ...record,
        })
      } else {
        state.thorondor.smartResponses.push({
          createdAt: new Date().toISOString(),
          ...record,
        })
      }
      state.thorondor.smartResponses = normalizeThorondorSmartResponses(
        state.thorondor.smartResponses,
        state.thorondor.agents,
      )
    },

    removeThorondorSmartResponse(state, policyId) {
      state.thorondor.smartResponses = state.thorondor.smartResponses.filter(
        (item) => item.id !== policyId,
      )
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
      const subject = payload.ip || payload.user || payload.subject || payload.group || 'accion'
      state.thorondor.responseActions.unshift({
        id: `${payload.agentId}-${payload.action}-${subject}-${Date.now()}`,
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
      const record = normalizeThorondorCase(
        {
          ...payload,
          updatedAt: new Date().toISOString(),
        },
        payload.agentId,
      )
      if (!record) return

      if (index >= 0) {
        const merged = normalizeThorondorCase({
          ...cases[index],
          ...record,
        })
        cases.splice(index, 1, merged)
      } else {
        cases.unshift(normalizeThorondorCase({
          createdAt: new Date().toISOString(),
          status: 'new',
          severity: 'medium',
          alerts: [],
          notes: [],
          tasks: [],
          ...record,
        }))
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
          smartResponses: buildDefaultThorondorSmartResponses(),
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

    async updateThorondorKeyAgents({ commit, state }, payload) {
      const updatedUser = await requestThorondorKeyAgentsUpdate(payload)
      const session = {
        ...(state.thorondor.session || buildAnonymousThorondorSession()),
        authenticated: true,
        user: updatedUser,
      }
      saveThorondorSession(session)
      configureThorondorCloudAccess(session, state.thorondor.token)
      commit('setThorondorSession', session)
      commit('setThorondorPersistenceStatus', getThorondorPersistenceStatus())
      return updatedUser
    },

    async logoutThorondorSession({ commit }) {
      const anonymousSession = buildAnonymousThorondorSession()
      let session = anonymousSession

      try {
        session = (await requestThorondorLogout()) || anonymousSession
      } catch (error) {
        saveThorondorSession(anonymousSession)
        commit('pushThorondorError', `No se pudo cerrar la sesión remota: ${error.message}`)
      }

      clearThorondorJwtToken()
      configureThorondorCloudAccess(session, null)
      commit('setThorondorSession', session)
      commit('setThorondorToken', null)
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

      if (!isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user)) {
        disableThorondorCloudPersistence(
          'Un usuario admin debe autorizar esta cuenta para usar BBDD por API.',
        )
        commit('setThorondorPersistenceStatus', getThorondorPersistenceStatus())
        commit('setThorondorCentralStatus', {
          status: 'auth-required',
          lastError: 'Usuario no autorizado para usar BBDD por API.',
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

      if (
        nextMode === 'cloud' &&
        (
          !isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user) ||
          !hasThorondorApiToken(state.thorondor.token) ||
          !state.thorondor.persistence?.cloudAllowed
        )
      ) {
        disableThorondorCloudPersistence(
          'Un usuario admin debe autorizar esta cuenta para usar BBDD por API.',
        )
        const fallbackStatus = getThorondorPersistenceStatus({
          syncStatus: 'cloud-blocked',
        })
        commit('setThorondorPersistenceStatus', fallbackStatus)
        return fallbackStatus
      }

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

    async updateThorondorAgentConnection({ commit, state }, payload) {
      const agentId = payload?.agentId || payload?.id
      const existing = state.thorondor.agents.find((item) => item.id === agentId)
      if (!existing) {
        throw new Error('Agente no encontrado')
      }

      const port = Number(payload.port || existing.port) || THORONDOR_AGENT_FIXED_PORT
      if (port < 1 || port > 65535) {
        throw new Error('Puerto del agente no valido')
      }

      const hostIp = String(payload.hostIp || payload.ipAddress || payload.ip || existing.hostIp || '').trim()
      if (!hostIp) {
        throw new Error('IP o DNS del agente requerido')
      }

      const nextKeyAgents = String(
        payload.keyAgents || payload.key_agents || payload.agentToken || existing.keyAgents || existing.agentToken || '',
      ).trim()
      const receiverUrl = buildAgentReceiverUrl(hostIp, port, payload.receiverUrl || existing.receiverUrl)
      const payloadHasPauseFlag = [
        'siemPaused',
        'siem_paused',
        'pollingPaused',
        'polling_paused',
        'monitoringPaused',
        'paused',
      ].some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key))
      const siemPaused = payloadHasPauseFlag
        ? isThorondorAgentPaused(payload)
        : isThorondorAgentPaused(existing)
      const record = normalizeAgentRecord({
        ...existing,
        ...payload,
        id: existing.id,
        hostIp,
        port,
        receiverUrl,
        keyAgents: nextKeyAgents,
        agentToken: nextKeyAgents,
        alertsPaused: Object.prototype.hasOwnProperty.call(payload || {}, 'alertsPaused')
          ? Boolean(payload.alertsPaused)
          : existing.alertsPaused,
        alertsPausedUntil: payload.alertsPausedUntil ?? existing.alertsPausedUntil,
        maintenanceReason: payload.maintenanceReason ?? existing.maintenanceReason,
        siemPaused,
        pollingPaused: siemPaused,
        updatedAt: new Date().toISOString(),
      })

      commit('updateThorondorAgent', record)
      await Promise.all([
        putOne(STORE_NAMES.agents, record),
        putMany(STORE_NAMES.history, state.thorondor.connectionHistoryByAgent[record.id] || []),
      ])

      const shouldUpdateCentral =
        isThorondorCentralConfigured()
        && hasThorondorApiToken(state.thorondor.token)
        && isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user)

      if (shouldUpdateCentral) {
        try {
          const remote = await updateThorondorCentralAgent(existing.id, {
            hostIp,
            port,
            receiverUrl,
            siemPaused: record.siemPaused,
            pollingPaused: record.siemPaused,
            alertsPaused: record.alertsPaused,
            alertsPausedUntil: record.alertsPausedUntil,
            maintenanceReason: record.maintenanceReason,
            ...(nextKeyAgents ? { keyAgents: nextKeyAgents } : {}),
          })
          const merged = normalizeAgentRecord({
            ...record,
            ...remote,
            keyAgents: nextKeyAgents,
            agentToken: nextKeyAgents,
          })
          commit('updateThorondorAgent', merged)
          await putOne(STORE_NAMES.agents, merged)
          return merged
        } catch (error) {
          commit('pushThorondorError', `No se pudo actualizar el agente en la API central: ${error.message}`)
          throw error
        }
      }

      return record
    },

    async setThorondorAgentPaused({ commit, state }, payload) {
      const agentId = payload?.agentId || payload?.id
      const existing = state.thorondor.agents.find((item) => item.id === agentId)
      if (!existing) {
        throw new Error('Agente no encontrado')
      }

      const paused = Boolean(payload?.paused ?? payload?.siemPaused ?? payload?.pollingPaused)
      const record = normalizeAgentRecord({
        ...existing,
        siemPaused: paused,
        pollingPaused: paused,
        lastStatus: paused ? 'paused' : (existing.lastStatus === 'paused' ? '' : existing.lastStatus),
        lastError: null,
        updatedAt: new Date().toISOString(),
      })

      commit('updateThorondorAgent', record)
      commit('recordThorondorConnection', {
        agentId: record.id,
        timestamp: new Date().toISOString(),
        kind: paused ? 'paused' : 'resumed',
        endpoint: record.receiverUrl,
        message: paused
          ? 'SIEM pausado desde la consola. No se harán peticiones al host.'
          : 'SIEM reanudado desde la consola.',
      })
      await Promise.all([
        putOne(STORE_NAMES.agents, record),
        putMany(STORE_NAMES.history, state.thorondor.connectionHistoryByAgent[record.id] || []),
      ])

      const shouldUpdateCentral =
        isThorondorCentralConfigured()
        && hasThorondorApiToken(state.thorondor.token)
        && isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user)

      if (shouldUpdateCentral) {
        try {
          const remote = await updateThorondorCentralAgent(record.id, {
            siemPaused: paused,
            pollingPaused: paused,
          })
          const merged = normalizeAgentRecord({
            ...record,
            ...remote,
            siemPaused: paused,
            pollingPaused: paused,
          })
          commit('updateThorondorAgent', merged)
          await putOne(STORE_NAMES.agents, merged)
          return merged
        } catch (error) {
          commit('pushThorondorError', `No se pudo actualizar la pausa del agente en la API central: ${error.message}`)
          throw error
        }
      }

      return record
    },

    async setThorondorAgentMaintenance({ commit, state }, payload) {
      const agentId = payload?.agentId || payload?.id
      const existing = state.thorondor.agents.find((item) => item.id === agentId)
      if (!existing) {
        throw new Error('Agente no encontrado')
      }

      const minutes = Math.max(0, Number(payload?.minutes) || 0)
      const explicitUntil = String(payload?.alertsPausedUntil || '').trim()
      const alertsPaused = Boolean(payload?.alertsPaused ?? payload?.enabled ?? (minutes > 0 || Boolean(explicitUntil)))
      const alertsPausedUntil = alertsPaused
        ? explicitUntil || new Date(Date.now() + Math.max(minutes, 15) * 60000).toISOString()
        : ''
      const maintenanceReason = alertsPaused
        ? String(payload?.maintenanceReason || payload?.reason || 'Ventana de mantenimiento').trim()
        : ''

      const record = normalizeAgentRecord({
        ...existing,
        alertsPaused,
        alertsPausedUntil,
        maintenanceReason,
        updatedAt: new Date().toISOString(),
      })

      commit('updateThorondorAgent', record)
      commit('recordThorondorConnection', {
        agentId: record.id,
        timestamp: new Date().toISOString(),
        kind: alertsPaused ? 'maintenance' : 'maintenance-ended',
        endpoint: record.receiverUrl,
        message: alertsPaused
          ? `Alertas pausadas hasta ${alertsPausedUntil}.`
          : 'Alertas reanudadas desde la consola.',
      })

      await Promise.all([
        putOne(STORE_NAMES.agents, record),
        putMany(STORE_NAMES.history, state.thorondor.connectionHistoryByAgent[record.id] || []),
      ])

      const shouldUpdateCentral =
        isThorondorCentralConfigured()
        && hasThorondorApiToken(state.thorondor.token)
        && isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user)

      if (shouldUpdateCentral) {
        try {
          const remote = await updateThorondorCentralAgent(record.id, {
            alertsPaused,
            alertsPausedUntil,
            maintenanceReason,
          })
          const merged = normalizeAgentRecord({
            ...record,
            ...remote,
            alertsPaused,
            alertsPausedUntil,
            maintenanceReason,
          })
          commit('updateThorondorAgent', merged)
          await putOne(STORE_NAMES.agents, merged)
          return merged
        } catch (error) {
          commit('pushThorondorError', `No se pudo actualizar el mantenimiento en la API central: ${error.message}`)
          throw error
        }
      }

      return record
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
            lastError: 'Token JWT requerido para monitorizar agentes.',
          })
          return false
        }

        const shouldUseCentral =
          state.thorondor.persistence?.effectiveMode === 'cloud'
          && isThorondorCentralConfigured()
          && isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user)

        if (shouldUseCentral) {
          await dispatch('syncThorondorCentralConsole')
          return true
        }

        commit('setThorondorCentralStatus', {
          status: 'local',
          lastError: '',
        })

        const agents = [...state.thorondor.agents]
        if (!agents.length) return false

        let successCount = 0

        for (const agent of agents) {
          if (isThorondorAgentPaused(agent)) {
            if (agent.lastStatus !== 'paused' || agent.lastError) {
              commit('updateThorondorAgent', {
                ...agent,
                lastStatus: 'paused',
                lastError: null,
                updatedAt: new Date().toISOString(),
              })
              await putOne(STORE_NAMES.agents, state.thorondor.agents.find((item) => item.id === agent.id) || agent)
            }
            continue
          }

          try {
            const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
            const telemetry = await fetchThorondorTelemetry(agent)
            const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
            telemetry.__request = {
              latencyMs: Math.max(0, Math.round(finishedAt - startedAt)),
              endpoint: agent.receiverUrl || agent.hostIp || '',
            }
            commit('ingestThorondorTelemetry', {
              agentId: agent.id,
              telemetry,
            })
            commit('recordThorondorConnection', {
              agentId: agent.id,
              timestamp: new Date().toISOString(),
              kind: 'success',
              endpoint: agent.receiverUrl,
              message: 'Polling local correcto.',
            })

            const currentAgent = state.thorondor.agents.find((item) => item.id === agent.id) || agent
            if (!isThorondorAgentAlertsPaused(currentAgent)) {
              const alerts = evaluateThorondorRules({
                agent: currentAgent,
                rules: state.thorondor.rules,
                snapshots: state.thorondor.snapshotsByAgent[agent.id] || [],
                securityEvents: state.thorondor.securityEventsByAgent[agent.id] || [],
              })
              if (alerts.length) {
                commit('upsertThorondorAlerts', alerts)
                await dispatch('persistThorondorAlerts')
              }

              await dispatch('evaluateThorondorSmartResponsesForAgent', agent.id)
            }

            await dispatch('persistThorondorAgentData', agent.id)
            successCount += 1
          } catch (error) {
            const details = normalizeErrorDetails(error)
            commit('recordThorondorConnection', {
              agentId: agent.id,
              timestamp: new Date().toISOString(),
              kind: 'error',
              endpoint: details.endpoint || agent.receiverUrl,
              error: details.message,
              detail: details.detail,
              statusCode: details.status,
              hints: details.hints,
            })
            await dispatch('persistThorondorAgentData', agent.id)
          }
        }

        return successCount > 0
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
        throw new Error('API central requerida para consultar bloqueos con validación JWT.')
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
      if (isThorondorAgentPaused(agent)) {
        throw new Error('El SIEM de este agente está pausado. Reanúdalo antes de encolar acciones sobre el host.')
      }

      requireThorondorApiToken(state)

      if (!isThorondorCentralConfigured()) {
        throw new Error('API central requerida para bloquear IPs con validación JWT.')
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
      if (isThorondorAgentPaused(agent)) {
        throw new Error('El SIEM de este agente está pausado. Reanúdalo antes de encolar acciones sobre el host.')
      }

      requireThorondorApiToken(state)

      if (!isThorondorCentralConfigured()) {
        throw new Error('API central requerida para desbloquear IPs con validación JWT.')
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

    async executeThorondorSafeAction({ state, commit, dispatch }, payload) {
      const targetAgentId = payload?.agentId || state.thorondor.selectedAgentId
      const agent = state.thorondor.agents.find((item) => item.id === targetAgentId)
      if (!agent) {
        throw new Error('Agente no encontrado')
      }
      if (isThorondorAgentPaused(agent)) {
        throw new Error('El SIEM de este agente está pausado. Reanúdalo antes de encolar acciones sobre el host.')
      }

      requireThorondorApiToken(state)

      if (!isThorondorUserAdmin(state.thorondor.session?.user)) {
        throw new Error('Solo un usuario admin puede ejecutar acciones seguras sobre el host.')
      }

      const commandType = String(payload?.type || '').trim()
      const allowedTypes = [
        'block-ip',
        'unblock-ip',
        'restart-service',
        'collect-logs',
        'list-connected-users',
        'terminate-user-session',
        'check-host-health',
        'set-host-baseline',
      ]
      if (!allowedTypes.includes(commandType)) {
        throw new Error('Acción segura no soportada.')
      }

      if (!isThorondorCentralConfigured()) {
        const response = await executeThorondorAgentSafeAction(agent, {
          ...payload,
          type: commandType,
          reason: payload.reason || 'Acción segura desde Thorondor',
        })
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: commandType,
          subject: payload.ip || payload.serviceName || payload.username || 'host',
          ok: response?.ok !== false,
          message: response?.message || 'Acción segura ejecutada.',
          detail: response?.error || response?.stderr || response?.stdout || '',
        })
        return response
      }

      try {
        const command = await createThorondorCentralCommand(agent.id, {
          type: commandType,
          requestedBy: 'frontend',
          reason: payload.reason || 'Acción segura desde Thorondor',
          payload: {
            ip: payload.ip || '',
            serviceName: payload.serviceName || '',
            username: payload.username || '',
            sessionId: payload.sessionId || '',
            reason: payload.reason || 'Acción segura desde Thorondor',
          },
        })
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: commandType,
          subject: payload.ip || payload.serviceName || payload.username || 'host',
          ok: true,
          message: 'Acción segura encolada en el back central.',
          detail: command.id,
        })
        await dispatch('syncThorondorCentralConsole')
        return {
          ok: true,
          queued: true,
          command,
          message: 'Acción segura encolada. El agente la ejecutará al consultar la cola.',
        }
      } catch (error) {
        const details = normalizeErrorDetails(error)
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: commandType,
          subject: payload.ip || payload.serviceName || payload.username || 'host',
          ok: false,
          message: details.message,
          detail: details.detail,
        })
        throw error
      }
    },

    async manageThorondorUserAccount({ state, commit, dispatch }, payload) {
      const targetAgentId = payload?.agentId || state.thorondor.selectedAgentId
      const agent = state.thorondor.agents.find((item) => item.id === targetAgentId)
      if (!agent) {
        throw new Error('Agente no encontrado')
      }
      if (isThorondorAgentPaused(agent)) {
        throw new Error('El SIEM de este agente está pausado. Reanúdalo antes de gestionar usuarios del host.')
      }

      requireThorondorApiToken(state)

      if (!isThorondorUserAdmin(state.thorondor.session?.user)) {
        throw new Error('Solo un usuario admin puede gestionar usuarios del host.')
      }

      if (!isThorondorCentralConfigured()) {
        throw new Error('API central requerida para gestionar usuarios con validación JWT.')
      }

      const commandType = String(payload?.type || '').trim()
      const username = String(payload?.username || '').trim()
      const group = String(payload?.group || '').trim()
      const endpoint = `/thorondor/api/console/agents/${agent.id}/commands`

      if (!commandType) {
        throw new Error('Tipo de operación requerido.')
      }

      if (commandType !== 'refresh-user-inventory' && !username) {
        throw new Error('Usuario requerido.')
      }

      if (['add-user-to-group', 'remove-user-from-group'].includes(commandType) && !group) {
        throw new Error('Grupo requerido.')
      }

      try {
        const command = await createThorondorCentralCommand(agent.id, {
          type: commandType,
          requestedBy: 'frontend',
          reason: payload.reason || 'gestión de usuarios',
          payload: {
            username,
            group,
            reason: payload.reason || 'gestión de usuarios',
          },
        })
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: commandType,
          subject: username || 'inventario',
          user: username,
          group,
          ok: true,
          message: 'Comando de usuario encolado en el back central.',
          detail: command.id,
        })
        await dispatch('syncThorondorCentralConsole')
        return {
          ok: true,
          queued: true,
          command,
          message: 'Comando de usuario encolado. El agente lo ejecutará al consultar la cola.',
        }
      } catch (error) {
        const details = normalizeErrorDetails(error)
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: commandType,
          subject: username || 'inventario',
          user: username,
          group,
          ok: false,
          message: details.message,
          detail: details.detail,
        })
        throw error
      }
    },

    async manageThorondorService({ state, commit, dispatch }, payload) {
      const targetAgentId = payload?.agentId || state.thorondor.selectedAgentId
      const agent = state.thorondor.agents.find((item) => item.id === targetAgentId)
      if (!agent) {
        throw new Error('Agente no encontrado')
      }
      if (isThorondorAgentPaused(agent)) {
        throw new Error('El SIEM de este agente está pausado. Reanúdalo antes de gestionar servicios del host.')
      }

      requireThorondorApiToken(state)

      if (!isThorondorUserAdmin(state.thorondor.session?.user)) {
        throw new Error('Solo un usuario admin puede gestionar servicios del host.')
      }

      const commandType = String(payload?.type || '').trim()
      const serviceName = String(payload?.serviceName || payload?.name || '').trim()

      if (!['refresh-service-inventory', 'start-service', 'stop-service', 'restart-service'].includes(commandType)) {
        throw new Error('Tipo de operación de servicio no soportado.')
      }

      if (commandType !== 'refresh-service-inventory' && !serviceName) {
        throw new Error('Servicio requerido.')
      }

      if (isThorondorCentralConfigured()) {
        try {
          const command = await createThorondorCentralCommand(agent.id, {
            type: commandType,
            requestedBy: 'frontend',
            reason: payload.reason || 'gestión de servicios',
            payload: {
              serviceName,
              reason: payload.reason || 'gestión de servicios',
            },
          })
          commit('recordThorondorResponseAction', {
            agentId: agent.id,
            agentName: agent.displayName,
            action: commandType,
            subject: serviceName || 'inventario de servicios',
            ok: true,
            message: 'Comando de servicio encolado en el back central.',
            detail: command.id,
          })
          await dispatch('syncThorondorCentralConsole')
          return {
            ok: true,
            queued: true,
            command,
            message: 'Comando de servicio encolado. El agente lo ejecutará al consultar la cola.',
          }
        } catch (error) {
          const details = normalizeErrorDetails(error)
          commit('recordThorondorResponseAction', {
            agentId: agent.id,
            agentName: agent.displayName,
            action: commandType,
            subject: serviceName || 'inventario de servicios',
            ok: false,
            message: details.message,
            detail: details.detail,
          })
          throw error
        }
      }

      try {
        const response = await manageThorondorAgentService(agent, {
          type: commandType,
          serviceName,
          reason: payload.reason || 'gestión de servicios',
        })
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: commandType,
          subject: serviceName || 'inventario de servicios',
          ok: response?.ok !== false,
          message: response?.message || 'Operación de servicio ejecutada.',
          detail: response?.stderr || response?.stdout || '',
        })
        return response
      } catch (error) {
        const details = normalizeErrorDetails(error)
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: commandType,
          subject: serviceName || 'inventario de servicios',
          ok: false,
          message: details.message,
          detail: details.detail,
        })
        throw error
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

    async persistThorondorSmartResponses({ state }) {
      await setMeta('smartResponses', state.thorondor.smartResponses || [])
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

    async saveThorondorSmartResponse({ commit, state, dispatch }, policy) {
      const normalized = normalizeThorondorSmartResponses([policy], state.thorondor.agents)[0]
      let saved = normalized

      const shouldSyncCentral =
        isThorondorCentralConfigured()
        && hasThorondorApiToken(state.thorondor.token)
        && isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user)

      if (shouldSyncCentral) {
        saved = await requestSaveThorondorSmartResponse(normalized)
      }

      commit('updateThorondorSmartResponse', saved)
      await dispatch('persistThorondorSmartResponses')
      return saved
    },

    async deleteThorondorSmartResponse({ commit, state, dispatch }, policyId) {
      const shouldSyncCentral =
        isThorondorCentralConfigured()
        && hasThorondorApiToken(state.thorondor.token)
        && isThorondorUserAuthorizedForCloudPersistence(state.thorondor.session?.user)

      if (shouldSyncCentral) {
        await requestDeleteThorondorSmartResponse(policyId)
      }

      commit('removeThorondorSmartResponse', policyId)
      await dispatch('persistThorondorSmartResponses')
    },

    async executeThorondorSmartResponse({ state, commit, dispatch }, match) {
      const agentId = match?.agentId || state.thorondor.selectedAgentId
      const agent = state.thorondor.agents.find((item) => item.id === agentId)
      if (!agent) {
        throw new Error('Agente no encontrado')
      }

      const actionType = match?.actionType || 'create-alert'
      const subject = String(match?.subject || match?.sourceIp || match?.username || '').trim()
      const reason = match?.reason || 'Respuesta inteligente de Thorondor'
      if (isThorondorAgentPaused(agent) && actionType !== 'create-alert') {
        throw new Error('El SIEM de este agente está pausado. Reanúdalo antes de ejecutar respuestas sobre el host.')
      }

      try {
        let result = null

        if (actionType === 'create-alert') {
          const alert = {
            id: `smart-${match.id || `${agent.id}-${Date.now()}`}`,
            agentId: agent.id,
            ruleId: match.policyId,
            type: 'smart_response',
            typeLabel: 'Respuesta inteligente',
            name: match.policyName || 'Respuesta inteligente',
            severity: match.severity || 'danger',
            description: reason,
            status: 'active',
            count: match.count || 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          commit('upsertThorondorAlerts', [alert])
          await dispatch('persistThorondorAlerts')
          result = { ok: true, alert }
        } else if (actionType === 'block-ip') {
          if (!match.sourceIp && !subject) {
            throw new Error('La politica no ha detectado una IP bloqueable.')
          }
          result = await dispatch('blockThorondorIp', {
            agentId: agent.id,
            ip: match.sourceIp || subject,
            reason,
          })
        } else if (actionType === 'lock-user') {
          if (!match.username && !subject) {
            throw new Error('La politica no ha detectado un usuario bloqueable.')
          }
          result = await dispatch('manageThorondorUserAccount', {
            agentId: agent.id,
            type: 'lock-user',
            username: match.username || subject,
            reason,
          })
        } else if (['collect-telemetry', 'collect-logs'].includes(actionType)) {
          requireThorondorApiToken(state)
          if (!isThorondorCentralConfigured()) {
            throw new Error('API central requerida para encolar respuestas inteligentes.')
          }
          const command = await createThorondorCentralCommand(agent.id, {
            type: actionType,
            requestedBy: 'smart-response',
            reason,
            payload: {
              policyId: match.policyId,
              subject,
              sourceIp: match.sourceIp || '',
              username: match.username || '',
              reason,
            },
          })
          await dispatch('syncThorondorCentralConsole')
          result = { ok: true, queued: true, command }
        } else {
          throw new Error(`Acción inteligente no soportada: ${actionType}`)
        }

        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: `smart:${actionType}`,
          policyId: match.policyId,
          policyName: match.policyName,
          subject,
          ip: match.sourceIp || '',
          user: match.username || '',
          ok: true,
          message: `${smartActionLabel(actionType)} ejecutada por respuesta inteligente.`,
          detail: result?.command?.id || result?.alert?.id || result?.message || '',
        })
        return result
      } catch (error) {
        commit('recordThorondorResponseAction', {
          agentId: agent.id,
          agentName: agent.displayName,
          action: `smart:${actionType}`,
          policyId: match.policyId,
          policyName: match.policyName,
          subject,
          ip: match.sourceIp || '',
          user: match.username || '',
          ok: false,
          message: error.message,
          detail: '',
        })
        throw error
      }
    },

    async evaluateThorondorSmartResponsesForAgent({ state, dispatch }, agentId) {
      const agent = state.thorondor.agents.find((item) => item.id === agentId)
      if (!agent) return []
      if (isThorondorAgentPaused(agent)) return []
      if (isThorondorAgentAlertsPaused(agent)) return []

      const matches = evaluateThorondorSmartResponses({
        agent,
        policies: state.thorondor.smartResponses,
        securityEvents: state.thorondor.securityEventsByAgent[agent.id] || [],
        logs: state.thorondor.logsByAgent[agent.id] || [],
        responseActions: state.thorondor.responseActions,
      })

      for (const match of matches) {
        if (!match.autoExecute || match.inCooldown) continue
        try {
          await dispatch('executeThorondorSmartResponse', match)
        } catch {
          // La accion queda auditada en responseActions; el polling no debe quedar bloqueado.
        }
      }

      return matches
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
