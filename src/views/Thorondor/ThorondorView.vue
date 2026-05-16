<template>
    <ThorondorPageShell>
        <section class="home-hero">
            <article class="hero-copy">
                <span class="section-kicker">SIEM personal - Linux / Windows / navegador</span>
                <h1>Thorondor</h1>
                <p>
                    Consola operativa para observar hosts propios, detectar actividad relevante y responder ante
                    incidencias desde una interfaz sobria, directa y preparada para persistencia con base de datos.
                </p>
                <div class="hero-actions">
                    <RouterLink class="btn btn-main" :to="{ name: 'thorondor-dashboard' }">
                        Ver dashboard general
                    </RouterLink>
                    <RouterLink class="btn btn-subtle" :to="{ name: 'thorondor-agent-generator' }">
                        Generar agente
                    </RouterLink>
                </div>
            </article>

            <aside class="hero-console" aria-label="Resumen de Thorondor">
                <div class="hero-logo-frame">
                    <img src="@/assets/images/Thorondor-logo.png" alt="Sello de Thorondor" />
                </div>
                <div class="hero-status-grid">
                    <article v-for="item in heroStats" :key="item.label">
                        <label>{{ item.label }}</label>
                        <strong :class="item.tone">{{ item.value }}</strong>
                    </article>
                </div>
            </aside>
        </section>

        <section class="section-box intro-box">
            <header class="intro-layout">
                <article class="section-heading">
                    <span class="section-kicker">SIEM personal - Linux / Windows / navegador</span>
                    <span class="section-kicker">Monitorizacion distribuida</span>
                    <h1 class="section-name">Thorondor</h1>
                    <p class="section-copy">
                        Consola ligera para vigilar servidores Linux y Windows desde el navegador. Cada host ejecuta un
                        agente autocontenido, el panel consulta telemetria por HTTP y las reglas se evaluan localmente
                        para mantener una arquitectura directa, auditable y sencilla de desplegar.
                    </p>
                </article>

                <aside class="intro-summary">
                    <span>Endpoint</span>
                    <strong>Control directo por endpoint</strong>
                    <p>
                        Pensado para servidores propios, laboratorios y entornos donde quieres visibilidad sin montar
                        infraestructura central antes de tiempo.
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
                    <span class="section-kicker">Vision general</span>
                    <h2 class="module-title">Una consola para operar con calma</h2>
                    <p class="module-copy">
                        Registra sistemas, revisa su estado, configura reglas, consulta alertas y actua sobre IPs desde
                        una interfaz unica. El foco es ayudarte a detectar cambios, fallos y actividad relevante sin
                        convertir la monitorizacion en ruido.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Info</span>
                    <small>Base funcional de Thorondor.</small>
                </div>
            </div>

            <section class="metric-grid mb-4">
                <article class="metric-card" v-for="item in overviewCards" :key="item.label">
                    <label>{{ item.label }}</label>
                    <span :class="item.tone">{{ item.value }}</span>
                    <small>{{ item.note }}</small>
                </article>
            </section>

            <div class="verdict-card verdict-neutral">
                <div class="verdict-icon">
                    <span>Uso</span>
                </div>
                <div class="verdict-body">
                    <strong>Datos locales o sincronizacion con base de datos</strong>
                    <p>
                        Thorondor puede conservar la telemetria en IndexedDB del navegador o sincronizar agentes,
                        snapshots, logs, eventos, reglas y alertas con una API respaldada por base de datos. Cada agente
                        sigue siendo un endpoint HTTP independiente y, si esta en Internet, la URL publica debe quedar
                        detras de filtrado de red, HTTPS y un proxy controlado.
                    </p>
                </div>
            </div>
        </section>

        <section class="section-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Arquitectura</span>
                    <h2 class="module-title">Flujo tecnico extremo a extremo</h2>
                    <p class="module-copy">
                        El generador produce un agente Python parametrizado (host, puerto, modulos, usuario de servicio)
                        que se despliega en el sistema destino. El frontend realiza polling HTTP al agente, decodifica
                        el JSON de telemetria, lo persiste en el modo activo (IndexedDB local o base de datos) y
                        aplica las reglas de correlacion registradas. Solo hace falta conectividad directa desde el
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
                    <h2 class="module-title">Que guarda el navegador y como se limpia</h2>
                    <p class="module-copy">
                        Thorondor usa Vuex con una capa de persistencia intercambiable: IndexedDB local o API con base de
                        datos. Lo antiguo se purga automaticamente.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">{{ persistenceBadge }}</span>
                    <small>{{ persistenceNote }}</small>
                </div>
            </div>

            <section class="metric-grid">
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
                        a su vista correspondiente para que puedas avanzar sin volver atras.
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

        <section class="section-box">
            <ThorondorMarkdownArticle :source="thorondorDocumentation" />
        </section>
    </ThorondorPageShell>
</template>

<script>
import ThorondorMarkdownArticle from "@/components/Thorondor/ThorondorMarkdownArticle.vue";
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";
import { thorondorDocumentation } from "@/features/thorondor/data/thorondorDocumentation";

export default {
    name: "ThorondorView",

    components: {
        ThorondorMarkdownArticle,
        ThorondorPageShell
    },

    mixins: [thorondorBaseMixin],

    computed: {
        thorondorDocumentation() {
            return thorondorDocumentation;
        },

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
                    copy: "El instalador genera el agente y su arranque persistente desde un unico archivo. El host no necesita piezas sueltas."
                },
                {
                    label: "Linux y Windows",
                    copy: "Linux usa systemd y Windows Task Scheduler cuando activas autoarranque. Windows puede empaquetarse despues como MSI mediante WiX."
                },
                {
                    label: "Datos portables",
                    copy: "El modo local usa IndexedDB; el modo sincronizado guarda el mismo historico en base de datos para llevarlo a cualquier sesion."
                },
                {
                    label: "Alertas separadas de reglas",
                    copy: "Las reglas definen condiciones. Las alertas son la cola operativa que revisas, cierras o reabres."
                }
            ];
        },

        overviewCards() {
            return [
                {
                    label: "Agentes registrados",
                    value: String(this.dashboardCards.length),
                    tone: "tone-blue",
                    note: "Hosts dados de alta en esta instancia del navegador."
                },
                {
                    label: "Alertas activas",
                    value: String(this.activeAlerts.length),
                    tone: this.activeAlerts.length ? "tone-warning" : "tone-success",
                    note: "Reglas disparadas por la logica JS del frontend."
                },
                {
                    label: "Eventos 24h",
                    value: String(this.eventsLast24h.length),
                    tone: "tone-neutral",
                    note: "Eventos recientes que el navegador ha persistido."
                },
                {
                    label: "Ultimo polling",
                    value: this.thorondorLastPollAt ? this.formatRelativeTime(this.thorondorLastPollAt) : "Pendiente",
                    tone: "tone-success",
                    note: "El navegador consulta cada host directamente."
                }
            ];
        },

        storageCards() {
            return [
                {
                    label: "Retencion",
                    value: `${this.thorondorState.retentionDays} dias`,
                    tone: "tone-success",
                    note: this.persistenceWindowNote
                },
                {
                    label: "Snapshots",
                    value: String(Object.values(this.thorondorSnapshots).flat().length),
                    tone: "tone-blue",
                    note: "Historico resumido por host monitorizado."
                },
                {
                    label: "Eventos",
                    value: String(this.allSecurityEvents.length),
                    tone: "tone-warning",
                    note: "Seguridad, sudo, logins y cambios criticos."
                },
                {
                    label: "Ultima limpieza",
                    value: this.thorondorState.lastSweepAt ? this.formatRelativeTime(this.thorondorState.lastSweepAt) : "Pendiente",
                    tone: "tone-neutral",
                    note: "Thorondor borra historico antiguo para no saturar memoria."
                }
            ];
        },

        persistenceBadge() {
            return this.thorondorState.persistence?.effectiveMode === "cloud" ? "Cloud DB" : "IndexedDB";
        },

        persistenceNote() {
            return this.thorondorState.persistence?.effectiveMode === "cloud"
                ? "Sincronizacion por workspace."
                : "Persistencia local del navegador.";
        },

        persistenceWindowNote() {
            return this.thorondorState.persistence?.effectiveMode === "cloud"
                ? "Ventana operativa sincronizada con cache local."
                : "Ventana local antes del purgado automatico.";
        },

        architectureCards() {
            return [
                {
                    label: "1. Genera el agente",
                    badge: "Frontend",
                    copy: "El generador pide lo minimo: alcance de red, Linux o Windows, host, URL y puerto. Los ajustes de distro, servicio, modulos y logs quedan como avanzados. Descarga un unico .sh o .ps1; en Windows tambien puede generar WiX para compilar un MSI real."
                },
                {
                    label: "2. Despliega en el host",
                    badge: "Host",
                    copy: "Linux: cuenta sin shell, /opt/thorondor-agent/, grupos adm+systemd-journal, psutil via apt/dnf/pacman, unidad systemd. Windows: C:\\ProgramData\\Thorondor-Agent\\, psutil via pip, tarea en Task Scheduler con RunLevel Highest."
                },
                {
                    label: "3. El navegador hace polling",
                    badge: "Polling",
                    copy: "Peticion HTTP GET al /telemetry del agente cada N segundos. El agente responde JSON con system, metrics (CPU, RAM, disco por particion, temperatura), security (logins, sudo, file integrity) y logs."
                },
                {
                    label: "4. Persistencia de datos",
                    badge: "Storage",
                    copy: "El store Vuex decodifica el payload y lo distribuye por la fachada de persistencia: IndexedDB local o API con base de datos. IndexedDB queda siempre como cache local."
                },
                {
                    label: "5. Correlacion y alertas",
                    badge: "Rules",
                    copy: "El motor de reglas JavaScript evalua thresholds de CPU, RAM, heartbeat, frecuencia de fallos de autenticacion, sudo fuera de whitelist y cambios en el baseline de integridad de archivos."
                },
                {
                    label: "6. Exposicion remota",
                    badge: "Network",
                    copy: "Para remoto, registra una URL que el navegador pueda resolver. Si es publica, usa firewall con origen restringido, HTTPS y proxy frontal cuando el frontend se sirva por HTTPS."
                }
            ];
        },

        startSteps() {
            return [
                {
                    label: "Paso 1 — Guia de instalacion",
                    copy: "Selecciona solo Linux o Windows y sigue el flujo directo: generar instalador unico, ejecutarlo como administrador y validar endpoints."
                },
                {
                    label: "Paso 2 — Generador de agentes",
                    copy: "Rellena hostname, URL accesible, IP o DNS del host, alcance de red y puerto (ej. 8765). Toca los ajustes avanzados solo si necesitas cambiar logs, modulos o servicio."
                },
                {
                    label: "Paso 3 — Despliega y valida",
                    copy: "Copia el instalador al host, ejecutalo como administrador, valida /health y /telemetry y revisa systemd o Task Scheduler si activaste autoarranque. En Windows puedes compilar MSI si necesitas despliegue formal."
                },
                {
                    label: "Paso 4 — Dashboard y alertas",
                    copy: "El host aparece en el dashboard con heartbeat, CPU, RAM y disco. Ajusta las reglas de monitorizacion segun el rol del sistema y revisa las alertas desde la vista de reglas."
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
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    gap: clamp(22px, 3vw, 42px);
    align-items: stretch;
    min-height: 420px;
    margin-bottom: 24px;
    padding: clamp(28px, 4vw, 52px);
    overflow: hidden;
    border: 1px solid rgba(196, 204, 214, 0.2);
    border-radius: 4px;
    background:
        linear-gradient(120deg, rgba(28, 34, 42, 0.98), rgba(13, 17, 23, 0.98) 58%, rgba(8, 11, 16, 0.99)),
        #10151c;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 28px 70px rgba(0, 0, 0, 0.34);
}

.home-hero::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
        linear-gradient(90deg, rgba(226, 232, 240, 0.08) 1px, transparent 1px),
        linear-gradient(180deg, rgba(226, 232, 240, 0.055) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.18));
}

.home-hero::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    z-index: -1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(226, 232, 240, 0.5), transparent);
}

.hero-copy {
    display: grid;
    align-content: center;
    gap: 18px;
    min-width: 0;
}

.hero-copy h1 {
    margin: 0;
    color: #f8fafc;
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-size: clamp(3rem, 7vw, 6.4rem);
    font-weight: 800;
    line-height: 0.94;
}

.hero-copy p {
    max-width: 68ch;
    margin: 0;
    color: #c7d0db;
    font-size: clamp(1rem, 1.3vw, 1.16rem);
    line-height: 1.75;
}

.hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
}

.hero-actions .btn {
    min-height: 42px;
    align-content: center;
}

.hero-console {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 18px;
    min-width: 0;
    padding: 18px;
    border: 1px solid rgba(196, 204, 214, 0.2);
    border-radius: 4px;
    background:
        linear-gradient(180deg, rgba(31, 37, 46, 0.86), rgba(12, 16, 22, 0.94)),
        rgba(12, 16, 22, 0.92);
}

.hero-logo-frame {
    display: grid;
    place-items: center;
    min-height: 220px;
    border: 1px solid rgba(196, 204, 214, 0.16);
    border-radius: 3px;
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.045), transparent 44%),
        rgba(7, 10, 14, 0.42);
}

.hero-logo-frame img {
    width: min(220px, 66%);
    filter: contrast(1.08) saturate(0.92) drop-shadow(0 24px 38px rgba(0, 0, 0, 0.42));
}

.hero-status-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.hero-status-grid article {
    display: grid;
    gap: 5px;
    padding: 12px;
    border: 1px solid rgba(196, 204, 214, 0.15);
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.035);
}

.hero-status-grid label {
    color: #9aa6b3;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
}

.hero-status-grid strong {
    color: #f8fafc;
    font-size: 1.12rem;
    font-weight: 800;
}

@media (max-width: 1180px) {
    .home-hero {
        grid-template-columns: 1fr;
        min-height: 0;
    }

    .hero-console {
        grid-template-columns: minmax(180px, 0.75fr) minmax(0, 1fr);
        grid-template-rows: auto;
        align-items: stretch;
    }

    .hero-logo-frame {
        min-height: 180px;
    }
}

@media (max-width: 720px) {
    .home-hero {
        padding: 22px;
    }

    .hero-copy h1 {
        font-size: clamp(2.5rem, 17vw, 4rem);
    }

    .hero-actions .btn {
        width: 100%;
    }

    .hero-console,
    .hero-status-grid {
        grid-template-columns: 1fr;
    }
}
</style>
