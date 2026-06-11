<template>
    <ThorondorPageShell>
        <section class="section-box intro-box agents-hero">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Inventario de agentes</span>
                    <h1 class="section-name">Agentes</h1>
                    <p class="section-copy">
                        Configura la conexión de cada agente: IP o DNS, puerto expuesto y key agents operativa.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Fleet</span>
                    <small>{{ dashboardCards.length }} agentes registrados.</small>
                </div>
            </div>

        </section>

        <section class="section-box agent-console">
            <aside class="agent-selector" aria-label="Agentes registrados">
                <header class="agent-selector-head">
                    <div>
                        <span class="section-kicker">Selección</span>
                        <h2 class="module-title">Agente activo</h2>
                    </div>
                    <button class="btn btn-quiet" type="button" @click="pollNow">Refrescar</button>
                </header>

                <button
                    v-for="agent in dashboardCards"
                    :key="agent.id"
                    type="button"
                    class="agent-select-card"
                    :class="{ 'is-active': agent.id === selectedAgentId, 'is-paused': isAgentPaused(agent) }"
                    @click="selectAgent(agent.id)"
                >
                    <span>
                        <strong>{{ agent.displayName }}</strong>
                        <small>{{ agent.hostIp || agentEndpoint(agent) }}</small>
                    </span>
                    <em class="state-chip" :class="statusClass(agent.status.color)">{{ agent.status.label }}</em>
                </button>

                <p v-if="!dashboardCards.length" class="empty-box">
                    Todavía no hay agentes registrados. Genera un instalador y registra el primer host.
                </p>
            </aside>

            <article v-if="selectedAgent" class="agent-editor">
                <header class="agent-editor-head">
                    <div>
                        <span class="section-kicker">Conexión</span>
                        <h2 class="module-title">{{ selectedAgent.displayName }}</h2>
                        <p class="module-copy">Estos datos controlan a dónde se lanzan las peticiones desde Thorondor.</p>
                    </div>
                    <span class="mini-badge" :class="{ 'badge-warn': isAgentPaused(selectedAgent) }">
                        {{ isAgentPaused(selectedAgent) ? 'SIEM pausado' : networkScopeLabel(selectedAgent) }}
                    </span>
                </header>

                <div class="agent-pause-panel" :class="{ 'is-paused': isAgentPaused(selectedAgent) }">
                    <div>
                        <span>Servicio SIEM</span>
                        <strong>{{ isAgentPaused(selectedAgent) ? 'Pausado' : 'Activo' }}</strong>
                        <small>
                            {{
                                isAgentPaused(selectedAgent)
                                    ? 'Thorondor no hará polling ni encolará acciones contra este host.'
                                    : 'Thorondor puede consultar telemetría y ejecutar acciones autorizadas.'
                            }}
                        </small>
                    </div>
                    <button
                        class="btn btn-subtle"
                        type="button"
                        :disabled="savingAgentId === selectedAgent.id"
                        @click="toggleAgentPause(selectedAgent)"
                    >
                        {{ isAgentPaused(selectedAgent) ? 'Reanudar SIEM' : 'Pausar SIEM' }}
                    </button>
                </div>

                <div class="agent-form-grid">
                    <label class="control-field">
                        <span class="field-label">IP o DNS del agente</span>
                        <input
                            v-model.trim="selectedDraft.hostIp"
                            class="form-control input-dark"
                            placeholder="192.168.1.50 o agente.midominio.com"
                        />
                    </label>
                    <label class="control-field">
                        <span class="field-label">Puerto de peticiones</span>
                        <input
                            v-model.number="selectedDraft.port"
                            class="form-control input-dark"
                            inputmode="numeric"
                            min="1"
                            max="65535"
                            placeholder="53553"
                            type="number"
                        />
                    </label>
                    <label class="control-field agent-key-field">
                        <span class="field-label">Key agents de este agente</span>
                        <input
                            v-model.trim="selectedDraft.keyAgents"
                            :type="isAgentKeyVisible(selectedAgent.id) ? 'text' : 'password'"
                            autocomplete="off"
                            class="form-control input-dark"
                            placeholder="Clave guardada para este agente"
                        />
                    </label>
                    <div class="agent-endpoint-preview">
                        <span>Endpoint resultante</span>
                        <code>{{ selectedDraftEndpoint }}</code>
                    </div>
                </div>

                <div class="agent-editor-actions">
                    <button class="btn btn-subtle" type="button" @click="toggleAgentKeyVisibility(selectedAgent.id)">
                        {{ isAgentKeyVisible(selectedAgent.id) ? 'Ocultar key' : 'Mostrar key' }}
                    </button>
                    <button class="btn btn-quiet" type="button" @click="prepareNewAgentKey(selectedAgent.id)">
                        Generar key
                    </button>
                    <button class="btn btn-quiet" type="button" @click="openAgentDetail(selectedAgent.id)">
                        Detalle
                    </button>
                    <button class="btn btn-subtle" type="button" :disabled="testingAgentId === selectedAgent.id || isAgentPaused(selectedAgent)" @click="testAgent(selectedAgent)">
                        {{ testingAgentId === selectedAgent.id ? 'Probando...' : 'Probar conexión' }}
                    </button>
                    <button class="btn btn-primary" type="button" :disabled="savingAgentId === selectedAgent.id" @click="saveAgent(selectedAgent)">
                        {{ savingAgentId === selectedAgent.id ? 'Guardando...' : 'Guardar agente' }}
                    </button>
                </div>

                <p v-if="agentFeedback" class="agent-feedback" :class="agentFeedback.type === 'error' ? 'is-error' : 'is-success'">
                    {{ agentFeedback.message }}
                </p>
            </article>

            <article v-else class="agent-editor agent-editor-empty">
                <h2 class="module-title">Sin agente seleccionado</h2>
                <p class="module-copy">Registra un agente desde el generador para editar su IP, puerto y key agents.</p>
            </article>
        </section>

        <section class="section-box">
            <div class="card-head compact-card-head">
                <div>
                    <h5>Inventario operativo</h5>
                    <span>Estado actual, endpoint y clave local de cada agente.</span>
                </div>
                <span class="mini-badge">{{ dashboardCards.length }}</span>
            </div>
            <div class="table-wrap">
                <table class="table table-dark align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Agente</th>
                            <th>SO</th>
                            <th>Último heartbeat</th>
                            <th>Estado</th>
                            <th>SIEM</th>
                            <th>Endpoint</th>
                            <th>Key agents</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="agent in dashboardCards" :key="agent.id">
                            <td>
                                <strong>{{ agent.displayName }}</strong>
                                <small class="table-subline">{{ agent.id }}</small>
                            </td>
                            <td>{{ agent.distro || agent.targetOs }}</td>
                            <td>{{ formatRelativeTime(agent.lastHeartbeatAt) }}</td>
                            <td><span class="state-chip" :class="statusClass(agent.status.color)">{{ agent.status.label }}</span></td>
                            <td>
                                <span class="mini-badge" :class="isAgentPaused(agent) ? 'badge-warn' : 'badge-ok'">
                                    {{ isAgentPaused(agent) ? 'Pausado' : 'Activo' }}
                                </span>
                            </td>
                            <td><code class="inline-code endpoint-code">{{ agentEndpoint(agent) }}</code></td>
                            <td>
                                <span class="mini-badge" :class="agentKeyStatusClass(agent)">
                                    {{ agentKeyStatus(agent) }}
                                </span>
                            </td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-quiet" type="button" @click="selectAgent(agent.id)">Editar</button>
                                    <button class="btn btn-quiet" type="button" @click="openAgentDetail(agent.id)">Detalle</button>
                                    <button class="btn btn-quiet" type="button" @click="toggleAgentPause(agent)">
                                        {{ isAgentPaused(agent) ? 'Reanudar' : 'Pausar' }}
                                    </button>
                                    <button class="btn btn-quiet danger-text" type="button" @click="removeAgent(agent.id)">Eliminar</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section class="section-box">
            <div class="tool-card">
                <div class="card-head">
                    <h5>Historial de conexión</h5>
                    <span class="mini-badge">{{ selectedAgent ? selectedAgent.displayName : "Sin selección" }}</span>
                </div>
                <div class="table-wrap scrollable-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Resultado</th>
                                <th>Endpoint</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="entry in selectedConnectionHistory" :key="entry.id">
                                <td>{{ formatDateTime(entry.timestamp) }}</td>
                                <td>{{ entry.kind }}</td>
                                <td>{{ entry.endpoint }}</td>
                                <td>{{ entry.error || "-" }}</td>
                            </tr>
                            <tr v-if="!selectedConnectionHistory.length">
                                <td colspan="4">Sin pruebas de conexión registradas.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";

function generateKeyAgents(byteLength = 32) {
    const bytes = new Uint8Array(byteLength);
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseEndpoint(value) {
    const raw = String(value || "").trim();
    if (!raw) return { host: "", port: 53553 };
    try {
        const url = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`);
        return {
            host: url.hostname || "",
            port: Number(url.port) || (url.protocol === "https:" ? 443 : 80)
        };
    } catch {
        return { host: "", port: 53553 };
    }
}

function buildEndpoint(hostIp, port) {
    const host = String(hostIp || "").trim();
    const normalizedPort = Number(port) || 53553;
    if (!host) return "";
    const base = host.startsWith("http://") || host.startsWith("https://")
        ? host.replace(/\/+$/, "")
        : `http://${host}`;
    return /:\d+$/.test(base) ? base : `${base}:${normalizedPort}`;
}

export default {
    name: "ThorondorAgentesView",

    components: {
        ThorondorPageShell
    },

    mixins: [thorondorBaseMixin],

    data() {
        return {
            agentDrafts: {},
            keyVisibility: {},
            savingAgentId: "",
            testingAgentId: "",
            agentFeedback: null
        };
    },

    computed: {
        selectedDraft() {
            if (!this.selectedAgent) {
                return { hostIp: "", port: 53553, keyAgents: "" };
            }
            return this.agentDrafts[this.selectedAgent.id] || this.createAgentDraft(this.selectedAgent);
        },

        selectedDraftEndpoint() {
            return buildEndpoint(this.selectedDraft.hostIp, this.selectedDraft.port) || "Sin endpoint";
        }
    },

    watch: {
        dashboardCards: {
            immediate: true,
            handler() {
                this.syncAgentDrafts();
            }
        }
    },

    methods: {
        syncAgentDrafts() {
            const drafts = { ...this.agentDrafts };
            this.dashboardCards.forEach((agent) => {
                if (!drafts[agent.id]) {
                    drafts[agent.id] = this.createAgentDraft(agent);
                }
            });
            Object.keys(drafts).forEach((agentId) => {
                if (!this.dashboardCards.some((agent) => agent.id === agentId)) {
                    delete drafts[agentId];
                }
            });
            this.agentDrafts = drafts;
        },

        createAgentDraft(agent) {
            const parsed = parseEndpoint(agent.receiverUrl || agent.endpoint);
            return {
                hostIp: String(agent.hostIp || agent.ipAddress || parsed.host || "").trim(),
                port: Number(agent.port || agent.listenPort || parsed.port) || 53553,
                keyAgents: this.agentKeyValue(agent)
            };
        },

        isAgentPaused(agent) {
            return Boolean(agent?.siemPaused || agent?.siem_paused || agent?.pollingPaused || agent?.polling_paused || agent?.paused);
        },

        agentKeyValue(agent) {
            return String(agent?.keyAgents || agent?.key_agents || agent?.agentToken || agent?.token || "").trim();
        },

        agentKeyStatus(agent) {
            return this.agentKeyValue(agent) ? "Configurada" : "Pendiente";
        },

        agentKeyStatusClass(agent) {
            return this.agentKeyValue(agent) ? "badge-ok" : "badge-warn";
        },

        isAgentKeyVisible(agentId) {
            return Boolean(this.keyVisibility[agentId]);
        },

        toggleAgentKeyVisibility(agentId) {
            this.keyVisibility = {
                ...this.keyVisibility,
                [agentId]: !this.keyVisibility[agentId]
            };
        },

        prepareNewAgentKey(agentId) {
            const draft = this.agentDrafts[agentId];
            if (!draft) return;
            this.agentDrafts = {
                ...this.agentDrafts,
                [agentId]: {
                    ...draft,
                    keyAgents: generateKeyAgents()
                }
            };
            this.keyVisibility = {
                ...this.keyVisibility,
                [agentId]: true
            };
            this.agentFeedback = {
                type: "success",
                message: "Nueva key agents preparada. Guarda el agente para aplicarla."
            };
        },

        async saveAgent(agent) {
            if (!agent?.id) return;
            const draft = this.agentDrafts[agent.id] || this.createAgentDraft(agent);
            const port = Number(draft.port) || 0;
            if (!String(draft.hostIp || "").trim()) {
                this.agentFeedback = { type: "error", message: "Indica la IP o DNS del agente." };
                return;
            }
            if (port < 1 || port > 65535) {
                this.agentFeedback = { type: "error", message: "El puerto debe estar entre 1 y 65535." };
                return;
            }
            if (draft.keyAgents && (draft.keyAgents.length < 32 || draft.keyAgents.length > 128)) {
                this.agentFeedback = { type: "error", message: "La key agents debe tener entre 32 y 128 caracteres." };
                return;
            }

            this.savingAgentId = agent.id;
            this.agentFeedback = null;
            try {
                await this.$store.dispatch("updateThorondorAgentConnection", {
                    id: agent.id,
                    hostIp: draft.hostIp,
                    port,
                    receiverUrl: buildEndpoint(draft.hostIp, port),
                    keyAgents: draft.keyAgents,
                    siemPaused: this.isAgentPaused(agent),
                    pollingPaused: this.isAgentPaused(agent)
                });
                this.agentFeedback = {
                    type: "success",
                    message: "Agente actualizado. La clave predeterminada del usuario no se ha modificado."
                };
            } catch (error) {
                this.agentFeedback = {
                    type: "error",
                    message: error.message || "No se pudo actualizar el agente."
                };
            } finally {
                this.savingAgentId = "";
            }
        },

        async testAgent(agent) {
            if (!agent?.id || this.testingAgentId) return;
            if (this.isAgentPaused(agent)) {
                this.agentFeedback = {
                    type: "error",
                    message: "El SIEM de este agente está pausado. Reanúdalo antes de probar la conexión."
                };
                return;
            }
            await this.saveAgent(agent);
            if (this.agentFeedback?.type === "error") return;

            this.testingAgentId = agent.id;
            try {
                this.selectAgent(agent.id);
                await this.$store.dispatch("pollThorondorAgents");
                this.agentFeedback = {
                    type: "success",
                    message: "Prueba lanzada. Revisa el historial de conexión para ver el resultado."
                };
            } catch (error) {
                this.agentFeedback = {
                    type: "error",
                    message: error.message || "No se pudo probar la conexión."
                };
            } finally {
                this.testingAgentId = "";
            }
        },

        async toggleAgentPause(agent) {
            if (!agent?.id || this.savingAgentId) return;
            const nextPaused = !this.isAgentPaused(agent);
            this.savingAgentId = agent.id;
            this.agentFeedback = null;
            try {
                await this.$store.dispatch("setThorondorAgentPaused", {
                    id: agent.id,
                    paused: nextPaused
                });
                this.agentFeedback = {
                    type: "success",
                    message: nextPaused
                        ? "SIEM pausado. Thorondor no hará peticiones a este host."
                        : "SIEM reanudado. El host volverá a recibir polling y acciones autorizadas."
                };
            } catch (error) {
                this.agentFeedback = {
                    type: "error",
                    message: error.message || "No se pudo cambiar el estado del SIEM."
                };
            } finally {
                this.savingAgentId = "";
            }
        },

        openAgentDetail(agentId) {
            this.selectAgent(agentId);
            this.$router.push({
                name: "thorondor-host-detail",
                query: { agent: agentId }
            });
        },

        async removeAgent(agentId) {
            await this.$store.dispatch("removeThorondorAgent", agentId);
        }
    }
};
</script>

<style scoped>
.agent-console {
    display: grid;
    grid-template-columns: minmax(260px, 0.7fr) minmax(0, 1.3fr);
    gap: 16px;
}

.agent-selector,
.agent-editor {
    display: grid;
    align-content: start;
    gap: 12px;
    min-width: 0;
    padding: 14px;
    border: 1px solid rgba(176, 184, 194, 0.16);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.agent-selector-head,
.agent-editor-head,
.compact-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.agent-select-card {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border: 1px solid rgba(176, 184, 194, 0.14);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
    color: #e5eef8;
    cursor: var(--cursor-pointer), pointer;
    text-align: left;
}

.agent-select-card.is-active,
.agent-select-card:hover {
    border-color: rgba(236, 194, 119, 0.32);
    background: rgba(236, 194, 119, 0.06);
}

.agent-select-card.is-paused {
    border-color: rgba(251, 191, 36, 0.24);
    background: rgba(251, 191, 36, 0.045);
}

.agent-select-card span,
.table-subline {
    display: grid;
    min-width: 0;
    gap: 4px;
}

.agent-select-card strong {
    overflow: hidden;
    color: #f8fafc;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.agent-select-card small,
.table-subline,
.compact-card-head span {
    color: #9fb0c3;
    font-size: 0.78rem;
}

.agent-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.agent-pause-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px;
    border: 1px solid rgba(74, 222, 128, 0.22);
    border-radius: 4px;
    background: rgba(20, 83, 45, 0.12);
}

.agent-pause-panel.is-paused {
    border-color: rgba(251, 191, 36, 0.28);
    background: rgba(120, 77, 19, 0.12);
}

.agent-pause-panel div {
    display: grid;
    gap: 4px;
}

.agent-pause-panel span {
    color: #9fb0c3;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.agent-pause-panel strong {
    color: #f8fafc;
}

.agent-pause-panel small {
    color: #b7c4d3;
}

.agent-key-field,
.agent-endpoint-preview {
    grid-column: 1 / -1;
}

.agent-endpoint-preview {
    display: grid;
    gap: 6px;
    padding: 11px;
    border: 1px solid rgba(176, 184, 194, 0.14);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
}

.agent-endpoint-preview span {
    color: #b7c4d3;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.agent-endpoint-preview code,
.endpoint-code {
    color: #bfdbfe;
}

.agent-editor-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

.agent-feedback {
    margin: 0;
    padding: 10px 12px;
    border: 1px solid rgba(74, 222, 128, 0.26);
    border-radius: 4px;
    background: rgba(20, 83, 45, 0.18);
    color: #bbf7d0;
}

.agent-feedback.is-error {
    border-color: rgba(248, 113, 113, 0.34);
    background: rgba(69, 24, 27, 0.24);
    color: #fecaca;
}

.agent-editor-empty {
    min-height: 220px;
    place-content: center;
}

.badge-ok {
    border-color: rgba(74, 222, 128, 0.32);
    color: #bbf7d0;
}

.badge-warn {
    border-color: rgba(251, 191, 36, 0.34);
    color: #fde68a;
}

@media (max-width: 1100px) {
    .agent-console {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 680px) {
    .agent-form-grid {
        grid-template-columns: 1fr;
    }

    .agent-pause-panel {
        align-items: stretch;
        flex-direction: column;
    }

    .agent-selector-head,
    .agent-editor-head,
    .compact-card-head {
        display: grid;
    }
}
</style>
