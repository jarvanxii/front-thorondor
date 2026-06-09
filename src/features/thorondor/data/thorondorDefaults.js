export const THORONDOR_RETENTION_DAYS = 7;
export const THORONDOR_ALERT_REVIEW_STATES = ["active", "reviewed", "resolved"];
export const THORONDOR_HEARTBEAT_WARNING_MINUTES = 2;
export const THORONDOR_HEARTBEAT_CRITICAL_MINUTES = 5;
export const THORONDOR_HISTORY_LIMIT = 240;
export const THORONDOR_SECURITY_LIMIT = 500;
export const THORONDOR_LOG_LIMIT = 800;
export const THORONDOR_CONNECTION_LIMIT = 120;

export const THORONDOR_IDB_SNAPSHOT_LIMIT = 500;
export const THORONDOR_IDB_LOG_LIMIT = 2000;
export const THORONDOR_IDB_EVENT_LIMIT = 1000;
export const THORONDOR_SWEEP_INTERVAL_MS = 3_600_000;

export const THORONDOR_MODULE_KEYS = [
  {
    key: "systemMetrics",
    label: "Métricas de sistema",
    description: "Recoge CPU, memoria, swap, discos, procesos, interfaces de red, puertos abiertos y datos base del sistema."
  },
  {
    key: "securityLogs",
    label: "Logs de seguridad",
    description: "Normaliza eventos de autenticación, fallos de login, accesos relevantes y señales de seguridad del sistema."
  },
  {
    key: "sudoCommands",
    label: "Comandos sudo",
    description: "Busca ejecuciones sudo o elevadas para detectar acciones administrativas fuera de lo esperado."
  },
  {
    key: "fileIntegrity",
    label: "Integridad de archivos",
    description: "Calcula y compara hashes de archivos críticos como hosts, passwd, shadow, sudoers o equivalentes de Windows."
  },
  {
    key: "networkConnections",
    label: "Conexiones de red",
    description: "Lista puertos abiertos y conexiones relevantes para revisar exposición de servicios y actividad de red."
  },
  {
    key: "applicationLogs",
    label: "Logs de aplicación",
    description: "Lee las fuentes diagnósticas seleccionadas en el bloque anterior: web, base de datos, PHP, firewall, IDS y rutas personalizadas."
  },
  {
    key: "networkRates",
    label: "Velocidad de red en tiempo real",
    description: "Calcula tasas de entrada y salida por interfaz para detectar picos de tráfico o actividad anómala."
  },
  {
    key: "establishedConnections",
    label: "Conexiones ESTABLISHED con PID",
    description: "Relaciona conexiones establecidas con procesos cuando el sistema lo permite, útil para investigar origen y propietario."
  },
  {
    key: "hardwareMonitor",
    label: "Hardware (fans, batería, GPU)",
    description: "Añade sensores disponibles: temperatura, ventiladores, batería y GPU cuando el host expone esa información."
  },
  {
    key: "dockerMonitor",
    label: "Contenedores Docker",
    description: "Consulta contenedores, estado y salud cuando Docker está instalado y el agente tiene permisos de lectura."
  },
  {
    key: "updateMonitor",
    label: "Parches y actualizaciones pendientes",
    description: "Comprueba actualizaciones pendientes para detectar servidores con mantenimiento atrasado o parches críticos sin aplicar."
  },
  {
    key: "loginHistory",
    label: "Historial de logins (last)",
    description: "Incluye sesiones recientes y usuarios conectados para revisar accesos interactivos y actividad de cuentas."
  },
  {
    key: "smartMonitor",
    label: "Estado SMART de discos",
    description: "Intenta leer salud SMART de discos para anticipar fallos físicos o degradación de almacenamiento."
  }
];

export const THORONDOR_DISTRO_OPTIONS = [
  "Ubuntu/Debian",
  "CentOS/RHEL/Rocky",
  "Arch",
  "Kali",
  "Otra"
];

export const THORONDOR_OS_FAMILY_OPTIONS = [
  { value: "linux", label: "Linux" },
  { value: "windows", label: "Windows" }
];

export const THORONDOR_LINUX_OS_MODEL_OPTIONS_BY_DISTRO = {
  "Ubuntu/Debian": [
    "Ubuntu 24.04 LTS",
    "Ubuntu 22.04 LTS",
    "Debian 12",
    "Debian 11"
  ],
  "CentOS/RHEL/Rocky": [
    "RHEL 9",
    "RHEL 8",
    "Rocky Linux 9",
    "AlmaLinux 9"
  ],
  Arch: [
    "Arch Linux",
    "Manjaro"
  ],
  Kali: [
    "Kali Linux Rolling"
  ],
  Otra: [
    "Linux generico"
  ]
};

export const THORONDOR_WINDOWS_VERSION_OPTIONS = [
  "Windows 11",
  "Windows 10",
  "Windows Server 2025",
  "Windows Server 2022",
  "Windows Server 2019",
  "Windows Server 2016"
];

export function getThorondorLinuxModelOptions(distro = "Ubuntu/Debian") {
  return THORONDOR_LINUX_OS_MODEL_OPTIONS_BY_DISTRO[distro]
    || THORONDOR_LINUX_OS_MODEL_OPTIONS_BY_DISTRO["Otra"];
}

export function getThorondorDefaultOsVersionForTarget(targetOs = "linux", distro = "Ubuntu/Debian") {
  if (targetOs === "windows") {
    return THORONDOR_WINDOWS_VERSION_OPTIONS[0];
  }

  return getThorondorLinuxModelOptions(distro)[0];
}

export const THORONDOR_NETWORK_SCOPE_OPTIONS = [
  {
    value: "local",
    label: "Localhost",
    shortLabel: "Local",
    copy: "El agente escucha solo en localhost para comprobaciones locales; la monitorizacion real se sincroniza contra la API central."
  },
  {
    value: "lan",
    label: "LAN / VPN",
    shortLabel: "LAN",
    copy: "El agente puede escuchar en IP privada o VPN, pero telemetria y comandos viajan por la API central autenticada."
  },
  {
    value: "public",
    label: "Remoto / IP pública / DNS",
    shortLabel: "Remoto",
    copy: "Usa este modo solo con firewall restrictivo; la ingesta publica debe pasar por la API central HTTPS y token de agente."
  }
];

export function normalizeThorondorNetworkScope(value) {
  return THORONDOR_NETWORK_SCOPE_OPTIONS.some((item) => item.value === value) ? value : "lan";
}

export function getThorondorNetworkScopeLabel(value) {
  const scope = normalizeThorondorNetworkScope(value);
  return THORONDOR_NETWORK_SCOPE_OPTIONS.find((item) => item.value === scope)?.shortLabel || "LAN";
}

export const THORONDOR_LOG_SOURCES = [
  { value: "all", label: "Todas" },
  { value: "syslog", label: "syslog" },
  { value: "journal", label: "journalctl" },
  { value: "auth", label: "auth.log / secure" },
  { value: "custom", label: "Personalizados" }
];

export const THORONDOR_LEGACY_ADDITIONAL_LOG_PATHS = "/var/log/nginx/access.log\n/var/log/nginx/error.log";

export const THORONDOR_LINUX_DIAGNOSTIC_LOG_PATHS = [
  "/var/log/nginx/access.log",
  "/var/log/nginx/error.log",
  "/var/log/apache2/access.log",
  "/var/log/apache2/error.log",
  "/var/log/mysql/error.log",
  "/var/log/postgresql/postgresql-*-main.log",
  "/var/log/php/error.log",
  "/var/log/syslog",
  "/var/log/auth.log",
  "/var/log/iptables.log",
  "/var/log/snort/"
];

export const THORONDOR_WINDOWS_DIAGNOSTIC_LOG_PATHS = [
  "winlog://System",
  "winlog://Application",
  "winlog://Security",
  "C:\\inetpub\\logs\\LogFiles\\W3SVC*\\u_ex*.log",
  "C:\\Windows\\System32\\LogFiles\\HTTPERR\\httperr*.log",
  "C:\\nginx\\logs\\access.log",
  "C:\\nginx\\logs\\error.log",
  "C:\\Apache24\\logs\\access.log",
  "C:\\Apache24\\logs\\error.log",
  "C:\\xampp\\apache\\logs\\access.log",
  "C:\\xampp\\apache\\logs\\error.log",
  "C:\\ProgramData\\MySQL\\MySQL Server *\\Data\\*.err",
  "C:\\Program Files\\PostgreSQL\\*\\data\\log\\postgresql-*.log",
  "C:\\php\\logs\\php_error.log",
  "C:\\xampp\\php\\logs\\php_error_log",
  "C:\\Windows\\Temp\\php_errors.log",
  "C:\\Windows\\System32\\LogFiles\\Firewall\\pfirewall.log",
  "C:\\Snort\\log\\alert.ids",
  "C:\\Snort\\log\\alert_fast.txt"
];

function joinThorondorLogPaths(paths) {
  return paths.join("\n");
}

function normalizeLogPathList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export const THORONDOR_DEFAULT_ADDITIONAL_LOG_PATHS = joinThorondorLogPaths(THORONDOR_LINUX_DIAGNOSTIC_LOG_PATHS);
export const THORONDOR_WINDOWS_DEFAULT_ADDITIONAL_LOG_PATHS = joinThorondorLogPaths(THORONDOR_WINDOWS_DIAGNOSTIC_LOG_PATHS);

export function getThorondorDefaultLogPathsForOs(targetOs = "linux") {
  return targetOs === "windows"
    ? THORONDOR_WINDOWS_DEFAULT_ADDITIONAL_LOG_PATHS
    : THORONDOR_DEFAULT_ADDITIONAL_LOG_PATHS;
}

export function isThorondorDefaultDiagnosticLogPathList(value) {
  const normalized = normalizeLogPathList(value);
  return normalized === normalizeLogPathList(THORONDOR_LEGACY_ADDITIONAL_LOG_PATHS)
    || normalized === normalizeLogPathList(THORONDOR_DEFAULT_ADDITIONAL_LOG_PATHS)
    || normalized === normalizeLogPathList(THORONDOR_WINDOWS_DEFAULT_ADDITIONAL_LOG_PATHS);
}

export const THORONDOR_ALERT_TYPES = {
  cpu: "CPU sostenida alta",
  ram: "RAM alta",
  disk: "Disco alto",
  failedLogins: "Exceso de logs de autenticación fallidos",
  unknownLoginIp: "Login exitoso desde IP desconocida",
  criticalFileChange: "Cambio en archivo crítico",
  heartbeat: "Agente sin heartbeat",
  sudoUnauthorized: "Comando sudo no autorizado",
  newUser: "Nuevo usuario creado",
  networkExposure: "Puerto en escucha sospechoso",
  failedService: "Servicio systemd en estado FAILED",
  pendingUpdates: "Actualizaciones críticas pendientes",
  dockerUnhealthy: "Contenedor Docker en estado anomalo",
  dnsFailure: "Fallo de resolucion DNS",
  smartError: "Atributo SMART de disco en estado crítico",
  highNetworkRate: "Trafico de red inusualmente elevado",
  tempCritical: "Temperatura de componente crítica"
};

export function buildDefaultThorondorRuleSet() {
  return [
    {
      id: "rule-cpu-high",
      name: "CPU sostenida por encima del 85%",
      type: "cpu",
      enabled: true,
      threshold: 85,
      durationMinutes: 5,
      scope: "all",
      description: "Dispara una alerta cuando la media reciente de CPU supera el umbral."
    },
    {
      id: "rule-ram-high",
      name: "RAM por encima del 90%",
      type: "ram",
      enabled: true,
      threshold: 90,
      durationMinutes: 3,
      scope: "all",
      description: "Avisa cuando la RAM del sistema permanece muy alta."
    },
    {
      id: "rule-disk-high",
      name: "Disco por encima del 90%",
      type: "disk",
      enabled: true,
      threshold: 90,
      durationMinutes: 10,
      scope: "all",
      description: "Controla el uso de disco sobre las particiones monitorizadas."
    },
    {
      id: "rule-failed-logins",
      name: "Mas de 5 logins fallidos en 10 minutos",
      type: "failedLogins",
      enabled: true,
      threshold: 5,
      durationMinutes: 10,
      scope: "all",
      description: "Detecta picos de autenticaciones fallidas."
    },
    {
      id: "rule-heartbeat-lost",
      name: "Heartbeat ausente más de 3 minutos",
      type: "heartbeat",
      enabled: true,
      threshold: 3,
      durationMinutes: 3,
      scope: "all",
      description: "Marca agentes que dejan de responder durante demasiado tiempo."
    },
    {
      id: "rule-critical-files",
      name: "Cambio en /etc/passwd, /etc/shadow o /etc/sudoers",
      type: "criticalFileChange",
      enabled: true,
      threshold: 1,
      durationMinutes: 1,
      scope: "all",
      description: "Dispara ante cambios de integridad en archivos críticos."
    },
    {
      id: "rule-sudo-unauthorized",
      name: "Uso de sudo fuera de usuarios autorizados",
      type: "sudoUnauthorized",
      enabled: true,
      threshold: 1,
      durationMinutes: 1,
      allowedUsers: ["root", "admin", "secops"],
      scope: "all",
      description: "Controla comandos sudo ejecutados por usuarios no permitidos."
    },
    {
      id: "rule-new-user-created",
      name: "Nuevo usuario o grupo creado",
      type: "newUser",
      enabled: true,
      threshold: 1,
      durationMinutes: 1,
      scope: "all",
      description: "Advierte cuando se detectan altas de cuentas o grupos."
    },
    {
      id: "rule-network-exposure",
      name: "Puerto sensible expuesto",
      type: "networkExposure",
      enabled: true,
      threshold: 1,
      durationMinutes: 1,
      sensitivePorts: [21, 23, 3306, 5432, 6379],
      scope: "all",
      description: "Marca puertos sensibles en escucha."
    },
    {
      id: "rule-failed-service",
      name: "Servicio systemd en estado FAILED",
      type: "failedService",
      enabled: true,
      threshold: 1,
      durationMinutes: 1,
      scope: "all",
      description: "Detecta servicios del sistema que han fallado y no han sido relanzados."
    },
    {
      id: "rule-pending-updates",
      name: "Mas de 20 actualizaciones pendientes",
      type: "pendingUpdates",
      enabled: true,
      threshold: 20,
      durationMinutes: 1,
      scope: "all",
      description: "Avisa cuando el numero de parches sin aplicar supera el umbral."
    },
    {
      id: "rule-dns-failure",
      name: "Fallo de resolucion DNS",
      type: "dnsFailure",
      enabled: true,
      threshold: 1,
      durationMinutes: 1,
      scope: "all",
      description: "Detecta cuando el host no puede resolver nombres DNS esenciales."
    },
    {
      id: "rule-temp-critical",
      name: "Temperatura de componente por encima de 85C",
      type: "tempCritical",
      enabled: true,
      threshold: 85,
      durationMinutes: 1,
      scope: "all",
      description: "Dispara alerta cuando cualquier sensor de temperatura supera el umbral."
    },
    {
      id: "rule-high-network-rate",
      name: "Trafico saliente por encima de 100 MB/s",
      type: "highNetworkRate",
      enabled: true,
      threshold: 104857600,
      durationMinutes: 2,
      scope: "all",
      description: "Detecta exfiltracion de datos o trafico de red inusualmente alto."
    }
  ];
}

export function buildThorondorAgentDraft(targetOs = "linux") {
  const normalizedTargetOs = targetOs === "windows" ? "windows" : "linux";
  const defaultDistro = normalizedTargetOs === "windows" ? "Windows" : THORONDOR_DISTRO_OPTIONS[0];

  return {
    targetOs: normalizedTargetOs,
    displayName: "",
    systemName: "",
    distro: defaultDistro,
    osVersion: getThorondorDefaultOsVersionForTarget(normalizedTargetOs, defaultDistro),
    receiverUrl: "",
    centralApiBaseUrl: "",
    networkScope: "local",
    corsOrigin: "*",
    port: "",
    intervalSeconds: "",
    additionalLogPaths: getThorondorDefaultLogPathsForOs(normalizedTargetOs),
    modules: {
      systemMetrics: true,
      securityLogs: true,
      sudoCommands: true,
      fileIntegrity: true,
      networkConnections: true,
      applicationLogs: true,
      networkRates: true,
      establishedConnections: true,
      hardwareMonitor: true,
      dockerMonitor: false,
      updateMonitor: true,
      loginHistory: true,
      smartMonitor: false
    },
    generateSystemd: normalizedTargetOs !== "windows",
    hostIp: "",
    installUser: "",
    serviceName: "",
    autoStart: true,
    notes: ""
  };
}

export function isLegacyThorondorAgentDraft(draft) {
  if (!draft || typeof draft !== "object") return false;

  return draft.displayName === "PC UBUNTU DE PACO"
    && draft.systemName === "servidor-web-01"
    && draft.distro === "Ubuntu/Debian"
    && draft.osVersion === "22.04 LTS"
    && String(draft.hostIp || "") === "192.168.1.50"
    && String(draft.installUser || "") === "thorondor"
    && String(draft.serviceName || "") === "thorondor-agent"
    && Number(draft.intervalSeconds) === 30
    && String(draft.additionalLogPaths || "") === THORONDOR_LEGACY_ADDITIONAL_LOG_PATHS;
}
