<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Buscador SIEM"
      title="Eventos globales"
      copy="Consulta todos los eventos recibidos por Thorondor sin entrar host por host. Filtra por sistema, severidad, tipo, origen, IP y texto libre para investigar actividad transversal."
      badge="Central"
      :badge-note="`${filteredEvents.length} eventos en la vista actual.`"
    >
      <nav class="inline-actions" aria-label="Acciones de eventos">
        <button class="btn btn-main" type="button" @click="pollNow">Sincronizar</button>
      </nav>
    </ThorondorSectionHeader>

    <ThorondorMetricGrid :items="summaryCards" />

    <section class="section-box event-search-panel">
      <label class="control-field" for="events-agent">
        <span class="field-label">Sistema</span>
        <select id="events-agent" v-model="filters.agentId" class="form-select input-dark">
          <option value="">Todos</option>
          <option v-for="agent in dashboardCards" :key="agent.id" :value="agent.id">
            {{ agent.displayName }}
          </option>
        </select>
      </label>

      <label class="control-field" for="events-severity">
        <span class="field-label">Severidad</span>
        <select id="events-severity" v-model="filters.severity" class="form-select input-dark">
          <option value="">Todas</option>
          <option value="critical">Critical</option>
          <option value="danger">Danger</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </label>

      <label class="control-field" for="events-type">
        <span class="field-label">Tipo</span>
        <select id="events-type" v-model="filters.type" class="form-select input-dark">
          <option value="">Todos</option>
          <option v-for="type in eventTypes" :key="type" :value="type">{{ humanizeEventKind(type) }}</option>
        </select>
      </label>

      <label class="control-field" for="events-ip">
        <span class="field-label">IP origen</span>
        <input id="events-ip" v-model.trim="filters.sourceIp" class="form-control input-dark" placeholder="203.0.113.24" />
      </label>

      <label class="control-field search-field" for="events-query">
        <span class="field-label">Busqueda</span>
        <input id="events-query" v-model.trim="filters.q" class="form-control input-dark" placeholder="ssh, sudo, 500, usuario..." />
      </label>
    </section>

    <section class="section-box">
      <header class="card-head">
        <h2>Histórico de eventos</h2>
        <span class="mini-badge">{{ filteredEvents.length }}</span>
      </header>

      <section class="table-wrap events-table-wrap">
        <table class="table table-dark align-middle mb-0">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Sistema</th>
              <th>Severidad</th>
              <th>Tipo</th>
              <th>Origen</th>
              <th>Usuario</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in filteredEvents" :key="event.id">
              <td>{{ formatDateTime(event.timestamp) }}</td>
              <td>{{ agentNameById(event.agentId) }}</td>
              <td>
                <span class="state-chip" :class="severityClass(event.severity)">
                  {{ event.severity || 'info' }}
                </span>
              </td>
              <td>{{ humanizeEventKind(event.kind || event.type) }}</td>
              <td><code class="inline-code">{{ event.sourceIp || event.origin || '-' }}</code></td>
              <td>{{ event.user || '-' }}</td>
              <td class="event-message">{{ event.message || event.file || event.subject || '-' }}</td>
            </tr>
            <tr v-if="!filteredEvents.length">
              <td colspan="7" class="text-muted">Sin eventos para los filtros actuales.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorMetricGrid from '@/components/Thorondor/ThorondorMetricGrid.vue'
import ThorondorPageShell from '@/components/Thorondor/ThorondorPageShell.vue'
import ThorondorSectionHeader from '@/components/Thorondor/ThorondorSectionHeader.vue'
import thorondorBaseMixin from '@/features/thorondor/mixins/thorondorBaseMixin'

export default {
  name: 'ThorondorEventosView',

  components: {
    ThorondorMetricGrid,
    ThorondorPageShell,
    ThorondorSectionHeader,
  },

  mixins: [thorondorBaseMixin],

  data() {
    return {
      filters: {
        agentId: '',
        severity: '',
        type: '',
        sourceIp: '',
        q: '',
      },
    }
  },

  computed: {
    eventTypes() {
      return Array.from(new Set(this.allSecurityEvents.map((event) => event.kind || event.type).filter(Boolean))).sort()
    },

    filteredEvents() {
      const query = this.filters.q.toLowerCase()
      const ip = this.filters.sourceIp.toLowerCase()
      return [...this.allSecurityEvents]
        .filter((event) => !this.filters.agentId || event.agentId === this.filters.agentId)
        .filter((event) => !this.filters.severity || String(event.severity || '').toLowerCase() === this.filters.severity)
        .filter((event) => !this.filters.type || (event.kind || event.type) === this.filters.type)
        .filter((event) => !ip || String(event.sourceIp || event.origin || '').toLowerCase().includes(ip))
        .filter((event) => {
          if (!query) return true
          return [event.message, event.user, event.sourceIp, event.origin, event.kind, event.type]
            .map((value) => String(value || '').toLowerCase())
            .some((value) => value.includes(query))
        })
        .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
        .slice(0, 600)
    },

    summaryCards() {
      const critical = this.filteredEvents.filter((event) => ['critical', 'danger'].includes(String(event.severity || '').toLowerCase())).length
      const failedLogins = this.filteredEvents.filter((event) => (event.kind || event.type) === 'failed_login').length
      const uniqueIps = new Set(this.filteredEvents.map((event) => event.sourceIp).filter(Boolean)).size

      return [
        {
          label: 'Eventos',
          value: String(this.filteredEvents.length),
          tone: 'tone-blue',
          note: 'Tras aplicar filtros.',
        },
        {
          label: 'Alta severidad',
          value: String(critical),
          tone: critical ? 'tone-danger' : 'tone-success',
          note: 'Critical y danger.',
        },
        {
          label: 'Logins fallidos',
          value: String(failedLogins),
          tone: failedLogins ? 'tone-warning' : 'tone-success',
          note: 'Posible fuerza bruta.',
        },
        {
          label: 'IPs origen',
          value: String(uniqueIps),
          tone: 'tone-neutral',
          note: 'Orígenes únicos detectados.',
        },
      ]
    },
  },

  methods: {
    severityClass(severity) {
      const normalized = String(severity || '').toLowerCase()
      if (normalized === 'critical' || normalized === 'danger') return 'chip-danger'
      if (normalized === 'warning') return 'chip-warning'
      return 'chip-muted'
    },
  },
}
</script>

<style scoped>
.event-search-panel {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(150px, 0.7fr) minmax(170px, 0.9fr) minmax(170px, 0.8fr) minmax(260px, 1.4fr);
  gap: 14px;
  align-items: end;
}

.events-table-wrap table {
  min-width: 1040px;
}

.event-message {
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .event-search-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-field {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .event-search-panel {
    grid-template-columns: 1fr;
  }
}
</style>
