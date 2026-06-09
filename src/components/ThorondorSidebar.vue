<template>
  <aside
    class="thorondor-sidebar"
    :class="{ 'is-open': open }"
    aria-label="Navegación del sistema monitorizado"
  >
    <header class="sidebar-identity">
      <div class="identity-status">
        <span>Sistema seleccionado</span>
        <strong>{{ selectedAgent ? selectedAgent.displayName : 'Sin selección' }}</strong>
        <small>{{
          selectedAgentStatus || 'Elige un ordenador monitorizado para activar las vistas por host.'
        }}</small>
      </div>
    </header>

    <label class="sidebar-system" for="thorondor-selected-agent">
      <span>Ordenador monitorizado</span>
      <select
        id="thorondor-selected-agent"
        :value="selectedAgentId || ''"
        :disabled="!dashboardCards.length"
        @change="selectAgent($event.target.value)"
      >
        <option value="" disabled>
          {{ dashboardCards.length ? 'Selecciona sistema' : 'Sin sistemas' }}
        </option>
        <option v-for="agent in dashboardCards" :key="agent.id" :value="agent.id">
          {{ agent.displayName }}
        </option>
      </select>
    </label>
    <nav class="sidebar-nav">
      <section v-for="group in navGroups" :key="group.label" class="sidebar-nav-group">
        <h2>{{ group.label }}</h2>
        <RouterLink
          v-for="item in group.items"
          :key="item.id"
          class="sidebar-nav-item"
          :class="{
            'is-active': isActive(item),
            'is-disabled': item.agentScoped && !selectedAgentId,
          }"
          :to="routeFor(item)"
          @click="handleNavClick(item, $event)"
        >
          <span class="nav-marker" aria-hidden="true"></span>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </RouterLink>
      </section>
    </nav>
  </aside>
</template>

<script>
import {
  THORONDOR_HOST_SCOPED_ROUTES,
  THORONDOR_SIDEBAR_GROUPS,
} from '@/features/thorondor/data/thorondorNavigation'

export default {
  name: 'ThorondorSidebar',

  props: {
    open: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['close'],

  data() {
    return {
      navGroups: THORONDOR_SIDEBAR_GROUPS,
    }
  },

  computed: {
    thorondorState() {
      return this.$store.state.thorondor || {}
    },

    dashboardCards() {
      return this.$store.getters.thorondorDashboardCards || []
    },

    selectedAgentId() {
      return this.thorondorState.selectedAgentId
    },

    selectedAgent() {
      return this.$store.getters.thorondorSelectedAgent || null
    },

    selectedAgentStatus() {
      if (!this.selectedAgent) return ''
      const status = this.selectedAgent.status?.label || 'Pendiente'
      const endpoint =
        this.selectedAgent.ipAddress || this.selectedAgent.receiverUrl || 'endpoint sin fijar'
      return `${status} - ${endpoint}`
    },
  },

  methods: {
    routeFor(item) {
      if (item.agentScoped && this.selectedAgentId) {
        return { name: item.routeName, query: { agent: this.selectedAgentId } }
      }

      return { name: item.routeName }
    },

    isActive(item) {
      return this.$route.name === item.routeName
    },

    selectAgent(agentId) {
      if (!agentId) return

      this.$store.commit('setThorondorSelectedAgent', agentId)

      if (THORONDOR_HOST_SCOPED_ROUTES.includes(this.$route.name)) {
        this.$router.replace({
          name: this.$route.name,
          query: { ...this.$route.query, agent: agentId },
        })
      }
    },

    closeSidebar() {
      this.$emit('close')
    },

    handleNavClick(item, event) {
      if (item.agentScoped && !this.selectedAgentId) {
        event.preventDefault()
        return
      }

      this.closeSidebar()
    },
  },
}
</script>

<style scoped>
.thorondor-sidebar {
  position: fixed;
  top: var(--main-header-height);
  bottom: 0;
  left: 0;
  z-index: 2500;
  display: grid;
  width: var(--sidebar-width);
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px 12px 14px;
  overflow-y: auto;
  background: var(--thorondor-panel-background);
  border-right: 1px solid rgba(236, 194, 119, 0.17);
  box-shadow: 20px 0 44px rgba(0, 0, 0, 0.26);
}

.sidebar-identity {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(236, 194, 119, 0.16);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
}

.identity-status {
  display: grid;
  gap: 4px;
}

.sidebar-identity span,
.sidebar-system span,
.sidebar-nav-group h2 {
  margin: 0;
  color: #c4a16b;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.sidebar-identity strong {
  overflow: hidden;
  color: #f4f6f8;
  font-size: 0.94rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-identity small,
.sidebar-system small {
  color: #aeb6c0;
  font-size: 0.72rem;
  line-height: 1.45;
}

.sidebar-system {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(189, 196, 205, 0.15);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
}

.sidebar-system select {
  width: 100%;
  min-height: 36px;
  border: 1px solid rgba(189, 196, 205, 0.24);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  color: #f4f6f8;
  font-size: 0.8rem;
  outline: none;
}

.sidebar-nav {
  display: grid;
  align-content: start;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.sidebar-nav::-webkit-scrollbar {
  width: 5px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(164, 172, 183, 0.34);
  border-radius: 4px;
}

.sidebar-nav-group {
  display: grid;
  gap: 5px;
}

.sidebar-nav-group h2 {
  position: relative;
  padding: 0 10px 8px;
}

.sidebar-nav-group h2::after {
  content: '';
  position: absolute;
  right: 6px;
  bottom: 3px;
  left: 10px;
  height: 1px;
  background: linear-gradient(90deg, rgba(189, 196, 205, 0.22), transparent);
}

.sidebar-nav-item {
  position: relative;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  min-height: 39px;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #cbd2db;
  font-size: 0.82rem;
  font-weight: 760;
  text-decoration: none;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.sidebar-nav-item:hover {
  border-color: rgba(189, 196, 205, 0.13);
  background: var(--thorondor-soft-background);
  color: #f7f9fb;
  transform: translateX(1px);
}

.sidebar-nav-item.is-active {
  border-color: rgba(236, 194, 119, 0.28);
  background: linear-gradient(90deg, rgba(126, 93, 42, 0.34), rgba(35, 40, 47, 0.72));
  color: #ffffff;
  box-shadow:
    inset 3px 0 0 var(--thorondor-gold),
    0 10px 18px rgba(0, 0, 0, 0.16);
}

.sidebar-nav-item.is-disabled {
  opacity: 0.5;
}

.nav-marker {
  width: 3px;
  height: 17px;
  border-radius: 2px;
  background: rgba(148, 157, 168, 0.34);
}

.sidebar-nav-item.is-active .nav-marker {
  background: var(--thorondor-gold);
}

.nav-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-badge {
  padding: 3px 6px;
  border-radius: 3px;
  border: 1px solid rgba(189, 196, 205, 0.16);
  background: var(--thorondor-soft-background);
  color: #dce3ea;
  font-size: 0.58rem;
  font-weight: 800;
}

@media (max-width: 1040px) {
  .thorondor-sidebar {
    width: min(330px, 88vw);
    gap: 10px;
    padding: 14px 12px;
    background: var(--thorondor-panel-background);
    box-shadow: 24px 0 54px rgba(0, 0, 0, 0.46);
    transform: translateX(-104%);
    transition: transform 180ms ease;
  }

  .thorondor-sidebar.is-open {
    transform: translateX(0);
  }

  .sidebar-identity,
  .sidebar-system {
    padding: 11px;
  }

  .sidebar-nav-item {
    min-height: 43px;
  }
}

@media (max-width: 520px) {
  .thorondor-sidebar {
    width: min(342px, 92vw);
    padding: 12px 10px;
  }

  .sidebar-identity small {
    font-size: 0.7rem;
  }

  .sidebar-nav {
    gap: 13px;
    padding-right: 2px;
  }

  .sidebar-nav-group h2 {
    padding-inline: 8px;
  }

  .sidebar-nav-item {
    min-height: 44px;
    padding-inline: 9px;
    font-size: 0.8rem;
  }
}
</style>
