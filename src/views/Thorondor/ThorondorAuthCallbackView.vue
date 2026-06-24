<template>
  <main class="auth-callback-page">
    <section class="auth-callback-card" aria-labelledby="auth-callback-title">
      <div class="auth-callback-topline">
        <RouterLink :to="{ name: 'thorondor-login' }" class="auth-callback-brand">
          <img :src="thorondorLogo" alt="" />
          <span>Thorondor</span>
        </RouterLink>

      </div>

      <div class="auth-callback-status" :class="{ 'has-error': hasProviderError }">
        <span class="status-indicator" aria-hidden="true"></span>
        <p>{{ statusLabel }}</p>
      </div>

      <div class="auth-callback-copy">
        <span class="section-kicker">Proveedor externo</span>
        <h1 id="auth-callback-title">{{ title }}</h1>
        <p>{{ description }}</p>
      </div>

      <div class="auth-callback-actions">
        <RouterLink :to="{ name: 'thorondor-login' }" class="secondary-link">Volver al inicio de sesión</RouterLink>
        <RouterLink :to="{ name: 'thorondor-information' }" class="primary-link">Continuar en modo local</RouterLink>
      </div>
    </section>
  </main>
</template>

<script>
import thorondorLogo from '@/assets/images/brand/logo_thorondor.png'

export default {
  name: 'ThorondorAuthCallbackView',

  data() {
    return {
      thorondorLogo,
      sessionStatus: 'checking',
      session: null,
      sessionError: '',
    }
  },

  async mounted() {
    if (this.hasProviderError) {
      this.sessionStatus = 'error'
      return
    }

    try {
      const session = await this.$store.dispatch('refreshThorondorSession')
      this.session = session
      this.sessionStatus = session.authenticated ? 'success' : 'error'
      if (session.authenticated) {
        window.setTimeout(() => {
          this.$router.replace({ name: 'thorondor-information' })
        }, 900)
      }
    } catch (error) {
      this.sessionStatus = 'error'
      this.sessionError = error.message
    }
  },

  computed: {
    hasProviderError() {
      return Boolean(
        this.$route.query.error ||
          this.$route.query.auth === 'error' ||
          this.$route.query.auth === 'provider_not_configured',
      )
    },

    statusLabel() {
      if (this.hasProviderError) {
        return 'El proveedor ha devuelto un error'
      }

      if (this.sessionStatus === 'success') {
        return 'Sesión iniciada'
      }

      if (this.sessionStatus === 'error') {
        return 'No hay sesión activa'
      }

      return 'Comprobando sesión'
    },

    title() {
      if (this.hasProviderError) {
        return 'No se pudo completar el acceso'
      }

      if (this.sessionStatus === 'success') {
        return 'Acceso validado'
      }

      if (this.sessionStatus === 'error') {
        return 'No se pudo validar la sesión'
      }

      return 'Validando sesión'
    },

    description() {
      if (this.hasProviderError) {
        return (
          this.$route.query.message ||
          'El proveedor no está disponible o no pudo completar el flujo OAuth.'
        )
      }

      if (this.sessionStatus === 'success') {
        const name = this.session?.user?.displayName || this.session?.user?.email || 'operador'
        return `Sesión iniciada como ${name}. Te llevamos a la consola.`
      }

      if (this.sessionStatus === 'error') {
        return (
          this.sessionError ||
          'El backend no devolvió una sesión autenticada. Revisa cookies, CORS y callback OAuth.'
        )
      }

      return 'Cerrando el flujo con la API y cargando la sesión del workspace sin guardar secretos en el navegador.'
    },
  },
}
</script>

<style scoped>
.auth-callback-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(22px, 4vw, 48px);
  background: var(--thorondor-grid-background);
  background-size: var(--thorondor-grid-background-size);
  color: #e5eef8;
}

.auth-callback-card {
  display: grid;
  width: min(100%, 520px);
  gap: 24px;
  padding: clamp(24px, 4vw, 34px);
  border: 1px solid rgba(236, 194, 119, 0.24);
  border-radius: 4px;
  background: var(--thorondor-panel-background);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 14px 34px rgba(5, 9, 8, 0.24);
}

.auth-callback-brand,
.auth-callback-actions {
  display: flex;
  align-items: center;
}

.auth-callback-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.auth-callback-brand {
  width: fit-content;
  gap: 12px;
  color: #f8fafc;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  text-decoration: none;
}

.auth-callback-brand img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  background: var(--thorondor-flat-soft-background);
  filter: drop-shadow(0 7px 12px rgba(5, 9, 8, 0.28));
}

.auth-callback-status {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid rgba(213, 219, 226, 0.28);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
  color: #e2e8f0;
}

.auth-callback-status.has-error {
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(127, 29, 29, 0.2);
  color: #fecaca;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: currentColor;
  box-shadow: 0 0 0 5px rgba(190, 198, 208, 0.12);
}

.auth-callback-status p,
.auth-callback-copy h1,
.auth-callback-copy p {
  margin: 0;
}

.auth-callback-status p {
  font-size: 0.8rem;
  font-weight: 900;
}

.auth-callback-copy {
  display: grid;
  gap: 10px;
}

.section-kicker {
  color: var(--thorondor-gold);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.auth-callback-copy h1 {
  color: #f8fafc;
  font-size: clamp(2rem, 6vw, 3.4rem);
  font-weight: 850;
  letter-spacing: 0;
  line-height: 1;
}

.auth-callback-copy p {
  color: #9fb0c3;
  line-height: 1.65;
}

.auth-callback-actions {
  justify-content: space-between;
  gap: 14px;
  padding-top: 4px;
  border-top: 1px solid rgba(176, 184, 194, 0.14);
}

.primary-link,
.secondary-link {
  font-size: 0.86rem;
  font-weight: 900;
  text-decoration: none;
}

.primary-link {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 1px solid rgba(236, 194, 119, 0.82);
  border-radius: 4px;
  background: linear-gradient(180deg, #f3cf8c, #c88935);
  color: #10100d;
}

.secondary-link {
  color: #dbe4ee;
}

@media (max-width: 560px) {
  .auth-callback-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
