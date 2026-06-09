<template>
    <ThorondorPageShell>
        <section class="home-hero" aria-labelledby="thorondor-home-title">
            <article class="hero-copy">
                <div class="hero-heading-row">
                    <img class="hero-logo" src="@/assets/images/Thorondor-logo.png" alt="Sello de Thorondor" />
                    <div class="hero-heading-text">
                        <span class="section-kicker">SIEM para infraestructura propia</span>
                        <h1 id="thorondor-home-title">Thorondor</h1>
                        <p>
                            Supervisa hosts Linux y Windows, centraliza eventos relevantes y ejecuta respuesta manual
                            con trazabilidad.
                        </p>
                    </div>
                </div>
                <dl class="hero-status-bar" aria-label="Estado de Thorondor">
                    <div v-for="item in heroStats" :key="item.label">
                        <dt>{{ item.label }}</dt>
                        <dd :class="item.tone">{{ item.value }}</dd>
                    </div>
                </dl>
            </article>
        </section>

        <section class="section-box intro-box">
            <header class="intro-layout">
                <article class="section-heading">
                    <span class="section-kicker">Monitorización distribuida</span>
                    <h2 class="section-name">Modelo operativo</h2>
                    <p class="section-copy">
                        Cada sistema ejecuta un agente autocontenido. La consola consulta telemetría, registra eventos
                        y mantiene reglas separadas por host para que la operación sea directa, trazable y sencilla de
                        desplegar.
                    </p>
                </article>

                <aside class="intro-summary">
                    <span>Despliegue</span>
                    <strong>Directo o centralizado</strong>
                    <p>
                        Puede trabajar en local con IndexedDB o sincronizarse con una API respaldada por base de datos
                        cuando necesitas persistencia compartida.
                    </p>
                </aside>
            </header>

            <section class="intro-points" aria-label="Bases de Thorondor">
                <article class="intro-point" v-for="item in foundationalNotes" :key="item.label">
                    <label>{{ item.label }}</label>
                    <span>{{ item.copy }}</span>
                </article>
            </section>
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

        foundationalNotes() {
            return [
                {
                    label: "Agente autocontenido",
                    copy: "El instalador genera el agente y su arranque persistente desde un único archivo. El host no necesita piezas sueltas."
                },
                {
                    label: "Linux y Windows",
                    copy: "Linux usa systemd con entorno Python aislado y Windows genera un MSI real que deja Task Scheduler configurado si activas autoarranque."
                },
                {
                    label: "Datos portables",
                    copy: "El modo local usa IndexedDB; el modo sincronizado guarda el mismo histórico en base de datos para llevarlo a cualquier sesión."
                },
                {
                    label: "Alertas separadas de reglas",
                    copy: "Las reglas definen condiciones. Las alertas son la cola operativa que revisas, cierras o reabres."
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
.home-hero {
    position: relative;
    isolation: isolate;
    margin-bottom: 18px;
    padding: clamp(14px, 1.6vw, 18px) clamp(18px, 2.4vw, 28px);
    overflow: hidden;
    border: 1px solid rgba(196, 204, 214, 0.2);
    border-radius: 4px;
    background: linear-gradient(115deg, #171d25, #0f141b 64%, #0b0f14);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 18px 42px rgba(0, 0, 0, 0.28);
}

.home-hero::after {
    content: "";
    position: absolute;
    inset: auto 22px 0;
    z-index: -1;
    height: 1px;
    background: linear-gradient(90deg, rgba(226, 232, 240, 0.4), rgba(226, 232, 240, 0.08), transparent);
}

.hero-copy {
    display: grid;
    gap: 14px;
    min-width: 0;
}

.hero-heading-row {
    display: grid;
    grid-template-columns: 62px minmax(0, 1fr);
    gap: 16px;
    align-items: center;
}

.hero-logo {
    width: 62px;
    height: 62px;
    object-fit: contain;
    filter: contrast(1.06) saturate(0.96) drop-shadow(0 14px 22px rgba(0, 0, 0, 0.36));
}

.hero-heading-text {
    display: grid;
    gap: 6px;
    min-width: 0;
}

.hero-heading-text h1 {
    margin: 0;
    color: #f8fafc;
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-size: clamp(1.95rem, 3.4vw, 3.15rem);
    font-weight: 800;
    line-height: 0.98;
    letter-spacing: 0;
}

.hero-heading-text p {
    max-width: 70ch;
    margin: 0;
    color: #c9d3df;
    font-size: clamp(0.94rem, 1.1vw, 1.04rem);
    line-height: 1.55;
}

.hero-status-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    min-width: 0;
    margin: 0;
    padding: 0;
    max-width: 560px;
    border: 1px solid rgba(196, 204, 214, 0.16);
    background: rgba(255, 255, 255, 0.035);
}

.hero-status-bar div {
    display: grid;
    gap: 2px;
    padding: 8px 12px;
}

.hero-status-bar div + div {
    border-left: 1px solid rgba(196, 204, 214, 0.16);
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
    font-weight: 800;
}

.storage-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 720px) {
    .home-hero {
        margin-bottom: 14px;
        padding: 14px;
        border-radius: 3px;
    }

    .hero-heading-row {
        grid-template-columns: 44px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
    }

    .hero-logo {
        width: 44px;
        height: 44px;
    }

    .hero-heading-text h1 {
        font-size: clamp(1.72rem, 8.6vw, 2.28rem);
    }

    .hero-heading-text p {
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .hero-status-bar {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        width: 100%;
        max-width: none;
    }

    .hero-status-bar div + div {
        border-top: 0;
        border-left: 1px solid rgba(196, 204, 214, 0.16);
    }

    .hero-status-bar div {
        padding: 9px 8px;
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
    .hero-heading-row {
        grid-template-columns: 38px minmax(0, 1fr);
    }

    .hero-logo {
        width: 38px;
        height: 38px;
    }

    .hero-status-bar dt {
        font-size: 0.52rem;
    }

    .hero-status-bar dd {
        font-size: 0.92rem;
    }
}
</style>
