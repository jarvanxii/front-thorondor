export const THORONDOR_TOP_NAV_ITEMS = [
  { label: 'Inicio', routeName: 'thorondor-information' },
  { label: 'Instalación', routeName: 'thorondor-installation-guide' },
  { label: 'Registro', routeName: 'thorondor-agent-registration' },
  { label: 'Dashboard', routeName: 'thorondor-dashboard' },
  { label: 'Eventos', routeName: 'thorondor-events' },
  { label: 'Agentes', routeName: 'thorondor-agents' },
]

export const THORONDOR_SIDEBAR_GROUPS = [
  {
    label: 'Host seleccionado',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard del host',
        routeName: 'thorondor-host-detail',
        agentScoped: true,
        query: { tab: 'overview' },
      },
      {
        id: 'logs',
        label: 'Logs',
        routeName: 'thorondor-host-detail',
        agentScoped: true,
        query: { tab: 'logs' },
      },
      {
        id: 'hardware',
        label: 'Hardware',
        routeName: 'thorondor-host-detail',
        agentScoped: true,
        query: { tab: 'hardware' },
      },
      {
        id: 'processes',
        label: 'Procesos',
        routeName: 'thorondor-host-detail',
        agentScoped: true,
        query: { tab: 'processes' },
      },
      {
        id: 'network',
        label: 'Red',
        routeName: 'thorondor-host-detail',
        agentScoped: true,
        query: { tab: 'network' },
      },
      {
        id: 'users',
        label: 'Usuarios',
        routeName: 'thorondor-host-detail',
        agentScoped: true,
        query: { tab: 'users' },
      },
      {
        id: 'commands',
        label: 'Comandos',
        routeName: 'thorondor-command-audit',
        agentScoped: true,
      },
      {
        id: 'alerts',
        label: 'Alertas',
        routeName: 'thorondor-alerts',
        agentScoped: true,
      },
      {
        id: 'rules',
        label: 'Reglas',
        routeName: 'thorondor-monitorization-rules',
        agentScoped: true,
      },
      {
        id: 'smart_response',
        label: 'Respuesta Inteligente',
        routeName: 'thorondor-smart-response',
        agentScoped: true,
      },
      {
        id: 'ip_blocks',
        label: 'Bloqueo de IPs',
        routeName: 'thorondor-ip-blocks',
        agentScoped: true,
      },
      {
        id: 'cases',
        label: 'Casos',
        routeName: 'thorondor-cases',
        agentScoped: true,
      },
    ],
  },
]

export const THORONDOR_HOST_SCOPED_ROUTES = [
  'thorondor-host-detail',
  'thorondor-alerts',
  'thorondor-monitorization-rules',
  'thorondor-smart-response',
  'thorondor-ip-blocks',
  'thorondor-command-audit',
  'thorondor-cases',
]

export const THORONDOR_HOST_ROUTE_LABELS = [
  {
    id: 'dashboard',
    label: 'Dashboard del host',
    routeName: 'thorondor-host-detail',
    query: { tab: 'overview' },
  },
  {
    id: 'logs',
    label: 'Logs',
    routeName: 'thorondor-host-detail',
    query: { tab: 'logs' },
  },
  {
    id: 'hardware',
    label: 'Hardware',
    routeName: 'thorondor-host-detail',
    query: { tab: 'hardware' },
  },
  {
    id: 'processes',
    label: 'Procesos',
    routeName: 'thorondor-host-detail',
    query: { tab: 'processes' },
  },
  {
    id: 'network',
    label: 'Red',
    routeName: 'thorondor-host-detail',
    query: { tab: 'network' },
  },
  {
    id: 'users',
    label: 'Usuarios',
    routeName: 'thorondor-host-detail',
    query: { tab: 'users' },
  },
  {
    id: 'commands',
    label: 'Comandos',
    routeName: 'thorondor-command-audit',
  },
  {
    id: 'alerts',
    label: 'Alertas',
    routeName: 'thorondor-alerts',
  },
  {
    id: 'rules',
    label: 'Reglas',
    routeName: 'thorondor-monitorization-rules',
  },
  {
    id: 'smart_response',
    label: 'Respuesta Inteligente',
    routeName: 'thorondor-smart-response',
  },
  {
    id: 'ip_blocks',
    label: 'Bloqueo de IPs',
    routeName: 'thorondor-ip-blocks',
  },
  {
    id: 'cases',
    label: 'Casos',
    routeName: 'thorondor-cases',
  },
]
