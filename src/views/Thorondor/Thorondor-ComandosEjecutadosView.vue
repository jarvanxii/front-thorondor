<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Auditoria temporal"
      :title="selectedAgent ? `Comandos de ${selectedAgent.displayName}` : 'Comandos del host'"
      copy="Comandos detectados por host: usuario, origen, ejecución y acciones defensivas."
      badge="Audit"
      :badge-note="`${filteredCommandEvents.length} eventos visibles.`"
    />

    <ThorondorMetricGrid :items="commandSummary" />

    <section class="section-box">
      <article class="tool-card">
        <header class="card-head">
          <h5>Filtros</h5>
          <span class="mini-badge">{{ commandEvents.length }} eventos</span>
        </header>
        <section class="control-grid command-filter-grid">
          <label class="control-field" for="command-agent">
            <span class="field-label">Sistema</span>
            <select
              id="command-agent"
              v-model="filters.agentId"
              class="form-select input-dark"
              @change="selectHost"
            >
              <option value="" disabled>Selecciona host</option>
              <option v-for="agent in dashboardCards" :key="agent.id" :value="agent.id">
                {{ agent.displayName }}
              </option>
            </select>
          </label>
          <label class="control-field" for="command-kind">
            <span class="field-label">Tipo</span>
            <select id="command-kind" v-model="filters.kind" class="form-select input-dark">
              <option value="all">Todos</option>
              <option value="sudo_command">Sudo</option>
              <option value="command_execution">Proceso Windows</option>
              <option value="response_action">Acción Thorondor</option>
            </select>
          </label>
          <label class="control-field" for="command-user">
            <span class="field-label">Usuario</span>
            <input
              id="command-user"
              v-model.trim="filters.user"
              class="form-control input-dark"
              placeholder="Usuario"
            />
          </label>
          <label class="control-field" for="command-text">
            <span class="field-label">Comando</span>
            <input
              id="command-text"
              v-model.trim="filters.command"
              class="form-control input-dark"
              placeholder="Comando"
            />
          </label>
        </section>
      </article>
    </section>

    <section class="section-box">
      <article class="tool-card">
        <header class="card-head">
          <h5>Timeline</h5>
          <button class="btn btn-quiet" @click="pollNow">Actualizar</button>
        </header>
        <section class="table-wrap audit-table-wrap">
          <table class="table table-dark align-middle mb-0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sistema</th>
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Ejecuta como</th>
                <th>Origen</th>
                <th>Comando</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in filteredCommandEvents" :key="event.id">
                <td>{{ formatDateTime(event.timestamp) }}</td>
                <td>{{ event.agentName }}</td>
                <td>
                  <span class="state-chip" :class="commandKindClass(event.kind)">
                    {{ humanizeCommandKind(event.kind) }}
                  </span>
                </td>
                <td>{{ event.user || '-' }}</td>
                <td>{{ event.runAs || '-' }}</td>
                <td>{{ event.sourceIp || '-' }}</td>
                <td class="command-cell">
                  <code class="inline-code">{{ event.command || 'No expuesto por el log' }}</code>
                </td>
                <td class="detail-cell">{{ event.message || '-' }}</td>
              </tr>
              <tr v-if="!filteredCommandEvents.length">
                <td colspan="8" class="text-muted">
                  Sin comandos registrados con los filtros actuales.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
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
  name: 'ThorondorComandosEjecutadosView',

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
        kind: 'all',
        user: '',
        command: '',
      },
    }
  },

  watch: {
    selectedAgentId: {
      immediate: true,
      handler(value) {
        this.filters.agentId = value || ''
      },
    },
  },

  computed: {
    commandEvents() {
      const securityCommands = (this.allSecurityEvents || [])
        .filter(
          (event) => ['sudo_command', 'command_execution'].includes(event.kind) || event.command,
        )
        .map((event) => ({
          id: event.id,
          agentId: event.agentId,
          agentName: this.agentNameById(event.agentId),
          timestamp: event.timestamp,
          kind: event.kind || 'command_execution',
          user: event.user || event.subject || '',
          runAs: event.runAs || event.runAsUser || '',
          sourceIp: event.sourceIp || event.source || '',
          command: event.command || this.commandFromMessage(event.message),
          message: event.message || '',
        }))

      const responseCommands = (this.$store.getters.thorondorResponseActions || []).map(
        (action) => ({
          id: action.id,
          agentId: action.agentId,
          agentName: action.agentName || this.agentNameById(action.agentId),
          timestamp: action.timestamp,
          kind: 'response_action',
          user: action.actor || 'frontend',
          runAs: 'firewall',
          sourceIp: action.ip,
          command:
            action.action === 'block'
              ? `thorondor block-ip ${action.ip}`
              : `thorondor unblock-ip ${action.ip}`,
          message: [action.message, action.detail].filter(Boolean).join(' - '),
        }),
      )

      return [...securityCommands, ...responseCommands].sort((a, b) =>
        String(b.timestamp || '').localeCompare(String(a.timestamp || '')),
      )
    },

    filteredCommandEvents() {
      const userFilter = this.filters.user.toLowerCase()
      const commandFilter = this.filters.command.toLowerCase()

      return this.commandEvents.filter((event) => {
        if (!this.filters.agentId || event.agentId !== this.filters.agentId) return false
        if (this.filters.kind !== 'all' && event.kind !== this.filters.kind) return false
        if (
          userFilter &&
          !String(event.user || '')
            .toLowerCase()
            .includes(userFilter)
        )
          return false
        if (
          commandFilter &&
          !String(event.command || event.message || '')
            .toLowerCase()
            .includes(commandFilter)
        )
          return false
        return true
      })
    },

    commandSummary() {
      const hostEvents = this.commandEvents.filter(
        (event) => event.agentId === this.filters.agentId,
      )
      const sudo = hostEvents.filter((event) => event.kind === 'sudo_command').length
      const windows = hostEvents.filter((event) => event.kind === 'command_execution').length
      const response = hostEvents.filter((event) => event.kind === 'response_action').length
      const users = new Set(hostEvents.map((event) => event.user).filter(Boolean))

      return [
        {
          label: 'Sudo',
          value: String(sudo),
          tone: sudo ? 'tone-warning' : 'tone-success',
          note: 'Comandos privilegiados en Linux',
        },
        {
          label: 'Procesos Windows',
          value: String(windows),
          tone: windows ? 'tone-blue' : 'tone-success',
          note: 'Evento 4688 si está habilitado',
        },
        {
          label: 'Acciones Thorondor',
          value: String(response),
          tone: response ? 'tone-danger' : 'tone-success',
          note: 'Bloqueos y desbloqueos desde el panel',
        },
        {
          label: 'Usuarios',
          value: String(users.size),
          tone: 'tone-blue',
          note: 'Identidades vistas en eventos',
        },
      ]
    },
  },

  methods: {
    selectHost(event) {
      const agentId = event.target.value
      if (!agentId) return
      this.selectAgent(agentId)
      this.$router.replace({
        name: this.$route.name,
        query: { ...this.$route.query, agent: agentId },
      })
    },

    commandFromMessage(message) {
      const text = String(message || '')
      const sudoMatch = text.match(/COMMAND=(.+)$/)
      if (sudoMatch) return sudoMatch[1].trim()
      const windowsMatch = text.match(/Process Command Line:\s*([^\r\n]+)/i)
      if (windowsMatch) return windowsMatch[1].trim()
      return ''
    },

    humanizeCommandKind(kind) {
      const map = {
        sudo_command: 'Sudo',
        command_execution: 'Proceso',
        response_action: 'Thorondor',
      }
      return map[kind] || kind || 'Comando'
    },

    commandKindClass(kind) {
      if (kind === 'response_action') return 'chip-danger'
      if (kind === 'sudo_command') return 'chip-warning'
      return 'chip-muted'
    },
  },
}
</script>

<style scoped>
.command-filter-grid {
  margin-bottom: 0;
}

.audit-table-wrap {
  max-height: 620px;
  overflow-y: auto;
}

.command-cell {
  min-width: 260px;
}

.command-cell code {
  display: inline-block;
  max-width: 520px;
  white-space: pre-wrap;
}

.detail-cell {
  min-width: 260px;
  max-width: 420px;
  color: #cfd6de;
  overflow-wrap: anywhere;
}
</style>
