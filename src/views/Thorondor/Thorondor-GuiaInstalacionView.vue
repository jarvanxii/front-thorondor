<template>
    <ThorondorPageShell>
        <section class="section-box intro-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Despliegue controlado</span>
                    <h1 class="section-name">Instalación del agente</h1>
                    <p class="section-copy">
                        El formulario genera un único instalador por host. Ese archivo escribe el agente, configura sus
                        parámetros, instala dependencias y prepara el arranque automático solo cuando lo decides. La
                        validación se hace por endpoints simples: <code>/health</code> y <code>/telemetry</code>.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Deploy</span>
                    <small>Python 3.8+ - HTTP pull - IndexedDB / Base de datos</small>
                </div>
            </div>

            <div class="guide-grid">
                <div class="guide-card" v-for="item in installationHighlights" :key="item.label">
                    <label>{{ item.label }}</label>
                    <span>{{ item.copy }}</span>
                </div>
            </div>
        </section>

        <section class="section-box connection-selector-section">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Tipo de conexión</span>
                    <h2 class="module-title">Monitorización {{ deploymentScopeLabel }}</h2>
                    <p class="module-copy">{{ deploymentScopeDescription }}</p>
                </div>
                <div class="deployment-selector-control">
                    <label class="field-label" for="guide-network-scope">Conexión del agente</label>
                    <select id="guide-network-scope" v-model="deploymentScope" class="form-select input-dark">
                        <option v-for="scope in deploymentScopeOptions" :key="scope.value" :value="scope.value">
                            {{ scope.shortLabel }}
                        </option>
                    </select>
                </div>
            </div>
        </section>

        <section class="section-box beginner-section">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Para empezar sin experiencia</span>
                    <h2 class="module-title">Qué opción elegir en cada caso</h2>
                    <p class="module-copy">
                        Si es tu primera prueba, empieza por el camino más sencillo. Cuando el agente responda en local,
                        pasa a LAN/VPN y deja remoto para el final.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Inicio</span>
                    <small>De menos a más exposición.</small>
                </div>
            </div>

            <div class="beginner-grid">
                <article v-for="item in beginnerChoices" :key="item.label" class="beginner-card">
                    <label>{{ item.label }}</label>
                    <strong>{{ item.when }}</strong>
                    <p>{{ item.copy }}</p>
                </article>
            </div>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Secuencia</span>
                    <h2 class="module-title">Runbook completo de instalación</h2>
                    <p class="module-copy">
                        Sigue este orden para evitar instalaciones a medias: primero decides cómo se va a alcanzar el
                        host, después generas el instalador, lo ejecutas con permisos elevados, validas el proceso y
                        solo entonces registras el endpoint como operativo.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Runbook</span>
                    <small>Preparar, instalar, validar y operar.</small>
                </div>
            </div>

            <div class="card-grid install-step-grid">
                <article class="tool-card install-step-card" v-for="step in installSteps" :key="step.title">
                    <div class="card-head">
                        <div>
                            <span class="step-index">{{ step.index }}</span>
                            <h5>{{ step.title }}</h5>
                        </div>
                        <span class="mini-badge">{{ step.badge }}</span>
                    </div>
                    <p class="section-copy mb-0">{{ step.copy }}</p>
                    <div class="step-detail-grid">
                        <div>
                            <label>Para qué sirve</label>
                            <p>{{ step.purpose }}</p>
                        </div>
                        <div>
                            <label>Resultado esperado</label>
                            <p>{{ step.expected }}</p>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <div class="guide-section-title">
            <span>Instalación</span>
            <h2>Instalación del agente</h2>
            <p>Prepara el host, valida el endpoint y deja el servicio persistente según el sistema operativo y el tipo de conexión elegido.</p>
        </div>

        <section class="section-box guide-phase-header">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Host monitorizado</span>
                    <h2 class="module-title">Selecciona sistema objetivo</h2>
                    <p class="module-copy">
                        El formulario descarga un solo instalador directo por sistema: <code>install-thorondor-agent.sh</code>
                        en Linux o <code>crear-e-instalar-thorondor-agent-msi.ps1</code> en Windows. En Windows ese
                        asistente genera <code>ThorondorAgent.msi</code>, lo deja en el Escritorio y lo instala con msiexec.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">{{ hostOsLabel }}</span>
                    <small>Comandos adaptados al destino.</small>
                </div>
            </div>

            <div class="os-selector-panel">
                <label class="control-field" for="host-os-family">
                    <span class="field-label">Sistema operativo</span>
                    <select id="host-os-family" v-model="hostOsFamily" class="form-select input-dark">
                        <option v-for="family in osFamilyOptions" :key="family.value" :value="family.value">
                            {{ family.label }}
                        </option>
                    </select>
                </label>
                <div class="os-simple-note">
                    <strong>Sin elegir distro ni versión</strong>
                    <span>El instalador de Linux detecta apt, dnf o pacman y crea un entorno Python aislado. En Windows el asistente deja un MSI real listo para reutilizar.</span>
                </div>
            </div>
        </section>

        <section v-for="section in hostCommandSections" :key="section.title" class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">{{ section.kicker }}</span>
                    <h2 class="module-title">{{ section.title }}</h2>
                    <p class="module-copy">{{ section.copy }}</p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">{{ section.badge }}</span>
                    <small>{{ section.note }}</small>
                </div>
            </div>

            <div class="command-stack">
                <article class="tool-card command-card" v-for="command in section.commands" :key="command.title">
                    <div class="card-head">
                        <h5>{{ command.title }}</h5>
                        <span class="mini-badge">{{ command.badge }}</span>
                    </div>
                    <div class="output-box copy-box">
                        <button class="copy-btn" :class="{ copied: copiedKey === command.title }" @click="copyCmd(localizedSnippet(command.command), command.title)">
                            {{ copiedKey === command.title ? 'Copiado' : 'Copiar' }}
                        </button>
                        <pre class="result-pre">{{ localizedSnippet(command.command) }}</pre>
                    </div>
                    <div class="command-meta">
                        <div class="meta-line">
                            <label>Qué hace</label>
                            <p>{{ command.purpose }}</p>
                        </div>
                        <div class="meta-line">
                            <label>Notas</label>
                            <p>{{ command.when }}</p>
                        </div>
                        <div class="meta-line">
                            <label>Salida esperada</label>
                            <p>{{ command.expected }}</p>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Validación</span>
                    <h2 class="module-title">Comprobaciones antes de registrar el host</h2>
                    <p class="module-copy">
                        Estas pruebas separan proceso, payload, red y servicio. No registres el host en el dashboard
                        hasta que <code>/health</code> y <code>/telemetry</code> respondan desde la máquina que abre
                        Thorondor.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Validate</span>
                    <small>Proceso, JSON y conectividad.</small>
                </div>
            </div>

            <div class="card-grid validation-grid">
                <article class="tool-card command-card" v-for="check in validationChecks" :key="check.title">
                    <div class="card-head">
                        <h5>{{ check.title }}</h5>
                        <span class="mini-badge">{{ check.badge }}</span>
                    </div>
                    <p class="section-copy mb-0">{{ check.copy }}</p>
                    <div class="output-box copy-box">
                        <button class="copy-btn" :class="{ copied: copiedKey === check.title }" @click="copyCmd(localizedSnippet(check.command), check.title)">
                            {{ copiedKey === check.title ? 'Copiado' : 'Copiar' }}
                        </button>
                        <pre class="result-pre">{{ localizedSnippet(check.command) }}</pre>
                    </div>
                    <div class="command-meta">
                        <div class="meta-line">
                            <label>Qué confirma</label>
                            <p>{{ check.confirms }}</p>
                        </div>
                        <div class="meta-line">
                            <label>Salida esperada</label>
                            <p>{{ check.expected }}</p>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <div class="guide-section-title guide-section-title--danger">
            <span>Desinstalación</span>
            <h2>Retirada y limpieza</h2>
            <p>Deten el servicio, elimina artefactos y cierra cualquier exposición de red asociada al agente.</p>
        </div>

        <section class="section-box guide-phase-header">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Retirada del agente</span>
                    <h2 class="module-title">Selecciona sistema a desinstalar</h2>
                    <p class="module-copy">
                        Deten el servicio antes de borrar ficheros. Cierra el puerto abierto en firewall y elimina los
                        datos locales del navegador si el host no va a volver a registrarse.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">{{ uninstallOsLabel }}</span>
                    <small>Sin reinicio requerido.</small>
                </div>
            </div>

            <div class="os-selector-panel">
                <label class="control-field" for="uninstall-os-family">
                    <span class="field-label">Sistema operativo</span>
                    <select id="uninstall-os-family" v-model="uninstallOsFamily" class="form-select input-dark">
                        <option v-for="family in osFamilyOptions" :key="family.value" :value="family.value">
                            {{ family.label }}
                        </option>
                    </select>
                </label>
                <div class="os-simple-note">
                    <strong>Limpieza por familia de sistema</strong>
                    <span>La retirada busca servicios y ficheros de Thorondor sin depender de Ubuntu, Debian, RHEL, Arch o versión de Windows.</span>
                </div>
            </div>
        </section>

        <section class="section-box">
            <div class="command-stack">
                <article class="tool-card command-card" v-for="cmd in uninstallCommands" :key="cmd.title">
                    <div class="card-head">
                        <h5>{{ cmd.title }}</h5>
                        <span class="mini-badge">{{ cmd.badge }}</span>
                    </div>
                    <div class="output-box copy-box">
                        <button class="copy-btn" :class="{ copied: copiedKey === cmd.title }" @click="copyCmd(localizedSnippet(cmd.command), cmd.title)">
                            {{ copiedKey === cmd.title ? 'Copiado' : 'Copiar' }}
                        </button>
                        <pre class="result-pre">{{ localizedSnippet(cmd.command) }}</pre>
                    </div>
                    <div class="command-meta">
                        <div class="meta-line">
                            <label>Qué hace</label>
                            <p>{{ cmd.purpose }}</p>
                        </div>
                        <div class="meta-line">
                            <label>Notas</label>
                            <p>{{ cmd.when }}</p>
                        </div>
                        <div class="meta-line">
                            <label>Salida esperada</label>
                            <p>{{ cmd.expected }}</p>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import {
    THORONDOR_NETWORK_SCOPE_OPTIONS,
    normalizeThorondorNetworkScope
} from "@/features/thorondor/data/thorondorDefaults";

const OS_FAMILY_OPTIONS = [
    { value: "linux", label: "Linux" },
    { value: "windows", label: "Windows" }
];

function localizeSnippetText(value) {
    return String(value || "");
}

export default {
    name: "ThorondorGuíaInstalaciónView",

    components: {
        ThorondorPageShell
    },

    data() {
        return {
            copiedKey: null,
            deploymentScope: "lan",
            hostOsFamily: "linux",
            uninstallOsFamily: "linux"
        };
    },

    computed: {
        normalizedDeploymentScope() {
            return normalizeThorondorNetworkScope(this.deploymentScope);
        },

        isLocalDeployment() {
            return this.normalizedDeploymentScope === "local";
        },

        isLanDeployment() {
            return this.normalizedDeploymentScope === "lan";
        },

        isRemoteDeployment() {
            return this.normalizedDeploymentScope === "public";
        },

        deploymentScopeOptions() {
            return THORONDOR_NETWORK_SCOPE_OPTIONS;
        },

        osFamilyOptions() {
            return OS_FAMILY_OPTIONS;
        },

        isWindowsHostOs() {
            return this.hostOsFamily === "windows";
        },

        isWindowsUninstallOs() {
            return this.uninstallOsFamily === "windows";
        },

        deploymentScopeLabel() {
            return this.deploymentScopeOptions.find((item) => item.value === this.normalizedDeploymentScope)?.shortLabel || "LAN";
        },

        deploymentScopeDescription() {
            if (this.isLocalDeployment) {
                return "El agente escucha en 127.0.0.1 para validacion local y sincroniza la monitorizacion real con la API central autenticada.";
            }
            if (this.isLanDeployment) {
                return "El agente puede exponer health en IP privada o VPN, pero telemetria y comandos deben ir por la API central con token.";
            }
            return "Usa remoto solo con firewall restrictivo. La ingesta publica debe ir por HTTPS contra la API central y token de agente.";
        },

        hostOsLabel() {
            return this.isWindowsHostOs ? "Windows" : "Linux";
        },

        uninstallOsLabel() {
            return this.isWindowsUninstallOs ? "Windows" : "Linux";
        },

        installationHighlights() {
            return [
                {
                    label: "API central",
                    copy: "El front consulta el back con JWT y el agente sincroniza heartbeat, telemetria, logs y resultados con su token propio."
                },
                {
                    label: this.deploymentScopeLabel,
                    copy: this.deploymentScopeDescription
                },
                {
                    label: "Permisos explícitos",
                    copy: "Los logs protegidos se leen mediante grupos del sistema o permisos concretos. No se debe ejecutar el agente como root salvo diagnóstico puntual."
                },
                {
                    label: "Persistencia de datos",
                    copy: "El modo local guarda histórico en IndexedDB. El modo sincronizado conserva snapshots, eventos, logs, reglas y alertas en base de datos."
                }
            ];
        },

        beginnerChoices() {
            return [
                {
                    label: "Prueba en el mismo equipo",
                    when: "Elige Local",
                    copy: "Instala el agente en el ordenador donde abres Thorondor. No abre firewall y sirve para comprobar que el instalador funciona."
                },
                {
                    label: "Servidor de casa, laboratorio o empresa",
                    when: "Elige LAN / VPN",
                    copy: "Usa la IP privada del host y permite el puerto solo desde tu equipo, VPN o red de administración."
                },
                {
                    label: "Servidor fuera de tu red",
                    when: "Elige Remoto",
                    copy: "Usa DNS o IP pública, origen restringido y HTTPS/proxy. No lo uses como primera prueba."
                },
                {
                    label: "Windows",
                    when: "Ejecuta como administrador",
                    copy: "Descargas un asistente PowerShell que crea un MSI real, lo instala y deja una copia en el Escritorio."
                },
                {
                    label: "Linux",
                    when: "Ejecuta con sudo",
                    copy: "Descargas un .sh único. Crea /opt/thorondor-agent, venv, permisos y systemd si activas autoarranque."
                }
            ];
        },

        installSteps() {
            return [
                {
                    index: "01",
                    title: "Definir alcance de red",
                    badge: this.deploymentScopeLabel,
                    copy: `Decide si el agente será local, LAN/VPN o remoto. En este momento está seleccionado ${this.deploymentScopeLabel}.`,
                    purpose: "Evita registrar una URL incorrecta y determina si habrá que abrir firewall, usar IP privada, VPN, DNS público o HTTPS.",
                    expected: "Tienes clara la API central publica y la URL local o de red para validar /health."
                },
                {
                    index: "02",
                    title: "Generar instalador",
                    badge: "Build",
                    copy: "Entra en el generador, elige Linux o Windows, revisa host, puerto, módulos y fuentes de logs, y descarga el único archivo resultante.",
                    purpose: "El instalador queda ligado a ese host: contiene agente Python, configuración, módulos, logs seleccionados y política de autoarranque.",
                    expected: "Descargas install-thorondor-agent.sh en Linux o crear-e-instalar-thorondor-agent-msi.ps1 en Windows."
                },
                {
                    index: "03",
                    title: "Copiar al host monitorizado",
                    badge: "Transfer",
                    copy: "Lleva el instalador al servidor o equipo que quieres vigilar usando SFTP, SCP, USB, consola cloud o el canal seguro que ya uses.",
                    purpose: "La instalación debe ejecutarse dentro del host que va a exponer el agente, no en el equipo desde el que administras Thorondor.",
                    expected: "El archivo está en una ruta temporal del host, por ejemplo /tmp o la carpeta Descargas."
                },
                {
                    index: "04",
                    title: "Ejecutar con permisos elevados",
                    badge: "Install",
                    copy: this.isWindowsHostOs
                        ? "Ejecuta el asistente PowerShell como Administrador. El propio asistente genera ThorondorAgent.msi y lo instala con msiexec."
                        : "Ejecuta el .sh con sudo. El script crea rutas, entorno Python aislado, permisos y systemd si activaste autoarranque.",
                    purpose: "Permite escribir en ProgramData u /opt, instalar dependencias, crear servicio persistente y preparar lectura de logs protegidos.",
                    expected: "La consola termina con instalación completada y deja el agente listo para responder en el puerto configurado."
                },
                {
                    index: "05",
                    title: "Revisar artefactos y servicio",
                    badge: this.isWindowsHostOs ? "Task" : "systemd",
                    copy: this.isWindowsHostOs
                        ? "Comprueba C:\\ProgramData\\Thorondor-Agent y la tarea ThorondorAgent si activaste autoarranque."
                        : "Comprueba /opt/thorondor-agent y la unidad systemd si activaste autoarranque.",
                    purpose: "Confirma que no solo se descargó el instalador, sino que el agente quedó escrito y persistente.",
                    expected: "Existen los ficheros del agente y el servicio aparece Ready/Running en Windows o active en Linux."
                },
                {
                    index: "06",
                    title: "Abrir red solo si aplica",
                    badge: "Firewall",
                    copy: this.isLocalDeployment
                        ? "En modo local no abras firewall: 127.0.0.1 basta y reduce exposición."
                        : "Permite el puerto del agente únicamente desde el cliente, VPN, bastión o rango de administración autorizado.",
                    purpose: "Separa un fallo de instalación de un fallo de red y evita exponer el agente a orígenes innecesarios.",
                    expected: this.isLocalDeployment
                        ? "El puerto solo responde desde el propio host."
                        : "Desde la red autorizada puedes llegar a /health sin abrir el puerto a todo Internet."
                },
                {
                    index: "07",
                    title: "Validar endpoints",
                    badge: "HTTP",
                    copy: "Primero prueba /health en localhost, despues /telemetry con token y finalmente la sincronizacion contra la API central.",
                    purpose: "Comprueba proceso, JSON, permisos de lectura, CORS, firewall, NAT, DNS y TLS antes de dar el host por bueno.",
                    expected: "Recibes JSON con status ok, heartbeat, system, metrics, security y logs."
                },
                {
                    index: "08",
                    title: "Registrar y operar",
                    badge: "SIEM",
                    copy: "Registra el host en el dashboard solo cuando la URL final responde. Después revisa reglas, alertas y eventos generados.",
                    purpose: "Evita hosts fantasma y te asegura que la consola muestra fallos reales, no errores de despliegue.",
                    expected: "El host aparece online, con última conexión reciente y telemetría visible en las vistas de Thorondor."
                }
            ];
        },

        hostCommandSections() {
            return this.isWindowsHostOs ? this.windowsCommandSections : this.linuxCommandSections;
        },

        linuxFirewallCommand() {
            const source = this.isRemoteDeployment ? "<IP_PUBLICA_CLIENTE_O_CIDR>" : "<IP_CLIENTE_O_CIDR>";
            return `# UFW\nsudo ufw allow from ${source} to any port <PUERTO> proto tcp\nsudo ufw status numbered\n\n# firewalld\nsudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="${source}" port protocol="tcp" port="<PUERTO>" accept'\nsudo firewall-cmd --reload`;
        },

        linuxCommandSections() {
            return [
                {
                    kicker: "Preparacion",
                    title: "Ejecutar el instalador único",
                    copy: "El .sh generado contiene agente Python, configuración, módulos, fuentes de logs y unidad systemd opcional. Ejecútalo en el host Linux con sudo para que cree rutas, dependencias y permisos.",
                    badge: "Linux",
                    note: this.hostOsLabel,
                    commands: [
                        {
                            title: "Preflight del host",
                            badge: "Check",
                            command: "hostname -I\nip route get 1.1.1.1 2>/dev/null || true\nsudo -v\ncommand -v python3 || true\ncommand -v sudo || true\ncommand -v systemctl || true\ncommand -v journalctl || true\ncommand -v smartctl || true\nss -ltnp 2>/dev/null | grep ':<PUERTO>' || true",
                            purpose: "Comprueba la IP que usarás en LAN/VPN, permisos sudo, Python 3, systemd/journal, SMART opcional y si el puerto elegido ya está ocupado.",
                            when: "Hazlo antes de generar o ejecutar si no tienes claro qué IP o puerto usar.",
                            expected: "Ves la IP del host, sudo valida credenciales, las herramientas clave aparecen o serán instalables y ningún proceso escucha en <PUERTO>."
                        },
                        {
                            title: "Copiar instalador al host",
                            badge: "Transfer",
                            command: "scp ./install-thorondor-agent.sh <USUARIO>@<HOST>:/tmp/install-thorondor-agent.sh\nssh <USUARIO>@<HOST>",
                            purpose: "Lleva al sistema monitorizado el único archivo que ha descargado el generador, sin copiar piezas sueltas ni editar el agente a mano.",
                            when: "También puedes copiarlo por SFTP, USB, consola cloud o cualquier canal seguro que ya uses. No lo ejecutes en tu PC si el host a vigilar es otro servidor.",
                            expected: "El host monitorizado tiene /tmp/install-thorondor-agent.sh listo para ejecutar."
                        },
                        {
                            title: "Ejecutar instalador",
                            badge: "Install",
                            command: "chmod +x /tmp/install-thorondor-agent.sh\nsudo /tmp/install-thorondor-agent.sh",
                            purpose: "Crea /opt/thorondor-agent, genera un venv propio, escribe thorondor-agent.py, instala psutil, sensores y smartmontools, prepara grupos de lectura y configura systemd si activaste autoarranque.",
                            when: "Si desactivaste autoarranque, el script deja el agente listo para arranque manual pero no registra el servicio.",
                            expected: "Mensaje de instalación completada; con autoarranque, systemd queda recargado, habilitado y arrancado."
                        },
                        {
                            title: "Comprobar ficheros creados",
                            badge: "Files",
                            command: "sudo ls -la /opt/thorondor-agent\nsudo test -x /opt/thorondor-agent/venv/bin/python && echo 'venv ok'\nid thorondor\nsudo -l -U thorondor | grep -E 'THORONDOR_(FIREWALL|DIAGNOSTICS)' || true\nsudo find /etc/systemd/system -maxdepth 1 \\( -iname '*thorondor*.service' -o -iname '*-agent.service' \\) -print",
                            purpose: "Verifica que el instalador reconstruyó el agente, creó el entorno Python aislado y dejó la unidad systemd cuando correspondía.",
                            when: "Si cambiaste el usuario del servicio, sustituye thorondor por el usuario configurado en el generador.",
                            expected: "Aparece thorondor-agent.py, el mensaje venv ok, el usuario dedicado y sudoers limitado para firewall/diagnóstico."
                        }
                    ]
                },
                {
                    kicker: "Servicio",
                    title: this.isLocalDeployment ? "Validación local" : "Validación de servicio y red",
                    copy: this.isLocalDeployment
                        ? "Valida que el agente responde en 127.0.0.1 y que no has abierto exposición de red innecesaria."
                        : "Valida que el servicio está activo y abre firewall solo al cliente, VPN o red de administración que corresponda.",
                    badge: "Validate",
                    note: "Después de instalar",
                    commands: [
                        {
                            title: "Validar health y telemetry",
                            badge: "HTTP",
                            command: "curl -s http://127.0.0.1:<PUERTO>/health\ncurl -s -H 'X-Thorondor-Agent-Token: <TOKEN_AGENTE>' http://127.0.0.1:<PUERTO>/telemetry | python3 -m json.tool | head -40",
                            purpose: "Comprueba que el proceso escucha en local y que el payload JSON tiene estructura válida antes de abrir red o registrar el host.",
                            when: "Si falla la importación de psutil, reejecuta el instalador y revisa la salida de pip dentro del venv.",
                            expected: "JSON con status ok y telemetría con system, metrics, security, logs y heartbeat."
                        },
                        {
                            title: "Revisar servicio",
                            badge: "systemd",
                            command: "systemctl list-units --type=service --all --no-pager | grep -i thorondor\nsystemctl status <SERVICIO>.service --no-pager\nsystemctl show <SERVICIO>.service -p ActiveState,NRestarts,ExecMainStatus --value\njournalctl -u <SERVICIO>.service -n 80 --no-pager",
                            purpose: "Comprueba que systemd mantiene vivo el agente, que no está reiniciando en bucle y que no hay errores recientes.",
                            when: "Sustituye <SERVICIO> por el nombre técnico configurado en el formulario, por ejemplo thorondor-agent.",
                            expected: "ActiveState=active, NRestarts=0 y ExecMainStatus=0."
                        },
                        ...(this.isLocalDeployment ? [] : [{
                            title: "Abrir firewall solo al cliente",
                            badge: "Firewall",
                            command: this.linuxFirewallCommand,
                            purpose: "Permite acceso TCP al puerto del agente desde la IP del navegador o desde la subred de administración.",
                            when: this.isRemoteDeployment
                                ? "Usa una allowlist real: tu IP fija, VPN, bastión o rango de administración. Si necesitas 0.0.0.0/0, pon un reverse proxy TLS delante."
                                : "No abras rangos amplios. Permite solo la IP del navegador, la subred de administración o la VPN.",
                            expected: "El puerto aparece permitido y el cliente puede conectar a /health."
                        }])
                    ]
                }
            ];
        },

        windowsCommandSections() {
            return [
                {
                    kicker: "Preparacion",
                    title: "Ejecutar el instalador único Windows",
                    copy: "El asistente generado crea un MSI real con el agente Python, la configuración elegida, la regla de firewall cuando aplica y la tarea de Task Scheduler si activaste autoarranque.",
                    badge: "Windows",
                    note: "PowerShell administrador",
                    commands: [
                        {
                            title: "Preflight del host",
                            badge: "Check",
                            command: "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)\nGet-NetTCPConnection -LocalPort <PUERTO> -ErrorAction SilentlyContinue\nGet-Command winget,dotnet,powershell -ErrorAction SilentlyContinue\nGet-Service EventLog\nGet-WinEvent -LogName Security -MaxEvents 1 -ErrorAction SilentlyContinue",
                            purpose: "Comprueba que la consola está elevada, que el puerto no está ocupado, que hay herramientas para compilar el MSI y que Windows Event Log responde.",
                            when: "Hazlo antes de ejecutar si el host tiene políticas restrictivas o si dudas del puerto elegido.",
                            expected: "La primera línea devuelve True, el puerto no aparece ocupado, winget/dotnet están disponibles o pueden instalarse y Event Log responde."
                        },
                        {
                            title: "Abrir PowerShell administrador",
                            badge: "Admin",
                            command: "Start-Process PowerShell -Verb RunAs\nSet-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass",
                            purpose: "Prepara una sesión elevada para escribir en ProgramData, instalar dependencias, generar el MSI, abrir firewall y crear la tarea programada.",
                            when: "La política se aplica solo al proceso actual. No cambia la política global del equipo.",
                            expected: "La consola elevada permite ejecutar scripts locales."
                        },
                        {
                            title: "Ejecutar instalador",
                            badge: "Install",
                            command: "cd <CARPETA_DONDE_DESCARGASTE_EL_INSTALADOR>\n.\\crear-e-instalar-thorondor-agent-msi.ps1",
                            purpose: "Reconstruye los artefactos internos, compila ThorondorAgent.msi, deja una copia en el Escritorio, lo instala con msiexec y aplica la configuración del formulario.",
                            when: "Si faltan .NET SDK o WiX, el asistente intenta prepararlos con winget/dotnet. No descargues ni edites artefactos sueltos.",
                            expected: "Aparece ThorondorAgent.msi en el Escritorio, instalación completada y health check local correcto."
                        },
                        {
                            title: "Comprobar ficheros creados",
                            badge: "Files",
                            command: "Get-ChildItem 'C:\\ProgramData\\Thorondor-Agent'\nTest-Path \"$env:USERPROFILE\\Desktop\\ThorondorAgent.msi\"\nGet-ScheduledTask -TaskName 'ThorondorAgent' -ErrorAction SilentlyContinue",
                            purpose: "Verifica que el MSI instaló el agente, que existe una copia reutilizable del paquete y que la tarea programada se creó cuando correspondía.",
                            when: "La tarea no existirá si elegiste arranque manual.",
                            expected: "C:\\ProgramData\\Thorondor-Agent contiene thorondor-agent.py y el MSI aparece en el Escritorio."
                        }
                    ]
                },
                {
                    kicker: "Servicio",
                    title: this.isLocalDeployment ? "Tarea programada local" : "Tarea programada y red",
                    copy: this.isLocalDeployment
                        ? "Valida el endpoint local. No necesitas abrir firewall si solo consultas desde la misma máquina."
                        : "Valida el endpoint y revisa la regla de firewall que permite el puerto TCP del agente.",
                    badge: "Task",
                    note: "Task Scheduler",
                    commands: [
                        {
                            title: "Health y telemetry local",
                            badge: "HTTP",
                            command: "$headers = @{ 'X-Thorondor-Agent-Token' = '<TOKEN_AGENTE>' }\nInvoke-RestMethod http://127.0.0.1:<PUERTO>/health\nInvoke-RestMethod -Headers $headers http://127.0.0.1:<PUERTO>/telemetry",
                            purpose: "Comprueba el endpoint de salud y el payload completo en localhost antes de registrar la URL final en Thorondor.",
                            when: "Si el puerto está ocupado, cambia el puerto en el generador y regenera el agente.",
                            expected: "Objetos JSON con status ok, port, heartbeat, system y metrics."
                        },
                        {
                            title: "Revisar tarea programada",
                            badge: "Schedule",
                            command: "Get-ScheduledTask -TaskName 'ThorondorAgent' | Select-Object TaskName,State\nGet-ScheduledTaskInfo -TaskName 'ThorondorAgent'",
                            purpose: "Comprueba que Task Scheduler quedó registrado, que la tarea puede arrancar con privilegios y que no hay errores recientes.",
                            when: "Ejecuta solo si activaste arranque automático.",
                            expected: "Get-ScheduledTask -TaskName ThorondorAgent muestra estado Ready o Running."
                        },
                        ...(this.isLocalDeployment ? [] : [{
                            title: "Abrir firewall",
                            badge: "Firewall",
                            command: this.isRemoteDeployment
                                ? "New-NetFirewallRule -DisplayName 'Thorondor Agent' -Direction Inbound -Protocol TCP -LocalPort <PUERTO> -Action Allow -Profile Any -RemoteAddress <IP_PUBLICA_CLIENTE_O_CIDR>"
                                : "New-NetFirewallRule -DisplayName 'Thorondor Agent' -Direction Inbound -Protocol TCP -LocalPort <PUERTO> -Action Allow -Profile Private -RemoteAddress <IP_CLIENTE_O_CIDR>",
                            purpose: "Permite conexiones entrantes al puerto del agente desde el cliente, VPN, bastión o rango de administración.",
                            when: this.isRemoteDeployment
                                ? "Evita Any como RemoteAddress en Internet. Si expones IP pública, combina origen restringido y preferiblemente reverse proxy TLS."
                                : "El instalador crea una regla LocalSubnet como ayuda inicial; ajusta RemoteAddress si usas VPN o una IP concreta.",
                            expected: "Test-NetConnection -ComputerName <IP_O_DNS_HOST> -Port <PUERTO> funciona desde el cliente."
                        }])
                    ]
                }
            ];
        },

        validationChecks() {
            const checks = [
                {
                    title: "Health local",
                    badge: "Local",
                    copy: "Comprueba que el agente instalado por el instalador único responde en el propio host.",
                    command: this.isWindowsHostOs
                        ? "Invoke-RestMethod http://127.0.0.1:<PUERTO>/health"
                        : "curl -s http://127.0.0.1:<PUERTO>/health",
                    confirms: "El proceso está vivo y escucha en el puerto configurado.",
                    expected: "JSON con status ok, heartbeat y nombre del sistema."
                },
                {
                    title: "Telemetry local",
                    badge: "JSON",
                    copy: "Comprueba estructura de payload antes de abrirlo a la red.",
                    command: this.isWindowsHostOs
                        ? "$headers = @{ 'X-Thorondor-Agent-Token' = '<TOKEN_AGENTE>' }\nInvoke-RestMethod -Headers $headers http://127.0.0.1:<PUERTO>/telemetry | ConvertTo-Json -Depth 4"
                        : "curl -s -H 'X-Thorondor-Agent-Token: <TOKEN_AGENTE>' http://127.0.0.1:<PUERTO>/telemetry | python3 -m json.tool | grep -E '\"(system|metrics|security|logs|heartbeat)\"'",
                    confirms: "El payload contiene los bloques raíz que consume Vuex.",
                    expected: "Aparecen system, metrics, security, logs y heartbeat."
                }
            ];

            if (this.isWindowsHostOs) {
                checks.push({
                    title: "Estado de Task Scheduler",
                    badge: "Windows",
                    copy: "Detecta errores de arranque automático cuando el formulario generó tarea programada.",
                    command: "Get-ScheduledTask -TaskName 'ThorondorAgent' -ErrorAction SilentlyContinue | Select-Object TaskName,State\nGet-ScheduledTaskInfo -TaskName 'ThorondorAgent' -ErrorAction SilentlyContinue",
                    confirms: "Tarea creada, estado Ready o Running y última ejecución sin error.",
                    expected: "LastTaskResult igual a 0 cuando la tarea ya se ejecutó."
                });
            } else {
                checks.push({
                    title: "Estado del servicio",
                    badge: "systemd",
                    copy: "Detecta bucles de reinicio y errores ocultos por systemd.",
                    command: "systemctl list-units --type=service --all --no-pager | grep -i thorondor\nsystemctl show <SERVICIO>.service -p ActiveState,NRestarts,ExecMainStatus --value\njournalctl -u <SERVICIO>.service -n 30 --no-pager",
                    confirms: "Servicio estable, sin reinicios y sin errores recientes.",
                    expected: "active, 0 reinicios y ExecMainStatus=0."
                });
            }

            if (this.isLanDeployment) {
                checks.splice(2, 0, {
                    title: "Conexión LAN o VPN",
                    badge: "LAN",
                    copy: "Ejecuta desde la máquina que abre Thorondor dentro de la red privada o VPN.",
                    command: "curl -v --connect-timeout 5 http://<IP_PRIVADA_O_VPN>:<PUERTO>/health",
                    confirms: "Ruta, firewall, CORS y bind address permiten acceso real desde el navegador.",
                    expected: "Conexión TCP establecida y JSON de /health. Timeout significa red/firewall; refused significa puerto sin escucha."
                });
            }

            if (this.isRemoteDeployment) {
                checks.splice(2, 0, {
                    title: "Conexión remota",
                    badge: "Remoto",
                    copy: "Ejecuta desde una red externa a la del host.",
                    command: "curl -v --connect-timeout 5 <URL_REMOTA_DEL_AGENTE>/health",
                    confirms: "DNS/IP pública, NAT, firewall, CORS y bind address permiten acceso real desde fuera.",
                    expected: "HTTP 200. Timeout significa red/firewall; refused significa puerto sin escucha."
                }, {
                    title: "HTTPS y navegador",
                    badge: "TLS",
                    copy: "Comprueba que el navegador no bloqueará la petición por mixed content.",
                    command: "curl -s -o /dev/null -w \"%{http_code}\\n\" <URL_REMOTA_DEL_AGENTE>/health\n# Si la aplicación se sirve por HTTPS, usa https:// también para el agente.",
                    confirms: "El endpoint remoto usa el esquema correcto para poder ser consultado desde la UI.",
                    expected: "200. Si hay error TLS, corrige certificado o proxy antes de registrar."
                });
            }

            return checks;
        },

        uninstallCommands() {
            if (this.isWindowsUninstallOs) {
                return [
                    {
                        title: "Eliminar tarea programada",
                        badge: "Task",
                        command: "Stop-ScheduledTask -TaskName 'ThorondorAgent' -ErrorAction SilentlyContinue\nUnregister-ScheduledTask -TaskName 'ThorondorAgent' -Confirm:$false -ErrorAction SilentlyContinue\nGet-Process python,python3 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Thorondor-Agent*' } | Stop-Process -Force",
                        purpose: "Detiene y elimina la tarea que arranca el agente y mata procesos Python asociados a Thorondor.",
                        when: "Ejecutar como Administrador.",
                        expected: "Get-ScheduledTask -TaskName ThorondorAgent no devuelve resultados."
                    },
                    {
                        title: "Eliminar ficheros",
                        badge: "Files",
                        command: "Remove-Item -Recurse -Force 'C:\\ProgramData\\Thorondor-Agent'",
                        purpose: "Borra agente, baseline y ficheros auxiliares.",
                        when: "Si algun fichero está bloqueado, confirma que la tarea ya no existe.",
                        expected: "Test-Path 'C:\\ProgramData\\Thorondor-Agent' devuelve False."
                    },
                    ...(this.isLocalDeployment ? [] : [{
                        title: "Cerrar firewall",
                        badge: "Firewall",
                        command: "Remove-NetFirewallRule -DisplayName 'Thorondor Agent' -ErrorAction SilentlyContinue\nRemove-NetFirewallRule -DisplayName 'Thorondor Agent HTTP' -ErrorAction SilentlyContinue",
                        purpose: "Elimina las reglas TCP entrantes del agente.",
                        when: "Si la regla no existe, el error no es crítico.",
                        expected: "La regla deja de aparecer en Get-NetFirewallRule."
                    }])
                ];
            }

            return [
                {
                    title: "Detener servicio",
                    badge: "systemd",
                    command: "THORONDOR_UNITS=\"$(sudo grep -Ril 'Thorondor SIEM Agent\\|thorondor-agent.py' /etc/systemd/system /lib/systemd/system 2>/dev/null | xargs -r -n1 basename | sort -u)\"\nfor unit in $THORONDOR_UNITS; do\n  sudo systemctl stop \"$unit\" 2>/dev/null || true\n  sudo systemctl disable \"$unit\" 2>/dev/null || true\ndone\nprintf '%s\\n' \"$THORONDOR_UNITS\"",
                    purpose: "Localiza unidades systemd de Thorondor por contenido, aunque tengan nombres antiguos como <host>-agent.service, y las detiene.",
                    when: "Ejecutar antes de borrar ficheros. Revisa la lista impresa si tenías unidades personalizadas.",
                    expected: "Las unidades detectadas quedan stopped y disabled."
                },
                {
                    title: "Eliminar unidades, ficheros y procesos",
                    badge: "Files",
                    command: "THORONDOR_UNITS=\"$(sudo grep -Ril 'Thorondor SIEM Agent\\|thorondor-agent.py' /etc/systemd/system /lib/systemd/system 2>/dev/null | sort -u)\"\nprintf '%s\\n' \"$THORONDOR_UNITS\" | xargs -r sudo rm -f\nsudo pkill -f '/opt/thorondor-agent/thorondor-agent.py' 2>/dev/null || true\nsudo pkill -f 'thorondor-agent.py' 2>/dev/null || true\nsudo rm -rf /opt/thorondor-agent /etc/thorondor /var/log/thorondor /usr/local/bin/thorondor /usr/local/bin/thorondor-agent /etc/sudoers.d/thorondor-agent-firewall\nsudo systemctl daemon-reload\nsudo systemctl reset-failed",
                    purpose: "Borra unidades systemd, mata procesos residuales y elimina rutas habituales del agente antiguo y nuevo.",
                    when: "Si quieres conservar el baseline de integridad, cópialo antes.",
                    expected: "No quedan unidades ni procesos Thorondor."
                },
                {
                    title: "Eliminar usuario dedicado",
                    badge: "User",
                    command: "id thorondor >/dev/null 2>&1 && sudo userdel -r thorondor || true",
                    purpose: "Borra la cuenta de servicio si fue creada exclusivamente para Thorondor.",
                    when: "Omitir si reutilizaste un usuario existente.",
                    expected: "id thorondor devuelve no such user."
                },
                ...(this.isLocalDeployment ? [] : [{
                    title: "Cerrar puerto",
                    badge: "Firewall",
                    command: this.isRemoteDeployment
                        ? "# UFW\nsudo ufw delete allow from <IP_PUBLICA_CLIENTE_O_CIDR> to any port <PUERTO> proto tcp\nsudo ufw delete allow <PUERTO>/tcp\n\n# firewalld\nsudo firewall-cmd --permanent --remove-rich-rule='rule family=\"ipv4\" source address=\"<IP_PUBLICA_CLIENTE_O_CIDR>\" port protocol=\"tcp\" port=\"<PUERTO>\" accept'\nsudo firewall-cmd --permanent --remove-port=<PUERTO>/tcp\nsudo firewall-cmd --reload"
                        : "# UFW\nsudo ufw delete allow from <IP_CLIENTE_O_CIDR> to any port <PUERTO> proto tcp\nsudo ufw delete allow <PUERTO>/tcp\n\n# firewalld\nsudo firewall-cmd --permanent --remove-rich-rule='rule family=\"ipv4\" source address=\"<IP_CLIENTE_O_CIDR>\" port protocol=\"tcp\" port=\"<PUERTO>\" accept'\nsudo firewall-cmd --permanent --remove-port=<PUERTO>/tcp\nsudo firewall-cmd --reload",
                    purpose: "Revierte la exposición TCP del agente.",
                    when: "Ejecuta solo el bloque del firewall activo en el host.",
                    expected: "El puerto deja de responder desde el cliente."
                }])
            ];
        }
    },

    methods: {
        localizedSnippet(text) {
            return localizeSnippetText(text);
        },

        copyCmd(text, key) {
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(text).then(() => {
                this.copiedKey = key;
                setTimeout(() => {
                    this.copiedKey = null;
                }, 1800);
            });
        }
    }
};
</script>

<style scoped>
.intro-box .phase-badge-block small:last-child:not(:first-of-type) {
    display: none;
}

.command-stack {
    display: grid;
    gap: 1rem;
}

.command-card {
    background: linear-gradient(180deg, rgba(31, 36, 44, 0.98), rgba(17, 21, 27, 0.98));
}

.beginner-section {
    border-color: rgba(176, 184, 194, 0.24);
}

.beginner-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.85rem;
    margin-top: 1rem;
}

.beginner-card {
    display: grid;
    gap: 0.45rem;
    align-content: start;
    padding: 1rem;
    border: 1px solid rgba(176, 184, 194, 0.16);
    border-radius: 4px;
    background: rgba(16, 20, 26, 0.48);
}

.beginner-card label {
    color: #a9bacb;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.beginner-card strong {
    color: #f8fafc;
    font-size: 0.96rem;
}

.beginner-card p {
    margin: 0;
    color: rgba(226, 235, 244, 0.86);
    font-size: 0.88rem;
    line-height: 1.55;
}

.install-step-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.install-step-card {
    align-content: start;
}

.install-step-card .card-head {
    align-items: flex-start;
}

.step-index {
    display: inline-flex;
    margin-bottom: 0.45rem;
    color: #a9bacb;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.16em;
}

.step-detail-grid {
    display: grid;
    gap: 0.75rem;
    margin-top: 1rem;
    padding-top: 0.95rem;
    border-top: 1px solid rgba(176, 184, 194, 0.18);
}

.step-detail-grid label {
    display: block;
    margin-bottom: 0.25rem;
    color: #a9bacb;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.step-detail-grid p {
    margin: 0;
    color: rgba(226, 235, 244, 0.88);
    font-size: 0.88rem;
    line-height: 1.55;
}

.command-meta {
    display: grid;
    gap: 0.8rem;
}

.validation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.connection-selector-section {
    border-color: rgba(213, 219, 226, 0.32);
    background: linear-gradient(180deg, rgba(32, 37, 45, 0.98), rgba(18, 22, 28, 0.98));
}

.deployment-selector-control {
    display: grid;
    gap: 0.45rem;
    align-self: end;
}

.guide-section-title {
    display: grid;
    gap: 0.45rem;
    margin: 2.35rem 0 1.1rem;
    padding: 1.15rem 1.25rem;
    border-left: 3px solid rgba(176, 184, 194, 0.72);
    background: linear-gradient(90deg, rgba(30, 35, 43, 0.92), rgba(30, 35, 43, 0.2));
}

.guide-section-title--danger {
    border-left-color: rgba(248, 113, 113, 0.68);
}

.guide-section-title span {
    color: #a9bacb;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.guide-section-title h2 {
    margin: 0;
    color: #f8fafc;
    font-size: clamp(1.35rem, 2vw, 1.85rem);
    font-weight: 800;
}

.guide-section-title p {
    margin: 0;
    color: rgba(203, 213, 225, 0.88);
    line-height: 1.65;
}

.meta-line {
    display: grid;
    gap: 0.3rem;
}

.meta-line label {
    color: #a9bacb;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.meta-line p {
    margin: 0;
    color: rgba(226, 235, 244, 0.9);
}

.copy-box {
    position: relative;
    padding-top: 2.7rem;
}

.copy-box .result-pre {
    margin: 0;
}

.copy-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: inline-flex;
    align-items: center;
    padding: 0.32rem 0.78rem;
    border-radius: 4px;
    border: 1px solid rgba(176, 184, 194, 0.34);
    background: rgba(28, 33, 40, 0.94);
    color: #dbe5ef;
    font-size: 0.76rem;
    font-weight: 700;
    cursor: var(--cursor-pointer), pointer;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    white-space: nowrap;
}

.copy-btn:hover {
    border-color: rgba(183, 197, 211, 0.58);
    background: rgba(48, 54, 64, 0.98);
    color: #f8fbff;
}

.copy-btn.copied {
    border-color: rgba(74, 222, 128, 0.5);
    color: #86efac;
}

.os-selector-panel {
    display: grid;
    grid-template-columns: minmax(220px, 340px) minmax(0, 1fr);
    gap: 1rem;
    align-items: center;
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(21, 25, 31, 0.74), rgba(13, 16, 21, 0.82));
}

.os-simple-note {
    display: grid;
    gap: 0.35rem;
    padding-left: 1rem;
    border-left: 1px solid rgba(176, 184, 194, 0.2);
}

.os-simple-note strong {
    color: #f8fafc;
    font-size: 0.92rem;
}

.os-simple-note span {
    color: rgba(203, 213, 225, 0.84);
    line-height: 1.6;
}

@media (max-width: 1199px) {
    .beginner-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .validation-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 767px) {
    .beginner-grid {
        grid-template-columns: 1fr;
    }

    .install-step-grid {
        grid-template-columns: 1fr;
    }

    .os-selector-panel {
        grid-template-columns: 1fr;
    }

    .os-simple-note {
        padding-left: 0;
        padding-top: 0.85rem;
        border-left: 0;
        border-top: 1px solid rgba(176, 184, 194, 0.2);
    }
}
</style>
