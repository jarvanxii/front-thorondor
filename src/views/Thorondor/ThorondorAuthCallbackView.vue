<template>
  <main class="auth-callback-redirect" aria-label="Cargando consola"></main>
</template>

<script>
export default {
  name: 'ThorondorAuthCallbackView',

  async mounted() {
    if (this.hasProviderError) {
      await this.returnToLogin('No se pudo completar el acceso con Google.')
      return
    }

    try {
      const session = await this.$store.dispatch('refreshThorondorSession')
      if (!session?.authenticated) {
        await this.returnToLogin('No se pudo validar la sesión.')
        return
      }

      await this.$router.replace(this.resolveConsoleRoute())
    } catch (error) {
      await this.returnToLogin(error.message || 'No se pudo validar la sesión.')
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
  },

  methods: {
    resolveConsoleRoute() {
      const next = String(this.$route.query.next || '').trim()
      if (next.startsWith('/') && !next.startsWith('//')) {
        return next
      }

      return { name: 'thorondor-information' }
    },

    returnToLogin(message) {
      return this.$router.replace({
        name: 'thorondor-login',
        query: message ? { auth: 'error', message } : undefined,
      })
    },
  },
}
</script>

<style scoped>
.auth-callback-redirect {
  min-height: 100vh;
  background: var(--thorondor-grid-background);
  background-size: var(--thorondor-grid-background-size);
}
</style>
