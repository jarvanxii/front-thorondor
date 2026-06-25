<template>
    <ThorondorPageShell>
        <section class="home-overview" aria-labelledby="thorondor-home-title">
            <div class="home-overview-main">
                <div class="hero-brand-panel">
                    <img class="hero-wordmark" src="@/assets/images/brand/logo_completo_thorondor.png"
                        alt="Thorondor SIEM" />
                    <h1 id="thorondor-home-title" class="sr-only">Thorondor</h1>
                </div>
                <div class="hero-message">
                    <span class="section-kicker">Consola SIEM para equipos autorizados</span>
                    <h2>Qué hace Thorondor por ti</h2>
                    <p class="hero-summary">
                        Thorondor te ayuda a saber qué está pasando en tus servidores, ver señales importantes en una
                        sola consola y actuar con control cuando algo necesita atención.
                    </p>
                </div>
                <dl class="hero-status-bar" aria-label="Estado de Thorondor">
                    <div v-for="item in heroStats" :key="item.label">
                        <dt>{{ item.label }}</dt>
                        <dd :class="item.tone">{{ item.value }}</dd>
                    </div>
                </dl>
            </div>
            <p class="home-overview-note">
                Cualquier usuario puede trabajar en local con IndexedDB. Cuando una cuenta está autorizada, Thorondor
                guarda automáticamente el histórico en el servidor para trabajar de forma continuada.
            </p>
        </section>

        <section class="section-box agent-capabilities-section">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Cómo funciona</span>
                    <h2 class="module-title">Un agente por cada equipo que quieras vigilar</h2>
                    <p class="module-copy">
                        Instalas un agente ligero en cada equipo que quieras monitorizar. El agente recoge el estado del sistema, los
                        eventos relevantes y las señales de seguridad disponibles. Thorondor ordena esa información para
                        que puedas revisarla sin saltar entre herramientas.
                    </p>
                </div>
            </div>

            <div class="card-grid capabilities-grid">
                <article class="tool-card capability-card" v-for="item in agentCapabilities" :key="item.label">
                    <div class="card-head">
                        <h5>{{ item.label }}</h5>
                        <span class="mini-badge">{{ item.badge }}</span>
                    </div>
                    <p class="section-copy mb-0">{{ item.copy }}</p>
                </article>
            </div>
        </section>

        <section class="section-box telemetry-summary-section" aria-labelledby="agent-telemetry-title">
            <header class="telemetry-summary-header">
                <span class="section-kicker">Telemetría recogida</span>
                <h2 id="agent-telemetry-title" class="module-title">Qué informa cada agente</h2>
                <p class="module-copy">
                    Cada agente envía una lectura ordenada del host monitorizado. La consola muestra lo que existe en
                    cada sistema: si un sensor, log o servicio no está disponible, se omite en lugar de generar ruido.
                </p>
            </header>

            <ul class="telemetry-list" aria-label="Resumen de telemetría y métricas del agente">
                <li v-for="group in agentTelemetryGroups" :key="group.label" class="telemetry-row">
                    <strong>{{ group.label }}</strong>
                    <span>{{ group.summary }}</span>
                    <ul class="telemetry-metrics" :aria-label="`Métricas de ${group.label}`">
                        <li v-for="metric in group.metrics" :key="metric.name">
                            <b>{{ metric.name }}</b>
                            <span>{{ metric.detail }}</span>
                        </li>
                    </ul>
                </li>
            </ul>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Datos de trabajo</span>
                    <h2 class="module-title">Dónde se conserva la información</h2>
                    <p class="module-copy">
                        Thorondor conserva la información de dos formas. Los usuarios no autorizados guardan agentes,
                        logs, reglas, alertas y preferencias en IndexedDB del navegador. Cuando la cuenta está
                        autorizada, la API guarda el histórico en la base de datos del servidor e IndexedDB sigue
                        funcionando como caché local.
                    </p>
                </div>
            </div>

            <section class="metric-grid storage-grid">
                <article class="signal-card" v-for="item in storageCards" :key="item.label">
                    <label>{{ item.label }}</label>
                    <span :class="item.tone">{{ item.value }}</span>
                    <small>{{ item.note }}</small>
                </article>
            </section>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Forma de uso</span>
                    <h2 class="module-title">Del primer agente a la operación diaria</h2>
                    <p class="module-copy">
                        El objetivo es que puedas instalar un agente, registrarlo en la consola, confirmar que envía
                        información y empezar a trabajar sobre alertas, eventos y acciones desde una interfaz clara.
                    </p>
                </div>
            </div>

            <div class="guide-grid">
                <div class="guide-card" v-for="step in startSteps" :key="step.label">
                    <label>{{ step.label }}</label>
                    <span>{{ step.copy }}</span>
                </div>
            </div>
        </section>

    </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";

export default {
    name: "ThorondorView",

    components: {
        ThorondorPageShell
    },

    mixins: [thorondorBaseMixin],

    computed: {
        heroStats() {
            return [
                {
                    label: "Equipos",
                    value: String(this.dashboardCards.length),
                    tone: "tone-blue"
                },
                {
                    label: "Alertas abiertas",
                    value: String(this.activeAlerts.length),
                    tone: this.activeAlerts.length ? "tone-warning" : "tone-success"
                },
                {
                    label: "Eventos recientes",
                    value: String(this.eventsLast24h.length),
                    tone: "tone-neutral"
                }
            ];
        },

        storageCards() {
            return [
                {
                    label: "Persistencia activa",
                    value: this.thorondorState.persistence?.effectiveMode === "cloud" ? "Servidor + IDB" : "IndexedDB",
                    tone: "tone-success",
                    note: this.persistenceWindowNote
                },
                {
                    label: "Lecturas recibidas",
                    value: String(Object.values(this.thorondorSnapshots).flat().length),
                    tone: "tone-blue",
                    note: "Últimos estados recibidos de los equipos."
                },
                {
                    label: "Limpieza automática",
                    value: this.thorondorState.lastSweepAt ? this.formatRelativeTime(this.thorondorState.lastSweepAt) : "Pendiente",
                    tone: "tone-neutral",
                    note: "Thorondor evita acumular datos antiguos sin control."
                }
            ];
        },

        persistenceWindowNote() {
            return this.thorondorState.persistence?.effectiveMode === "cloud"
                ? "Histórico sincronizado en servidor con caché IndexedDB local."
                : "Histórico local en IndexedDB hasta la limpieza automática.";
        },

        agentCapabilities() {
            return [
                {
                    label: "Estado del equipo",
                    badge: "Equipo",
                    copy: "Thorondor muestra si el agente está activo, cuándo fue la última señal y qué sistema está vigilando."
                },
                {
                    label: "Rendimiento y hardware",
                    badge: "Uso",
                    copy: "Puedes ver uso de CPU, memoria, discos, temperaturas y otros sensores cuando el equipo los ofrece."
                },
                {
                    label: "Procesos",
                    badge: "Proc",
                    copy: "La consola ayuda a entender qué se está ejecutando, cuánto consume y con qué usuario está funcionando."
                },
                {
                    label: "Red",
                    badge: "Net",
                    copy: "Revisa puertos abiertos, conexiones activas e interfaces para detectar exposición o actividad inesperada."
                },
                {
                    label: "Usuarios y accesos",
                    badge: "Acceso",
                    copy: "Consulta usuarios, grupos, inicios de sesión, errores de autenticación y cambios que puedan requerir revisión."
                },
                {
                    label: "Alertas y respuesta",
                    badge: "Acción",
                    copy: "Cuando aparece un patrón relevante, Thorondor lo convierte en alerta y permite ejecutar acciones autorizadas."
                }
            ];
        },

        agentTelemetryGroups() {
            return [
                {
                    label: "Identidad y salud del agente",
                    summary: "Permite saber qué host responde, desde dónde responde y si la última lectura es válida.",
                    metrics: [
                        { name: "Host", detail: "nombre visible, sistema operativo, versión, IP/DNS y puerto configurado." },
                        { name: "Heartbeat", detail: "fecha de última señal, estado de /health y errores de colección." },
                        { name: "Persistencia", detail: "IndexedDB para usuarios sin autorizar y servidor Thorondor para cuentas autorizadas." }
                    ]
                },
                {
                    label: "Sistema y hardware",
                    summary: "Resume inventario físico y uso actual del equipo monitorizado.",
                    metrics: [
                        { name: "CPU", detail: "modelo, fabricante, núcleos, carga total y uso por núcleo cuando está disponible." },
                        { name: "Memoria", detail: "RAM instalada, memoria usada, memoria libre y porcentaje de ocupación." },
                        { name: "Discos", detail: "particiones, espacio usado/libre, discos físicos y estado SMART si el host lo permite." },
                        { name: "Sensores", detail: "temperaturas, ventiladores, batería y GPU con uso, VRAM, driver y temperatura si se puede leer." }
                    ]
                },
                {
                    label: "Procesos y servicios",
                    summary: "Ayuda a entender qué se está ejecutando y qué puede estar consumiendo recursos.",
                    metrics: [
                        { name: "Procesos", detail: "PID, nombre, usuario, CPU, memoria, ruta y comando de arranque." },
                        { name: "Servicios", detail: "servicios detectados, estado, arranque y cambios frente al baseline." },
                        { name: "Tareas", detail: "tareas programadas o unidades persistentes relevantes para el arranque." }
                    ]
                },
                {
                    label: "Red y exposición",
                    summary: "Muestra cómo se comunica el host y qué superficie queda abierta.",
                    metrics: [
                        { name: "Interfaces", detail: "interfaces activas, direcciones, tráfico y tasas de red cuando están disponibles." },
                        { name: "Puertos", detail: "puertos en escucha, protocolo, proceso asociado y exposición local/remota." },
                        { name: "Conexiones", detail: "conexiones activas, estados, IPs remotas y procesos relacionados." },
                        { name: "Firewall", detail: "reglas activas y reglas propias de Thorondor separadas para no romper configuración del sistema." }
                    ]
                },
                {
                    label: "Usuarios y accesos",
                    summary: "Centraliza identidad local, grupos y actividad de autenticación.",
                    metrics: [
                        { name: "Usuarios", detail: "usuarios locales, grupos, cuentas privilegiadas y usuarios conectados." },
                        { name: "Logins", detail: "últimos accesos correctos y fallidos, IPs repetidas y usuarios más atacados." },
                        { name: "Privilegios", detail: "sudo en Linux, elevaciones relevantes en Windows y cambios en grupos sensibles." }
                    ]
                },
                {
                    label: "Logs, seguridad y cambios",
                    summary: "Convierte logs nativos y señales del sistema en eventos útiles para revisar.",
                    metrics: [
                        { name: "Logs detectados", detail: "web, base de datos, PHP, firewall, IDS y eventos del sistema si existen en el host." },
                        { name: "Integridad", detail: "hashes de archivos críticos y cambios en ficheros sensibles." },
                        { name: "Baseline", detail: "cambios de usuarios, servicios, puertos, tareas, firewall y componentes persistentes." },
                        { name: "Respuesta", detail: "acciones ejecutadas, bloqueos de IP, recolección de logs y trazabilidad de comandos." }
                    ]
                }
            ];
        },

        startSteps() {
            return [
                {
                    label: "1. Genera el instalador",
                    copy: "Genera el instalador para Linux o Windows y deja preparado el servicio que recogerá la información."
                },
                {
                    label: "2. Instala el agente",
                    copy: "Copia el fichero en el equipo destino y ejecútalo con los permisos necesarios. El instalador deja también el desinstalador."
                },
                {
                    label: "3. Registra el agente",
                    copy: "Indica en Thorondor el nombre, la IP o DNS y el puerto por el que la consola debe consultar ese equipo."
                },
                {
                    label: "4. Opera con contexto",
                    copy: "Revisa estado, hardware, red, usuarios, logs, alertas y acciones desde las vistas del host seleccionado."
                }
            ];
        }
    }
};
</script>

<style scoped>
.home-overview {
    position: relative;
    isolation: isolate;
    display: grid;
    gap: 12px;
    margin-bottom: 14px;
    min-height: 0;
    padding: clamp(14px, 1.6vw, 18px) clamp(16px, 2.2vw, 24px);
    overflow: hidden;
    border: 1px solid rgba(236, 194, 119, 0.18);
    border-radius: 6px;
    background: var(--thorondor-panel-background);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.035),
        0 12px 28px rgba(0, 0, 0, 0.2);
}

.home-overview::before {
    display: none;
}

.home-overview::after {
    content: "";
    position: absolute;
    inset: auto 26px 0;
    z-index: -1;
    height: 1px;
    background: linear-gradient(90deg, rgba(236, 194, 119, 0.56), rgba(236, 194, 119, 0.12), transparent);
}

.home-overview-main {
    display: grid;
    grid-template-columns: minmax(130px, 160px) minmax(300px, 1fr) minmax(210px, 250px);
    gap: clamp(14px, 2vw, 24px);
    min-width: 0;
    align-items: center;
}

.hero-brand-panel {
    display: grid;
    gap: 9px;
    min-width: 0;
    align-content: center;
}

.hero-wordmark {
    display: block;
    width: min(100%, clamp(126px, 10.8vw, 150px));
    height: auto;
    object-fit: contain;
    object-position: left center;
    filter: contrast(1.04) saturate(1.02) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.26));
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.hero-message {
    display: grid;
    gap: 6px;
    min-width: 0;
}

.hero-message h2 {
    margin: 0;
    color: #f8fafc;
    font-size: clamp(1.18rem, 1.6vw, 1.48rem);
    line-height: 1.15;
}

.hero-summary {
    max-width: 48ch;
    margin: 0;
    color: #c9d3df;
    font-size: 0.94rem;
    line-height: 1.45;
}

.hero-status-bar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    min-width: 0;
    margin: 0;
    padding: 0;
    width: min(100%, 250px);
    justify-self: end;
    border: 1px solid rgba(196, 204, 214, 0.16);
    background: var(--thorondor-nested-background);
}

.hero-status-bar div {
    display: flex;
    min-height: 38px;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 7px 10px;
}

.hero-status-bar div + div {
    border-top: 1px solid rgba(196, 204, 214, 0.16);
}

.hero-status-bar dt {
    margin: 0;
    color: #96a4b4;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.hero-status-bar dd {
    margin: 0;
    color: #f8fafc;
    font-size: 1rem;
    font-weight: 900;
}

.home-overview-note {
    margin: 0;
    padding-top: 10px;
    border-top: 1px solid rgba(196, 204, 214, 0.14);
    color: #aebac8;
    font-size: 0.9rem;
    line-height: 1.45;
}

.storage-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.section-box {
    display: grid;
    gap: clamp(18px, 1.8vw, 24px);
}

.section-box .section-topline {
    margin-bottom: 0;
}

.section-box .module-header {
    gap: 0.62rem;
}

.section-box .module-copy {
    max-width: 82ch;
}

.capabilities-grid,
.storage-grid,
.guide-grid {
    gap: clamp(14px, 1.35vw, 18px);
}

.capability-card,
.storage-grid .signal-card,
.guide-grid .guide-card {
    padding: clamp(15px, 1.25vw, 18px);
}

.capability-card .card-head {
    margin-bottom: 0.5rem;
}

.guide-grid .guide-card {
    gap: 0.72rem;
}

.agent-capabilities-section .section-topline {
    align-items: center;
}

.agent-capabilities-section .module-copy {
    max-width: 68ch;
}

.capabilities-grid .tool-card {
    min-height: 0;
}

.capabilities-grid .section-copy {
    max-width: 58ch;
    font-size: 0.94rem;
    line-height: 1.48;
}

.telemetry-summary-section {
    display: grid;
    gap: 1rem;
}

.telemetry-summary-header {
    display: grid;
    gap: 0.42rem;
    max-width: 76ch;
}

.telemetry-summary-header .module-title,
.telemetry-summary-header .module-copy {
    margin: 0;
}

.telemetry-list,
.telemetry-metrics {
    margin: 0;
    padding: 0;
    list-style: none;
}

.telemetry-list {
    display: grid;
    border-top: 1px solid rgba(190, 205, 218, 0.14);
}

.telemetry-row {
    display: grid;
    grid-template-columns: minmax(180px, 0.28fr) minmax(220px, 0.42fr) minmax(360px, 1fr);
    gap: 1rem;
    align-items: start;
    padding: 0.95rem 0;
    border-bottom: 1px solid rgba(190, 205, 218, 0.14);
}

.telemetry-row > strong {
    color: #f8fafc;
    font-size: 0.96rem;
    line-height: 1.3;
}

.telemetry-row > span {
    color: #c8d4e1;
    font-size: 0.9rem;
    line-height: 1.48;
}

.telemetry-metrics {
    display: grid;
    gap: 0.45rem;
}

.telemetry-metrics li {
    display: grid;
    grid-template-columns: minmax(96px, 0.28fr) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: baseline;
}

.telemetry-metrics b {
    color: #f0bc6a;
    font-size: 0.75rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    line-height: 1.35;
    text-transform: uppercase;
}

.telemetry-metrics span {
    color: #d7e1ec;
    font-size: 0.88rem;
    line-height: 1.45;
}

@media (max-width: 1180px) {
    .home-overview-main {
        grid-template-columns: minmax(124px, 150px) minmax(300px, 1fr);
    }

    .hero-status-bar {
        grid-column: 1 / -1;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        width: 100%;
        justify-self: stretch;
    }

    .hero-status-bar div + div {
        border-top: 0;
        border-left: 1px solid rgba(196, 204, 214, 0.16);
    }

    .telemetry-row {
        grid-template-columns: minmax(180px, 0.35fr) minmax(0, 1fr);
    }

    .telemetry-metrics {
        grid-column: 1 / -1;
    }
}

@media (max-width: 760px) {
    .home-overview {
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 6px;
    }

    .home-overview-main {
        position: relative;
        z-index: 0;
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .hero-brand-panel {
        position: absolute;
        top: -4px;
        right: -8px;
        z-index: 0;
        opacity: 0.14;
        pointer-events: none;
    }

    .hero-message,
    .hero-status-bar {
        position: relative;
        z-index: 1;
    }

    .hero-wordmark {
        width: 154px;
        max-width: none;
    }

    .hero-message h2 {
        max-width: 18ch;
        font-size: clamp(1.22rem, 6vw, 1.52rem);
    }

    .hero-summary {
        max-width: 32ch;
        font-size: 0.92rem;
        line-height: 1.45;
    }

    .home-overview-note {
        font-size: 0.86rem;
        line-height: 1.42;
    }

    .hero-status-bar {
        grid-column: 1 / -1;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        width: 100%;
        max-width: none;
        justify-self: stretch;
        border-color: rgba(196, 204, 214, 0.13);
    }

    .hero-status-bar div {
        display: grid;
        padding: 9px 8px;
        justify-content: start;
        gap: 2px;
    }

    .hero-status-bar dt {
        font-size: 0.72rem;
    }

    .hero-status-bar dd {
        font-size: 1rem;
    }

    .storage-grid {
        grid-template-columns: 1fr;
    }

    .telemetry-row {
        grid-template-columns: 1fr;
        gap: 0.42rem;
        padding: 0.9rem 0;
    }

    .telemetry-metrics li {
        grid-template-columns: 1fr;
        gap: 0.12rem;
        padding-left: 0.6rem;
        border-left: 2px solid rgba(236, 194, 119, 0.28);
    }
}

@media (max-width: 420px) {
    .hero-wordmark {
        width: 140px;
    }

    .hero-status-bar dt {
        font-size: 0.7rem;
    }

    .hero-status-bar dd {
        font-size: 0.92rem;
    }
}
</style>
