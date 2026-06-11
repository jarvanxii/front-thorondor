const DEFAULT_POLICY_SCOPE = 'all'
const SUSPICIOUS_HTTP_TYPES = new Set(['http_404', 'http_500', 'application_error'])
const INVALID_IP_VALUES = new Set(['', 'sin-ip', 'win', 'local', 'localhost', '127.0.0.1', '::1'])

export const THORONDOR_SMART_TRIGGER_TYPES = [
  {
    value: 'failed_logins_by_user',
    label: 'Accesos fallidos por usuario',
    copy: 'Agrupa fallos de autenticación por cuenta dentro de la ventana definida.',
  },
  {
    value: 'suspicious_requests_by_ip',
    label: 'Peticiones anómalas por IP',
    copy: 'Agrupa errores HTTP, rutas inexistentes y actividad repetida desde el mismo origen.',
  },
]

export const THORONDOR_SMART_ACTION_TYPES = [
  {
    value: 'create-alert',
    label: 'Crear alerta',
    copy: 'Registra una alerta sin ejecutar comandos en el agente.',
  },
  {
    value: 'block-ip',
    label: 'Bloquear IP',
    copy: 'Encola un bloqueo de firewall para el agente seleccionado.',
  },
  {
    value: 'collect-telemetry',
    label: 'Recolectar telemetría',
    copy: 'Pide al agente una recolección inmediata de estado.',
  },
  {
    value: 'collect-logs',
    label: 'Recolectar logs',
    copy: 'Pide al agente que recopile logs recientes para investigación.',
  },
  {
    value: 'lock-user',
    label: 'Bloquear usuario',
    copy: 'Encola el bloqueo de una cuenta local detectada en el host.',
  },
]

export function buildDefaultThorondorSmartResponses() {
  const now = new Date().toISOString()
  return [
    {
      id: 'smart-failed-logins-user',
      name: 'Bloqueo por accesos fallidos de usuario',
      description: 'Detecta varios accesos con contraseña errónea para una misma cuenta.',
      scope: DEFAULT_POLICY_SCOPE,
      triggerType: 'failed_logins_by_user',
      enabled: true,
      autoExecute: false,
      threshold: 5,
      durationMinutes: 10,
      cooldownMinutes: 30,
      actionType: 'lock-user',
      severity: 'danger',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'smart-suspicious-requests-ip',
      name: 'Bloqueo por peticiones anómalas desde IP',
      description: 'Detecta peticiones repetidas con errores HTTP desde una misma IP.',
      scope: DEFAULT_POLICY_SCOPE,
      triggerType: 'suspicious_requests_by_ip',
      enabled: true,
      autoExecute: false,
      threshold: 20,
      durationMinutes: 5,
      cooldownMinutes: 30,
      actionType: 'block-ip',
      severity: 'critical',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function createThorondorSmartResponseDraft(agentId = DEFAULT_POLICY_SCOPE) {
  const now = new Date().toISOString()
  return {
    id: '',
    name: '',
    description: '',
    scope: agentId || DEFAULT_POLICY_SCOPE,
    triggerType: 'failed_logins_by_user',
    enabled: true,
    autoExecute: false,
    threshold: 5,
    durationMinutes: 10,
    cooldownMinutes: 30,
    actionType: 'create-alert',
    severity: 'danger',
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeThorondorSmartResponses(policies, agents = []) {
  const source = Array.isArray(policies) && policies.length
    ? policies
    : buildDefaultThorondorSmartResponses()
  const validAgentIds = new Set((agents || []).map((agent) => agent.id).filter(Boolean))

  return source.map((policy, index) => {
    const now = new Date().toISOString()
    const scope = String(policy?.scope || DEFAULT_POLICY_SCOPE).trim()
    const normalizedScope = scope === DEFAULT_POLICY_SCOPE || validAgentIds.has(scope)
      ? scope
      : DEFAULT_POLICY_SCOPE
    const triggerType = THORONDOR_SMART_TRIGGER_TYPES.some((item) => item.value === policy?.triggerType)
      ? policy.triggerType
      : 'failed_logins_by_user'
    const actionType = THORONDOR_SMART_ACTION_TYPES.some((item) => item.value === policy?.actionType)
      ? policy.actionType
      : 'create-alert'

    return {
      id: String(policy?.id || `smart-response-${Date.now()}-${index}`),
      name: String(policy?.name || smartTriggerLabel(triggerType)).trim(),
      description: String(policy?.description || '').trim(),
      scope: normalizedScope,
      triggerType,
      enabled: policy?.enabled !== false,
      autoExecute: Boolean(policy?.autoExecute),
      threshold: Math.max(1, Number(policy?.threshold) || 1),
      durationMinutes: Math.max(1, Number(policy?.durationMinutes) || 5),
      cooldownMinutes: Math.max(1, Number(policy?.cooldownMinutes) || 30),
      actionType,
      severity: String(policy?.severity || 'danger').trim(),
      createdAt: policy?.createdAt || now,
      updatedAt: policy?.updatedAt || now,
    }
  })
}

export function evaluateThorondorSmartResponses({
  agent,
  policies,
  securityEvents = [],
  logs = [],
  responseActions = [],
  now = Date.now(),
}) {
  if (!agent?.id) return []

  const activePolicies = (policies || []).filter((policy) => {
    if (!policy?.enabled) return false
    return policy.scope === DEFAULT_POLICY_SCOPE || policy.scope === agent.id
  })

  return activePolicies.flatMap((policy) => {
    if (policy.triggerType === 'failed_logins_by_user') {
      return evaluateFailedLoginsByUser(policy, agent, securityEvents, responseActions, now)
    }
    if (policy.triggerType === 'suspicious_requests_by_ip') {
      return evaluateSuspiciousRequestsByIp(policy, agent, securityEvents, logs, responseActions, now)
    }
    return []
  })
}

export function smartTriggerLabel(type) {
  return THORONDOR_SMART_TRIGGER_TYPES.find((item) => item.value === type)?.label || type
}

export function smartActionLabel(type) {
  return THORONDOR_SMART_ACTION_TYPES.find((item) => item.value === type)?.label || type
}

function evaluateFailedLoginsByUser(policy, agent, events, responseActions, now) {
  const groups = new Map()
  recentEvents(events, policy.durationMinutes, now)
    .filter((event) => event.kind === 'failed_login' || event.type === 'failed_login')
    .forEach((event) => {
      const username = String(event.user || event.username || 'desconocido').trim()
      if (!username || username === 'desconocido') return
      const sourceIp = normalizeIp(event.sourceIp)
      const current = groups.get(username) || {
        subject: username,
        username,
        sourceIp,
        count: 0,
        lastTimestamp: event.timestamp,
        sources: new Map(),
      }
      current.count += 1
      current.lastTimestamp = maxIso(current.lastTimestamp, event.timestamp)
      if (sourceIp) {
        current.sources.set(sourceIp, (current.sources.get(sourceIp) || 0) + 1)
      }
      groups.set(username, current)
    })

  return Array.from(groups.values())
    .filter((group) => group.count >= policy.threshold)
    .map((group) => {
      const sourceIp = mostFrequent(group.sources) || group.sourceIp
      return buildMatch({
        policy,
        agent,
        subject: group.subject,
        username: group.username,
        sourceIp,
        count: group.count,
        lastTimestamp: group.lastTimestamp,
        reason: `${group.count} accesos fallidos para ${group.username} en ${policy.durationMinutes} min.`,
        responseActions,
        now,
      })
    })
    .filter(Boolean)
}

function evaluateSuspiciousRequestsByIp(policy, agent, events, logs, responseActions, now) {
  const groups = new Map()

  recentEvents(events, policy.durationMinutes, now)
    .filter((event) => SUSPICIOUS_HTTP_TYPES.has(event.kind || event.type))
    .forEach((event) => addIpHit(groups, event.sourceIp, event.timestamp, event.message))

  recentEvents(logs, policy.durationMinutes, now)
    .map(logToHttpSignal)
    .filter(Boolean)
    .forEach((event) => addIpHit(groups, event.sourceIp, event.timestamp, event.message))

  return Array.from(groups.values())
    .filter((group) => group.count >= policy.threshold)
    .map((group) =>
      buildMatch({
        policy,
        agent,
        subject: group.sourceIp,
        sourceIp: group.sourceIp,
        count: group.count,
        lastTimestamp: group.lastTimestamp,
        reason: `${group.count} peticiones anómalas desde ${group.sourceIp} en ${policy.durationMinutes} min.`,
        sample: group.sample,
        responseActions,
        now,
      }),
    )
    .filter(Boolean)
}

function buildMatch({
  policy,
  agent,
  subject,
  username = '',
  sourceIp = '',
  count,
  lastTimestamp,
  reason,
  sample = '',
  responseActions,
  now,
}) {
  const normalizedSubject = String(subject || sourceIp || username || '').trim()
  if (!normalizedSubject) return null

  return {
    id: `${policy.id}-${agent.id}-${normalizedSubject}`.replace(/[^a-zA-Z0-9_.-]/g, '-'),
    policyId: policy.id,
    policyName: policy.name,
    agentId: agent.id,
    agentName: agent.displayName || agent.id,
    triggerType: policy.triggerType,
    actionType: policy.actionType,
    autoExecute: Boolean(policy.autoExecute),
    severity: policy.severity,
    subject: normalizedSubject,
    username,
    sourceIp,
    count,
    threshold: policy.threshold,
    durationMinutes: policy.durationMinutes,
    cooldownMinutes: policy.cooldownMinutes,
    lastTimestamp: lastTimestamp || new Date(now).toISOString(),
    reason,
    sample,
    inCooldown: isInCooldown(policy, agent.id, normalizedSubject, responseActions, now),
  }
}

function recentEvents(items, durationMinutes, now) {
  const cutoff = now - Math.max(1, Number(durationMinutes) || 1) * 60000
  return (items || []).filter((item) => {
    const timestamp = new Date(item.timestamp || item.createdAt || item.updatedAt || 0).getTime()
    return Number.isFinite(timestamp) && timestamp >= cutoff
  })
}

function addIpHit(groups, value, timestamp, sample) {
  const sourceIp = normalizeIp(value)
  if (!sourceIp) return
  const current = groups.get(sourceIp) || {
    sourceIp,
    count: 0,
    lastTimestamp: timestamp,
    sample: '',
  }
  current.count += 1
  current.lastTimestamp = maxIso(current.lastTimestamp, timestamp)
  current.sample = current.sample || sample || ''
  groups.set(sourceIp, current)
}

function logToHttpSignal(log) {
  const message = String(log?.message || '')
  const sourceIp = normalizeIp(message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0] || '')
  if (!sourceIp) return null
  const status = Number(message.match(/"\s(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s[^"]*"\s(\d{3})\b/i)?.[1]
    || message.match(/\s(401|403|404|429|500|502|503)\s/)?.[1]
    || 0)
  if (![401, 403, 404, 429, 500, 502, 503].includes(status)) return null
  return {
    sourceIp,
    timestamp: log.timestamp,
    message,
  }
}

function normalizeIp(value) {
  const ip = String(value || '').trim().replace(/^\[(.*)\]$/, '$1')
  return INVALID_IP_VALUES.has(ip.toLowerCase()) ? '' : ip
}

function mostFrequent(map) {
  let selected = ''
  let max = 0
  map.forEach((count, key) => {
    if (count > max) {
      selected = key
      max = count
    }
  })
  return selected
}

function maxIso(left, right) {
  if (!left) return right || ''
  if (!right) return left
  return String(right).localeCompare(String(left)) > 0 ? right : left
}

function isInCooldown(policy, agentId, subject, responseActions, now) {
  const cutoff = now - Math.max(1, Number(policy.cooldownMinutes) || 1) * 60000
  return (responseActions || []).some((action) => {
    if (action.policyId !== policy.id) return false
    if (action.agentId !== agentId) return false
    if (String(action.subject || action.ip || action.user || '') !== subject) return false
    const timestamp = new Date(action.timestamp || action.createdAt || 0).getTime()
    return Number.isFinite(timestamp) && timestamp >= cutoff
  })
}
