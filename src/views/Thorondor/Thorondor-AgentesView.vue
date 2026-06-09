<template>
    <ThorondorPageShell>
        <section class="section-box intro-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Inventario de agentes</span>
                    <h1 class="section-name">Agentes</h1>
                    <p class="section-copy">
                        Aqui tienes el censo de agentes registrados en tu navegador: alcance de red, endpoint,
                        heartbeat, módulos activos, historial de conexiones y accesos rápidos para revisar o retirar un host.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Fleet</span>
                    <small>{{ dashboardCards.length }} agentes en esta instancia.</small>
                </div>
            </div>

            <div class="guide-grid">
                <div class="guide-card" v-for="item in fleetHighlights" :key="item.label">
                    <label>{{ item.label }}</label>
                    <span>{{ item.copy }}</span>
                </div>
            </div>
        </section>

        <section class="section-box">
            <div class="table-wrap">
                <table class="table table-dark align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Distro</th>
                            <th>Registro</th>
                            <th>Ultimo heartbeat</th>
                            <th>Estado</th>
                            <th>Alcance</th>
                            <th>Endpoint</th>
                            <th>Módulos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="agent in dashboardCards" :key="agent.id">
                            <td>{{ agent.displayName }}</td>
                            <td>{{ agent.distro }}</td>
                            <td>{{ formatDateTime(agent.createdAt) }}</td>
                            <td>{{ formatRelativeTime(agent.lastHeartbeatAt) }}</td>
                            <td><span class="state-chip" :class="statusClass(agent.status.color)">{{ agent.status.label }}</span></td>
                            <td><span class="mini-badge">{{ networkScopeLabel(agent) }}</span></td>
                            <td><code class="inline-code endpoint-code">{{ agentEndpoint(agent) }}</code></td>
                            <td>{{ summarizeModules(agent.modules) }}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-quiet" @click="openAgentDetail(agent.id)">Detalle</button>
                                    <button class="btn btn-quiet danger-text" @click="removeAgent(agent.id)">Eliminar</button>
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
                    <h5>Historial de conexiones del sistema seleccionado</h5>
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

export default {
    name: "ThorondorAgentesView",

    components: {
        ThorondorPageShell
    },

    mixins: [thorondorBaseMixin],

    computed: {
        fleetHighlights() {
            return [
                {
                    label: "Inventario local",
                    copy: "Cada agente queda asociado a esta instancia del navegador y puede apuntar a localhost, LAN, VPN o endpoint público."
                },
                {
                    label: "Estado operativo",
                    copy: "La tabla resume si cada host está respondiendo, si acumula retraso de heartbeat o si ya no devuelve datos."
                },
                {
                    label: "Trazabilidad",
                    copy: "El historial de conexiones te ayuda a distinguir un problema de red, de firewall o de propio agente."
                },
                {
                    label: "Retirada limpia",
                    copy: "Eliminar un agente lo saca del inventario local y evita que el navegador siga intentando consultarlo."
                }
            ];
        }
    },

    methods: {
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
