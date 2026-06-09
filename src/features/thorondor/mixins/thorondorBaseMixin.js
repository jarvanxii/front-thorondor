import {
  formatBytes,
  formatDateTime,
  formatDurationSeconds,
  formatList,
  formatPercent,
  formatRelativeTime,
} from '@/features/thorondor/utils/formatters'
import {
  THORONDOR_MODULE_KEYS,
  getThorondorNetworkScopeLabel,
} from '@/features/thorondor/data/thorondorDefaults'
import { buildThorondorAgentEndpoints } from '@/features/thorondor/services/thorondorApi'

export default {
  data() {
    return {
      pollHandle: null,
      clockHandle: null,
      nowTick: new Date().toISOString(),
    }
  },

  computed: {
    thorondorState() {
      return this.$store.state.thorondor
    },

    dashboardCards() {
      return this.$store.getters.thorondorDashboardCards || []
    },

    thorondorRules() {
      return this.thorondorState.rules || []
    },

    selectedRules() {
      return this.selectedAgentId
        ? this.thorondorRules.filter((rule) => rule.scope === this.selectedAgentId)
        : []
    },

    thorondorSnapshots() {
      return this.$store.getters.thorondorSnapshots || {}
    },

    thorondorLastPollAt() {
      return this.thorondorState.lastPollAt
    },

    selectedAgentId() {
      return this.thorondorState.selectedAgentId
    },

    selectedAgent() {
      return this.$store.getters.thorondorSelectedAgent
    },

    selectedAgentCard() {
      return this.dashboardCards.find((agent) => agent.id === this.selectedAgentId) || null
    },

    selectedAgentSnapshots() {
      return this.selectedAgentId ? this.thorondorSnapshots[this.selectedAgentId] || [] : []
    },

    selectedLatestSnapshot() {
      const snapshots = this.selectedAgentSnapshots
      return snapshots[snapshots.length - 1] || null
    },

    selectedAgentLogs() {
      return this.selectedAgentId ? this.thorondorState.logsByAgent[this.selectedAgentId] || [] : []
    },

    selectedSecurityEvents() {
      return this.selectedAgentId
        ? [...(this.thorondorState.securityEventsByAgent[this.selectedAgentId] || [])].sort(
            (a, b) => b.timestamp.localeCompare(a.timestamp),
          )
        : []
    },

    selectedConnectionHistory() {
      return this.selectedAgentId
        ? [...(this.thorondorState.connectionHistoryByAgent[this.selectedAgentId] || [])].sort(
            (a, b) => b.timestamp.localeCompare(a.timestamp),
          )
        : []
    },

    selectedAlerts() {
      return this.thorondorState.alerts.filter((alert) => alert.agentId === this.selectedAgentId)
    },

    selectedActiveAlerts() {
      return this.selectedAlerts.filter((alert) => alert.status === 'active')
    },

    activeAlerts() {
      return this.thorondorState.alerts.filter((alert) => alert.status === 'active')
    },

    selectedCases() {
      return this.selectedAgentId
        ? [...(this.thorondorState.casesByAgent?.[this.selectedAgentId] || [])].sort((a, b) =>
            String(b.updatedAt || b.createdAt || '').localeCompare(
              String(a.updatedAt || a.createdAt || ''),
            ),
          )
        : []
    },

    allSecurityEvents() {
      return this.$store.getters.thorondorSecurityEventsFlat || []
    },

    eventsLast24h() {
      const cutoff = Date.now() - 86400000
      return this.allSecurityEvents.filter((event) => new Date(event.timestamp).getTime() >= cutoff)
    },

    eventsPerSystem24h() {
      return this.dashboardCards.map((agent) => ({
        agentId: agent.id,
        agentName: agent.displayName,
        total: this.eventsLast24h.filter((event) => event.agentId === agent.id).length,
      }))
    },

    failedOrigins() {
      const aggregate = new Map()
      this.eventsLast24h
        .filter((event) => event.kind === 'failed_login' && event.sourceIp)
        .forEach((event) => {
          const existing = aggregate.get(event.sourceIp) || {
            ip: event.sourceIp,
            count: 0,
            agentName: this.agentNameById(event.agentId),
          }
          existing.count += 1
          existing.agentName = this.agentNameById(event.agentId)
          aggregate.set(event.sourceIp, existing)
        })

      return Array.from(aggregate.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    },
  },

  async mounted() {
    await this.$store.dispatch('bootstrapThorondor')
    this.syncSelectedAgentFromRoute()
    this.ensureSelectedAgent()
    await this.$store.dispatch('pollThorondorAgents')
    this.startThorondorPolling()
    this.clockHandle = window.setInterval(() => {
      this.nowTick = new Date().toISOString()
    }, 1000)
  },

  beforeUnmount() {
    if (this.pollHandle) {
      window.clearInterval(this.pollHandle)
      this.pollHandle = null
    }

    if (this.clockHandle) {
      window.clearInterval(this.clockHandle)
      this.clockHandle = null
    }
  },

  watch: {
    '$route.query.agent'(value) {
      if (value) {
        this.syncSelectedAgentFromRoute()
      }
    },
  },

  methods: {
    startThorondorPolling() {
      if (this.pollHandle) {
        window.clearInterval(this.pollHandle)
      }

      this.pollHandle = window.setInterval(() => {
        this.$store.dispatch('pollThorondorAgents')
      }, 30000)
    },

    async pollNow() {
      await this.$store.dispatch('pollThorondorAgents')
      this.ensureSelectedAgent()
    },

    ensureSelectedAgent() {
      if (!this.selectedAgentId && this.dashboardCards.length) {
        this.$store.commit('setThorondorSelectedAgent', this.dashboardCards[0].id)
      }
    },

    syncSelectedAgentFromRoute() {
      const routeAgentId = String(this.$route?.query?.agent || '')
      if (routeAgentId && this.dashboardCards.some((agent) => agent.id === routeAgentId)) {
        this.$store.commit('setThorondorSelectedAgent', routeAgentId)
      }
    },

    selectAgent(agentId) {
      this.$store.commit('setThorondorSelectedAgent', agentId)
    },

    agentNameById(agentId) {
      return (
        this.dashboardCards.find((item) => item.id === agentId)?.displayName ||
        agentId ||
        'Desconocido'
      )
    },

    summarizeModules(modules) {
      return (
        THORONDOR_MODULE_KEYS.filter((item) => modules?.[item.key])
          .map((item) => item.label)
          .join(', ') || 'Sin módulos'
      )
    },

    agentEndpoint(agent) {
      return buildThorondorAgentEndpoints(agent).baseUrl || 'Sin endpoint'
    },

    networkScopeLabel(agent) {
      return getThorondorNetworkScopeLabel(agent?.networkScope)
    },

    statusClass(color) {
      if (color === 'success') return 'chip-success'
      if (color === 'warning') return 'chip-warning'
      return 'chip-danger'
    },

    alertStatusClass(status) {
      if (status === 'resolved') return 'chip-success'
      if (status === 'reviewed') return 'chip-warning'
      return 'chip-danger'
    },

    humanizeEventKind(kind) {
      const map = {
        failed_login: 'Login fallido',
        successful_login: 'Login exitoso',
        sudo_command: 'Comando sudo',
        critical_file_change: 'Cambio en archivo crítico',
        new_user: 'Nuevo usuario o grupo',
      }
      return map[kind] || kind || 'Evento'
    },

    formatDateTime,
    formatRelativeTime,
    formatPercent,
    formatBytes,
    formatDurationSeconds,
    formatList,
  },
}
