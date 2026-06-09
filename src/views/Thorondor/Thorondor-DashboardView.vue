<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Visibilidad general"
      title="Dashboard general"
      copy="Resume el estado de todos los agentes, el Último heartbeat, el consumo principal, las alertas activas y los eventos de seguridad que más importan en las Últimas 24 horas."
      badge="Live"
      :badge-note="`Último polling: ${thorondorLastPollAt ? formatRelativeTime(thorondorLastPollAt) : 'Pendiente'}`"
    >
      <nav class="inline-actions" aria-label="Acciones del dashboard">
        <button class="btn btn-main" @click="pollNow">Actualizar ahora</button>
      </nav>
    </ThorondorSectionHeader>

    <ThorondorMetricGrid :items="dashboardSummaryCards" />

    <section class="section-box">
      <article class="tool-card">
        <header class="card-head">
          <h5>Evolucion de CPU y RAM de las Últimas 2 horas</h5>
          <span class="mini-badge">Chart.js</span>
        </header>
        <ThorondorLineChart
          chart-id="thorondor-dashboard-chart"
          :labels="dashboardChart.labels"
          :datasets="dashboardChart.datasets"
          title="CPU y RAM por sistema"
        />
      </article>
    </section>

    <section class="section-box">
      <section v-if="dashboardCards.length" class="card-grid">
        <article
          v-for="card in dashboardCards"
          :key="card.id"
          class="tool-card clickable-card"
          @click="openAgentDetail(card.id)"
        >
          <header class="card-head">
            <section class="card-title-block">
              <h5>{{ card.displayName }}</h5>
              <small class="muted-copy"
                >{{ card.systemName }} ·
                {{ card.targetOs === 'windows' ? card.osVersion || 'Windows' : card.distro }}</small
              >
            </section>
            <aside class="card-head-right">
              <span
                class="os-badge"
                :class="card.targetOs === 'windows' ? 'os-badge--win' : 'os-badge--linux'"
                >{{ card.targetOs === 'windows' ? 'Windows' : 'Linux' }}</span
              >
              <span class="state-chip" :class="statusClass(card.status.color)">{{
                card.status.label
              }}</span>
            </aside>
          </header>

          <section class="mini-grid">
            <article class="mini-stat">
              <label>Ultimo heartbeat</label>
              <span>{{ formatRelativeTime(card.lastHeartbeatAt) }}</span>
            </article>
            <article class="mini-stat">
              <label>CPU</label>
              <span>{{ formatPercent(card.latestSnapshot?.cpuTotal) }}</span>
            </article>
            <article class="mini-stat">
              <label>RAM</label>
              <span>{{ formatPercent(card.latestSnapshot?.memoryPercent) }}</span>
            </article>
            <article class="mini-stat">
              <label>Disco</label>
              <span>{{ formatPercent(card.latestSnapshot?.diskPercent) }}</span>
            </article>
            <article class="mini-stat">
              <label>Alertas</label>
              <span>{{ card.alertCount }}</span>
            </article>
            <article class="mini-stat">
              <label>Alcance</label>
              <span>{{ networkScopeLabel(card) }}</span>
            </article>
            <article class="mini-stat endpoint-mini-stat">
              <label>Endpoint</label>
              <span class="endpoint-text">{{ agentEndpoint(card) }}</span>
            </article>
          </section>
        </article>
      </section>
      <p v-else class="empty-box">
        No hay agentes registrados todavía. Empieza por la vista de generador.
      </p>
    </section>

    <section class="section-box">
      <section class="dashboard-table-grid">
        <article class="tool-card">
          <header class="card-head">
            <h5>Eventos de seguridad en las Últimas 24 horas</h5>
            <span class="mini-badge">24h</span>
          </header>
          <section class="table-wrap">
            <table class="table table-dark table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Sistema</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in eventsPerSystem24h" :key="item.agentId">
                  <td>{{ item.agentName }}</td>
                  <td>{{ item.total }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>
        <article class="tool-card">
          <header class="card-head">
            <h5>IPs de origen con intentos fallidos</h5>
            <span class="mini-badge">Top</span>
          </header>
          <section class="table-wrap">
            <table class="table table-dark table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Intentos</th>
                  <th>Ultimo sistema</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in failedOrigins" :key="item.ip">
                  <td>{{ item.ip }}</td>
                  <td>{{ item.count }}</td>
                  <td>{{ item.agentName }}</td>
                </tr>
                <tr v-if="!failedOrigins.length">
                  <td colspan="3" class="text-muted">Sin intentos fallidos recientes.</td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>
      </section>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorLineChart from '@/components/Thorondor/ThorondorLineChart.vue'
import ThorondorMetricGrid from '@/components/Thorondor/ThorondorMetricGrid.vue'
import ThorondorPageShell from '@/components/Thorondor/ThorondorPageShell.vue'
import ThorondorSectionHeader from '@/components/Thorondor/ThorondorSectionHeader.vue'
import thorondorBaseMixin from '@/features/thorondor/mixins/thorondorBaseMixin'

function colorFromSeed(seed, alpha = 1) {
  const palette = [
    [148, 163, 184],
    [251, 191, 36],
    [74, 222, 128],
    [248, 113, 113],
    [125, 140, 158],
    [251, 146, 60],
  ]
  const [r, g, b] = palette[Math.abs(seed) % palette.length]
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default {
  name: 'ThorondorDashboardView',

  components: {
    ThorondorLineChart,
    ThorondorMetricGrid,
    ThorondorPageShell,
    ThorondorSectionHeader,
  },

  mixins: [thorondorBaseMixin],

  computed: {
    dashboardSummaryCards() {
      const online = this.dashboardCards.filter((item) => item.status.color === 'success').length
      const warning = this.dashboardCards.filter((item) => item.status.color === 'warning').length
      const danger = this.dashboardCards.filter((item) => item.status.color === 'danger').length

      return [
        {
          label: 'Sistemas online',
          value: String(online),
          tone: 'tone-success',
          note: `${warning} con datos antiguos y ${danger} desconectados`,
        },
        {
          label: 'Alertas activas',
          value: String(this.activeAlerts.length),
          tone: this.activeAlerts.length ? 'tone-warning' : 'tone-success',
          note: 'Disparadas por reglas del frontend',
        },
        {
          label: 'Eventos 24h',
          value: String(this.eventsLast24h.length),
          tone: 'tone-blue',
          note: 'Actividad de seguridad reciente',
        },
        {
          label: 'Intentos fallidos',
          value: String(this.failedOrigins.reduce((sum, item) => sum + item.count, 0)),
          tone: 'tone-danger',
          note: 'Agregados por IP de origen',
        },
      ]
    },

    dashboardChart() {
      const points = []
      this.dashboardCards.forEach((agent) => {
        ;(this.thorondorSnapshots[agent.id] || []).forEach((snapshot) => {
          const timestamp = new Date(snapshot.timestamp).getTime()
          if (timestamp >= Date.now() - 7200000) {
            points.push({
              agentId: agent.id,
              agentName: agent.displayName,
              label: new Date(snapshot.timestamp).toLocaleTimeString(),
              cpu: snapshot.cpuTotal,
              ram: snapshot.memoryPercent,
            })
          }
        })
      })

      const labels = Array.from(new Set(points.map((point) => point.label)))
      const datasets = []

      this.dashboardCards.forEach((agent, index) => {
        const agentPoints = points.filter((point) => point.agentId === agent.id)
        if (!agentPoints.length) return

        datasets.push({
          label: `${agent.displayName} CPU`,
          data: labels.map(
            (label) => agentPoints.find((point) => point.label === label)?.cpu ?? null,
          ),
          borderColor: colorFromSeed(index, 1),
          backgroundColor: colorFromSeed(index, 0.18),
          tension: 0.3,
          spanGaps: true,
        })

        datasets.push({
          label: `${agent.displayName} RAM`,
          data: labels.map(
            (label) => agentPoints.find((point) => point.label === label)?.ram ?? null,
          ),
          borderColor: colorFromSeed(index + 11, 1),
          backgroundColor: colorFromSeed(index + 11, 0.18),
          tension: 0.3,
          borderDash: [6, 4],
          spanGaps: true,
        })
      })

      return { labels, datasets }
    },
  },

  methods: {
    openAgentDetail(agentId) {
      this.selectAgent(agentId)
      this.$router.push({
        name: 'thorondor-host-detail',
        query: { agent: agentId },
      })
    },
  },
}
</script>

<style scoped>
.card-head-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.card-title-block {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.dashboard-table-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.os-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.18rem 0.55rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.os-badge--linux {
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.3);
  color: #86efac;
}

.os-badge--win {
  background: rgba(176, 184, 194, 0.14);
  border: 1px solid rgba(169, 186, 203, 0.34);
  color: #dbe5ef;
}

@media (max-width: 1199px) {
  .dashboard-table-grid {
    grid-template-columns: 1fr;
  }
}
</style>
