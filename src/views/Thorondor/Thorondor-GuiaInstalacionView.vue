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

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Secuencia</span>
                    <h2 class="module-title">Orden correcto de despliegue</h2>
                    <p class="module-copy">
                        Genera un único instalador desde el formulario, cópialo al host y ejecútalo con permisos de
                        administrador. El propio instalador escribe el agente Python, instala dependencias y configura
                        el arranque automático solo si lo activaste.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Runbook</span>
                    <small>Generar, ejecutar, validar.</small>
                </div>
            </div>

            <div class="card-grid">
                <article class="tool-card" v-for="step in installSteps" :key="step.title">
                    <div class="card-head">
                        <h5>{{ step.title }}</h5>
                        <span class="mini-badge">{{ step.badge }}</span>
                    </div>
                    <p class="section-copy mb-0">{{ step.copy }}</p>
                </article>
            </div>
        </section>

        <div class="guide-section-title">
            <span>Instalación</span>
            <h2>Instalación del agente</h2>
            <p>Prepara el host, valida el endpoint y deja el servicio persistente segun el sistema operativo y el tipo de conexión elegido.</p>
        </div>

        <section class="section-box guide-phase-header">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Host monitorizado</span>
                    <h2 class="module-title">Selecciona sistema objetivo</h2>
                    <p class="module-copy">
                        El formulario descarga un solo instalador directo por sistema: <code>install-thorondor-agent.sh</code>
                        en Linux o <code>install-thorondor-agent.ps1</code> en Windows. Para Windows tambien puede
                        descargar artefactos WiX y compilar un MSI real si necesitas un despliegue formal.
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
                    <span>El instalador de Linux detecta apt, dnf o pacman. En Windows basta con PowerShell administrador; el MSI es opcional.</span>
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
    name: "ThorondorGuiaInstalacionView",

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
                return "El navegador y el agente viven en la misma máquina. El agente escucha en 127.0.0.1 y no necesitas abrir firewall ni exponer puertos a la red.";
            }
            if (this.isLanDeployment) {
                return "El navegador consulta al agente por una IP privada, una VPN o una red de administración. Debes permitir el puerto solo desde el cliente o la subred autorizada.";
            }
            return "El navegador consulta al agente por IP pública o DNS. Usa firewall con origen restringido, HTTPS y proxy frontal si la aplicación se sirve por HTTPS.";
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
                    label: "HTTP pull",
                    copy: "El agente no inicia conexiones salientes. El navegador abre las peticiones hacia la URL base configurada."
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
                    copy: "El modo local guarda historico en IndexedDB. El modo sincronizado conserva snapshots, eventos, logs, reglas y alertas en base de datos."
                }
            ];
        },

        installSteps() {
            return [
                {
                    title: "1. Generar",
                    badge: "Build",
                    copy: `Elige ${this.deploymentScopeLabel}, Linux o Windows, y descarga el instalador. Los ajustes de distro, logs, modulos y servicio quedan con valores por defecto seguros.`
                },
                {
                    title: "2. Ejecutar",
                    badge: "Install",
                    copy: this.isLocalDeployment
                        ? "Ejecuta el .sh con sudo o el .ps1 como administrador. En local no hay que abrir firewall."
                        : "Ejecuta el .sh con sudo o el .ps1 como administrador. Si el host no es local, abre el puerto solo al cliente, VPN o rango autorizado."
                },
                {
                    title: "3. Validar",
                    badge: "HTTP",
                    copy: "Comprueba /health y /telemetry. Si responden, registra el host en el dashboard con la URL que vaya a usar el navegador."
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
                    copy: "El .sh generado contiene el agente Python y la unidad systemd. Ejecútalo en el host Linux con sudo para que cree rutas, dependencias y permisos.",
                    badge: "Linux",
                    note: this.hostOsLabel,
                    commands: [
                        {
                            title: "Copiar instalador al host",
                            badge: "Transfer",
                            command: "scp ./install-thorondor-agent.sh <USUARIO>@<HOST>:/tmp/install-thorondor-agent.sh\nssh <USUARIO>@<HOST>",
                            purpose: "Lleva al sistema monitorizado el único archivo que ha descargado el generador.",
                            when: "También puedes copiarlo por SFTP, USB, consola cloud o cualquier canal seguro que ya uses.",
                            expected: "El host tiene /tmp/install-thorondor-agent.sh listo para ejecutar."
                        },
                        {
                            title: "Ejecutar instalador",
                            badge: "Install",
                            command: "chmod +x /tmp/install-thorondor-agent.sh\nsudo /tmp/install-thorondor-agent.sh",
                            purpose: "Crea /opt/thorondor-agent, escribe thorondor-agent.py, instala psutil, prepara permisos y configura systemd si activaste autoarranque.",
                            when: "Si desactivaste autoarranque, el script deja el agente listo pero no registra el servicio.",
                            expected: "Mensaje de instalación completada y, si hay autoarranque, servicio activo."
                        },
                        {
                            title: "Comprobar ficheros creados",
                            badge: "Files",
                            command: "sudo ls -la /opt/thorondor-agent\nsudo find /etc/systemd/system -maxdepth 1 \\( -iname '*thorondor*.service' -o -iname '*-agent.service' \\) -print",
                            purpose: "Verifica que el instalador ha reconstruido el .py y la unidad systemd desde el único .sh.",
                            when: "La segunda línea puede no devolver unidad si elegiste arranque manual.",
                            expected: "Aparece /opt/thorondor-agent/thorondor-agent.py y, si procede, el servicio configurado."
                        }
                    ]
                },
                {
                    kicker: "Servicio",
                    title: this.isLocalDeployment ? "Validación local" : "Validación de servicio y red",
                    copy: this.isLocalDeployment
                        ? "Valida que el agente responde en 127.0.0.1 y que no has abierto exposición de red innecesaria."
                        : "Valida que el servicio esta activo y abre firewall solo al cliente, VPN o red de administración que corresponda.",
                    badge: "Validate",
                    note: "Después de instalar",
                    commands: [
                        {
                            title: "Validar health y telemetry",
                            badge: "HTTP",
                            command: "curl -s http://127.0.0.1:<PUERTO>/health\ncurl -s http://127.0.0.1:<PUERTO>/telemetry | python3 -m json.tool | head -40",
                            purpose: "Comprueba que el proceso responde y que el payload JSON tiene estructura válida.",
                            when: "Si falla la importación de psutil, reejecuta el instalador y revisa la salida de pip.",
                            expected: "JSON con status ok y telemetría con system, metrics, security, logs y heartbeat."
                        },
                        {
                            title: "Revisar servicio",
                            badge: "systemd",
                            command: "systemctl list-units --type=service --all --no-pager | grep -i thorondor\nsystemctl status <SERVICIO>.service --no-pager\nsystemctl show <SERVICIO>.service -p ActiveState,NRestarts,ExecMainStatus --value\njournalctl -u <SERVICIO>.service -n 40 --no-pager",
                            purpose: "Comprueba que systemd mantiene vivo el agente generado por el instalador.",
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
                    copy: "El .ps1 generado contiene el agente Python y la configuración de Task Scheduler. PowerShell debe ejecutarse como Administrador.",
                    badge: "Windows",
                    note: "PowerShell administrador",
                    commands: [
                        {
                            title: "Abrir PowerShell administrador",
                            badge: "Admin",
                            command: "Start-Process PowerShell -Verb RunAs\nSet-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass",
                            purpose: "Prepara una sesión elevada para que el instalador pueda escribir en ProgramData, instalar psutil y crear la tarea programada.",
                            when: "La política se aplica solo al proceso actual.",
                            expected: "La consola elevada permite ejecutar scripts locales."
                        },
                        {
                            title: "Ejecutar instalador",
                            badge: "Install",
                            command: "cd <CARPETA_DONDE_DESCARGASTE_EL_PS1>\n.\\install-thorondor-agent.ps1",
                            purpose: "Crea C:\\ProgramData\\Thorondor-Agent, escribe thorondor-agent.py, instala psutil, prepara firewall si el alcance no es local y registra Task Scheduler si activaste autoarranque.",
                            when: "Si Python no existe, el instalador intentara instalarlo con winget.",
                            expected: "Mensaje de instalación completada y health check local funcionando."
                        },
                        {
                            title: "Compilar MSI opcional",
                            badge: "MSI",
                            command: "cd <CARPETA_DONDE_DESCARGASTE_LOS_ARCHIVOS>\n.\\build-thorondor-msi.ps1\nmsiexec /i .\\ThorondorAgent.msi",
                            purpose: "Compila un Windows Installer real con WiX usando el .ps1 generado y el manifiesto thorondor-agent.wxs.",
                            when: "Usalo si quieres distribuir por GPO, inventario o instalacion formal. Requiere WiX Toolset o .NET SDK para instalarlo como herramienta.",
                            expected: "Aparece ThorondorAgent.msi en la carpeta y el MSI ejecuta el mismo instalador elevado."
                        },
                        {
                            title: "Comprobar ficheros creados",
                            badge: "Files",
                            command: "Get-ChildItem 'C:\\ProgramData\\Thorondor-Agent'\nGet-ScheduledTask -TaskName 'ThorondorAgent' -ErrorAction SilentlyContinue",
                            purpose: "Verifica que el instalador ha reconstruido el .py y, si procede, la tarea programada desde el único .ps1.",
                            when: "La tarea no existirá si elegiste arranque manual.",
                            expected: "C:\\ProgramData\\Thorondor-Agent contiene thorondor-agent.py."
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
                            command: "Invoke-RestMethod http://127.0.0.1:<PUERTO>/health\nInvoke-RestMethod http://127.0.0.1:<PUERTO>/telemetry",
                            purpose: "Comprueba el endpoint de salud y el payload completo en localhost.",
                            when: "Si el puerto esta ocupado, cambia el puerto en el generador y regenera el agente.",
                            expected: "Objetos JSON con status ok, port, heartbeat, system y metrics."
                        },
                        {
                            title: "Revisar tarea programada",
                            badge: "Schedule",
                            command: "Get-ScheduledTask -TaskName 'ThorondorAgent' | Select-Object TaskName,State\nGet-ScheduledTaskInfo -TaskName 'ThorondorAgent'",
                            purpose: "Comprueba que Task Scheduler ha quedado registrado y sin errores recientes.",
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
                                : "Usa Profile Private si es una LAN confiable y restringe RemoteAddress a cliente, VPN o subred de administración.",
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
                    confirms: "El proceso esta vivo y escucha en el puerto configurado.",
                    expected: "JSON con status ok, heartbeat y nombre del sistema."
                },
                {
                    title: "Telemetry local",
                    badge: "JSON",
                    copy: "Comprueba estructura de payload antes de abrirlo a la red.",
                    command: this.isWindowsHostOs
                        ? "Invoke-RestMethod http://127.0.0.1:<PUERTO>/telemetry | ConvertTo-Json -Depth 4"
                        : "curl -s http://127.0.0.1:<PUERTO>/telemetry | python3 -m json.tool | grep -E '\"(system|metrics|security|logs|heartbeat)\"'",
                    confirms: "El payload contiene los bloques raíz que consume Vuex.",
                    expected: "Aparecen system, metrics, security, logs y heartbeat."
                }
            ];

            if (this.isWindowsHostOs) {
                checks.push({
                    title: "Estado de Task Scheduler",
                    badge: "Windows",
                    copy: "Detecta errores de arranque automático cuando el formulario genero tarea programada.",
                    command: "Get-ScheduledTask -TaskName 'ThorondorAgent' -ErrorAction SilentlyContinue | Select-Object TaskName,State\nGet-ScheduledTaskInfo -TaskName 'ThorondorAgent' -ErrorAction SilentlyContinue",
                    confirms: "Tarea creada, estado Ready o Running y ultima ejecución sin error.",
                    expected: "LastTaskResult igual a 0 cuando la tarea ya se ejecuto."
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
                    copy: "Comprueba que el navegador no bloqueara la peticion por mixed content.",
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
                        when: "Si algun fichero esta bloqueado, confirma que la tarea ya no existe.",
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
    .validation-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 767px) {
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
