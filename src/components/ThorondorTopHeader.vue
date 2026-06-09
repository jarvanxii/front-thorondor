<template>
  <header class="thorondor-primary-header">
    <button class="sidebar-toggle" type="button" aria-label="Abrir navegación" @click="$emit('open-sidebar')">
      <span></span><span></span><span></span>
    </button>

    <RouterLink :to="{ name: 'thorondor-information' }" class="thorondor-brand" aria-label="Thorondor SIEM">
      <img class="brand-logo" :src="thorondorHeaderLogo" alt="Thorondor SIEM" />
    </RouterLink>

    <nav class="thorondor-top-nav" aria-label="Navegación principal">
      <RouterLink v-for="item in navItems" :key="item.routeName" :to="routeFor(item)" class="top-nav-link">
        {{ item.label }}
      </RouterLink>
    </nav>

    <nav class="thorondor-account-nav" aria-label="Ajustes de usuario">
      <button v-if="thorondorErrors.length" class="error-square" type="button" aria-label="Ver incidencias de Thorondor"
        aria-haspopup="menu" :aria-expanded="errorMenuOpen.toString()" @click.stop="toggleErrorMenu">
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

      <button class="settings-square" type="button" aria-label="Abrir ajustes de usuario" aria-haspopup="menu"
        :aria-expanded="settingsMenuOpen.toString()" @click.stop="toggleSettingsMenu">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path
            d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.05 2.05 0 0 1-2.9 2.9l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.08 1.65V21a2.05 2.05 0 0 1-4.1 0v-.08a1.8 1.8 0 0 0-1.08-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2.05 2.05 0 0 1-2.9-2.9l.05-.05A1.8 1.8 0 0 0 4.1 15a1.8 1.8 0 0 0-1.65-1.08H2.4a2.05 2.05 0 0 1 0-4.1h.05A1.8 1.8 0 0 0 4.1 8.74a1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.05 2.05 0 0 1 2.9-2.9l.05.05a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 9.7 2.57V2.5a2.05 2.05 0 0 1 4.1 0v.08a1.8 1.8 0 0 0 1.08 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.05 2.05 0 0 1 2.9 2.9l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.08h.08a2.05 2.05 0 0 1 0 4.1h-.08A1.8 1.8 0 0 0 19.4 15Z" />
        </svg>
      </button>

      <transition name="settings-menu">
        <section v-if="settingsMenuOpen" class="settings-dropdown" role="menu">
          <header class="settings-dropdown-header">
            <span>Usuario activo</span>
            <strong>{{ operatorSettings.displayName }}</strong>
            <small>{{ operatorSettings.role }} - sesión local</small>
          </header>
          <button v-for="item in accountMenuItems" :key="item.key" type="button" class="settings-menu-item"
            role="menuitem" @click="openSettingsModal(item.key)">
            <strong>{{ item.label }}</strong>
            <span>{{ item.copy }}</span>
          </button>
          <div class="settings-menu-footer settings-menu-footer--action">
            <button type="button" class="settings-logout-button" role="menuitem" :disabled="logoutLoading"
              @click="handleLogout">
              {{ logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión' }}
            </button>
          </div>
        </section>
      </transition>
    </nav>

    <Teleport to="body">
      <transition name="settings-modal">
        <div v-if="activeSettingsModal" class="settings-modal-backdrop" role="dialog" aria-modal="true"
          :aria-labelledby="activeSettingsModalId" @click.self="closeSettingsModal">
          <section class="settings-modal">
            <header class="settings-modal-header">
              <div>
                <span>{{ activeSettingsModalConfig.kicker }}</span>
                <h2 :id="activeSettingsModalId">{{ activeSettingsModalConfig.label }}</h2>
                <p>{{ activeSettingsModalConfig.copy }}</p>
              </div>
              <button class="settings-modal-close" type="button"
                :aria-label="`Cerrar ${activeSettingsModalConfig.label}`" @click="closeSettingsModal">
                X
              </button>
            </header>

            <div class="settings-modal-body">
              <section v-if="activeSettingsModal === 'account'" class="settings-modal-grid">
                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Perfil local</span>
                    <strong>Identidad del operador</strong>
                    <small>Estos datos complementan la sesion OAuth/JWT activa y solo ajustan la vista local.</small>
                  </div>
                  <div class="settings-form-grid">
                    <label class="settings-field">
                      <span>Nombre visible</span>
                      <input v-model.trim="operatorSettings.displayName" type="text" />
                    </label>
                    <label class="settings-field">
                      <span>Rol operativo</span>
                      <select v-model="operatorSettings.role">
                        <option>Administrador</option>
                        <option>Operador</option>
                        <option>Solo lectura</option>
                      </select>
                    </label>
                    <label class="settings-field settings-field--full">
                      <span>Email de alertas</span>
                      <input v-model.trim="operatorSettings.alertEmail" type="email" />
                    </label>
                  </div>
                </article>

                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Seguridad</span>
                    <strong>Confirmaciones y acceso</strong>
                    <small>Preparado para que las acciones sensibles no se ejecuten por accidente.</small>
                  </div>
                  <label v-for="item in securitySettingItems" :key="item.key" class="settings-switch-row">
                    <input v-model="operatorSettings.security[item.key]" type="checkbox" />
                    <span class="switch-control" aria-hidden="true"></span>
                    <span>
                      <strong>{{ item.label }}</strong>
                      <small>{{ item.copy }}</small>
                    </span>
                  </label>
                </article>
              </section>

              <section v-else-if="activeSettingsModal === 'preferences'" class="settings-modal-panel">
                <div class="modal-panel-heading">
                  <span>Panel</span>
                  <strong>Preferencias de visualización</strong>
                  <small>Se aplican de forma local y se guardan en el navegador.</small>
                </div>
                <div class="settings-form-grid">
                  <label class="settings-field">
                    <span>Zona horaria</span>
                    <select v-model="operatorSettings.timezone">
                      <option>Europe/Madrid</option>
                      <option>UTC</option>
                      <option>America/New_York</option>
                    </select>
                  </label>
                  <label class="settings-field">
                    <span>Resumen operativo</span>
                    <select v-model="operatorSettings.digestCadence">
                      <option>Tiempo real</option>
                      <option>Cada hora</option>
                      <option>Diario</option>
                    </select>
                  </label>
                  <label class="settings-field">
                    <span>Densidad</span>
                    <select v-model="operatorSettings.density">
                      <option>Compacta</option>
                      <option>Equilibrada</option>
                      <option>Amplia</option>
                    </select>
                  </label>
                  <label class="settings-field">
                    <span>Retención local</span>
                    <input :value="`${retentionDays} días`" type="text" disabled />
                  </label>
                </div>
              </section>

              <section v-else-if="activeSettingsModal === 'email'" class="settings-modal-panel">
                <div class="modal-panel-heading">
                  <span>SMTP pendiente</span>
                  <strong>Reglas de aviso por email</strong>
                  <small>La configuración se puede preparar ya, pero el envío real llegará cuando integremos
                    SMTP.</small>
                </div>
                <div class="settings-status-strip">
                  <strong>No envía correos todavía</strong>
                  <span>Los avisos quedan guardados como preferencias del operador.</span>
                </div>
                <div class="mail-rule-grid">
                  <label v-for="rule in emailSettingItems" :key="rule.key" class="settings-switch-row">
                    <input v-model="operatorSettings.emailRules[rule.key]" type="checkbox" />
                    <span class="switch-control" aria-hidden="true"></span>
                    <span>
                      <strong>{{ rule.label }}</strong>
                      <small>{{ rule.copy }}</small>
                    </span>
                  </label>
                </div>
              </section>

              <section v-else-if="activeSettingsModal === 'persistence'" class="settings-modal-grid">
                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Datos</span>
                    <strong>{{ persistenceModeTitle }}</strong>
                    <small>{{ persistenceModeDescription }}</small>
                  </div>
                  <div class="settings-persistence-grid" role="radiogroup" aria-label="Persistencia de Thorondor">
                    <label v-for="option in persistenceOptions" :key="option.value" class="settings-persistence-card"
                      :class="{ 'is-active': selectedPersistenceMode === option.value, 'is-disabled': option.disabled }">
                      <input type="radio" name="thorondor-header-persistence-mode" :value="option.value"
                        :checked="selectedPersistenceMode === option.value"
                        :disabled="option.disabled || persistenceChanging" @change="setPersistenceMode(option.value)" />
                      <span>
                        <strong>{{ option.label }}</strong>
                        <small>{{ option.copy }}</small>
                      </span>
                      <em>{{ option.status }}</em>
                    </label>
                  </div>
                </article>

                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Workspace</span>
                    <strong>Uso actual</strong>
                    <small>Resumen rápido de lo que tiene cargado la consola.</small>
                  </div>
                  <div class="settings-metric-grid">
                    <div>
                      <span>Hosts</span>
                      <strong>{{ dashboardCards.length }}</strong>
                    </div>
                    <div>
                      <span>Alertas activas</span>
                      <strong>{{ activeAlerts.length }}</strong>
                    </div>
                    <div>
                      <span>Retención</span>
                      <strong>{{ retentionDays }} días</strong>
                    </div>
                    <div>
                      <span>Workspace</span>
                      <strong>{{ persistenceStatus.workspaceId || 'default' }}</strong>
                    </div>
                  </div>
                </article>
              </section>
            </div>

            <footer class="settings-modal-footer">
              <span v-if="settingsFeedback"
                :class="['settings-feedback', settingsFeedbackTone === 'error' ? 'is-error' : 'is-success']">
                {{ settingsFeedback }}
              </span>
              <div>
                <button type="button" class="settings-modal-secondary" @click="closeSettingsModal">Cerrar</button>
                <button type="button" class="settings-modal-primary" :disabled="settingsSaving"
                  @click="saveOperatorSettings">
                  {{ settingsSaving ? 'Guardando...' : 'Guardar ajustes' }}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </transition>
    </Teleport>
  </header>
</template>

<script>
import thorondorHeaderLogo from '@/assets/images/brand/thorondor_header.png'
import { THORONDOR_TOP_NAV_ITEMS } from '@/features/thorondor/data/thorondorNavigation'

const THORONDOR_OPERATOR_SETTINGS_KEY = 'thorondor.operator.settings'

function buildDefaultOperatorSettings() {
  return {
    displayName: 'Adm 3',
    role: 'Administrador',
    alertEmail: 'admin@thorondor.local',
    timezone: 'Europe/Madrid',
    digestCadence: 'Tiempo real',
    density: 'Equilibrada',
    security: {
      confirmSensitiveActions: true,
      lockInactiveSession: true,
      twoFactorPrepared: false,
    },
    emailRules: {
      criticalAlerts: true,
      authFailures: true,
      commandAudit: false,
      dailyDigest: false,
    },
  }
}

function mergeOperatorSettings(value = {}) {
  const defaults = buildDefaultOperatorSettings()

  return {
    ...defaults,
    ...value,
    security: {
      ...defaults.security,
      ...value.security,
    },
    emailRules: {
      ...defaults.emailRules,
      ...value.emailRules,
    },
  }
}

export default {
  name: 'ThorondorTopHeader',

  emits: ['open-sidebar'],

  data() {
    return {
      thorondorHeaderLogo,
      navItems: THORONDOR_TOP_NAV_ITEMS,
      settingsMenuOpen: false,
      errorMenuOpen: false,
      activeSettingsModal: null,
      settingsSaving: false,
      settingsFeedback: '',
      settingsFeedbackTone: 'success',
      logoutLoading: false,
      persistenceChanging: false,
      operatorSettings: buildDefaultOperatorSettings(),
      accountMenuItems: [
        {
          key: 'account',
          kicker: 'Operador',
          label: 'Cuenta y seguridad',
          copy: 'Perfil, rol, acceso y confirmaciones',
        },
        {
          key: 'preferences',
          kicker: 'Experiencia',
          label: 'Preferencias',
          copy: 'Zona horaria, densidad y retención',
        },
        {
          key: 'email',
          kicker: 'Notificaciones',
          label: 'Alertas por email',
          copy: 'Pendiente para la fase SMTP',
        },
        {
          key: 'persistence',
          kicker: 'Workspace',
          label: 'Persistencia y uso',
          copy: 'Datos, retención y sincronización',
        },
      ],
      securitySettingItems: [
        {
          key: 'confirmSensitiveActions',
          label: 'Confirmar acciones sensibles',
          copy: 'Pedir confirmación antes de bloqueos, desbloqueos y comandos administrativos.',
        },
        {
          key: 'lockInactiveSession',
          label: 'Bloquear sesiones inactivas',
          copy: 'Cerrar la vista local tras inactividad aunque la sesion OAuth siga activa.',
        },
        {
          key: 'twoFactorPrepared',
          label: 'Doble factor preparado',
          copy: 'Reserva la opcion para exigir 2FA desde el proveedor OAuth cuando se active la politica.',
        },
      ],
      emailSettingItems: [
        {
          key: 'criticalAlerts',
          label: 'Alertas críticas',
          copy: 'Heartbeat caído, disco lleno, reglas críticas y servicios parados.',
        },
        {
          key: 'authFailures',
          label: 'Intentos fallidos',
          copy: 'Picos de autenticación fallida, fuerza bruta y orígenes repetidos.',
        },
        {
          key: 'commandAudit',
          label: 'Comandos sensibles',
          copy: 'Actividad sudo, bloqueo de IPs y acciones manuales del operador.',
        },
        {
          key: 'dailyDigest',
          label: 'Resumen diario',
          copy: 'Estado agregado de hosts, eventos, alertas y crecimiento de datos.',
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

    dashboardCards() {
      return this.$store.getters.thorondorDashboardCards || []
    },

    activeAlerts() {
      return (this.thorondorState.alerts || []).filter((alert) => alert.status === 'active')
    },

    retentionDays() {
      return this.thorondorState.retentionDays || 30
    },

    persistenceStatus() {
      return this.thorondorState.persistence || {}
    },

    selectedPersistenceMode() {
      return this.persistenceStatus.requestedMode || this.persistenceStatus.effectiveMode || 'local'
    },

    persistenceEffectiveMode() {
      return this.persistenceStatus.effectiveMode || 'local'
    },

    activeSettingsModalConfig() {
      return (
        this.accountMenuItems.find((item) => item.key === this.activeSettingsModal) ||
        this.accountMenuItems[0]
      )
    },

    activeSettingsModalId() {
      return `thorondor-settings-${this.activeSettingsModal || 'panel'}`
    },

    persistenceModeTitle() {
      if (this.selectedPersistenceMode === 'cloud' && !this.persistenceStatus.cloudConfigured) {
        return 'API no configurada'
      }

      return this.persistenceEffectiveMode === 'cloud'
        ? 'API del back activa'
        : 'IndexedDB local activo'
    },

    persistenceModeDescription() {
      if (this.selectedPersistenceMode === 'cloud' && !this.persistenceStatus.cloudConfigured) {
        return 'Falta configurar la URL de la API. La consola mantiene IndexedDB para no perder datos.'
      }

      if (this.persistenceEffectiveMode === 'cloud') {
        return 'Los cambios se guardan en IndexedDB como caché y se sincronizan con la API del back.'
      }

      return 'Hosts, reglas, eventos y preferencias se guardan solo en este navegador mediante IndexedDB.'
    },

    persistenceOptions() {
      const cloudConfigured = Boolean(this.persistenceStatus.cloudConfigured)
      const effectiveMode = this.persistenceEffectiveMode

      return [
        {
          value: 'local',
          label: 'IndexedDB local',
          copy: 'Datos en este navegador. Útil para pruebas, laboratorio y uso sin servidor central.',
          status: effectiveMode === 'local' ? 'Activo' : 'Disponible',
          disabled: false,
        },
        {
          value: 'cloud',
          label: 'API del back',
          copy: cloudConfigured
            ? 'Persistencia centralizada en la API, con IndexedDB como caché local.'
            : 'Configura VITE_THORONDOR_API_BASE_URL para activar la persistencia con API.',
          status: cloudConfigured ? (effectiveMode === 'cloud' ? 'Activo' : 'Disponible') : 'Sin API',
          disabled: !cloudConfigured,
        },
      ]
    },
  },

  watch: {
    '$route.fullPath'() {
      this.closeSettingsMenu()
      this.closeErrorMenu()
      this.closeSettingsModal()
    },
  },

  mounted() {
    this.loadOperatorSettings()
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
        this.closeSettingsModal()
      }
    },

    toggleErrorMenu() {
      this.errorMenuOpen = !this.errorMenuOpen
      if (this.errorMenuOpen) {
        this.closeSettingsMenu()
        this.closeSettingsModal()
      }
    },

    closeSettingsMenu() {
      this.settingsMenuOpen = false
    },

    closeErrorMenu() {
      this.errorMenuOpen = false
    },

    async handleLogout() {
      if (this.logoutLoading) return

      this.logoutLoading = true
      try {
        await this.$store.dispatch('logoutThorondorSession')
        this.closeSettingsMenu()
        this.closeErrorMenu()
        this.closeSettingsModal()

        if (this.$route.name !== 'thorondor-login') {
          await this.$router.replace({ name: 'thorondor-login' })
        }
      } finally {
        this.logoutLoading = false
      }
    },

    openSettingsModal(key) {
      this.activeSettingsModal = key
      this.settingsFeedback = ''
      this.settingsFeedbackTone = 'success'
      this.closeSettingsMenu()
      this.closeErrorMenu()
    },

    closeSettingsModal() {
      this.activeSettingsModal = null
      this.settingsSaving = false
      this.persistenceChanging = false
      this.settingsFeedback = ''
    },

    handleDocumentClick(event) {
      if (!this.$el?.contains(event.target)) {
        this.closeSettingsMenu()
        this.closeErrorMenu()
      }
    },

    handleDocumentKeydown(event) {
      if (event.key === 'Escape') {
        if (this.activeSettingsModal) {
          this.closeSettingsModal()
          return
        }
        this.closeSettingsMenu()
        this.closeErrorMenu()
      }
    },

    loadOperatorSettings() {
      if (typeof window === 'undefined') return

      try {
        const rawValue = window.localStorage.getItem(THORONDOR_OPERATOR_SETTINGS_KEY)
        const parsedValue = rawValue ? JSON.parse(rawValue) : {}
        this.operatorSettings = mergeOperatorSettings(parsedValue)
        this.applyOperatorSettings()
      } catch {
        this.operatorSettings = buildDefaultOperatorSettings()
        this.applyOperatorSettings()
      }
    },

    applyOperatorSettings() {
      if (typeof document === 'undefined') return

      document.documentElement.dataset.thorondorDensity = String(
        this.operatorSettings.density || 'Equilibrada',
      )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
    },

    async saveOperatorSettings() {
      this.settingsSaving = true
      this.settingsFeedback = ''

      try {
        this.operatorSettings = mergeOperatorSettings(this.operatorSettings)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            THORONDOR_OPERATOR_SETTINGS_KEY,
            JSON.stringify(this.operatorSettings),
          )
        }
        this.applyOperatorSettings()
        this.settingsFeedbackTone = 'success'
        this.settingsFeedback = 'Ajustes guardados en este navegador.'
      } catch {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = 'No se pudieron guardar los ajustes locales.'
      } finally {
        this.settingsSaving = false
      }
    },

    async setPersistenceMode(mode) {
      if (mode === this.selectedPersistenceMode || this.persistenceChanging) return

      this.persistenceChanging = true
      this.settingsFeedback = ''

      try {
        await this.$store.dispatch('setThorondorPersistenceMode', mode)
        this.settingsFeedbackTone = 'success'
        this.settingsFeedback =
          mode === 'cloud'
            ? 'Persistencia con API activada.'
            : 'Persistencia local con IndexedDB activada.'
      } catch (error) {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = `No se pudo cambiar la persistencia: ${error.message}`
      } finally {
        this.persistenceChanging = false
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
  grid-template-columns: minmax(190px, 240px) minmax(0, 1fr) minmax(92px, auto);
  width: 100%;
  height: var(--main-header-height);
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(236, 194, 119, 0.2);
  background: var(--thorondor-panel-background);
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
}

.thorondor-brand {
  display: inline-flex;
  width: min(100%, 240px);
  min-width: 0;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
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
  display: block;
  width: min(100%, 226px);
  height: 44px;
  object-fit: contain;
  object-position: left center;
  filter: contrast(1.08) drop-shadow(0 8px 14px rgba(0, 0, 0, 0.34));
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
  border: 1px solid rgba(236, 194, 119, 0.16);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
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
  background: rgba(218, 166, 92, 0.08);
}

.top-nav-link.router-link-active {
  background: linear-gradient(180deg, rgba(218, 166, 92, 0.2), rgba(126, 93, 42, 0.16));
  color: #f8fafc;
  box-shadow:
    inset 0 0 0 1px rgba(236, 194, 119, 0.2),
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
  background: var(--thorondor-nested-background);
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
  background: var(--thorondor-soft-background);
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
  background: var(--thorondor-panel-background);
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
  background: var(--thorondor-soft-background);
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
  width: 100%;
  gap: 3px;
  padding: 13px 16px;
  border: 0;
  border-bottom: 1px solid rgba(176, 184, 194, 0.1);
  background: transparent;
  color: #e5eef8;
  cursor: var(--cursor-pointer), pointer;
  font: inherit;
  text-align: left;
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
.settings-menu-item:focus-visible {
  background: var(--thorondor-soft-background);
  outline: none;
}

.settings-menu-footer {
  background: var(--thorondor-soft-background);
}

.settings-menu-footer--action {
  gap: 0;
  padding: 12px 16px;
}

.settings-logout-button {
  display: inline-flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(248, 113, 113, 0.36);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(96, 34, 38, 0.9), rgba(42, 18, 22, 0.96));
  color: #fee2e2;
  cursor: var(--cursor-pointer), pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 900;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease,
    opacity 0.16s ease;
}

.settings-logout-button:hover,
.settings-logout-button:focus-visible {
  border-color: rgba(254, 202, 202, 0.58);
  background: linear-gradient(180deg, rgba(124, 38, 45, 0.96), rgba(58, 20, 26, 0.98));
  color: #fff7f7;
  outline: none;
}

.settings-logout-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
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

.settings-modal-backdrop {
  position: fixed;
  inset: var(--main-header-height) 0 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  padding: clamp(12px, 2.4vw, 28px);
  background: rgba(5, 8, 12, 0.72);
  backdrop-filter: blur(10px);
}

.settings-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(940px, 100%);
  max-height: min(760px, calc(100dvh - var(--main-header-height) - 24px));
  overflow: hidden;
  border: 1px solid rgba(176, 184, 194, 0.22);
  border-radius: 4px;
  background: var(--thorondor-panel-background);
  box-shadow:
    0 30px 70px rgba(0, 0, 0, 0.58),
    inset 0 1px 0 rgba(255, 255, 255, 0.045);
}

.settings-modal-header,
.settings-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
}

.settings-modal-header {
  border-bottom: 1px solid rgba(176, 184, 194, 0.16);
  background: var(--thorondor-soft-background);
}

.settings-modal-header div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.settings-modal-header span,
.modal-panel-heading span {
  color: #9aa6b3;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.settings-modal-header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  line-height: 1.05;
}

.settings-modal-header p,
.modal-panel-heading small {
  margin: 0;
  color: #9fb0c3;
  line-height: 1.5;
}

.settings-modal-close {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(176, 184, 194, 0.24);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  color: #e5eef8;
  cursor: var(--cursor-pointer), pointer;
  font-weight: 900;
}

.settings-modal-close:hover {
  border-color: rgba(229, 236, 246, 0.45);
  background: var(--thorondor-nested-background);
}

.settings-modal-body {
  min-height: 0;
  overflow: auto;
  padding: 18px 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(176, 184, 194, 0.35) transparent;
}

.settings-modal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
  gap: 14px;
}

.settings-modal-panel {
  display: grid;
  gap: 14px;
  align-content: start;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
}

.modal-panel-heading {
  display: grid;
  gap: 5px;
}

.modal-panel-heading strong {
  color: #f8fafc;
  font-size: 1rem;
}

.settings-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.settings-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.settings-field--full {
  grid-column: 1 / -1;
}

.settings-field span {
  color: #b7c4d3;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings-field input,
.settings-field select {
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(176, 184, 194, 0.2);
  border-radius: 3px;
  background: var(--thorondor-soft-background);
  color: #f8fafc;
  font: inherit;
  outline: none;
  padding: 0 11px;
}

.settings-field input:focus,
.settings-field select:focus {
  border-color: rgba(229, 236, 246, 0.46);
  box-shadow: 0 0 0 3px rgba(176, 184, 194, 0.08);
}

.settings-field input:disabled {
  color: #9aa6b3;
  cursor: not-allowed;
}

.settings-switch-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid rgba(176, 184, 194, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.settings-switch-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-control {
  position: relative;
  width: 38px;
  height: 21px;
  border: 1px solid rgba(176, 184, 194, 0.28);
  border-radius: 999px;
  background: var(--thorondor-nested-background);
  transition: background 0.16s ease, border-color 0.16s ease;
}

.switch-control::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #9aa6b3;
  transition: transform 0.16s ease, background 0.16s ease;
}

.settings-switch-row input:checked+.switch-control {
  border-color: rgba(110, 231, 183, 0.45);
  background: rgba(16, 185, 129, 0.18);
}

.settings-switch-row input:checked+.switch-control::after {
  transform: translateX(17px);
  background: #6ee7b7;
}

.settings-switch-row span:last-child {
  display: grid;
  gap: 4px;
}

.settings-switch-row strong {
  color: #edf5ff;
  font-size: 0.9rem;
}

.settings-switch-row small {
  color: #9fb0c3;
  line-height: 1.45;
}

.settings-status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.08);
}

.settings-status-strip strong {
  color: #fde68a;
  font-size: 0.86rem;
}

.settings-status-strip span {
  color: #d8c897;
  font-size: 0.82rem;
}

.mail-rule-grid,
.settings-persistence-grid {
  display: grid;
  gap: 10px;
}

.settings-persistence-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  cursor: var(--cursor-pointer), pointer;
}

.settings-persistence-card.is-active {
  border-color: rgba(229, 236, 246, 0.52);
  background: var(--thorondor-nested-background);
}

.settings-persistence-card.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.settings-persistence-card input {
  width: 16px;
  height: 16px;
  accent-color: #d8e3ef;
}

.settings-persistence-card span {
  display: grid;
  gap: 3px;
}

.settings-persistence-card strong {
  color: #f8fafc;
  font-size: 0.9rem;
}

.settings-persistence-card small {
  color: #9fb0c3;
  line-height: 1.42;
}

.settings-persistence-card em {
  justify-self: end;
  padding: 0.25rem 0.46rem;
  border: 1px solid rgba(176, 184, 194, 0.22);
  border-radius: 3px;
  color: #dce6f2;
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settings-metric-grid div {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(176, 184, 194, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.settings-metric-grid span {
  color: #9aa6b3;
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-metric-grid strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 1.04rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-modal-footer {
  border-top: 1px solid rgba(176, 184, 194, 0.16);
  background: var(--thorondor-soft-background);
}

.settings-modal-footer div {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.settings-modal-secondary,
.settings-modal-primary {
  min-height: 38px;
  border-radius: 4px;
  padding: 0 14px;
  cursor: var(--cursor-pointer), pointer;
  font-weight: 850;
}

.settings-modal-secondary {
  border: 1px solid rgba(176, 184, 194, 0.2);
  background: var(--thorondor-soft-background);
  color: #dce6f2;
}

.settings-modal-primary {
  border: 1px solid rgba(229, 236, 246, 0.34);
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.92), rgba(168, 177, 188, 0.9));
  color: #070a0e;
}

.settings-modal-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.settings-feedback {
  color: #9ff0c8;
  font-size: 0.84rem;
  line-height: 1.4;
}

.settings-feedback.is-error {
  color: #fca5a5;
}

.settings-modal-enter-active,
.settings-modal-leave-active {
  transition: opacity 0.18s ease;
}

.settings-modal-enter-active .settings-modal,
.settings-modal-leave-active .settings-modal {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.settings-modal-enter-from,
.settings-modal-leave-to {
  opacity: 0;
}

.settings-modal-enter-from .settings-modal,
.settings-modal-leave-to .settings-modal {
  opacity: 0;
  transform: translateY(10px);
}

.sidebar-toggle {
  display: none;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(168, 177, 188, 0.22);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
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
    grid-template-columns: 42px minmax(146px, 190px) minmax(0, 1fr) auto;
    gap: 10px;
    padding: 0 14px;
  }

  .brand-logo {
    width: min(100%, 184px);
    height: 40px;
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

@media (max-width: 900px) {
  .thorondor-primary-header {
    grid-template-columns: 38px minmax(118px, 146px) minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    height: var(--main-header-height);
    padding: 0 12px;
  }

  .thorondor-top-nav {
    width: 100%;
    justify-content: flex-start;
    gap: 3px;
    min-height: 36px;
    padding: 3px;
    border-color: rgba(176, 184, 194, 0.13);
    background: var(--thorondor-nested-background);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
  }

  .settings-menu-item span,
  .settings-menu-footer small {
    display: none;
  }

  .brand-logo {
    width: min(100%, 140px);
    height: 36px;
  }

  .top-nav-link {
    min-width: 78px;
    min-height: 30px;
    padding: 0 7px;
    font-size: 0.68rem;
  }

  .settings-square,
  .error-square,
  .sidebar-toggle {
    width: 38px;
    height: 38px;
  }

  .error-dropdown {
    right: 14px;
  }

  .settings-modal-backdrop {
    align-items: stretch;
    padding: 10px;
  }

  .settings-modal {
    width: 100%;
    max-height: calc(100dvh - var(--main-header-height) - 20px);
  }

  .settings-modal-grid,
  .settings-form-grid {
    grid-template-columns: 1fr;
  }

  .settings-field--full {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .thorondor-brand {
    width: 118px;
  }

  .brand-logo {
    width: 118px;
    height: 34px;
  }
}

@media (max-width: 520px) {
  .thorondor-primary-header {
    grid-template-columns: 36px minmax(94px, 104px) minmax(0, 1fr) auto;
    gap: 6px;
    padding: 0 8px;
  }

  .thorondor-brand {
    width: 102px;
  }

  .brand-logo {
    width: 102px;
    height: 32px;
  }

  .settings-square,
  .error-square,
  .sidebar-toggle {
    width: 36px;
    height: 36px;
  }

  .sidebar-toggle span {
    width: 16px;
  }

  .top-nav-link {
    min-width: 70px;
    min-height: 29px;
    padding: 0 6px;
    font-size: 0.64rem;
  }

  .settings-dropdown {
    right: 10px;
    width: calc(100vw - 20px);
  }

  .settings-modal-backdrop {
    padding: 0;
  }

  .settings-modal {
    max-height: calc(100dvh - var(--main-header-height));
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .settings-modal-header,
  .settings-modal-footer {
    align-items: stretch;
    flex-direction: column;
    padding: 14px;
  }

  .settings-modal-header {
    flex-direction: row;
    align-items: flex-start;
  }

  .settings-modal-body {
    padding: 14px;
  }

  .settings-modal-panel {
    padding: 13px;
  }

  .settings-modal-footer div,
  .settings-modal-secondary,
  .settings-modal-primary {
    width: 100%;
  }

  .settings-modal-footer div {
    margin-left: 0;
  }

  .settings-status-strip,
  .settings-persistence-card {
    align-items: flex-start;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .settings-status-strip {
    flex-direction: column;
  }

  .settings-persistence-card em {
    grid-column: 2;
    justify-self: start;
  }

  .settings-metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
