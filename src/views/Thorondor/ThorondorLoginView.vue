<template>
  <main class="login-page">
    <section class="login-layout">
      <aside class="product-panel" aria-label="Presentacion de Thorondor">
        <div class="login-topline">
          <RouterLink :to="{ name: 'thorondor-login' }" class="brand-link">
            <img :src="thorondorLogo" alt="" />
            <span>Thorondor</span>
          </RouterLink>

        </div>

        <div class="product-copy">
          <span class="section-kicker">Monitorización y respuesta</span>
          <h1>Entra, mira el estado y actúa con criterio.</h1>
          <p>
            Thorondor centraliza hosts, alertas, reglas, logs y acciones de respuesta en una consola clara para
            servidores propios.
          </p>
        </div>

        <section class="product-preview" aria-label="Resumen visual de Thorondor">
          <div class="preview-topline">
            <span>Workspace operativo</span>
            <strong>Demo local</strong>
          </div>
          <div class="preview-grid">
            <article v-for="item in previewStats" :key="item.label">
              <span>{{ item.value }}</span>
              <small>{{ item.label }}</small>
            </article>
          </div>
          <div class="preview-timeline">
            <span></span>
            <p>Alertas, comandos y bloqueos quedan ordenados por host.</p>
          </div>
        </section>
      </aside>

      <section class="login-card" aria-labelledby="login-title">
        <header class="login-card-header">
          <span class="section-kicker">Acceso</span>
          <h2 id="login-title">Inicio de sesión</h2>
          <p>Explora Thorondor sin cuenta o conecta tu workspace con un proveedor de confianza.</p>
        </header>

        <RouterLink :to="{ name: 'thorondor-information' }" class="guest-access-button">
          <span>Acceder sin logarse</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </RouterLink>

        <div class="login-divider" aria-hidden="true">
          <span>o entra con tu cuenta</span>
        </div>

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
      </section>
    </section>
  </main>
</template>

<script>
import thorondorLogo from '@/assets/images/Thorondor-logo.png'
import {
  THORONDOR_SOCIAL_AUTH_PROVIDERS,
  startThorondorSocialAuth,
} from '@/features/thorondor/services/thorondorAuth'

export default {
  name: 'ThorondorLoginView',

  data() {
    return {
      thorondorLogo,
      socialProviders: THORONDOR_SOCIAL_AUTH_PROVIDERS,
      socialAuthBusyProvider: '',
      showPassword: false,
      feedbackMessage: '',
      form: {
        email: '',
        password: '',
        rememberDevice: true,
      },
      previewStats: [
        { label: 'hosts vigilados', value: '12' },
        { label: 'alertas activas', value: '3' },
        { label: 'reglas por host', value: '48' },
      ],
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
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(20px, 3vw, 40px);
  background:
    linear-gradient(90deg, rgba(165, 180, 201, 0.105) 1px, transparent 1px),
    linear-gradient(180deg, rgba(165, 180, 201, 0.085) 1px, transparent 1px),
    linear-gradient(135deg, rgba(190, 198, 208, 0.05) 1px, transparent 1px),
    linear-gradient(135deg, #0b0f14 0%, #12161c 50%, #07090d 100%);
  background-size:
    40px 40px,
    40px 40px,
    120px 120px,
    auto;
  color: #e5eef8;
}

.login-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 430px);
  gap: clamp(32px, 5vw, 76px);
  width: min(100%, 1120px);
  align-items: center;
}

.product-panel,
.login-card,
.product-copy,
.login-card-header,
.login-form {
  display: grid;
}

.product-panel {
  gap: 32px;
}

.login-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.brand-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 12px;
  color: #f8fafc;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 1.18rem;
  font-weight: 850;
  text-decoration: none;
}

.brand-link img {
  width: 62px;
  height: 62px;
  object-fit: contain;
  filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.48));
}

.product-copy {
  gap: 14px;
  max-width: 650px;
}

.section-kicker {
  color: #8ea3b8;
  font-size: 0.76rem;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: uppercase;
}

.product-copy h1,
.login-card-header h2 {
  margin: 0;
  color: #f8fafc;
  letter-spacing: 0;
}

.product-copy h1 {
  max-width: 13ch;
  font-size: clamp(3rem, 6vw, 5.1rem);
  font-weight: 850;
  line-height: 0.98;
}

.product-copy p,
.login-card-header p,
.preview-timeline p,
.login-feedback {
  margin: 0;
  color: #9fb0c3;
  line-height: 1.62;
}

.product-copy p {
  max-width: 590px;
  font-size: 1rem;
}

.product-preview {
  display: grid;
  width: min(100%, 560px);
  gap: 18px;
  padding: 22px;
  border: 1px solid rgba(176, 184, 194, 0.18);
  border-radius: 4px;
  background: rgba(17, 21, 27, 0.7);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.26);
}

.preview-topline,
.preview-timeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preview-topline span,
.preview-grid small {
  color: #91a4ba;
  font-size: 0.78rem;
  font-weight: 750;
}

.preview-topline strong {
  color: #dbe4ee;
  font-size: 0.88rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.preview-grid article {
  display: grid;
  gap: 4px;
  padding: 13px;
  border: 1px solid rgba(176, 184, 194, 0.14);
  border-radius: 4px;
  background: rgba(18, 22, 28, 0.72);
}

.preview-grid span {
  color: #f8fafc;
  font-size: 1.3rem;
  font-weight: 900;
}

.preview-grid small {
  line-height: 1.35;
}

.preview-timeline {
  justify-content: flex-start;
  padding-top: 2px;
}

.preview-timeline span {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 2px;
  background: #aeb8c4;
  box-shadow: 0 0 0 5px rgba(174, 184, 196, 0.14);
}

.preview-timeline p {
  font-size: 0.86rem;
}

.login-card {
  gap: 20px;
  padding: 28px;
  border: 1px solid rgba(176, 184, 194, 0.24);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(28, 33, 40, 0.99), rgba(13, 16, 21, 0.995));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 30px 80px rgba(0, 0, 0, 0.42);
}

.login-card-header {
  gap: 8px;
}

.login-card-header h2 {
  font-size: 2.05rem;
  font-weight: 850;
}

.guest-access-button,
.login-submit,
.social-login-button {
  min-height: 48px;
  border-radius: 4px;
  font-weight: 900;
}

.guest-access-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid rgba(226, 232, 240, 0.82);
  background: linear-gradient(180deg, #eef6ff, #b8cadd);
  color: #06111d;
  text-decoration: none;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22);
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
  color: #7f91a7;
  font-size: 0.72rem;
  font-weight: 850;
  text-transform: uppercase;
}

.login-divider::before,
.login-divider::after {
  height: 1px;
  background: rgba(176, 184, 194, 0.16);
  content: '';
}

.social-login-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.social-login-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid rgba(176, 184, 194, 0.22);
  background: #f8fafc;
  color: #101827;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.social-login-button:hover:not(:disabled),
.guest-access-button:hover {
  transform: translateY(-1px);
}

.social-login-button:hover:not(:disabled) {
  border-color: rgba(226, 232, 240, 0.9);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.social-login-button:disabled {
  cursor: progress;
  opacity: 0.68;
}

.social-login-button.is-loading {
  border-color: rgba(213, 219, 226, 0.58);
  box-shadow: 0 0 0 3px rgba(190, 198, 208, 0.14);
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
  gap: 13px;
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
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(176, 184, 194, 0.3);
  border-radius: 4px;
  background: #10141a;
  color: #f8fafc;
  outline: none;
}

.login-field input::placeholder {
  color: #72859a;
}

.login-field input:focus {
  border-color: rgba(213, 219, 226, 0.58);
  box-shadow: 0 0 0 3px rgba(190, 198, 208, 0.14);
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
  height: 34px;
  place-items: center;
  border: 1px solid rgba(176, 184, 194, 0.22);
  border-radius: 4px;
  background: rgba(24, 28, 34, 0.86);
  color: #cfd6de;
  transform: translateY(-50%);
}

.login-submit {
  border: 1px solid rgba(213, 219, 226, 0.32);
  background: rgba(190, 198, 208, 0.12);
  color: #eef3f8;
}

.recover-link {
  width: fit-content;
  justify-self: center;
  color: #a8bfd6;
  font-size: 0.82rem;
  font-weight: 850;
  text-decoration: none;
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
    gap: 24px;
  }

  .login-card {
    order: 1;
  }

  .product-panel {
    order: 2;
  }

  .product-copy h1 {
    max-width: 18ch;
    font-size: 3rem;
  }
}

@media (max-width: 620px) {
  .login-page {
    padding: 16px;
    place-items: start center;
  }

  .login-card {
    padding: 22px;
  }

  .social-login-panel,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .product-copy h1 {
    font-size: 2.35rem;
  }
}
</style>
