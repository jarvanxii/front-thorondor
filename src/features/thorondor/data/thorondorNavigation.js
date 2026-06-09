export const THORONDOR_TOP_NAV_ITEMS = [
  { label: 'Inicio', routeName: 'thorondor-information' },
  { label: 'Dashboard', routeName: 'thorondor-dashboard' },
  { label: 'Hosts', routeName: 'thorondor-agents' },
  { label: 'Eventos', routeName: 'thorondor-events' },
  { label: 'Instalación', routeName: 'thorondor-installation-guide' },
  { label: 'Generador', routeName: 'thorondor-agent-generator' },
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
      },
      {
        id: 'alerts',
        label: 'Alertas',
        routeName: 'thorondor-alerts',
        agentScoped: true,
        badge: 'Host',
      },
      {
        id: 'rules',
        label: 'Reglas',
        routeName: 'thorondor-monitorization-rules',
        agentScoped: true,
      },
    ],
  },
  {
    label: 'Respuesta e investigación',
    items: [
      {
        id: 'ip_blocks',
        label: 'Bloqueo de IPs',
        routeName: 'thorondor-ip-blocks',
        agentScoped: true,
      },
      {
        id: 'commands',
        label: 'Comandos ejecutados',
        routeName: 'thorondor-command-audit',
        agentScoped: true,
      },
      {
        id: 'cases',
        label: 'Casos',
        routeName: 'thorondor-cases',
        agentScoped: true,
        badge: 'IRIS',
      },
    ],
  },
]

export const THORONDOR_HOST_SCOPED_ROUTES = [
  'thorondor-host-detail',
  'thorondor-alerts',
  'thorondor-monitorization-rules',
  'thorondor-ip-blocks',
  'thorondor-command-audit',
  'thorondor-cases',
]

export const THORONDOR_HOST_ROUTE_LABELS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    routeName: 'thorondor-host-detail',
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
    id: 'ip_blocks',
    label: 'Bloqueo IPs',
    routeName: 'thorondor-ip-blocks',
  },
  {
    id: 'cases',
    label: 'Casos',
    routeName: 'thorondor-cases',
  },
]
