<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Investigacion"
      :title="selectedAgent ? `Casos de ${selectedAgent.displayName}` : 'Casos del host'"
      copy="Agrupa alertas, comandos y acciones defensivas del ordenador seleccionado para investigar sin mezclar evidencias de otros sistemas."
      badge="Case"
      :badge-note="`${selectedCases.length} casos asociados a este host.`"
    />

    <ThorondorMetricGrid :items="caseSummary" />

    <section class="section-box cases-layout">
      <article class="tool-card">
        <header class="card-head">
          <h2>Nuevo caso</h2>
          <span class="mini-badge">{{
            selectedAgent ? selectedAgent.displayName : 'Sin host'
          }}</span>
        </header>

        <section class="control-grid compact-grid">
          <label class="control-field full-span" for="case-alert">
            <span class="field-label">Alerta inicial</span>
            <select id="case-alert" v-model="caseDraft.alertId" class="form-select input-dark">
              <option value="">Sin alerta asociada</option>
              <option v-for="alert in selectedAlerts" :key="alert.id" :value="alert.id">
                {{ alert.typeLabel || humanizeRuleType(alert.type) }} - {{ alert.status }}
              </option>
            </select>
          </label>

          <label class="control-field" for="case-severity">
            <span class="field-label">Severidad</span>
            <select id="case-severity" v-model="caseDraft.severity" class="form-select input-dark">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
            </select>
          </label>

          <label class="control-field" for="case-owner">
            <span class="field-label">Responsable</span>
            <input
              id="case-owner"
              v-model.trim="caseDraft.owner"
              class="form-control input-dark"
              placeholder="Analista"
            />
          </label>

          <label class="control-field full-span" for="case-title">
            <span class="field-label">Titulo</span>
            <input
              id="case-title"
              v-model.trim="caseDraft.title"
              class="form-control input-dark"
              placeholder="Investigacion de actividad sospechosa"
            />
          </label>

          <label class="control-field full-span" for="case-note">
            <span class="field-label">Nota inicial</span>
            <textarea
              id="case-note"
              v-model.trim="caseDraft.note"
              rows="4"
              class="form-control input-dark textarea-dark"
              placeholder="Contexto, hipotesis inicial o siguiente paso."
            ></textarea>
          </label>
        </section>

        <nav class="inline-actions" aria-label="Acciones de caso">
          <button class="btn btn-main" :disabled="!selectedAgentId" @click="createCase">
            Crear caso
          </button>
          <button class="btn btn-subtle" type="button" @click="resetDraft">Limpiar</button>
        </nav>
      </article>

      <article class="tool-card">
        <header class="card-head">
          <h2>Cola de investigacion</h2>
          <span class="mini-badge">{{ openCases.length }} abiertos</span>
        </header>

        <ul v-if="selectedCases.length" class="case-list">
          <li v-for="item in selectedCases" :key="item.id" class="case-item">
            <header>
              <strong>{{ item.title }}</strong>
              <span class="state-chip" :class="caseStatusClass(item.status)">
                {{ humanizeCaseStatus(item.status) }}
              </span>
            </header>
            <p>{{ item.note || 'Sin nota inicial.' }}</p>
            <footer>
              <span>{{ item.owner || 'Sin responsable' }}</span>
              <span>{{ humanizeSeverity(item.severity) }}</span>
              <span>{{ formatRelativeTime(item.updatedAt || item.createdAt) }}</span>
            </footer>
            <nav class="table-actions" aria-label="Estado del caso">
              <button class="btn btn-quiet" @click="updateCase(item, 'triage')">Triage</button>
              <button class="btn btn-quiet" @click="updateCase(item, 'contained')">
                Contenido
              </button>
              <button class="btn btn-quiet" @click="updateCase(item, 'resolved')">Resolver</button>
            </nav>
          </li>
        </ul>

        <p v-else class="empty-box">
          Este host no tiene casos todavia. Crea uno desde una alerta o desde una nota manual.
        </p>
      </article>
    </section>

    <section class="section-box">
      <article class="tool-card">
        <header class="card-head">
          <h2>Timeline operativo del host</h2>
          <span class="mini-badge">{{ hostTimeline.length }}</span>
        </header>

        <ol v-if="hostTimeline.length" class="case-timeline">
          <li v-for="entry in hostTimeline" :key="entry.id">
            <span class="timeline-dot" :class="entry.tone"></span>
            <article>
              <strong>{{ entry.title }}</strong>
              <p>{{ entry.copy }}</p>
              <small>{{ formatDateTime(entry.timestamp) }}</small>
            </article>
          </li>
        </ol>

        <p v-else class="empty-box">
          Sin alertas, comandos ni acciones defensivas recientes para construir timeline.
        </p>
      </article>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorMetricGrid from '@/components/Thorondor/ThorondorMetricGrid.vue'
import ThorondorPageShell from '@/components/Thorondor/ThorondorPageShell.vue'
import ThorondorSectionHeader from '@/components/Thorondor/ThorondorSectionHeader.vue'
import thorondorBaseMixin from '@/features/thorondor/mixins/thorondorBaseMixin'

export default {
  name: 'ThorondorCasosView',

  components: {
    ThorondorMetricGrid,
    ThorondorPageShell,
    ThorondorSectionHeader,
  },

  mixins: [thorondorBaseMixin],

  data() {
    return {
      caseDraft: this.emptyDraft(),
    }
  },

  computed: {
    openCases() {
      return this.selectedCases.filter(
        (item) => !['resolved', 'false_positive'].includes(item.status),
      )
    },

    caseSummary() {
      const high = this.selectedCases.filter((item) =>
        ['high', 'critical'].includes(item.severity),
      ).length
      return [
        {
          label: 'Abiertos',
          value: String(this.openCases.length),
          tone: this.openCases.length ? 'tone-warning' : 'tone-success',
          note: 'Casos pendientes de cierre.',
        },
        {
          label: 'Alta prioridad',
          value: String(high),
          tone: high ? 'tone-danger' : 'tone-success',
          note: 'Severidad alta o critica.',
        },
        {
          label: 'Alertas del host',
          value: String(this.selectedAlerts.length),
          tone: this.selectedAlerts.length ? 'tone-blue' : 'tone-neutral',
          note: 'Disponibles como evidencia inicial.',
        },
        {
          label: 'Acciones',
          value: String(this.hostResponseActions.length),
          tone: this.hostResponseActions.length ? 'tone-blue' : 'tone-neutral',
          note: 'Bloqueos o desbloqueos desde Thorondor.',
        },
      ]
    },

    hostResponseActions() {
      return (this.$store.getters.thorondorResponseActions || []).filter(
        (action) => action.agentId === this.selectedAgentId,
      )
    },

    hostTimeline() {
      const alerts = this.selectedAlerts.map((alert) => ({
        id: `alert-${alert.id}`,
        timestamp: alert.createdAt,
        title: alert.typeLabel || this.humanizeRuleType(alert.type),
        copy: alert.description,
        tone: alert.status === 'resolved' ? 'timeline-muted' : 'timeline-warning',
      }))

      const actions = this.hostResponseActions.map((action) => ({
        id: `action-${action.id}`,
        timestamp: action.timestamp,
        title: action.action === 'block' ? 'IP bloqueada' : 'IP desbloqueada',
        copy: `${action.ip} - ${action.message || 'Accion registrada desde el panel.'}`,
        tone: action.ok === false ? 'timeline-danger' : 'timeline-success',
      }))

      const commands = this.selectedSecurityEvents
        .filter(
          (event) => ['sudo_command', 'command_execution'].includes(event.kind) || event.command,
        )
        .slice(0, 12)
        .map((event) => ({
          id: `command-${event.id}`,
          timestamp: event.timestamp,
          title: this.humanizeEventKind(event.kind),
          copy: event.command || event.message || 'Comando detectado por el agente.',
          tone: 'timeline-info',
        }))

      return [...alerts, ...actions, ...commands]
        .filter((entry) => entry.timestamp)
        .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
        .slice(0, 20)
    },
  },

  methods: {
    emptyDraft() {
      return {
        alertId: '',
        title: '',
        severity: 'medium',
        owner: '',
        note: '',
      }
    },

    humanizeRuleType(type) {
      const map = {
        cpu: 'CPU sostenida alta',
        ram: 'RAM alta',
        disk: 'Disco alto',
        failedLogins: 'Fallos de login',
        unknownLoginIp: 'Login desde IP desconocida',
        criticalFileChange: 'Cambio en archivo critico',
        heartbeat: 'Heartbeat ausente',
        sudoUnauthorized: 'Sudo no autorizado',
        newUser: 'Nuevo usuario o grupo',
        networkExposure: 'Puerto sensible expuesto',
      }
      return map[type] || type || 'Alerta'
    },

    humanizeCaseStatus(status) {
      const map = {
        new: 'Nuevo',
        triage: 'En analisis',
        contained: 'Contenido',
        resolved: 'Resuelto',
        false_positive: 'Falso positivo',
      }
      return map[status] || status || 'Nuevo'
    },

    humanizeSeverity(severity) {
      const map = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        critical: 'Critica',
      }
      return `Severidad ${map[severity] || severity || 'media'}`
    },

    caseStatusClass(status) {
      if (status === 'resolved') return 'chip-success'
      if (status === 'contained') return 'chip-warning'
      return 'chip-danger'
    },

    async createCase() {
      if (!this.selectedAgentId) return
      const alert = this.selectedAlerts.find((item) => item.id === this.caseDraft.alertId)
      await this.$store.dispatch('saveThorondorCase', {
        agentId: this.selectedAgentId,
        title:
          this.caseDraft.title ||
          alert?.typeLabel ||
          alert?.description ||
          'Investigacion del host',
        severity: this.caseDraft.severity,
        owner: this.caseDraft.owner || 'Sin asignar',
        note: this.caseDraft.note || alert?.description || '',
        alerts: alert ? [alert.id] : [],
        tasks: [
          { id: 'review-alert', label: 'Revisar alerta inicial', done: false },
          { id: 'check-commands', label: 'Comprobar comandos recientes', done: false },
          { id: 'document-actions', label: 'Documentar acciones de respuesta', done: false },
        ],
      })
      this.resetDraft()
    },

    async updateCase(item, status) {
      await this.$store.dispatch('saveThorondorCase', {
        ...item,
        status,
      })
    },

    resetDraft() {
      this.caseDraft = this.emptyDraft()
    },
  },
}
</script>

<style scoped>
.cases-layout {
  display: grid;
  grid-template-columns: minmax(280px, 5fr) minmax(0, 7fr);
  gap: 16px;
}

.case-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.case-item {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: rgba(16, 20, 26, 0.54);
}

.case-item header,
.case-item footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.case-item strong {
  color: #f8fafc;
}

.case-item p,
.case-item footer {
  margin: 0;
  color: #aebed0;
}

.case-timeline {
  display: grid;
  gap: 14px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.case-timeline li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 12px;
}

.case-timeline article {
  display: grid;
  gap: 4px;
}

.case-timeline strong {
  color: #f8fafc;
}

.case-timeline p,
.case-timeline small {
  margin: 0;
  color: #aebed0;
}

.timeline-muted {
  background: #7c858f;
}

.timeline-warning {
  background: #f59e0b;
}

.timeline-danger {
  background: #f87171;
}

.timeline-success {
  background: #aeb8c4;
}

.timeline-info {
  background: #c4ccd6;
}

@media (max-width: 1199px) {
  .cases-layout {
    grid-template-columns: 1fr;
  }
}
</style>
