<template>
  <footer class="thorondor-mini-footer" aria-label="Información de plataforma">
    <p class="footer-brand">
      <strong>Thorondor</strong>
      <span>Consola SIEM para hosts propios</span>
    </p>

    <dl class="footer-status">
      <dt>Datos</dt>
      <dd>{{ persistenceLabel }}</dd>
      <dt>Workspace</dt>
      <dd>{{ workspaceLabel }}</dd>
      <dt>Polling</dt>
      <dd>{{ pollingLabel }}</dd>
    </dl>

    <small class="footer-copy">{{ currentYear }} Thorondor</small>
  </footer>
</template>

<script>
export default {
  name: 'ThorondorMiniFooter',

  computed: {
    thorondorState() {
      return this.$store.state.thorondor || {}
    },

    persistenceStatus() {
      return this.thorondorState.persistence || {}
    },

    persistenceLabel() {
      return this.persistenceStatus.effectiveMode === 'cloud' ? 'Base de datos' : 'Local'
    },

    workspaceLabel() {
      return this.persistenceStatus.workspaceId || 'default'
    },

    pollingLabel() {
      if (!this.thorondorState.lastPollAt) return 'Pendiente'

      return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(this.thorondorState.lastPollAt))
    },

    currentYear() {
      return new Date().getFullYear()
    },
  },
}
</script>

<style scoped>
.thorondor-mini-footer {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  gap: clamp(18px, 2.8vw, 42px);
  align-items: center;
  width: 100%;
  margin: 18px 0 0;
  padding: 18px clamp(20px, 2.4vw, 38px);
  border-top: 1px solid rgba(190, 198, 209, 0.18);
  background: linear-gradient(180deg, #121820 0%, #0b0f15 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 -14px 36px rgba(0, 0, 0, 0.2);
  color: #a4afbb;
  font-family: 'Inter', sans-serif;
}

.footer-brand {
  display: grid;
  gap: 3px;
  min-width: 0;
  margin: 0;
}

.footer-brand strong {
  color: #f1f5f9;
  font-size: 0.9rem;
  font-weight: 800;
}

.footer-brand span,
.footer-copy,
.footer-status dd {
  color: #a5b0bd;
  font-size: 0.75rem;
}

.footer-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px 9px;
  align-items: baseline;
  margin: 0;
  color: #f0f4f8;
}

.footer-status dt {
  color: #7f8b99;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.footer-status dd {
  max-width: 180px;
  margin: 0;
  overflow: hidden;
  color: #dce4ee;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-status dd:not(:last-child)::after {
  content: '';
  display: inline-block;
  width: 1px;
  height: 12px;
  margin-left: 11px;
  vertical-align: -2px;
  background: rgba(190, 198, 209, 0.18);
}

.footer-copy {
  justify-self: end;
  padding-left: 16px;
  border-left: 1px solid rgba(190, 198, 209, 0.14);
  color: #828e9b;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .thorondor-mini-footer {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .footer-status {
    justify-content: flex-start;
  }

  .footer-copy {
    justify-self: start;
    padding-left: 0;
    border-left: 0;
  }
}

@media (max-width: 560px) {
  .thorondor-mini-footer {
    padding: 16px 14px;
  }

  .footer-status {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    width: 100%;
    justify-content: stretch;
    gap: 7px 10px;
  }

  .footer-status dd {
    max-width: none;
  }

  .footer-status dd:not(:last-child)::after {
    display: none;
  }
}
</style>
