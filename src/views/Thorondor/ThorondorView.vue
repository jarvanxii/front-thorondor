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
                Puedes probar la plataforma en modo local. Cuando tu cuenta esté autorizada, también podrás conservar
                el histórico en Thorondor para trabajar de forma continuada.
            </p>
        </section>

        <section class="section-box agent-capabilities-section">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Cómo funciona</span>
                    <h2 class="module-title">Un agente por cada equipo que quieras vigilar</h2>
                    <p class="module-copy">
                        Instalas un agente ligero en cada equipo autorizado. El agente recoge el estado del sistema, los
                        eventos relevantes y las señales de seguridad disponibles. Thorondor ordena esa información para
                        que puedas revisarla sin saltar entre herramientas.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Linux y Windows</span>
                    <small>La misma forma de trabajar en ambos sistemas.</small>
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

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Datos de trabajo</span>
                    <h2 class="module-title">Dónde se conserva la información</h2>
                    <p class="module-copy">
                        Si todavía no tienes autorización, los datos se quedan en este navegador para que puedas probar
                        la consola. Con una cuenta autorizada, Thorondor puede guardar el histórico para mantener el
                        seguimiento entre sesiones.
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
                    <span class="section-kicker">Forma de uso</span>
                    <h2 class="module-title">Del primer agente a la operación diaria</h2>
                    <p class="module-copy">
                        El objetivo es que puedas añadir un equipo, confirmar que envía información y empezar a trabajar
                        sobre alertas, eventos y acciones desde una interfaz clara.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Guía sencilla</span>
                    <small>Todo queda separado por tareas.</small>
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
                    label: "Histórico conservado",
                    value: `${this.thorondorState.retentionDays} días`,
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

        persistenceBadge() {
            return this.thorondorState.persistence?.effectiveMode === "cloud" ? "Servidor Thorondor" : "Modo local";
        },

        persistenceNote() {
            return this.thorondorState.persistence?.effectiveMode === "cloud"
                ? "Histórico disponible para la cuenta autorizada."
                : "Datos guardados solo en este navegador.";
        },

        persistenceWindowNote() {
            return this.thorondorState.persistence?.effectiveMode === "cloud"
                ? "Ventana de trabajo compartida con tu cuenta."
                : "Ventana de trabajo local antes de limpiar datos antiguos.";
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

        startSteps() {
            return [
                {
                    label: "1. Añade un equipo",
                    copy: "Indica un nombre claro, la dirección del equipo y el puerto por el que el agente va a responder."
                },
                {
                    label: "2. Instala el agente",
                    copy: "Descarga el instalador de Linux o Windows y ejecútalo con los permisos necesarios en el equipo destino."
                },
                {
                    label: "3. Comprueba la señal",
                    copy: "Cuando el agente responde, Thorondor empieza a mostrar estado, eventos, hardware, red y actividad del sistema."
                },
                {
                    label: "4. Trabaja con criterio",
                    copy: "Revisa alertas, consulta logs, ajusta reglas y ejecuta respuestas solo cuando la información lo justifique."
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

.agent-capabilities-section .section-topline {
    align-items: center;
}

.agent-capabilities-section .module-copy {
    max-width: 68ch;
}

.agent-capabilities-section .phase-badge-block {
    width: min(100%, 220px);
    justify-self: end;
    align-self: center;
    justify-items: end;
    gap: 9px;
    text-align: right;
}

.agent-capabilities-section .phase-badge-block small {
    max-width: 24ch;
    color: #afbdc7;
    font-size: 0.88rem;
    line-height: 1.45;
}

.agent-capabilities-section .phase-badge {
    min-width: 144px;
}

.capabilities-grid .tool-card {
    min-height: 0;
}

.capabilities-grid .section-copy {
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

    .agent-capabilities-section .phase-badge-block {
        width: 100%;
        justify-self: start;
        justify-items: start;
        text-align: left;
    }

    .agent-capabilities-section .phase-badge-block small {
        max-width: 46ch;
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
