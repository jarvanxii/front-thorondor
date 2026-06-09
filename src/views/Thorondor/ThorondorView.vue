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
                    <span class="section-kicker">SIEM para infraestructura propia</span>
                    <h2>Modelo operativo</h2>
                    <p class="hero-summary">
                        Monitoriza hosts Linux y Windows, centraliza eventos y opera agentes con persistencia local o
                        API centralizada.
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
                Despliegue directo: laboratorio con IndexedDB, producción con API y base de datos.
            </p>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Arquitectura</span>
                    <h2 class="module-title">Flujo técnico extremo a extremo</h2>
                    <p class="module-copy">
                        El generador produce un agente Python parametrizado (host, puerto, módulos, usuario de servicio)
                        que se despliega en el sistema destino. El frontend realiza polling HTTP al agente, decodifica
                        el JSON de telemetría, lo persiste en el modo activo (IndexedDB local o base de datos) y
                        aplica las reglas de correlación registradas. Solo hace falta conectividad directa desde el
                        navegador hasta la URL registrada del agente.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Flow</span>
                    <small>Backend opcional para cuenta.</small>
                </div>
            </div>

            <div class="card-grid">
                <article class="tool-card" v-for="item in architectureCards" :key="item.label">
                    <div class="card-head">
                        <h5>{{ item.label }}</h5>
                        <span class="mini-badge">{{ item.badge }}</span>
                    </div>
                    <p class="section-copy mb-0">{{ item.copy }}</p>
                </article>
            </div>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Persistencia</span>
                    <h2 class="module-title">Qué guarda el navegador y cómo se limpia</h2>
                    <p class="module-copy">
                        Thorondor usa Vuex con una capa de persistencia intercambiable: IndexedDB local o API con base de
                        datos. Lo antiguo se purga automáticamente.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">{{ persistenceBadge }}</span>
                    <small>{{ persistenceNote }}</small>
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
                    <span class="section-kicker">Primeros pasos</span>
                    <h2 class="module-title">Ruta recomendada para empezar sin perderte</h2>
                    <p class="module-copy">
                        Si vas a usar Thorondor por primera vez, sigue este orden. La barra lateral ya enlaza cada paso
                        a su vista correspondiente para que puedas avanzar sin volver atrás.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Onboarding</span>
                    <small>Secuencia pensada para principiantes.</small>
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
                    label: "Hosts",
                    value: String(this.dashboardCards.length),
                    tone: "tone-blue"
                },
                {
                    label: "Alertas",
                    value: String(this.activeAlerts.length),
                    tone: this.activeAlerts.length ? "tone-warning" : "tone-success"
                },
                {
                    label: "Eventos 24h",
                    value: String(this.eventsLast24h.length),
                    tone: "tone-neutral"
                }
            ];
        },

        storageCards() {
            return [
                {
                    label: "Retención",
                    value: `${this.thorondorState.retentionDays} días`,
                    tone: "tone-success",
                    note: this.persistenceWindowNote
                },
                {
                    label: "Snapshots",
                    value: String(Object.values(this.thorondorSnapshots).flat().length),
                    tone: "tone-blue",
                    note: "Histórico resumido por host monitorizado."
                },
                {
                    label: "Última limpieza",
                    value: this.thorondorState.lastSweepAt ? this.formatRelativeTime(this.thorondorState.lastSweepAt) : "Pendiente",
                    tone: "tone-neutral",
                    note: "Thorondor borra histórico antiguo para no saturar memoria."
                }
            ];
        },

        persistenceBadge() {
            return this.thorondorState.persistence?.effectiveMode === "cloud" ? "Cloud DB" : "IndexedDB";
        },

        persistenceNote() {
            return this.thorondorState.persistence?.effectiveMode === "cloud"
                ? "Sincronización por workspace."
                : "Persistencia local del navegador.";
        },

        persistenceWindowNote() {
            return this.thorondorState.persistence?.effectiveMode === "cloud"
                ? "Ventana operativa sincronizada con caché local."
                : "Ventana local antes del purgado automático.";
        },

        architectureCards() {
            return [
                {
                    label: "1. Genera el agente",
                    badge: "Frontend",
                    copy: "El generador pide lo mínimo: alcance de red, Linux o Windows, host, URL y puerto. Linux descarga un único .sh; Windows descarga un asistente que crea e instala ThorondorAgent.msi sin piezas sueltas."
                },
                {
                    label: "2. Despliega en el host",
                    badge: "Host",
                    copy: "Linux: cuenta sin shell, /opt/thorondor-agent/, venv propio, grupos adm+systemd-journal y unidad systemd. Windows: C:\\ProgramData\\Thorondor-Agent\\, MSI, psutil y tarea en Task Scheduler con RunLevel Highest."
                },
                {
                    label: "3. El navegador hace polling",
                    badge: "Polling",
                    copy: "Petición HTTP GET al /telemetry del agente cada N segundos. El agente responde JSON con system, metrics (CPU, RAM, disco por partición, temperatura), security (logins, sudo, file integrity) y logs."
                },
                {
                    label: "4. Persistencia de datos",
                    badge: "Storage",
                    copy: "El store Vuex decodifica el payload y lo distribuye por la fachada de persistencia: IndexedDB local o API con base de datos. IndexedDB queda siempre como caché local."
                },
                {
                    label: "5. Correlación y alertas",
                    badge: "Rules",
                    copy: "El motor de reglas JavaScript evalúa thresholds de CPU, RAM, heartbeat, frecuencia de fallos de autenticación, sudo fuera de whitelist y cambios en el baseline de integridad de archivos."
                },
                {
                    label: "6. Exposición remota",
                    badge: "Network",
                    copy: "Para remoto, registra una URL que el navegador pueda resolver. Si es pública, usa firewall con origen restringido, HTTPS y proxy frontal cuando el frontend se sirva por HTTPS."
                }
            ];
        },

        startSteps() {
            return [
                {
                    label: "Paso 1 — Guía de instalación",
                    copy: "Selecciona solo Linux o Windows y sigue el flujo directo: generar instalador único, ejecutarlo como administrador y validar endpoints."
                },
                {
                    label: "Paso 2 — Generador de agentes",
                    copy: "Rellena hostname, URL accesible, IP o DNS del host, alcance de red y puerto (ej. 8765). Toca los ajustes avanzados solo si necesitas cambiar logs, módulos o servicio."
                },
                {
                    label: "Paso 3 — Despliega y valida",
                    copy: "Copia el instalador al host, ejecútalo como administrador, valida /health y /telemetry y revisa systemd o Task Scheduler si activaste autoarranque. En Windows el asistente genera e instala el MSI."
                },
                {
                    label: "Paso 4 — Dashboard y alertas",
                    copy: "El host aparece en el dashboard con heartbeat, CPU, RAM y disco. Ajusta las reglas de monitorización según el rol del sistema y revisa las alertas desde la vista de reglas."
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
    gap: 14px;
    margin-bottom: 18px;
    min-height: 0;
    padding: clamp(14px, 1.8vw, 22px) clamp(18px, 2.6vw, 30px);
    overflow: hidden;
    border: 1px solid rgba(236, 194, 119, 0.18);
    border-radius: 4px;
    background: var(--thorondor-panel-background);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 18px 42px rgba(0, 0, 0, 0.28);
}

.home-overview::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.026), transparent 45%);
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
    grid-template-columns: minmax(140px, 180px) minmax(300px, 1fr) minmax(220px, 270px);
    gap: clamp(18px, 2.4vw, 34px);
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
    width: min(100%, clamp(140px, 12vw, 168px));
    height: auto;
    object-fit: contain;
    object-position: left center;
    filter: contrast(1.06) saturate(1.04) drop-shadow(0 10px 16px rgba(0, 0, 0, 0.32));
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
    gap: 7px;
    min-width: 0;
}

.hero-message h2 {
    margin: 0;
    color: #f8fafc;
    font-size: clamp(1.28rem, 2vw, 1.8rem);
    line-height: 1.05;
}

.hero-summary {
    max-width: 48ch;
    margin: 0;
    color: #c9d3df;
    font-size: clamp(0.9rem, 0.95vw, 0.98rem);
    line-height: 1.45;
}

.hero-status-bar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    min-width: 0;
    margin: 0;
    padding: 0;
    width: min(100%, 270px);
    justify-self: end;
    border: 1px solid rgba(196, 204, 214, 0.16);
    background: var(--thorondor-nested-background);
}

.hero-status-bar div {
    display: flex;
    min-height: 40px;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 7px 11px;
}

.hero-status-bar div + div {
    border-top: 1px solid rgba(196, 204, 214, 0.16);
}

.hero-status-bar dt {
    margin: 0;
    color: #96a4b4;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.08em;
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
    padding-top: 12px;
    border-top: 1px solid rgba(196, 204, 214, 0.14);
    color: #aebac8;
    font-size: 0.86rem;
    line-height: 1.45;
}

.storage-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1180px) {
    .home-overview-main {
        grid-template-columns: minmax(140px, 170px) minmax(300px, 1fr);
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
}

@media (max-width: 760px) {
    .home-overview {
        margin-bottom: 14px;
        padding: 14px;
        border-radius: 3px;
    }

    .home-overview-main {
        grid-template-columns: minmax(118px, 140px) minmax(0, 1fr);
        gap: 12px 14px;
    }

    .hero-wordmark {
        width: min(100%, 140px);
    }

    .hero-message h2 {
        font-size: clamp(1.14rem, 6vw, 1.38rem);
    }

    .hero-summary {
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .home-overview-note {
        font-size: 0.82rem;
    }

    .hero-status-bar {
        grid-column: 1 / -1;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        width: 100%;
        max-width: none;
        justify-self: stretch;
    }

    .hero-status-bar div {
        display: grid;
        padding: 9px 8px;
        justify-content: start;
        gap: 2px;
    }

    .hero-status-bar dt {
        font-size: 0.58rem;
    }

    .hero-status-bar dd {
        font-size: 1rem;
    }

    .storage-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 420px) {
    .hero-wordmark {
        width: min(100%, 128px);
    }

    .hero-status-bar dt {
        font-size: 0.52rem;
    }

    .hero-status-bar dd {
        font-size: 0.92rem;
    }
}
</style>
