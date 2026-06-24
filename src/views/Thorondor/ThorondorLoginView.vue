<template>
  <main class="login-page">
    <section class="login-layout">
      <section class="login-visual" aria-label="Thorondor SIEM">
        <img class="login-banner" :src="loginBanner" alt="Thorondor SIEM" />
      </section>

      <section class="login-card" aria-labelledby="login-title">
        <header class="login-card-header">
          <span class="section-kicker">Acceso</span>
          <h1 id="login-title">{{ pageTitle }}</h1>
        </header>

        <section class="auth-mode-switch" aria-label="Tipo de acceso">
          <button
            type="button"
            :class="{ 'is-active': authMode === 'login' }"
            @click="setAuthMode('login')"
          >
            Acceso
          </button>
          <button
            type="button"
            :class="{ 'is-active': authMode === 'signup' }"
            @click="setAuthMode('signup')"
          >
            Registro
          </button>
          <button
            type="button"
            :class="{ 'is-active': authMode === 'recovery' }"
            @click="setAuthMode('recovery')"
          >
            Recuperar
          </button>
        </section>

        <section v-if="authMode === 'login'" class="social-login-panel" aria-label="Acceso con proveedores externos">
          <button
            v-for="provider in socialProviders"
            :key="provider.id"
            class="social-login-button"
            :class="{
              'is-loading': socialAuthBusyProvider === provider.id,
              'is-unavailable': !provider.configured,
            }"
            type="button"
            :disabled="Boolean(socialAuthBusyProvider) || !provider.configured"
            :aria-label="`Continuar con ${provider.label}`"
            :title="provider.configured ? provider.description : provider.disabledReason"
            @click="startSocialLogin(provider)"
          >
            <img :src="provider.icon" alt="" aria-hidden="true" />
            <span>{{ provider.label }}</span>
          </button>
        </section>

        <div v-if="authMode === 'login'" class="login-divider" aria-hidden="true">
          <span>o usa credenciales</span>
        </div>

        <form v-if="authMode === 'login'" class="login-form" @submit.prevent="submitLogin">
          <label class="login-field" for="login-email">
            <span>Email</span>
            <input
              id="login-email"
              v-model.trim="form.email"
              autocomplete="email"
              inputmode="email"
              placeholder="operador@thorondor.local"
              type="email"
            />
          </label>

          <label class="login-field" for="login-password">
            <span>Contraseña</span>
            <div class="password-control">
              <input
                id="login-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Introduce tu contraseña"
              />
              <button
                type="button"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                </svg>
              </button>
            </div>
          </label>

          <button class="login-submit" type="submit" :disabled="localAuthBusy">
            <span>Iniciar sesión</span>
          </button>

          <button class="recover-link as-button" type="button" @click="setAuthMode('recovery')">
            Recuperar acceso
          </button>

          <p v-if="feedbackMessage" class="login-feedback" role="status">{{ feedbackMessage }}</p>
        </form>

        <form v-else-if="authMode === 'signup'" class="login-form" @submit.prevent="submitSignup">
          <template v-if="signupStep === 'request'">
            <label class="login-field" for="signup-display-name">
              <span>Nombre</span>
              <input
                id="signup-display-name"
                v-model.trim="signupForm.displayName"
                autocomplete="name"
                placeholder="Nombre visible"
                type="text"
              />
            </label>

            <label class="login-field" for="signup-email">
              <span>Email</span>
              <input
                id="signup-email"
                v-model.trim="signupForm.email"
                autocomplete="email"
                inputmode="email"
                placeholder="tu@email.com"
                type="email"
              />
            </label>

            <label class="login-field" for="signup-password">
              <span>Contraseña</span>
              <div class="password-control">
                <input
                  id="signup-password"
                  v-model="signupForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                </button>
              </div>
            </label>

            <label class="login-field" for="signup-password-confirmation">
              <span>Repetir contraseña</span>
              <div class="password-control">
                <input
                  id="signup-password-confirmation"
                  v-model="signupForm.passwordConfirmation"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Vuelve a introducirla"
                />
                <button
                  type="button"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                </button>
              </div>
            </label>

            <button class="login-submit" type="submit" :disabled="localAuthBusy">
              <span>Enviar código</span>
            </button>
          </template>

          <template v-else>
            <label class="login-field" for="signup-code">
              <span>Código</span>
              <input
                id="signup-code"
                v-model.trim="signupForm.code"
                autocomplete="one-time-code"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
                type="text"
              />
            </label>

            <button class="login-submit" type="submit" :disabled="localAuthBusy">
              <span>Confirmar cuenta</span>
            </button>

            <button class="recover-link as-button" type="button" @click="signupStep = 'request'">
              Cambiar email
            </button>
          </template>

          <p v-if="feedbackMessage" class="login-feedback" role="status">{{ feedbackMessage }}</p>
        </form>

        <form v-else class="login-form" @submit.prevent="submitRecovery">
          <template v-if="recoveryStep === 'request'">
            <label class="login-field" for="recovery-email">
              <span>Email</span>
              <input
                id="recovery-email"
                v-model.trim="recoveryForm.email"
                autocomplete="email"
                inputmode="email"
                placeholder="tu@email.com"
                type="email"
              />
            </label>

            <button class="login-submit" type="submit" :disabled="localAuthBusy">
              <span>Enviar enlace</span>
            </button>

            <button class="recover-link as-button" type="button" @click="setAuthMode('login')">
              Volver al acceso
            </button>
          </template>

          <template v-else>
            <label class="login-field" for="recovery-password">
              <span>Nueva contraseña</span>
              <div class="password-control">
                <input
                  id="recovery-password"
                  v-model="recoveryForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                </button>
              </div>
            </label>

            <button class="login-submit" type="submit" :disabled="localAuthBusy">
              <span>Guardar contraseña</span>
            </button>
          </template>

          <p v-if="feedbackMessage" class="login-feedback" role="status">{{ feedbackMessage }}</p>
        </form>

        <footer class="login-legal-links" aria-label="Información legal">
          <RouterLink :to="{ name: 'thorondor-privacy' }">Privacidad</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink :to="{ name: 'thorondor-terms' }">Términos y condiciones</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink :to="{ name: 'thorondor-contact' }">Contacto</RouterLink>
        </footer>
      </section>
    </section>

    <section
      v-if="showCookieNotice"
      class="cookie-modal-backdrop"
      aria-labelledby="cookie-modal-title"
      aria-modal="true"
      role="dialog"
    >
      <article class="cookie-modal">
        <header class="cookie-modal-header">
          <span class="section-kicker">Privacidad y cookies</span>
          <small>Configuración esencial</small>
        </header>

        <div class="cookie-modal-body">
          <h2 id="cookie-modal-title">Uso de cookies en Thorondor</h2>
          <p>
            Utilizamos cookies técnicas para mantener la sesión, proteger el acceso y recordar
            preferencias básicas de la plataforma. También guardamos esta aceptación en IndexedDB
            para no volver a mostrar este aviso en este navegador.
          </p>

          <ul class="cookie-purpose-list">
            <li>
              <strong>Sesión y seguridad</strong>
              <p>Cookies necesarias para iniciar sesión, validar credenciales y proteger las peticiones a la API.</p>
            </li>
            <li>
              <strong>Preferencias locales</strong>
              <p>IndexedDB conserva el consentimiento, ajustes de uso y caché local de la consola cuando procede.</p>
            </li>
            <li>
              <strong>Sin publicidad</strong>
              <p>No se usan cookies publicitarias ni seguimiento comercial de terceros desde esta pantalla.</p>
            </li>
          </ul>
        </div>

        <footer class="cookie-modal-actions">
          <RouterLink :to="{ name: 'thorondor-privacy' }">Consultar política de privacidad</RouterLink>
          <button
            ref="cookieModalPrimary"
            class="cookie-modal-primary"
            type="button"
            @click="acceptCookieNotice"
          >
            Aceptar y continuar
          </button>
        </footer>
      </article>
    </section>
  </main>
</template>

<script>
import loginBanner from '@/assets/images/brand/banner_login.png'
import { getMeta, setMeta } from '@/features/thorondor/services/thorondorIndexedDb'
import {
  THORONDOR_SOCIAL_AUTH_PROVIDERS,
  confirmThorondorEmailSignup,
  confirmThorondorPasswordRecovery,
  fetchThorondorSession,
  getThorondorAuthConfig,
  loginThorondorCredentials,
  requestThorondorEmailSignup,
  requestThorondorPasswordRecovery,
  startThorondorSocialAuth,
} from '@/features/thorondor/services/thorondorAuth'

const COOKIE_CONSENT_META_KEY = 'thorondorCookieConsent:v1'
const EXTERNAL_OAUTH_ENABLED = false

export default {
  name: 'ThorondorLoginView',

  data() {
    return {
      loginBanner,
      authMode: 'login',
      providerAvailability: {},
      providersLoaded: false,
      socialAuthBusyProvider: '',
      localAuthBusy: false,
      showPassword: false,
      showCookieNotice: false,
      feedbackMessage: '',
      signupStep: 'request',
      recoveryStep: 'request',
      form: {
        email: '',
        password: '',
        rememberDevice: true,
      },
      signupForm: {
        displayName: '',
        email: '',
        password: '',
        passwordConfirmation: '',
        code: '',
      },
      recoveryForm: {
        email: '',
        resetId: '',
        token: '',
        password: '',
      },
    }
  },

  computed: {
    pageTitle() {
      if (this.authMode === 'signup') {
        return this.signupStep === 'confirm' ? 'Confirma tu cuenta' : 'Crear cuenta'
      }

      if (this.authMode === 'recovery') {
        return this.recoveryStep === 'reset' ? 'Nueva contraseña' : 'Recuperar acceso'
      }

      return 'Inicio de sesión'
    },

    socialProviders() {
      return THORONDOR_SOCIAL_AUTH_PROVIDERS.map((provider) => ({
        ...provider,
        checked: this.providersLoaded,
        configured: EXTERNAL_OAUTH_ENABLED && this.providerAvailability[provider.id] === true,
        disabledReason: EXTERNAL_OAUTH_ENABLED
          ? `${provider.label} pendiente de configurar en la API`
          : `${provider.label} estará disponible cuando activemos OAuth`,
      }))
    },
  },

  mounted() {
    this.bootstrapRecoveryFromQuery()
    this.loadProviderConfiguration()
    this.loadCookieNoticeConsent()
  },

  methods: {
    focusCookieNotice() {
      if (!this.showCookieNotice) return

      this.$nextTick(() => {
        this.$refs.cookieModalPrimary?.focus?.()
      })
    },

    async loadCookieNoticeConsent() {
      try {
        const consent = await getMeta(COOKIE_CONSENT_META_KEY, null)
        this.showCookieNotice = consent?.accepted !== true
      } catch {
        this.showCookieNotice = true
      }

      this.focusCookieNotice()
    },

    async acceptCookieNotice() {
      this.showCookieNotice = false

      try {
        await setMeta(COOKIE_CONSENT_META_KEY, {
          accepted: true,
          version: 1,
          acceptedAt: new Date().toISOString(),
        })
      } catch {
        // Si IndexedDB no está disponible, el aviso se cerrará solo para esta sesión.
      }
    },

    setAuthMode(mode) {
      this.authMode = mode
      this.feedbackMessage = ''
      if (mode === 'recovery' && !this.recoveryForm.token) {
        this.recoveryStep = 'request'
      }
    },

    bootstrapRecoveryFromQuery() {
      const resetId = this.$route.query.reset_id || this.$route.query.resetId || ''
      const token = this.$route.query.token || ''
      const email = this.$route.query.email || ''

      if (!resetId || !token) {
        return
      }

      this.authMode = 'recovery'
      this.recoveryStep = 'reset'
      this.recoveryForm.resetId = String(resetId)
      this.recoveryForm.token = String(token)
      this.recoveryForm.email = String(email || '')
    },

    async loadProviderConfiguration() {
      if (!getThorondorAuthConfig().apiBaseUrl) {
        return
      }

      try {
        const session = await fetchThorondorSession()
        this.providerAvailability = Object.fromEntries(
          (session.providers || []).map((provider) => [
            provider.id,
            Boolean(provider.configured),
          ]),
        )
        this.providersLoaded = true
      } catch {
        this.providersLoaded = false
      }
    },

    startSocialLogin(provider) {
      if (!provider.configured) {
        this.feedbackMessage = 'El acceso con Google, Microsoft, GitHub y Apple está pendiente de activar.'
        return
      }

      const result = startThorondorSocialAuth(provider.id, {
        rememberDevice: this.form.rememberDevice,
      })

      if (!result.started) {
        this.feedbackMessage =
          'Configura VITE_THORONDOR_API_BASE_URL para activar el login con Google, Microsoft, GitHub y Apple.'
        return
      }

      this.socialAuthBusyProvider = provider.id
      this.feedbackMessage = `Redirigiendo a ${provider.label}...`
    },

    async submitLogin() {
      if (this.localAuthBusy) return
      this.localAuthBusy = true
      this.feedbackMessage = ''

      try {
        await loginThorondorCredentials(this.form)
        await this.completeLocalAuth()
      } catch (error) {
        this.feedbackMessage = error.message || 'No se pudo iniciar sesión.'
      } finally {
        this.localAuthBusy = false
      }
    },

    async submitSignup() {
      if (this.localAuthBusy) return
      if (this.signupStep === 'request' && !this.validateSignupPasswordConfirmation()) return

      this.localAuthBusy = true
      this.feedbackMessage = ''

      try {
        if (this.signupStep === 'request') {
          await requestThorondorEmailSignup(this.signupForm)
          this.signupStep = 'confirm'
          this.feedbackMessage = 'Te hemos enviado un código de verificación al email.'
          return
        }

        await confirmThorondorEmailSignup(this.signupForm)
        await this.completeLocalAuth()
      } catch (error) {
        this.feedbackMessage = error.message || 'No se pudo completar el registro.'
      } finally {
        this.localAuthBusy = false
      }
    },

    validateSignupPasswordConfirmation() {
      if (!this.signupForm.passwordConfirmation) {
        this.feedbackMessage = 'Repite la contraseña para continuar.'
        return false
      }

      if (this.signupForm.password !== this.signupForm.passwordConfirmation) {
        this.feedbackMessage = 'Las contraseñas no coinciden.'
        return false
      }

      return true
    },

    async submitRecovery() {
      if (this.localAuthBusy) return
      this.localAuthBusy = true
      this.feedbackMessage = ''

      try {
        if (this.recoveryStep === 'request') {
          await requestThorondorPasswordRecovery(this.recoveryForm)
          this.feedbackMessage = 'Te hemos enviado un enlace de recuperación al email.'
          return
        }

        await confirmThorondorPasswordRecovery(this.recoveryForm)
        await this.completeLocalAuth()
      } catch (error) {
        this.feedbackMessage = error.message || 'No se pudo recuperar el acceso.'
      } finally {
        this.localAuthBusy = false
      }
    },

    async completeLocalAuth() {
      await this.$store.dispatch('refreshThorondorSession')
      await this.$router.replace({ name: 'thorondor-information' })
    },
  },
}
</script>

<style scoped>
.login-page {
  overflow: hidden;
  height: 100vh;
  height: 100svh;
  min-height: 100vh;
  min-height: 100svh;
  background: var(--thorondor-grid-background);
  background-size: var(--thorondor-grid-background-size);
  color: #eef3f8;
}

.login-layout {
  display: grid;
  grid-template-columns: minmax(0, min(150svh, calc(100vw - 460px))) minmax(460px, 1fr);
  width: 100%;
  height: 100vh;
  height: 100svh;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
}

.login-visual {
  position: relative;
  display: block;
  min-width: 0;
  height: 100%;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  padding: 0;
  background: var(--thorondor-panel-background);
}

.login-visual::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg, rgba(2, 4, 7, 0.02) 0%, rgba(2, 4, 7, 0.02) 68%, rgba(2, 4, 7, 0.34) 100%);
  content: '';
  pointer-events: none;
}

.login-banner {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border: 0;
  border-radius: 0;
  object-fit: cover;
  object-position: center;
  filter: saturate(1.04) contrast(1.05);
}

.login-card,
.login-card-header,
.login-form {
  display: grid;
}

.login-card {
  position: relative;
  align-content: center;
  justify-items: center;
  width: 100%;
  height: 100%;
  gap: 14px;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  padding: clamp(24px, 3.5vw, 44px);
  padding-left: clamp(32px, 4vw, 78px);
  padding-right: clamp(24px, 3vw, 56px);
  border-left: 1px solid rgba(236, 194, 119, 0.24);
  border-radius: 0;
  background: var(--thorondor-grid-background);
  background-size: var(--thorondor-grid-background-size);
  box-shadow:
    -20px 0 54px rgba(5, 9, 8, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.login-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, #d6a15c 32%, #f4cf8f 50%, #d6a15c 68%, transparent);
  content: '';
}

.login-card-header,
.auth-mode-switch,
.social-login-panel,
.login-divider,
.login-form {
  width: min(100%, 380px);
}

.login-card-header {
  gap: 7px;
  text-align: center;
}

.auth-mode-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(176, 184, 194, 0.18);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.auth-mode-switch button {
  min-height: 34px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #9fb0c3;
  font-size: 0.8rem;
  font-weight: 900;
}

.auth-mode-switch button.is-active {
  background: linear-gradient(180deg, rgba(244, 208, 143, 0.92), rgba(200, 137, 53, 0.92));
  color: #10100d;
}

.section-kicker {
  justify-self: center;
  color: #d6a15c;
  font-size: 0.76rem;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: uppercase;
}

.login-card-header h1 {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.85rem, 2.7vw, 2.25rem);
  font-weight: 850;
  letter-spacing: 0;
  line-height: 1;
}

.login-card-header p,
.login-feedback {
  margin: 0;
  color: #a8b4c2;
  line-height: 1.58;
}

.login-submit,
.social-login-button {
  min-height: 42px;
  border-radius: 4px;
  font-weight: 900;
}

.password-control svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.login-divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  color: #93a2b4;
  font-size: 0.72rem;
  font-weight: 850;
  text-transform: uppercase;
}

.login-divider::before,
.login-divider::after {
  height: 1px;
  background: rgba(236, 194, 119, 0.2);
  content: '';
}

.social-login-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.social-login-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid rgba(226, 232, 240, 0.12);
  background: rgba(248, 250, 252, 0.94);
  color: #0d141f;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.social-login-button:hover:not(:disabled),
.login-submit:hover {
  transform: translateY(-1px);
}

.social-login-button:hover:not(:disabled) {
  border-color: rgba(236, 194, 119, 0.66);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
}

.social-login-button:disabled {
  opacity: 0.68;
}

.social-login-button.is-loading {
  cursor: progress;
  border-color: rgba(236, 194, 119, 0.72);
  box-shadow: 0 0 0 3px rgba(218, 166, 92, 0.15);
}

.social-login-button.is-unavailable {
  cursor: not-allowed;
  background: rgba(148, 163, 184, 0.2);
  color: #9ca8b7;
  box-shadow: none;
}

.social-login-button img {
  width: 21px;
  height: 21px;
  object-fit: contain;
}

.social-login-button span {
  line-height: 1;
}

.login-form {
  gap: 10px;
}

.login-field {
  position: relative;
  display: grid;
  gap: 7px;
}

.login-field span {
  color: #dce3eb;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.login-field input {
  width: 100%;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(176, 184, 194, 0.28);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  color: #f8fafc;
  outline: none;
}

.login-field input::placeholder {
  color: #72859a;
}

.login-field input:focus {
  border-color: rgba(236, 194, 119, 0.72);
  box-shadow: 0 0 0 3px rgba(218, 166, 92, 0.15);
}

.password-control {
  position: relative;
}

.password-control input {
  padding-right: 52px;
}

.password-control button {
  position: absolute;
  top: 50%;
  right: 8px;
  display: grid;
  width: 34px;
  height: 32px;
  place-items: center;
  border: 1px solid rgba(176, 184, 194, 0.22);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
  color: #cfd6de;
  transform: translateY(-50%);
}

.login-submit {
  border: 1px solid rgba(236, 194, 119, 0.78);
  background: linear-gradient(180deg, #f4d08f, #c88935);
  color: #10100d;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.24);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.login-submit:disabled {
  cursor: progress;
  opacity: 0.72;
}

.login-submit:hover {
  border-color: rgba(255, 221, 158, 0.86);
  background: linear-gradient(180deg, #ffdc9f, #d59a45);
}

.recover-link {
  width: fit-content;
  justify-self: center;
  color: #d6a15c;
  font-size: 0.82rem;
  font-weight: 850;
  text-decoration: none;
}

.recover-link:hover {
  color: #f3cf8c;
}

.recover-link.as-button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.login-feedback {
  padding: 10px 12px;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 4px;
  background: rgba(120, 53, 15, 0.2);
  color: #fde68a;
  font-size: 0.82rem;
}

.login-legal-links {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: min(100%, 380px);
  color: #72859a;
  font-size: 0.78rem;
  font-weight: 760;
}

.login-legal-links a {
  color: #aab7c7;
  text-decoration: none;
}

.login-legal-links a:hover {
  color: #f3cf8c;
}

.cookie-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    linear-gradient(120deg, rgba(214, 161, 92, 0.08), transparent 34%),
    rgba(3, 6, 10, 0.74);
  backdrop-filter: blur(10px);
}

.cookie-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(100%, 540px);
  max-height: min(100%, 680px);
  overflow: hidden;
  border: 1px solid rgba(176, 184, 194, 0.24);
  border-radius: 6px;
  background:
    linear-gradient(145deg, rgba(236, 194, 119, 0.025), transparent 46%),
    var(--thorondor-panel-background);
  box-shadow:
    0 18px 48px rgba(5, 9, 8, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.cookie-modal-header,
.cookie-modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cookie-modal-header {
  padding: 20px 22px 0;
}

.cookie-modal-header small {
  padding: 4px 8px;
  border: 1px solid rgba(176, 184, 194, 0.18);
  border-radius: 999px;
  color: #9fb0c3;
  font-size: 0.68rem;
  font-weight: 820;
  white-space: nowrap;
}

.cookie-modal-body {
  display: grid;
  gap: 14px;
  overflow: auto;
  padding: 18px 22px 20px;
}

.cookie-modal-body h2 {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.35rem, 2.4vw, 1.72rem);
  font-weight: 900;
  line-height: 1.14;
}

.cookie-modal-body > p {
  margin: 0;
  color: #c7d0dc;
  font-size: 0.93rem;
  line-height: 1.58;
}

.cookie-purpose-list {
  display: grid;
  gap: 8px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}

.cookie-purpose-list li {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(176, 184, 194, 0.14);
  border-radius: 4px;
  background: rgba(8, 12, 17, 0.42);
}

.cookie-purpose-list strong {
  color: #f3cf8c;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.cookie-purpose-list p {
  margin: 0;
  color: #c6d0dc;
  font-size: 0.86rem;
  line-height: 1.48;
}

.cookie-modal-actions {
  justify-content: flex-end;
  padding: 16px 22px 20px;
  border-top: 1px solid rgba(176, 184, 194, 0.16);
  background: rgba(3, 6, 10, 0.2);
}

.cookie-modal-actions a {
  color: #aab7c7;
  font-size: 0.8rem;
  font-weight: 780;
  text-decoration: none;
}

.cookie-modal-actions a:hover {
  color: #f3cf8c;
}

.cookie-modal-primary {
  min-height: 42px;
  min-width: 158px;
  padding: 0 20px;
  border-radius: 4px;
  font-weight: 900;
  border: 1px solid rgba(236, 194, 119, 0.78);
  background: linear-gradient(180deg, #f4d08f, #c88935);
  color: #10100d;
}

.cookie-modal-primary:hover {
  transform: translateY(-1px);
}

@media (max-width: 980px) {
  .login-layout {
    grid-template-columns: 1fr;
    grid-template-rows: clamp(160px, 26svh, 220px) minmax(0, 1fr);
    min-height: 100vh;
    min-height: 100svh;
  }

  .login-visual {
    height: auto;
    min-height: 0;
    padding: 0;
  }

  .login-banner {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    object-fit: cover;
  }

  .login-card {
    height: 100%;
    justify-items: center;
    padding: clamp(20px, 4vw, 34px);
    min-height: auto;
    border-top: 1px solid rgba(236, 194, 119, 0.24);
    border-left: 0;
    box-shadow: 0 -16px 42px rgba(5, 9, 8, 0.3);
  }

  .login-card::before {
    inset: 0 0 auto;
    width: auto;
    height: 2px;
    background: linear-gradient(90deg, transparent, #d6a15c 32%, #f4cf8f 50%, #d6a15c 68%, transparent);
  }
}

@media (max-width: 620px) {
  .login-layout {
    grid-template-rows: clamp(142px, 23svh, 190px) minmax(0, 1fr);
  }

  .login-card {
    gap: 10px;
    padding: 18px;
  }

  .cookie-modal-backdrop {
    padding: 14px;
  }

  .cookie-modal {
    max-height: calc(100svh - 28px);
  }

  .cookie-modal-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    padding: 18px 18px 0;
  }

  .cookie-modal-body {
    gap: 12px;
    padding: 16px 18px;
  }

  .cookie-modal-body h2 {
    font-size: 1.35rem;
  }

  .cookie-modal-body > p,
  .cookie-purpose-list p {
    font-size: 0.85rem;
  }

  .cookie-purpose-list li {
    padding: 10px 12px;
  }

  .cookie-modal-actions {
    align-items: stretch;
    flex-direction: column-reverse;
    gap: 10px;
    padding: 14px 18px 18px;
  }

  .cookie-modal-primary {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .social-login-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 760px) {
  .login-card {
    gap: 9px;
    padding-top: 18px;
    padding-bottom: 18px;
  }

  .login-card-header {
    gap: 4px;
  }

  .login-card-header h1 {
    font-size: clamp(1.55rem, 2.2vw, 1.95rem);
  }

  .login-card-header p {
    display: none;
  }

  .login-divider {
    gap: 8px;
    font-size: 0.66rem;
  }

  .login-submit,
  .social-login-button,
  .login-field input {
    min-height: 38px;
  }

  .login-form {
    gap: 8px;
  }

  .password-control button {
    width: 30px;
    height: 30px;
  }
}
</style>
