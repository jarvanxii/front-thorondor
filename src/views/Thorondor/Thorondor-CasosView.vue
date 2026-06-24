<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Investigación"
      :title="selectedAgent ? `Casos de ${selectedAgent.displayName}` : 'Casos del host'"
      copy="Cada caso concentra el contexto de una incidencia: alertas, notas, evidencias, tareas y decisiones tomadas."
      badge="Casos"
      :badge-note="`${selectedCases.length} investigaciones en este host.`"
    />

    <ThorondorMetricGrid :items="caseSummary" />

    <section class="section-box cases-workbench">
      <aside class="cases-sidebar" aria-label="Gestión de casos">
        <article class="tool-card case-create-card">
          <header class="card-head">
            <h2>Nuevo caso</h2>
            <span class="mini-badge">{{ selectedAgent ? selectedAgent.displayName : 'Sin host' }}</span>
          </header>

          <section class="control-grid compact-grid">
            <label class="control-field full-span" for="case-title">
              <span class="field-label">Título</span>
              <input
                id="case-title"
                v-model.trim="caseDraft.title"
                class="form-control input-dark"
                placeholder="Qué ha pasado"
              />
            </label>

            <label class="control-field" for="case-severity">
              <span class="field-label">Severidad</span>
              <select id="case-severity" v-model="caseDraft.severity" class="form-select input-dark">
                <option v-for="item in severityOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </label>

            <label class="control-field" for="case-owner">
              <span class="field-label">Responsable</span>
              <input
                id="case-owner"
                v-model.trim="caseDraft.owner"
                class="form-control input-dark"
                placeholder="Persona responsable"
              />
            </label>

            <label class="control-field full-span" for="case-alert">
              <span class="field-label">Alerta inicial</span>
              <select id="case-alert" v-model="caseDraft.alertId" class="form-select input-dark">
                <option value="">Sin alerta asociada</option>
                <option v-for="alert in selectedAlerts" :key="alert.id" :value="alert.id">
                  {{ alert.typeLabel || humanizeRuleType(alert.type) }} · {{ humanizeAlertStatus(alert.status) }}
                </option>
              </select>
            </label>

            <label class="control-field full-span" for="case-note">
              <span class="field-label">Resumen inicial</span>
              <textarea
                id="case-note"
                v-model.trim="caseDraft.note"
                rows="3"
                class="form-control input-dark textarea-dark"
                placeholder="Contexto, síntoma observado o hipótesis inicial"
              ></textarea>
            </label>
          </section>

          <nav class="inline-actions" aria-label="Acciones de creación de caso">
            <button class="btn btn-main" :disabled="!selectedAgentId" @click="createCase">
              Abrir caso
            </button>
            <button class="btn btn-subtle" type="button" @click="resetDraft">Limpiar</button>
          </nav>
        </article>

        <article class="tool-card case-queue-card">
          <header class="card-head">
            <h2>Cola de casos</h2>
            <span class="mini-badge">{{ filteredCases.length }}</span>
          </header>

          <section class="case-filters" aria-label="Filtros de casos">
            <label class="control-field" for="case-status-filter">
              <span class="field-label">Estado</span>
              <select id="case-status-filter" v-model="caseFilters.status" class="form-select input-dark">
                <option value="open">Abiertos</option>
                <option value="">Todos</option>
                <option v-for="item in statusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </label>
            <label class="control-field" for="case-query-filter">
              <span class="field-label">Buscar</span>
              <input
                id="case-query-filter"
                v-model.trim="caseFilters.query"
                class="form-control input-dark"
                placeholder="Título, responsable o nota"
              />
            </label>
          </section>

          <ul v-if="filteredCases.length" class="case-list">
            <li v-for="item in filteredCases" :key="item.id">
              <button
                class="case-list-item"
                :class="{ 'is-selected': selectedCase?.id === item.id }"
                type="button"
                @click="selectedCaseId = item.id"
              >
                <span class="case-list-main">
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.owner || 'Sin responsable' }} · {{ formatRelativeTime(item.updatedAt || item.createdAt) }}</small>
                </span>
                <span class="case-list-meta">
                  <span class="state-chip" :class="caseStatusClass(item.status)">
                    {{ humanizeCaseStatus(item.status) }}
                  </span>
                  <span class="mini-badge" :class="severityBadgeClass(item.severity)">
                    {{ humanizeSeverityShort(item.severity) }}
                  </span>
                </span>
              </button>
            </li>
          </ul>

          <p v-else class="empty-box">
            No hay casos con estos filtros.
          </p>
        </article>
      </aside>

      <section class="case-detail" aria-label="Detalle del caso">
        <article v-if="selectedCase" class="tool-card case-detail-card">
          <header class="case-detail-header">
            <div>
              <span class="section-kicker">Caso activo</span>
              <h2>{{ selectedCase.title }}</h2>
              <p>{{ selectedCase.summary || selectedCase.note || 'Añade contexto para que la investigación quede clara.' }}</p>
            </div>
            <div class="case-detail-badges">
              <span class="state-chip" :class="caseStatusClass(selectedCase.status)">
                {{ humanizeCaseStatus(selectedCase.status) }}
              </span>
              <span class="mini-badge" :class="severityBadgeClass(selectedCase.severity)">
                {{ humanizeSeverity(selectedCase.severity) }}
              </span>
            </div>
          </header>

          <section class="case-meta-grid">
            <article>
              <span>Responsable</span>
              <strong>{{ selectedCase.owner || 'Sin asignar' }}</strong>
            </article>
            <article>
              <span>Creado</span>
              <strong>{{ formatDateTime(selectedCase.createdAt) }}</strong>
            </article>
            <article>
              <span>Último cambio</span>
              <strong>{{ formatRelativeTime(selectedCase.updatedAt || selectedCase.createdAt) }}</strong>
            </article>
            <article>
              <span>Evidencias</span>
              <strong>{{ selectedCaseEvidence.length }}</strong>
            </article>
          </section>

          <nav class="case-status-actions" aria-label="Actualizar estado del caso">
            <button
              v-for="item in statusOptions"
              :key="item.value"
              class="btn btn-quiet"
              :class="{ 'is-active': selectedCase.status === item.value }"
              type="button"
              @click="setCaseStatus(selectedCase, item.value)"
            >
              {{ item.label }}
            </button>
          </nav>

          <section class="case-panels-grid">
            <article class="case-panel">
              <header class="case-panel-head">
                <h3>Timeline de la incidencia</h3>
                <span class="mini-badge">{{ selectedCaseTimeline.length }}</span>
              </header>

              <ol class="case-timeline" v-if="selectedCaseTimeline.length">
                <li v-for="entry in selectedCaseTimeline" :key="entry.id">
                  <span class="timeline-rail" aria-hidden="true">
                    <span class="timeline-dot" :class="entry.tone"></span>
                  </span>
                  <article>
                    <header>
                      <strong>{{ entry.title }}</strong>
                      <small>{{ formatDateTime(entry.timestamp) }}</small>
                    </header>
                    <p>{{ entry.copy }}</p>
                    <footer>
                      <span>{{ entry.actor || 'Thorondor' }}</span>
                      <span>{{ humanizeTimelineType(entry.type) }}</span>
                    </footer>
                  </article>
                </li>
              </ol>

              <p v-else class="empty-box">
                El caso todavía no tiene actividad registrada.
              </p>
            </article>

            <article class="case-panel">
              <header class="case-panel-head">
                <h3>Añadir nota</h3>
                <span class="mini-badge">Bitácora</span>
              </header>

              <section class="note-compose">
                <label class="control-field" for="case-note-type">
                  <span class="field-label">Tipo</span>
                  <select id="case-note-type" v-model="noteDraft.type" class="form-select input-dark">
                    <option v-for="item in timelineTypeOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                </label>

                <label class="control-field full-span" for="case-note-text">
                  <span class="field-label">Nota</span>
                  <textarea
                    id="case-note-text"
                    v-model.trim="noteDraft.text"
                    rows="5"
                    class="form-control input-dark textarea-dark"
                    placeholder="Qué se ha revisado, qué se ha decidido y cuál es el siguiente paso"
                  ></textarea>
                </label>

                <button class="btn btn-main" type="button" :disabled="!noteDraft.text" @click="addCaseNote">
                  Añadir al timeline
                </button>
              </section>
            </article>
          </section>

          <section class="case-panels-grid">
            <article class="case-panel">
              <header class="case-panel-head">
                <h3>Tareas de cierre</h3>
                <span class="mini-badge">{{ completedTaskCount }}/{{ selectedCaseTasks.length }}</span>
              </header>

              <ul class="case-task-list" v-if="selectedCaseTasks.length">
                <li v-for="task in selectedCaseTasks" :key="task.id">
                  <label>
                    <input :checked="task.done" type="checkbox" @change="toggleTask(task.id)" />
                    <span>
                      <strong>{{ task.label }}</strong>
                      <small>{{ task.done ? 'Completada' : 'Pendiente' }}</small>
                    </span>
                  </label>
                </li>
              </ul>

              <form class="case-task-form" @submit.prevent="addTask">
                <label class="control-field" for="new-task">
                  <span class="field-label">Nueva tarea</span>
                  <input
                    id="new-task"
                    v-model.trim="taskDraft"
                    class="form-control input-dark"
                    placeholder="Ej. revisar logs de autenticación"
                  />
                </label>
                <button class="btn btn-subtle" type="submit" :disabled="!taskDraft">
                  Añadir tarea
                </button>
              </form>
            </article>

            <article class="case-panel">
              <header class="case-panel-head">
                <h3>Evidencias</h3>
                <span class="mini-badge">{{ selectedCaseEvidence.length }}</span>
              </header>

              <ul v-if="selectedCaseEvidence.length" class="evidence-list">
                <li v-for="item in selectedCaseEvidence" :key="item.id">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.copy }}</p>
                  <small>{{ formatDateTime(item.timestamp) }}</small>
                </li>
              </ul>
              <p v-else class="empty-box">
                Añade alertas, comandos o notas relevantes como evidencia.
              </p>

              <section class="evidence-compose">
                <label class="control-field" for="case-evidence-alert">
                  <span class="field-label">Alerta</span>
                  <select id="case-evidence-alert" v-model="evidenceDraft.alertId" class="form-select input-dark">
                    <option value="">Selecciona una alerta</option>
                    <option v-for="alert in availableAlertsForCase" :key="alert.id" :value="alert.id">
                      {{ alert.typeLabel || humanizeRuleType(alert.type) }}
                    </option>
                  </select>
                </label>
                <button class="btn btn-subtle" type="button" :disabled="!evidenceDraft.alertId" @click="addSelectedAlertEvidence">
                  Vincular alerta
                </button>
              </section>
            </article>
          </section>
        </article>

        <article v-else class="tool-card empty-detail-card">
          <h2>Sin caso seleccionado</h2>
          <p>Abre un caso para empezar a documentar una incidencia de este host.</p>
        </article>
      </section>
    </section>

    <section class="section-box host-activity-box">
      <header class="case-panel-head">
        <div>
          <span class="section-kicker">Actividad del host</span>
          <h2>Eventos útiles para investigar</h2>
        </div>
        <span class="mini-badge">{{ hostTimeline.length }}</span>
      </header>

      <ol v-if="hostTimeline.length" class="host-activity-list">
        <li v-for="entry in hostTimeline" :key="entry.id">
          <span class="timeline-dot" :class="entry.tone"></span>
          <article>
            <strong>{{ entry.title }}</strong>
            <p>{{ entry.copy }}</p>
            <small>{{ formatDateTime(entry.timestamp) }}</small>
          </article>
          <button class="btn btn-quiet" type="button" :disabled="!selectedCase" @click="addHostActivityToCase(entry)">
            Añadir al caso
          </button>
        </li>
      </ol>

      <p v-else class="empty-box">
        No hay alertas, comandos o acciones recientes para este host.
      </p>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorMetricGrid from '@/components/Thorondor/ThorondorMetricGrid.vue'
import ThorondorPageShell from '@/components/Thorondor/ThorondorPageShell.vue'
import ThorondorSectionHeader from '@/components/Thorondor/ThorondorSectionHeader.vue'
import thorondorBaseMixin from '@/features/thorondor/mixins/thorondorBaseMixin'

const OPEN_CASE_STATUSES = new Set(['new', 'triage', 'contained'])

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
      selectedCaseId: '',
      caseFilters: {
        status: 'open',
        query: '',
      },
      noteDraft: {
        type: 'note',
        text: '',
      },
      evidenceDraft: {
        alertId: '',
      },
      taskDraft: '',
    }
  },

  computed: {
    statusOptions() {
      return [
        { value: 'new', label: 'Nuevo' },
        { value: 'triage', label: 'En análisis' },
        { value: 'contained', label: 'Contenido' },
        { value: 'resolved', label: 'Resuelto' },
        { value: 'false_positive', label: 'Falso positivo' },
      ]
    },

    severityOptions() {
      return [
        { value: 'low', label: 'Baja' },
        { value: 'medium', label: 'Media' },
        { value: 'high', label: 'Alta' },
        { value: 'critical', label: 'Crítica' },
      ]
    },

    timelineTypeOptions() {
      return [
        { value: 'note', label: 'Nota' },
        { value: 'analysis', label: 'Análisis' },
        { value: 'decision', label: 'Decisión' },
        { value: 'action', label: 'Acción' },
        { value: 'evidence', label: 'Evidencia' },
      ]
    },

    openCases() {
      return this.selectedCases.filter((item) => OPEN_CASE_STATUSES.has(item.status || 'new'))
    },

    filteredCases() {
      const query = this.caseFilters.query.toLowerCase()
      return this.selectedCases.filter((item) => {
        const matchesStatus =
          !this.caseFilters.status ||
          (this.caseFilters.status === 'open'
            ? OPEN_CASE_STATUSES.has(item.status || 'new')
            : item.status === this.caseFilters.status)
        const haystack = [
          item.title,
          item.owner,
          item.note,
          item.summary,
          ...(item.timeline || []).map((entry) => `${entry.title} ${entry.copy}`),
        ]
          .join(' ')
          .toLowerCase()

        return matchesStatus && (!query || haystack.includes(query))
      })
    },

    selectedCase() {
      return (
        this.selectedCases.find((item) => item.id === this.selectedCaseId) ||
        this.filteredCases[0] ||
        this.selectedCases[0] ||
        null
      )
    },

    selectedCaseTimeline() {
      return [...(this.selectedCase?.timeline || [])].sort((a, b) =>
        String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
      )
    },

    selectedCaseTasks() {
      return this.selectedCase?.tasks || []
    },

    selectedCaseEvidence() {
      return [...(this.selectedCase?.evidence || [])].sort((a, b) =>
        String(b.timestamp || '').localeCompare(String(a.timestamp || '')),
      )
    },

    completedTaskCount() {
      return this.selectedCaseTasks.filter((task) => task.done).length
    },

    availableAlertsForCase() {
      const linked = new Set(this.selectedCase?.alerts || [])
      return this.selectedAlerts.filter((alert) => !linked.has(alert.id))
    },

    caseSummary() {
      const high = this.selectedCases.filter((item) =>
        ['high', 'critical'].includes(item.severity),
      ).length
      const notes = this.selectedCases.reduce((total, item) => total + (item.timeline || []).length, 0)
      return [
        {
          label: 'Abiertos',
          value: String(this.openCases.length),
          tone: this.openCases.length ? 'tone-warning' : 'tone-success',
          note: 'Investigaciones pendientes.',
        },
        {
          label: 'Prioridad alta',
          value: String(high),
          tone: high ? 'tone-danger' : 'tone-success',
          note: 'Alta o crítica.',
        },
        {
          label: 'Evidencias',
          value: String(this.selectedCases.reduce((total, item) => total + (item.evidence || []).length, 0)),
          tone: 'tone-blue',
          note: 'Alertas y actividad vinculada.',
        },
        {
          label: 'Entradas',
          value: String(notes),
          tone: notes ? 'tone-blue' : 'tone-neutral',
          note: 'Timeline documentado.',
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
        copy: alert.description || 'Alerta generada por una regla del host.',
        tone: alert.status === 'resolved' ? 'timeline-muted' : 'timeline-warning',
        source: 'Alerta',
        alertId: alert.id,
      }))

      const actions = this.hostResponseActions.map((action) => ({
        id: `action-${action.id}`,
        timestamp: action.timestamp,
        title: action.action === 'block' ? 'IP bloqueada' : 'IP desbloqueada',
        copy: `${action.ip} · ${action.message || 'Acción registrada desde Thorondor.'}`,
        tone: action.ok === false ? 'timeline-danger' : 'timeline-success',
        source: 'Respuesta',
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
          source: 'Evento',
        }))

      return [...alerts, ...actions, ...commands]
        .filter((entry) => entry.timestamp)
        .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
        .slice(0, 24)
    },
  },

  watch: {
    selectedAgentId() {
      this.selectedCaseId = ''
      this.resetDraft()
      this.resetNoteDraft()
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

    defaultCaseTasks() {
      return [
        { id: 'review-context', label: 'Revisar contexto y alcance', done: false },
        { id: 'collect-evidence', label: 'Vincular evidencias relevantes', done: false },
        { id: 'define-response', label: 'Definir respuesta o contención', done: false },
        { id: 'document-close', label: 'Documentar cierre y aprendizaje', done: false },
      ]
    },

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

    humanizeAlertStatus(status) {
      const map = {
        active: 'Activa',
        reviewed: 'Revisada',
        resolved: 'Resuelta',
      }
      return map[status] || status || 'Sin estado'
    },

    humanizeCaseStatus(status) {
      return this.statusOptions.find((item) => item.value === status)?.label || 'Nuevo'
    },

    humanizeSeverity(severity) {
      return this.severityOptions.find((item) => item.value === severity)?.label || 'Media'
    },

    humanizeSeverityShort(severity) {
      const map = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        critical: 'Crítica',
      }
      return map[severity] || 'Media'
    },

    humanizeTimelineType(type) {
      const map = {
        created: 'Creación',
        status: 'Cambio de estado',
      }
      return map[type] || this.timelineTypeOptions.find((item) => item.value === type)?.label || 'Entrada'
    },

    caseStatusClass(status) {
      if (status === 'resolved') return 'chip-success'
      if (status === 'contained') return 'chip-warning'
      if (status === 'false_positive') return 'chip-neutral'
      return 'chip-danger'
    },

    severityBadgeClass(severity) {
      if (severity === 'critical') return 'severity-critical'
      if (severity === 'high') return 'severity-high'
      if (severity === 'low') return 'severity-low'
      return 'severity-medium'
    },

    timelineTone(type) {
      const map = {
        note: 'timeline-note',
        analysis: 'timeline-info',
        decision: 'timeline-warning',
        action: 'timeline-success',
        evidence: 'timeline-danger',
        status: 'timeline-warning',
      }
      return map[type] || 'timeline-info'
    },

    buildTimelineEntry(type, title, copy, extra = {}) {
      const timestamp = new Date().toISOString()
      return {
        id: `${type}-${timestamp}-${Math.random().toString(16).slice(2)}`,
        type,
        title,
        copy,
        actor: extra.actor || this.operatorName(),
        tone: extra.tone || this.timelineTone(type),
        timestamp,
        ...extra,
      }
    },

    operatorName() {
      return (
        this.thorondorState.session?.user?.displayName ||
        this.thorondorState.session?.user?.display_name ||
        this.thorondorState.session?.user?.email ||
        'Operador'
      )
    },

    async createCase() {
      if (!this.selectedAgentId) return
      const alert = this.selectedAlerts.find((item) => item.id === this.caseDraft.alertId)
      const now = new Date().toISOString()
      const title =
        this.caseDraft.title ||
        alert?.typeLabel ||
        alert?.description ||
        'Investigación del host'

      const evidence = alert
        ? [
            {
              id: `evidence-alert-${alert.id}`,
              type: 'alert',
              alertId: alert.id,
              title: alert.typeLabel || this.humanizeRuleType(alert.type),
              copy: alert.description || 'Alerta vinculada al abrir el caso.',
              timestamp: alert.createdAt || now,
            },
          ]
        : []

      const timeline = [
        {
          id: `created-${now}`,
          type: 'created',
          title: 'Caso abierto',
          copy: alert
            ? `Investigación iniciada desde la alerta: ${alert.typeLabel || this.humanizeRuleType(alert.type)}.`
            : 'Investigación abierta manualmente.',
          actor: this.operatorName(),
          tone: 'timeline-info',
          timestamp: now,
        },
      ]

      if (this.caseDraft.note) {
        timeline.push({
          id: `initial-note-${now}`,
          type: 'note',
          title: 'Resumen inicial',
          copy: this.caseDraft.note,
          actor: this.operatorName(),
          tone: 'timeline-note',
          timestamp: now,
        })
      }

      const record = await this.$store.dispatch('saveThorondorCase', {
        agentId: this.selectedAgentId,
        title,
        severity: this.caseDraft.severity,
        owner: this.caseDraft.owner,
        summary: this.caseDraft.note,
        note: this.caseDraft.note,
        alerts: alert ? [alert.id] : [],
        evidence,
        tasks: this.defaultCaseTasks(),
        timeline,
      })

      this.selectedCaseId = record.id
      this.resetDraft()
    },

    async saveCasePatch(caseItem, patch, timelineEntry = null) {
      if (!caseItem) return
      const timeline = timelineEntry ? [...(caseItem.timeline || []), timelineEntry] : caseItem.timeline || []
      await this.$store.dispatch('saveThorondorCase', {
        ...caseItem,
        ...patch,
        timeline,
      })
      this.selectedCaseId = caseItem.id
    },

    async setCaseStatus(caseItem, status) {
      if (!caseItem || caseItem.status === status) return
      await this.saveCasePatch(
        caseItem,
        { status },
        this.buildTimelineEntry(
          'status',
          'Estado actualizado',
          `El caso pasa a "${this.humanizeCaseStatus(status)}".`,
          { tone: this.caseStatusClass(status).replace('chip-', 'timeline-') },
        ),
      )
    },

    async addCaseNote() {
      if (!this.selectedCase || !this.noteDraft.text) return
      const type = this.noteDraft.type || 'note'
      await this.saveCasePatch(
        this.selectedCase,
        { summary: this.selectedCase.summary || this.noteDraft.text },
        this.buildTimelineEntry(type, this.humanizeTimelineType(type), this.noteDraft.text),
      )
      this.resetNoteDraft()
    },

    async addSelectedAlertEvidence() {
      if (!this.selectedCase || !this.evidenceDraft.alertId) return
      const alert = this.selectedAlerts.find((item) => item.id === this.evidenceDraft.alertId)
      if (!alert) return

      const evidence = [
        ...(this.selectedCase.evidence || []),
        {
          id: `evidence-alert-${alert.id}-${Date.now()}`,
          type: 'alert',
          alertId: alert.id,
          title: alert.typeLabel || this.humanizeRuleType(alert.type),
          copy: alert.description || 'Alerta vinculada al caso.',
          timestamp: alert.createdAt || new Date().toISOString(),
        },
      ]

      await this.saveCasePatch(
        this.selectedCase,
        {
          alerts: Array.from(new Set([...(this.selectedCase.alerts || []), alert.id])),
          evidence,
        },
        this.buildTimelineEntry(
          'evidence',
          'Alerta vinculada',
          alert.description || alert.typeLabel || this.humanizeRuleType(alert.type),
        ),
      )
      this.evidenceDraft.alertId = ''
    },

    async addHostActivityToCase(entry) {
      if (!this.selectedCase || !entry) return
      const evidence = [
        ...(this.selectedCase.evidence || []),
        {
          id: `evidence-${entry.id}-${Date.now()}`,
          type: entry.source || 'actividad',
          sourceId: entry.id,
          title: entry.title,
          copy: entry.copy,
          timestamp: entry.timestamp || new Date().toISOString(),
        },
      ]

      const alerts = entry.alertId
        ? Array.from(new Set([...(this.selectedCase.alerts || []), entry.alertId]))
        : this.selectedCase.alerts || []

      await this.saveCasePatch(
        this.selectedCase,
        { evidence, alerts },
        this.buildTimelineEntry('evidence', `Evidencia añadida: ${entry.title}`, entry.copy, {
          timestamp: entry.timestamp || new Date().toISOString(),
        }),
      )
    },

    async toggleTask(taskId) {
      if (!this.selectedCase) return
      const tasks = this.selectedCaseTasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      )
      const task = tasks.find((item) => item.id === taskId)
      await this.saveCasePatch(
        this.selectedCase,
        { tasks },
        this.buildTimelineEntry(
          'action',
          task?.done ? 'Tarea completada' : 'Tarea reabierta',
          task?.label || 'Actualización de tarea',
          { tone: task?.done ? 'timeline-success' : 'timeline-warning' },
        ),
      )
    },

    async addTask() {
      if (!this.selectedCase || !this.taskDraft) return
      const task = {
        id: `task-${Date.now()}`,
        label: this.taskDraft,
        done: false,
      }
      await this.saveCasePatch(
        this.selectedCase,
        { tasks: [...this.selectedCaseTasks, task] },
        this.buildTimelineEntry('action', 'Tarea añadida', task.label, { tone: 'timeline-info' }),
      )
      this.taskDraft = ''
    },

    resetDraft() {
      this.caseDraft = this.emptyDraft()
    },

    resetNoteDraft() {
      this.noteDraft = {
        type: 'note',
        text: '',
      }
      this.evidenceDraft.alertId = ''
      this.taskDraft = ''
    },
  },
}
</script>

<style scoped>
.cases-workbench {
  display: grid;
  grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.cases-sidebar,
.case-detail,
.case-create-card,
.case-queue-card,
.case-detail-card {
  min-width: 0;
}

.cases-sidebar {
  display: grid;
  gap: 16px;
}

.case-create-card,
.case-queue-card,
.case-detail-card,
.host-activity-box {
  background: var(--thorondor-panel-background);
}

.case-filters {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.case-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.case-list-item {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--thorondor-border-subtle);
  border-radius: 6px;
  color: #e8eef6;
  text-align: left;
  background: var(--thorondor-flat-background);
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.case-list-item:hover,
.case-list-item.is-selected {
  border-color: rgba(214, 161, 92, 0.46);
  background: var(--thorondor-flat-soft-background);
  transform: translateY(-1px);
}

.case-list-main,
.case-list-meta {
  display: grid;
  gap: 6px;
}

.case-list-main strong,
.case-detail-header h2,
.case-panel h3 {
  color: #f8fafc;
}

.case-list-main small,
.case-detail-header p,
.case-meta-grid span,
.case-panel p,
.case-panel small,
.case-timeline footer,
.host-activity-list p,
.host-activity-list small {
  color: #aebed0;
}

.case-detail-card {
  display: grid;
  gap: 16px;
}

.case-detail-header {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(176, 184, 194, 0.16);
}

.case-detail-header h2,
.case-detail-header p,
.case-panel h3,
.case-panel p {
  margin: 0;
}

.case-detail-badges,
.case-status-actions,
.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-status-actions .btn {
  min-width: 118px;
}

.case-status-actions .btn.is-active {
  border-color: rgba(214, 161, 92, 0.72);
  color: #f6d79d;
  background: rgba(214, 161, 92, 0.12);
}

.case-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.case-meta-grid article {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--thorondor-border-subtle);
  border-radius: 6px;
  background: var(--thorondor-flat-background);
}

.case-meta-grid strong {
  color: #f8fafc;
  font-size: 0.95rem;
}

.case-panels-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 14px;
}

.case-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--thorondor-border-subtle);
  border-radius: 6px;
  background: var(--thorondor-flat-background);
}

.case-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.case-panel-head h2,
.case-panel-head h3 {
  margin: 0;
}

.case-timeline,
.host-activity-list,
.case-task-list,
.evidence-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.case-timeline li {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
}

.timeline-rail {
  position: relative;
  display: flex;
  justify-content: center;
}

.timeline-rail::after {
  content: '';
  position: absolute;
  top: 18px;
  bottom: -14px;
  width: 1px;
  background: rgba(176, 184, 194, 0.18);
}

.case-timeline li:last-child .timeline-rail::after {
  display: none;
}

.case-timeline article,
.evidence-list li {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--thorondor-border-subtle);
  border-radius: 6px;
  background: var(--thorondor-flat-soft-background);
}

.case-timeline header,
.case-timeline footer,
.host-activity-list li {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: flex-start;
}

.case-timeline strong,
.evidence-list strong,
.host-activity-list strong,
.case-task-list strong {
  color: #f8fafc;
}

.note-compose,
.evidence-compose,
.case-task-form {
  display: grid;
  gap: 10px;
}

.case-task-list li label {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 10px;
  border: 1px solid var(--thorondor-border-subtle);
  border-radius: 6px;
  background: var(--thorondor-flat-soft-background);
}

.case-task-list li label span {
  display: grid;
  gap: 4px;
}

.case-task-list li label small {
  line-height: 1.3;
}

.host-activity-box {
  display: grid;
  gap: 14px;
}

.host-activity-list li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--thorondor-border-subtle);
  border-radius: 6px;
  background: var(--thorondor-flat-soft-background);
}

.host-activity-list article {
  display: grid;
  gap: 4px;
}

.host-activity-list p,
.host-activity-list small {
  margin: 0;
}

.timeline-muted {
  background: #7c858f;
}

.timeline-warning {
  background: #d6a15c;
}

.timeline-danger {
  background: #f87171;
}

.timeline-success {
  background: #8fd6ad;
}

.timeline-info {
  background: #8fd6ad;
}

.timeline-note {
  background: #f3cf8c;
}

.severity-critical {
  border-color: rgba(248, 113, 113, 0.55);
  color: #fecaca;
}

.severity-high {
  border-color: rgba(245, 158, 11, 0.55);
  color: #fed7aa;
}

.severity-medium {
  border-color: rgba(214, 161, 92, 0.45);
  color: #f3cf8c;
}

.severity-low {
  border-color: rgba(143, 214, 173, 0.45);
  color: #bbf7d0;
}

.chip-neutral {
  border-color: rgba(176, 184, 194, 0.28);
  color: #cbd5e1;
  background: rgba(176, 184, 194, 0.08);
}

@media (max-width: 1199px) {
  .cases-workbench,
  .case-panels-grid {
    grid-template-columns: 1fr;
  }

  .case-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .case-filters,
  .case-list-item,
  .case-detail-header,
  .host-activity-list li {
    grid-template-columns: 1fr;
  }

  .case-detail-header,
  .case-timeline header,
  .case-timeline footer {
    flex-direction: column;
  }

  .case-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
