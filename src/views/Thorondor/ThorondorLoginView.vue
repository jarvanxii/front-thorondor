<template>
  <main class="login-page">
    <section class="login-layout">
      <section class="login-visual" aria-label="Thorondor SIEM">
        <img class="login-banner" :src="loginBanner" alt="Thorondor SIEM" />
      </section>

      <section class="login-card" aria-labelledby="login-title">
        <header class="login-card-header">
          <span class="section-kicker">Acceso</span>
          <h1 id="login-title">Inicio de sesión</h1>
          <p>Acceso validado para operadores, administradores y revisores.</p>
        </header>

        <section class="social-login-panel" aria-label="Acceso con proveedores externos">
          <button
            v-for="provider in socialProviders"
            :key="provider.id"
            class="social-login-button"
            :class="{ 'is-loading': socialAuthBusyProvider === provider.id }"
            type="button"
            :disabled="Boolean(socialAuthBusyProvider)"
            :aria-label="`Continuar con ${provider.label}`"
            :title="provider.description"
            @click="startSocialLogin(provider)"
          >
            <img :src="provider.icon" alt="" aria-hidden="true" />
            <span>{{ provider.label }}</span>
          </button>
        </section>

        <div class="login-divider" aria-hidden="true">
          <span>o usa credenciales</span>
        </div>

        <form class="login-form" @submit.prevent="submitLogin">
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

          <button class="login-submit" type="submit">
            <span>Iniciar sesión</span>
          </button>

          <RouterLink :to="{ name: 'thorondor-login' }" class="recover-link">Recuperar acceso</RouterLink>

          <p v-if="feedbackMessage" class="login-feedback" role="status">{{ feedbackMessage }}</p>
        </form>

        <RouterLink :to="{ name: 'thorondor-information' }" class="guest-access-button">
          <span>Acceder sin logarse</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </RouterLink>
      </section>
    </section>
  </main>
</template>

<script>
import loginBanner from '@/assets/images/brand/banner_login.png'
import {
  THORONDOR_SOCIAL_AUTH_PROVIDERS,
  startThorondorSocialAuth,
} from '@/features/thorondor/services/thorondorAuth'

export default {
  name: 'ThorondorLoginView',

  data() {
    return {
      loginBanner,
      socialProviders: THORONDOR_SOCIAL_AUTH_PROVIDERS,
      socialAuthBusyProvider: '',
      showPassword: false,
      feedbackMessage: '',
      form: {
        email: '',
        password: '',
        rememberDevice: true,
      },
    }
  },

  methods: {
    startSocialLogin(provider) {
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

    submitLogin() {
      this.feedbackMessage =
        'El acceso por email queda preparado para la API propia de Thorondor. Puedes acceder sin logarte para explorar la aplicación.'
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
    -32px 0 86px rgba(0, 0, 0, 0.46),
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
.social-login-panel,
.login-divider,
.login-form,
.guest-access-button {
  width: min(100%, 380px);
}

.login-card-header {
  gap: 7px;
  text-align: center;
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

.guest-access-button,
.login-submit,
.social-login-button {
  min-height: 42px;
  border-radius: 4px;
  font-weight: 900;
}

.guest-access-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 42px;
  border: 1px solid rgba(236, 194, 119, 0.26);
  background: var(--thorondor-soft-background);
  color: #f0c77e;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.guest-access-button svg,
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
.guest-access-button:hover,
.login-submit:hover {
  transform: translateY(-1px);
}

.guest-access-button:hover {
  border-color: rgba(236, 194, 119, 0.46);
  background: var(--thorondor-nested-background);
  color: #ffd998;
}

.social-login-button:hover:not(:disabled) {
  border-color: rgba(236, 194, 119, 0.66);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
}

.social-login-button:disabled {
  cursor: progress;
  opacity: 0.68;
}

.social-login-button.is-loading {
  border-color: rgba(236, 194, 119, 0.72);
  box-shadow: 0 0 0 3px rgba(218, 166, 92, 0.15);
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
  display: grid;
  gap: 7px;
}

.login-field span {
  color: #dce3eb;
  font-size: 0.82rem;
  font-weight: 850;
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

.login-feedback {
  padding: 10px 12px;
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 4px;
  background: rgba(120, 53, 15, 0.2);
  color: #fde68a;
  font-size: 0.82rem;
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
    box-shadow: 0 -24px 64px rgba(0, 0, 0, 0.4);
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

  .guest-access-button,
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
