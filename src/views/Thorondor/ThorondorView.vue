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

        <section class="section-box architecture-section">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Arquitectura</span>
                    <h2 class="module-title">Flujo operativo del agente</h2>
                    <p class="module-copy">
                        Agente Python en el host, polling HTTP desde el navegador y persistencia local o remota según
                        autorización del usuario.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">HTTPS</span>
                    <small>Cloudflare Tunnel recomendado.</small>
                </div>
            </div>

            <div class="card-grid architecture-grid">
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
                    <h2 class="module-title">Persistencia y limpieza</h2>
                    <p class="module-copy">
                        Vuex escribe en IndexedDB o en la API. El histórico se purga por ventana de retención.
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
                    <h2 class="module-title">Secuencia de puesta en marcha</h2>
                    <p class="module-copy">
                        Orden operativo para instalar agente, registrar host, validar telemetría y ajustar reglas.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Runbook</span>
                    <small>Una vista por paso.</small>
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
                    note: "Resumen por host monitorizado."
                },
                {
                    label: "Última limpieza",
                    value: this.thorondorState.lastSweepAt ? this.formatRelativeTime(this.thorondorState.lastSweepAt) : "Pendiente",
                    tone: "tone-neutral",
                    note: "Purgado automático según retención."
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
                    copy: "Define sistema, URL y puerto. Linux genera un .sh; Windows prepara e instala el MSI."
                },
                {
                    label: "2. Despliega en el host",
                    badge: "Host",
                    copy: "Linux usa systemd y venv propio. Windows usa ProgramData, psutil y Task Scheduler."
                },
                {
                    label: "3. Polling de telemetría",
                    badge: "Polling",
                    copy: "GET /telemetry por intervalo. Respuesta JSON con sistema, métricas, seguridad y logs."
                },
                {
                    label: "4. Persistencia de datos",
                    badge: "Storage",
                    copy: "Vuex normaliza el payload. IndexedDB guarda local; la API sincroniza usuarios autorizados."
                },
                {
                    label: "5. Correlación y alertas",
                    badge: "Rules",
                    copy: "Reglas locales evalúan CPU, RAM, heartbeat, auth, sudo e integridad."
                },
                {
                    label: "6. Exposición remota",
                    badge: "Network",
                    copy: "Usa URL resoluble por el navegador. En real: HTTPS, origen restringido y Cloudflare Tunnel."
                }
            ];
        },

        startSteps() {
            return [
                {
                    label: "1. Instalación",
                    copy: "Elige Linux o Windows, genera instalador único y valida endpoints."
                },
                {
                    label: "2. Agente",
                    copy: "Define hostname, URL accesible, IP o DNS, alcance y puerto."
                },
                {
                    label: "3. Validación",
                    copy: "Ejecuta como administrador, comprueba /health y /telemetry, y revisa autoarranque."
                },
                {
                    label: "4. Operación",
                    copy: "Revisa heartbeat, métricas y reglas. Ajusta umbrales por rol del host."
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
    border-radius: 4px;
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

.architecture-section .section-topline {
    align-items: end;
}

.architecture-section .module-copy {
    max-width: 68ch;
}

.architecture-grid .tool-card {
    min-height: 0;
}

.architecture-grid .section-copy {
    max-width: 58ch;
    font-size: 0.94rem;
    line-height: 1.48;
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
}

@media (max-width: 760px) {
        .home-overview {
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 3px;
    }

    .home-overview-main {
        grid-template-columns: minmax(118px, 140px) minmax(0, 1fr);
        gap: 12px 14px;
    }

    .hero-wordmark {
        width: min(100%, 128px);
    }

    .hero-message h2 {
        font-size: clamp(1.08rem, 5vw, 1.28rem);
    }

    .hero-summary {
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .home-overview-note {
        font-size: 0.86rem;
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
        font-size: 0.72rem;
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
        width: min(100%, 118px);
    }

    .hero-status-bar dt {
        font-size: 0.7rem;
    }

    .hero-status-bar dd {
        font-size: 0.92rem;
    }
}
</style>
