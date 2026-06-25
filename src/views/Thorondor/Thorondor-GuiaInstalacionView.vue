<template>
    <ThorondorPageShell>
        <ThorondorAgentInstallerBuilder v-model:target-os="hostOsFamily" />

        <section class="section-box intro-box install-hero">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Instalación simplificada</span>
                    <h1 class="section-name">Instalación del agente</h1>
                    <p class="section-copy">
                        Elige el sistema operativo en el generador, descarga el instalador, déjalo en una carpeta del
                        host y ejecútalo con permisos elevados. El agente quedará instalado con su desinstalador
                        preparado.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">{{ osLabel }}</span>
                    <small>Un fichero, un comando.</small>
                </div>
            </div>

            <div class="install-principles">
                <article v-for="item in principles" :key="item.label" class="install-principle">
                    <label>{{ item.label }}</label>
                    <span>{{ item.copy }}</span>
                </article>
            </div>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Instalar</span>
                    <h2 class="module-title">Copia el fichero y ejecuta</h2>
                    <p class="module-copy">
                        El instalador crea la carpeta real del agente, instala dependencias, detecta módulos/logs
                        disponibles y deja el servicio arrancando automáticamente.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">{{ installerName }}</span>
                    <small>{{ installDir }}</small>
                </div>
            </div>

            <div class="install-detail-grid mb-3">
                <article v-for="detail in installDetails" :key="detail.label" class="install-detail-card">
                    <label>{{ detail.label }}</label>
                    <p>{{ detail.copy }}</p>
                </article>
            </div>

            <div class="command-stack">
                <article v-for="command in installCommands" :key="command.title" class="tool-card command-card">
                    <div class="card-head">
                        <h5>{{ command.title }}</h5>
                        <span class="mini-badge">{{ command.badge }}</span>
                    </div>
                    <p class="section-copy mb-0">{{ command.copy }}</p>
                    <div class="output-box copy-box">
                        <button class="copy-btn" :class="{ copied: copiedKey === command.title }" @click="copyCmd(command.command, command.title)">
                            {{ copiedKey === command.title ? 'Copiado' : 'Copiar' }}
                        </button>
                        <pre class="result-pre">{{ command.command }}</pre>
                    </div>
                </article>
            </div>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Desinstalar</span>
                    <h2 class="module-title">Ejecuta el desinstalador generado</h2>
                    <p class="module-copy">
                        El propio instalador deja este fichero en la carpeta real del agente. No hace falta recordar
                        comandos de limpieza ni borrar servicios a mano.
                    </p>
                </div>
                <div class="phase-badge-block phase-badge-block--danger">
                    <span class="phase-badge">Remove</span>
                    <small>{{ uninstallPath }}</small>
                </div>
            </div>

            <div class="command-stack">
                <article v-for="command in uninstallCommands" :key="command.title" class="tool-card command-card">
                    <div class="card-head">
                        <h5>{{ command.title }}</h5>
                        <span class="mini-badge">{{ command.badge }}</span>
                    </div>
                    <p class="section-copy mb-0">{{ command.copy }}</p>
                    <div class="output-box copy-box">
                        <button class="copy-btn" :class="{ copied: copiedKey === command.title }" @click="copyCmd(command.command, command.title)">
                            {{ copiedKey === command.title ? 'Copiado' : 'Copiar' }}
                        </button>
                        <pre class="result-pre">{{ command.command }}</pre>
                    </div>
                </article>
            </div>
        </section>
    </ThorondorPageShell>
</template>

<script>
import ThorondorAgentInstallerBuilder from "@/components/Thorondor/ThorondorAgentInstallerBuilder.vue";
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";

export default {
    name: "ThorondorGuiaInstalacionView",

    components: {
        ThorondorAgentInstallerBuilder,
        ThorondorPageShell
    },

    data() {
        return {
            copiedKey: null,
            hostOsFamily: "linux"
        };
    },

    computed: {
        isWindowsHostOs() {
            return this.hostOsFamily === "windows";
        },

        osLabel() {
            return this.isWindowsHostOs ? "Windows" : "Linux";
        },

        installerName() {
            return this.isWindowsHostOs ? "thorondor-installer.ps1" : "thorondor-installer.sh";
        },

        installDir() {
            return this.isWindowsHostOs ? "C:\\ProgramData\\Thorondor-Agent" : "/opt/thorondor-agent";
        },

        workDir() {
            return this.isWindowsHostOs ? "C:\\Thorondor-Agent-Installer" : "~/thorondor-agent-installer";
        },

        uninstallPath() {
            return this.isWindowsHostOs
                ? "C:\\ProgramData\\Thorondor-Agent\\thorondor-uninstaller.ps1"
                : "/opt/thorondor-agent/thorondor-uninstaller.sh";
        },

        principles() {
            return [
                {
                    label: "Permisos elevados",
                    copy: this.isWindowsHostOs ? "El instalador pedirá administrador si hace falta." : "Ejecuta con root o sudo."
                },
                {
                    label: "Un único instalador",
                    copy: "El fichero generado contiene agente, configuración y detección automática."
                },
                {
                    label: "Desinstalación directa",
                    copy: `El instalador genera ${this.isWindowsHostOs ? "thorondor-uninstaller.ps1" : "thorondor-uninstaller.sh"}.`
                },
                {
                    label: "Servicio persistente",
                    copy: this.isWindowsHostOs ? "Task Scheduler arranca el agente." : "systemd arranca el agente."
                }
            ];
        },

        installDetails() {
            if (this.isWindowsHostOs) {
                return [
                    {
                        label: "Permisos",
                        copy: "Puedes ejecutarlo desde PowerShell normal; si no está elevado, pedirá permisos de administrador."
                    },
                    {
                        label: "Dependencias",
                        copy: "Usa PowerShell 5.1+ y Python 3.8+. Si falta Python y existe winget, intenta instalarlo automáticamente."
                    },
                    {
                        label: "Instalación",
                        copy: "Crea C:\\ProgramData\\Thorondor-Agent, un venv aislado, el agente, logs, configuración y desinstalador."
                    },
                    {
                        label: "Arranque",
                        copy: "Crea la tarea programada ThorondorAgent como SYSTEM, con nivel Highest, y la inicia al arrancar Windows."
                    },
                    {
                        label: "Red",
                        copy: "Crea una regla inbound TCP para el puerto configurado. Para acceso externo, usa túnel, proxy o NAT controlado."
                    },
                    {
                        label: "Desinstalación",
                        copy: "El desinstalador también pide administrador; elimina tarea, procesos, reglas de firewall del agente y carpetas."
                    }
                ];
            }

            return [
                {
                    label: "Permisos",
                    copy: "El script funciona como root o con sudo. Si no hay sudo y no eres root, se detiene."
                },
                {
                    label: "Dependencias",
                    copy: "Con apt, dnf o pacman instala Python, venv/pip, lm-sensors, smartmontools, dmidecode y pciutils."
                },
                {
                    label: "Instalación real",
                    copy: "Crea /opt/thorondor-agent, usuario de sistema, venv aislado, psutil, agente Python y desinstalador."
                },
                {
                    label: "Arranque",
                    copy: "Crea thorondor-siem-agent.service en systemd, recarga systemd, lo habilita y reinicia el servicio."
                },
                {
                    label: "Permisos de lectura",
                    copy: "Añade el usuario del agente a adm, systemd-journal y docker si existen; detecta logs y módulos disponibles durante la instalación."
                },
                {
                    label: "Red",
                    copy: "El agente escucha en el puerto configurado. Si el host tiene firewall, permite ese puerto de forma controlada o usa un túnel local hacia 127.0.0.1."
                },
                {
                    label: "Operativa controlada",
                    copy: "Crea un sudoers limitado para iptables, ufw, firewall-cmd, smartctl, dmesg y dmidecode."
                }
            ];
        },

        installCommands() {
            if (this.isWindowsHostOs) {
                return [
                    {
                        title: "Preparar carpeta",
                        badge: "Folder",
                        copy: `Deja ${this.installerName} en esta carpeta del host Windows.`,
                        command: `New-Item -ItemType Directory -Force "${this.workDir}" | Out-Null\n# Copia ${this.installerName} dentro de ${this.workDir}\ncd "${this.workDir}"`
                    },
                    {
                        title: "Ejecutar instalador",
                        badge: "Admin",
                        copy: "Ejecuta el instalador. Si PowerShell no está elevado, pedirá permisos de administrador y continuará la instalación.",
                        command: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\\${this.installerName}"`
                    },
                    {
                        title: "Validar instalación",
                        badge: "Check",
                        copy: "Comprueba que el agente responde, que existe el desinstalador y que la tarea programada quedó registrada.",
                        command: `Invoke-RestMethod http://127.0.0.1:53553/health\nTest-Path "${this.uninstallPath}"\nGet-ScheduledTask -TaskName ThorondorAgent -ErrorAction SilentlyContinue`
                    }
                ];
            }

            return [
                {
                    title: "Preparar carpeta",
                    badge: "Folder",
                    copy: `Deja ${this.installerName} en esta carpeta del host Linux.`,
                    command: `mkdir -p ${this.workDir}\n# Copia ${this.installerName} dentro de ${this.workDir}\ncd ${this.workDir}`
                },
                {
                    title: "Ejecutar instalador",
                    badge: "sudo",
                    copy: "Ejecuta con sudo o como root. El script crea /opt/thorondor-agent, instala dependencias, configura permisos y arranca systemd.",
                    command: `chmod +x ./${this.installerName}\nsudo ./${this.installerName}`
                },
                {
                    title: "Validar instalación",
                    badge: "Check",
                    copy: "Comprueba que el servicio responde, que existe el desinstalador y que systemd dejó el servicio activo.",
                    command: `curl -s http://127.0.0.1:53553/health\nsudo test -x "${this.uninstallPath}" && echo "desinstalador ok"\nsudo systemctl status thorondor-siem-agent.service --no-pager`
                }
            ];
        },

        uninstallCommands() {
            return [
                {
                    title: "Ejecutar desinstalador",
                    badge: this.osLabel,
                    copy: this.isWindowsHostOs
                        ? "Ejecuta el desinstalador. Si hace falta, pedirá permisos de administrador y retirará tarea, procesos, reglas y carpetas del agente."
                        : "Ejecuta con sudo o root. Retira systemd, procesos, sudoers limitado, usuario creado por el instalador y carpeta del agente.",
                    command: this.isWindowsHostOs
                        ? `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${this.uninstallPath}"`
                        : `sudo ${this.uninstallPath}`
                }
            ];
        }
    },

    methods: {
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
.install-hero {
    gap: 1rem;
}

.install-principles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.8rem;
    margin-top: 1rem;
}

.install-principle {
    display: grid;
    gap: 0.42rem;
    align-content: start;
    min-height: 6rem;
    padding: 0.9rem;
    border: 1px solid rgba(236, 194, 119, 0.16);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.install-principle label {
    color: #a9bacb;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.install-principle span {
    color: rgba(226, 235, 244, 0.9);
    font-size: 0.88rem;
    line-height: 1.5;
}

.os-picker {
    min-width: min(22rem, 100%);
}

.command-stack {
    display: grid;
    gap: 0.85rem;
}

.install-detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
}

.install-detail-card {
    display: grid;
    gap: 0.35rem;
    min-height: 7rem;
    padding: 0.85rem;
    border: 1px solid rgba(236, 194, 119, 0.16);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.install-detail-card label {
    margin: 0;
    color: #f0bc6a;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.install-detail-card p {
    margin: 0;
    color: rgba(226, 235, 244, 0.88);
    font-size: 0.86rem;
    line-height: 1.45;
}

.command-card {
    background: var(--thorondor-nested-background);
}

.copy-box {
    position: relative;
    margin-top: 0.85rem;
    padding-top: 2.6rem;
}

.copy-box .result-pre {
    margin: 0;
}

.copy-btn {
    position: absolute;
    top: 0.7rem;
    right: 0.7rem;
    display: inline-flex;
    align-items: center;
    min-height: 1.85rem;
    padding: 0.28rem 0.72rem;
    border: 1px solid rgba(236, 194, 119, 0.24);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
    color: #dbe5ef;
    font-size: 0.75rem;
    font-weight: 800;
    cursor: var(--cursor-pointer), pointer;
}

.copy-btn:hover {
    border-color: rgba(236, 194, 119, 0.44);
    color: #f8fbff;
}

.copy-btn.copied {
    border-color: rgba(158, 230, 192, 0.42);
    color: #9ee6c0;
}

.phase-badge-block--danger .phase-badge {
    border-color: rgba(248, 113, 113, 0.36);
    color: #fecaca;
}

@media (max-width: 1199px) {
    .install-principles {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .install-detail-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 767px) {
    .install-principles,
    .install-detail-grid {
        grid-template-columns: 1fr;
    }
}
</style>
