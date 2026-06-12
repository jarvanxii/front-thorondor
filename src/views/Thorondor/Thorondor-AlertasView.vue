<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Centro de alertas"
      :title="selectedAgent ? `Alertas de ${selectedAgent.displayName}` : 'Alertas del host'"
      copy="Alertas del host seleccionado. Revisión por estado, severidad y fecha."
      :badge="selectedAgentCard ? selectedAgentCard.status.label : 'Sin host'"
      :badge-note="`${filteredAlerts.length} alertas en la vista actual.`"
    />

    <ThorondorMetricGrid :items="summaryCards" />

    <section class="section-box alert-filters">
      <label class="control-field">
        <span class="field-label">Estado</span>
        <select v-model="filters.status" class="form-select input-dark">
          <option value="all">Todos</option>
          <option value="active">Activas</option>
          <option value="reviewed">Revisadas</option>
          <option value="resolved">Resueltas</option>
        </select>
      </label>

      <button class="btn btn-main" type="button" @click="pollNow">Actualizar ahora</button>
    </section>

    <section class="section-box">
      <header class="card-head">
        <h2>Timeline de alertas</h2>
        <span class="mini-badge">{{ filteredAlerts.length }}</span>
      </header>

      <ul v-if="filteredAlerts.length" class="alert-list">
        <li v-for="alert in filteredAlerts" :key="alert.id" class="alert-item">
          <span class="alert-severity" :class="severityClass(alert)"></span>
          <article>
            <header>
              <strong>{{ alert.typeLabel || humanizeRuleType(alert.type) }}</strong>
              <span class="state-chip" :class="alertStatusClass(alert.status)">{{
                alert.status
              }}</span>
            </header>
            <p>{{ alert.description }}</p>
            <small class="alert-meta">
              <span>{{ agentNameById(alert.agentId) }} - {{ formatDateTime(alert.createdAt) }}</span>
              <span v-if="alert.lastNotifiedAt">Email: {{ formatDateTime(alert.lastNotifiedAt) }}</span>
            </small>
          </article>
          <nav class="table-actions" aria-label="Acciones de alerta">
            <button class="btn btn-quiet" type="button" @click="setAlertStatus(alert, 'reviewed')">
              Revisar
            </button>
            <button class="btn btn-quiet" type="button" @click="setAlertStatus(alert, 'resolved')">
              Resolver
            </button>
            <button class="btn btn-quiet" type="button" @click="setAlertStatus(alert, 'active')">
              Reabrir
            </button>
          </nav>
        </li>
      </ul>

      <p v-else class="empty-box">No hay alertas que coincidan con los filtros actuales.</p>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from '@/components/Thorondor/ThorondorPageShell.vue'
import ThorondorMetricGrid from '@/components/Thorondor/ThorondorMetricGrid.vue'
import ThorondorSectionHeader from '@/components/Thorondor/ThorondorSectionHeader.vue'
import thorondorBaseMixin from '@/features/thorondor/mixins/thorondorBaseMixin'

export default {
  name: 'ThorondorAlertasView',

  components: {
    ThorondorMetricGrid,
    ThorondorPageShell,
    ThorondorSectionHeader,
  },

  mixins: [thorondorBaseMixin],

  data() {
    return {
      filters: {
        status: 'active',
      },
    }
  },

  computed: {
    allAlerts() {
      return [...(this.selectedAlerts || [])].sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || ''),
      )
    },

    reviewedAlerts() {
      return this.allAlerts.filter((alert) => alert.status === 'reviewed')
    },

    resolvedAlerts() {
      return this.allAlerts.filter((alert) => alert.status === 'resolved')
    },

    filteredAlerts() {
      return this.allAlerts.filter((alert) => {
        const matchesStatus = this.filters.status === 'all' || alert.status === this.filters.status
        return matchesStatus
      })
    },

    summaryCards() {
      return [
        {
          label: 'Activas',
          value: String(this.selectedActiveAlerts.length),
          tone: this.selectedActiveAlerts.length ? 'tone-warning' : 'tone-success',
          note: 'Requieren revision en este host.',
        },
        {
          label: 'Revisadas',
          value: String(this.reviewedAlerts.length),
          tone: 'tone-blue',
          note: 'Vistas por el operador.',
        },
        {
          label: 'Resueltas',
          value: String(this.resolvedAlerts.length),
          tone: 'tone-success',
          note: 'Cerradas en esta instancia.',
        },
        {
          label: 'Host activo',
          value: this.selectedAgent ? '1' : '0',
          tone: 'tone-neutral',
          note: 'Contexto aislado por ordenador.',
        },
      ]
    },
  },

  methods: {
    humanizeRuleType(type) {
      const map = {
        cpu: 'CPU sostenida alta',
        ram: 'RAM alta',
        disk: 'Disco alto',
        failedLogins: 'Fallos de login',
        unknownLoginIp: 'Login desde IP desconocida',
        criticalFileChange: 'Cambio en archivo crítico',
        heartbeat: 'Heartbeat ausente',
        sudoUnauthorized: 'Sudo no autorizado',
        newUser: 'Nuevo usuario o grupo',
        networkExposure: 'Puerto sensible expuesto',
      }
      return map[type] || type || 'Alerta'
    },

    severityClass(alert) {
      if (alert.status === 'resolved') return 'severity-muted'
      if (['heartbeat', 'failedLogins', 'criticalFileChange'].includes(alert.type))
        return 'severity-high'
      return 'severity-medium'
    },

    async setAlertStatus(alert, status) {
      await this.$store.dispatch('setThorondorAlertStatus', {
        id: alert.id,
        status,
      })
    },
  },
}
</script>

<style scoped>
.alert-filters {
  display: grid;
  grid-template-columns: minmax(180px, 280px) auto;
  gap: 16px;
  align-items: end;
}

.alert-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 18px 0 0;
  list-style: none;
}

.alert-item {
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.alert-severity {
  width: 4px;
  height: 100%;
  min-height: 54px;
  border-radius: 2px;
}

.severity-high {
  background: #f59e0b;
}

.severity-medium {
  background: #aeb8c4;
}

.severity-muted {
  background: #7c858f;
}

.alert-item article {
  display: grid;
  gap: 5px;
}

.alert-item article header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.alert-item strong {
  color: #f8fafc;
}

.alert-item p,
.alert-item small {
  margin: 0;
  color: #aebed0;
}

.alert-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}

@media (max-width: 1100px) {
  .alert-filters,
  .alert-item {
    grid-template-columns: 1fr;
  }
}
</style>
