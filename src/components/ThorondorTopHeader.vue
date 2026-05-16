<template>
  <header class="thorondor-primary-header">
    <button
      class="sidebar-toggle"
      type="button"
      aria-label="Abrir navegación"
      @click="$emit('open-sidebar')"
    >
      <span></span><span></span><span></span>
    </button>

    <RouterLink :to="{ name: 'thorondor-information' }" class="thorondor-brand">
      <img class="brand-logo" :src="thorondorLogo" alt="" />
      <strong>Thorondor</strong>
      <small>Consola SIEM</small>
    </RouterLink>

    <nav class="thorondor-top-nav" aria-label="Navegación principal">
      <RouterLink
        v-for="item in navItems"
        :key="item.routeName"
        :to="routeFor(item)"
        class="top-nav-link"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <nav class="thorondor-account-nav" aria-label="Ajustes de usuario">
      <button
        v-if="thorondorErrors.length"
        class="error-square"
        type="button"
        aria-label="Ver incidencias de Thorondor"
        aria-haspopup="menu"
        :aria-expanded="errorMenuOpen.toString()"
        @click.stop="toggleErrorMenu"
      >
        <span></span>
        <strong>{{ thorondorErrors.length }}</strong>
      </button>

      <transition name="settings-menu">
        <section v-if="errorMenuOpen" class="settings-dropdown error-dropdown" role="menu">
          <header class="settings-dropdown-header">
            <span>Incidencias recientes</span>
            <strong>Errores de operación</strong>
            <small>Polling, persistencia, bloqueo de IPs y peticiones al agente.</small>
          </header>
          <article v-for="error in thorondorErrors" :key="error.id" class="error-menu-item">
            <strong>{{ error.message }}</strong>
            <small>{{ formatErrorTime(error.timestamp) }}</small>
          </article>
        </section>
      </transition>

      <button
        class="settings-square"
        type="button"
        aria-label="Abrir ajustes de usuario"
        aria-haspopup="menu"
        :aria-expanded="settingsMenuOpen.toString()"
        @click.stop="toggleSettingsMenu"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.05 2.05 0 0 1-2.9 2.9l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.08 1.65V21a2.05 2.05 0 0 1-4.1 0v-.08a1.8 1.8 0 0 0-1.08-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2.05 2.05 0 0 1-2.9-2.9l.05-.05A1.8 1.8 0 0 0 4.1 15a1.8 1.8 0 0 0-1.65-1.08H2.4a2.05 2.05 0 0 1 0-4.1h.05A1.8 1.8 0 0 0 4.1 8.74a1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.05 2.05 0 0 1 2.9-2.9l.05.05a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 9.7 2.57V2.5a2.05 2.05 0 0 1 4.1 0v.08a1.8 1.8 0 0 0 1.08 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.05 2.05 0 0 1 2.9 2.9l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.08h.08a2.05 2.05 0 0 1 0 4.1h-.08A1.8 1.8 0 0 0 19.4 15Z" />
        </svg>
      </button>

      <transition name="settings-menu">
        <section v-if="settingsMenuOpen" class="settings-dropdown" role="menu">
          <header class="settings-dropdown-header">
            <span>Usuario activo</span>
            <strong>Adm 3</strong>
            <small>Sesion local - Thorondor</small>
          </header>
          <RouterLink
            v-for="item in accountMenuItems"
            :key="item.label"
            :to="item.to"
            class="settings-menu-item"
            role="menuitem"
          >
            <strong>{{ item.label }}</strong>
            <span>{{ item.copy }}</span>
          </RouterLink>
          <div class="settings-menu-footer">
            <span>Sesión local</span>
            <small>Autenticación remota pendiente de integrar.</small>
          </div>
        </section>
      </transition>
    </nav>
  </header>
</template>

<script>
import thorondorLogo from '@/assets/images/Thorondor-logo.png'
import { THORONDOR_TOP_NAV_ITEMS } from '@/features/thorondor/data/thorondorNavigation'

export default {
  name: 'ThorondorTopHeader',

  emits: ['open-sidebar'],

  data() {
    return {
      thorondorLogo,
      navItems: THORONDOR_TOP_NAV_ITEMS,
      settingsMenuOpen: false,
      errorMenuOpen: false,
      accountMenuItems: [
        {
          label: 'Cuenta y seguridad',
          copy: 'Perfil, rol, acceso y confirmaciones',
          to: { name: 'thorondor-user-settings', hash: '#cuenta-seguridad' },
        },
        {
          label: 'Preferencias',
          copy: 'Zona horaria, densidad y retención',
          to: { name: 'thorondor-user-settings', hash: '#preferencias' },
        },
        {
          label: 'Alertas por email',
          copy: 'Reglas de aviso y resumenes',
          to: { name: 'thorondor-user-settings', hash: '#alertas-email' },
        },
        {
          label: 'Persistencia y uso',
          copy: 'Datos, retencion y sincronizacion',
          to: { name: 'thorondor-user-settings', hash: '#persistencia-datos' },
        },
      ],
    }
  },

  computed: {
    thorondorState() {
      return this.$store.state.thorondor || {}
    },

    selectedAgentId() {
      return this.thorondorState.selectedAgentId
    },

    thorondorErrors() {
      return (this.thorondorState.errors || []).slice(0, 6)
    },
  },

  watch: {
    '$route.fullPath'() {
      this.closeSettingsMenu()
      this.closeErrorMenu()
    },
  },

  mounted() {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.handleDocumentClick)
      document.addEventListener('keydown', this.handleDocumentKeydown)
    }
  },

  beforeUnmount() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.handleDocumentClick)
      document.removeEventListener('keydown', this.handleDocumentKeydown)
    }
  },

  methods: {
    toggleSettingsMenu() {
      this.settingsMenuOpen = !this.settingsMenuOpen
      if (this.settingsMenuOpen) {
        this.closeErrorMenu()
      }
    },

    toggleErrorMenu() {
      this.errorMenuOpen = !this.errorMenuOpen
      if (this.errorMenuOpen) {
        this.closeSettingsMenu()
      }
    },

    closeSettingsMenu() {
      this.settingsMenuOpen = false
    },

    closeErrorMenu() {
      this.errorMenuOpen = false
    },

    handleDocumentClick(event) {
      if (!this.$el?.contains(event.target)) {
        this.closeSettingsMenu()
        this.closeErrorMenu()
      }
    },

    handleDocumentKeydown(event) {
      if (event.key === 'Escape') {
        this.closeSettingsMenu()
        this.closeErrorMenu()
      }
    },

    routeFor(item) {
      if (item.agentScoped && this.selectedAgentId) {
        return { name: item.routeName, query: { agent: this.selectedAgentId } }
      }

      return { name: item.routeName }
    },

    formatErrorTime(timestamp) {
      if (!timestamp) return 'Sin hora'
      return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(timestamp))
    },
  },
}
</script>

<style scoped>
.thorondor-primary-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 2600;
  display: grid;
  grid-template-columns: minmax(184px, auto) minmax(0, 1fr) minmax(92px, auto);
  width: 100%;
  height: var(--main-header-height);
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(176, 184, 194, 0.18);
  background:
    linear-gradient(180deg, rgba(21, 24, 30, 0.985), rgba(12, 15, 19, 0.975)),
    #12161c;
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
}

.thorondor-brand {
  display: grid;
  grid-template-areas:
    'logo title'
    'logo subtitle';
  grid-template-columns: 42px minmax(0, auto);
  width: fit-content;
  min-width: 0;
  align-items: center;
  column-gap: 10px;
  row-gap: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #f8fafc;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  text-decoration: none;
  box-shadow: none;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.thorondor-brand:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.brand-logo {
  grid-area: logo;
  width: 42px;
  height: 42px;
  object-fit: contain;
  filter: contrast(1.08) drop-shadow(0 8px 14px rgba(0, 0, 0, 0.34));
}

.thorondor-brand strong {
  grid-area: title;
  overflow: hidden;
  color: #f8fafc;
  font-size: 1.03rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thorondor-brand small {
  grid-area: subtitle;
  overflow: hidden;
  color: #9aa6b3;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.thorondor-top-nav {
  display: flex;
  justify-self: center;
  width: min(100%, 760px);
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 5px;
  overflow-x: auto;
  padding: 5px;
  border: 1px solid rgba(176, 184, 194, 0.18);
  border-radius: 4px;
  background:
    linear-gradient(180deg, rgba(36, 41, 49, 0.88), rgba(17, 21, 27, 0.92)), rgba(20, 24, 30, 0.82);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 22px rgba(0, 0, 0, 0.22);
  scrollbar-width: none;
}

.thorondor-top-nav::-webkit-scrollbar {
  display: none;
}

.top-nav-link {
  display: inline-flex;
  flex: 0 0 auto;
  min-width: 96px;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  width: auto;
  padding: 0 10px;
  border-radius: 3px;
  color: #aeb8c4;
  font-size: 0.8rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.top-nav-link:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.06);
}

.top-nav-link.router-link-active {
  background: linear-gradient(180deg, rgba(196, 204, 214, 0.2), rgba(126, 136, 149, 0.16));
  color: #f8fafc;
  box-shadow:
    inset 0 0 0 1px rgba(226, 232, 240, 0.18),
    0 8px 16px rgba(0, 0, 0, 0.18);
}

.thorondor-account-nav {
  position: relative;
  display: inline-flex;
  justify-self: end;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.settings-square {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border: 1px solid rgba(168, 177, 188, 0.22);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(35, 39, 46, 0.96), rgba(18, 21, 26, 0.98));
  color: #e5eef8;
  flex: 0 0 auto;
  cursor: var(--cursor-pointer), pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 18px rgba(0, 0, 0, 0.22);
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.error-square {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid rgba(248, 113, 113, 0.42);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(69, 24, 27, 0.96), rgba(28, 14, 18, 0.98));
  color: #fecaca;
  cursor: var(--cursor-pointer), pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 18px rgba(0, 0, 0, 0.22);
}

.error-square span {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #f87171;
  box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.14);
}

.error-square strong {
  color: #fee2e2;
  font-size: 0.78rem;
  font-weight: 900;
}

.error-square:hover,
.error-square[aria-expanded='true'] {
  border-color: rgba(254, 202, 202, 0.58);
  background: linear-gradient(180deg, rgba(91, 28, 34, 0.98), rgba(38, 16, 22, 0.98));
}

.settings-square {
  width: 44px;
}

.settings-square:hover,
.settings-square[aria-expanded='true'] {
  border-color: rgba(213, 219, 226, 0.36);
  background: linear-gradient(180deg, rgba(45, 50, 58, 0.98), rgba(24, 28, 34, 0.98));
  color: #f8fafc;
}

.settings-square svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.settings-dropdown {
  position: fixed;
  top: var(--main-header-height);
  right: 24px;
  z-index: 2700;
  display: grid;
  width: min(360px, calc(100vw - 48px));
  max-height: calc(100vh - var(--main-header-height));
  overflow: auto;
  border: 1px solid rgba(176, 184, 194, 0.24);
  border-top: 0;
  border-radius: 0 0 4px 4px;
  background:
    linear-gradient(180deg, rgba(29, 33, 40, 0.99), rgba(14, 17, 22, 0.995)), #11151b;
  box-shadow:
    0 28px 54px rgba(0, 0, 0, 0.46),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transform-origin: top right;
  clip-path: inset(0 0 0 0);
  will-change: max-height, opacity, clip-path;
  scrollbar-width: thin;
  scrollbar-color: rgba(176, 184, 194, 0.35) transparent;
}

.settings-dropdown-header,
.settings-menu-footer {
  display: grid;
  gap: 3px;
  padding: 14px 16px;
}

.settings-dropdown-header {
  border-bottom: 1px solid rgba(176, 184, 194, 0.16);
  background: rgba(255, 255, 255, 0.035);
}

.settings-dropdown-header span,
.settings-menu-footer span {
  color: #9aa6b3;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-dropdown-header strong {
  color: #f8fafc;
  font-size: 1rem;
}

.settings-dropdown-header small,
.settings-menu-footer small,
.settings-menu-item span {
  color: #96a1ad;
  line-height: 1.45;
}

.settings-menu-item {
  display: grid;
  gap: 3px;
  padding: 13px 16px;
  color: #e5eef8;
  text-decoration: none;
  border-bottom: 1px solid rgba(176, 184, 194, 0.1);
}

.error-dropdown {
  right: 76px;
}

.error-menu-item {
  display: grid;
  gap: 5px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(248, 113, 113, 0.12);
}

.error-menu-item strong {
  color: #fee2e2;
  font-size: 0.84rem;
  line-height: 1.45;
}

.error-menu-item small {
  color: #fca5a5;
}

.settings-menu-item strong {
  color: #edf5ff;
  font-size: 0.88rem;
}

.settings-menu-item:hover,
.settings-menu-item.router-link-active {
  background: rgba(199, 207, 217, 0.075);
}

.settings-menu-footer {
  background: rgba(10, 13, 17, 0.86);
}

.settings-menu-enter-active,
.settings-menu-leave-active {
  transition:
    opacity 0.18s ease,
    max-height 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    clip-path 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.settings-menu-enter-from,
.settings-menu-leave-to {
  opacity: 0;
  max-height: 0;
  clip-path: inset(0 0 100% 0);
}

.sidebar-toggle {
  display: none;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(168, 177, 188, 0.22);
  border-radius: 4px;
  background: rgba(18, 21, 26, 0.78);
}

.sidebar-toggle span {
  display: block;
  width: 18px;
  height: 2px;
  margin: 2px 0;
  border-radius: 2px;
  background: #dce3eb;
}

@media (max-width: 1040px) {
  .thorondor-primary-header {
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    padding: 0 14px;
  }

  .settings-dropdown {
    right: 14px;
    width: min(360px, calc(100vw - 28px));
  }

  .error-dropdown {
    right: 64px;
  }

  .sidebar-toggle {
    display: grid;
  }

  .thorondor-top-nav {
    justify-self: center;
    width: 100%;
    min-width: 0;
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .thorondor-primary-header {
    gap: 10px;
  }

  .thorondor-top-nav {
    width: 100%;
    padding: 4px;
  }

  .thorondor-brand strong,
  .thorondor-brand small,
  .settings-menu-item span,
  .settings-menu-footer small {
    display: none;
  }

  .top-nav-link {
    min-width: 82px;
    min-height: 32px;
    padding: 0 4px;
    font-size: 0.72rem;
  }

  .thorondor-brand {
    grid-template-areas: 'logo';
    grid-template-columns: 42px;
  }

  .error-dropdown {
    right: 14px;
  }
}
</style>
