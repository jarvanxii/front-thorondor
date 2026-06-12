<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Respuesta defensiva"
      title="Bloqueo de IPs"
      copy="Bloqueos manuales por host. Revisión de IPs cortadas e intentos fallidos recientes."
      badge="Manual"
      :badge-note="`${selectedBlockedIps.length} IPs bloqueadas en este host.`"
    />

    <section class="section-box">
      <section class="ip-block-layout">
        <article class="tool-card">
          <header class="card-head">
            <h5>Control del host</h5>
            <span class="mini-badge">{{
              selectedAgent ? selectedAgent.displayName : 'Sin agente'
            }}</span>
          </header>

          <section class="control-grid compact-grid ip-control-grid">
            <label class="control-field full-span" for="block-ip">
              <span class="field-label">IP</span>
              <input
                id="block-ip"
                v-model.trim="draft.ip"
                class="form-control input-dark"
                placeholder="IP a bloquear (ej. 203.0.113.24)"
              />
              <small v-if="ipValidationMessage" class="field-feedback">
                {{ ipValidationMessage }}
              </small>
            </label>
            <label class="control-field full-span" for="block-reason">
              <span class="field-label">Motivo</span>
              <input
                id="block-reason"
                v-model.trim="draft.reason"
                class="form-control input-dark"
                placeholder="Bloqueo manual desde Thorondor"
              />
            </label>
          </section>

          <nav class="inline-actions" aria-label="Acciones de bloqueo">
            <button class="btn btn-main" :disabled="busy || !canSubmit" @click="blockIp()">
              {{ busyAction === 'block' ? 'Bloqueando...' : 'Bloquear IP' }}
            </button>
            <button
              class="btn btn-subtle"
              :disabled="busy || !canSubmit"
              @click="unblockIp(draft.ip)"
            >
              {{ busyAction === 'unblock' ? 'Desbloqueando...' : 'Desbloquear IP' }}
            </button>
            <button
              class="btn btn-quiet"
              :disabled="refreshing || !effectiveAgentId"
              @click="refreshBlocks()"
            >
              {{ refreshing ? 'Actualizando...' : 'Actualizar' }}
            </button>
          </nav>

          <p
            v-if="statusMessage"
            class="status-line"
            :class="{
              'status-line--error': statusTone === 'error',
              'status-line--success': statusTone === 'success'
            }"
          >
            {{ statusMessage }}
          </p>
          <section v-if="statusDetailText || statusHints.length" class="status-detail">
            <p v-if="statusDetailText">
              <strong>Detalle:</strong> {{ statusDetailText }}
            </p>
            <ul v-if="statusHints.length">
              <li v-for="hint in statusHints" :key="hint">{{ hint }}</li>
            </ul>
          </section>

          <section class="mini-grid">
            <article class="mini-stat">
              <label>Endpoint</label>
              <span>{{ selectedAgent ? agentEndpoint(selectedAgent) : '-' }}</span>
            </article>
            <article class="mini-stat">
              <label>Bloqueadas</label>
              <span>{{ selectedBlockedIps.length }}</span>
            </article>
            <article class="mini-stat">
              <label>Agente</label>
              <span>{{ agentHealthLabel }}</span>
            </article>
            <article class="mini-stat">
              <label>Operación IP</label>
              <span>{{ ipBlockOperationLabel }}</span>
            </article>
          </section>
        </article>

        <article class="tool-card">
          <header class="card-head">
            <h5>IPs bloqueadas</h5>
            <span class="mini-badge">{{ selectedBlockedIps.length }}</span>
          </header>
          <section class="table-wrap">
            <table class="table table-dark align-middle mb-0">
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Proveedor</th>
                  <th>Regla</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in selectedBlockedIps" :key="item.id">
                  <td>
                    <code class="inline-code">{{ item.ip }}</code>
                  </td>
                  <td>{{ item.provider || '-' }}</td>
                  <td>{{ item.rule || 'THORONDOR_BLOCK' }}</td>
                  <td>
                    <span
                      class="state-chip"
                      :class="item.enabled === false ? 'chip-muted' : 'chip-danger'"
                    >
                      {{ item.enabled === false ? 'Inactiva' : 'Bloqueada' }}
                    </span>
                  </td>
                  <td>
                    <nav class="table-actions" aria-label="Acciones de IP bloqueada">
                      <button class="btn btn-quiet" :disabled="busy" @click="unblockIp(item.ip)">
                        Desbloquear
                      </button>
                    </nav>
                  </td>
                </tr>
                <tr v-if="!selectedBlockedIps.length">
                  <td colspan="5" class="text-muted">
                    Sin bloqueos Thorondor registrados para este sistema.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>
      </section>

      <article class="tool-card diagnostic-card">
        <header class="card-head">
          <h5>Diagnostico operativo</h5>
          <span class="mini-badge" :class="diagnosticToneClass">{{ diagnosticToneLabel }}</span>
        </header>
        <section class="diagnostic-grid">
          <article>
            <label>Último polling</label>
            <strong>{{ latestConnectionLabel }}</strong>
            <span>{{ latestConnectionDetail }}</span>
          </article>
          <article>
            <label>Endpoint probado</label>
            <strong>{{ operationEndpointLabel }}</strong>
            <span>{{ operationHttpLabel }}</span>
          </article>
          <article>
            <label>Última acción</label>
            <strong>{{ latestResponseActionLabel }}</strong>
            <span>{{ latestResponseActionDetail }}</span>
          </article>
          <article>
            <label>Causa visible</label>
            <strong>{{ visibleFailureLabel }}</strong>
            <span>{{ visibleFailureDetail }}</span>
          </article>
        </section>
        <section v-if="diagnosticHints.length" class="diagnostic-hints">
          <strong>Que revisar ahora</strong>
          <ul>
            <li v-for="hint in diagnosticHints" :key="hint">{{ hint }}</li>
          </ul>
        </section>
      </article>
    </section>

    <section class="section-box">
      <article class="tool-card">
        <header class="card-head">
          <h5>Origenes con fallos recientes</h5>
          <span class="mini-badge">24h</span>
        </header>
        <section class="table-wrap">
          <table class="table table-dark table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>IP</th>
                <th>Intentos</th>
                <th>Ultimo evento</th>
                <th>Usuario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="origin in selectedFailedOrigins" :key="origin.ip">
                <td>
                  <code class="inline-code">{{ origin.ip }}</code>
                </td>
                <td>{{ origin.count }}</td>
                <td>{{ formatDateTime(origin.lastTimestamp) }}</td>
                <td>{{ origin.lastUser }}</td>
                <td>
                  <nav class="table-actions" aria-label="Acciones de origen fallido">
                    <button class="btn btn-quiet" @click="useOrigin(origin.ip)">Usar</button>
                    <button
                      class="btn btn-quiet danger-text"
                      :disabled="busy"
                      @click="blockIp(origin.ip, 'Intentos fallidos recientes')"
                    >
                      Bloquear
                    </button>
                  </nav>
                </td>
              </tr>
              <tr v-if="!selectedFailedOrigins.length">
                <td colspan="5" class="text-muted">
                  Sin orígenes fallidos recientes en este sistema.
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </article>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from '@/components/Thorondor/ThorondorPageShell.vue'
import ThorondorSectionHeader from '@/components/Thorondor/ThorondorSectionHeader.vue'
import thorondorBaseMixin from '@/features/thorondor/mixins/thorondorBaseMixin'

function normalizeIpInput(value) {
  return String(value || '')
    .trim()
    .replace(/^\[(.*)\]$/, '$1')
}

function isValidIpv4(value) {
  const parts = String(value || '').split('.')
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false
      const number = Number(part)
      return number >= 0 && number <= 255 && String(number) === String(Number(part))
    })
  )
}

function isValidIpv6(value) {
  const candidate = String(value || '').trim()
  if (!candidate.includes(':')) return false
  try {
    return new URL(`http://[${candidate}]/`).hostname.length > 0
  } catch {
    return false
  }
}

function getIpValidationMessage(value) {
  const candidate = normalizeIpInput(value)
  if (!candidate) return ''
  if (candidate.includes('/')) return 'Introduce una IP concreta, no un rango CIDR.'
  if (candidate.includes(' ')) return 'La IP no puede contener espacios.'
  if (isValidIpv4(candidate)) {
    const octets = candidate.split('.').map(Number)
    if (octets[0] === 127 || candidate === '0.0.0.0') {
      return 'No se permite bloquear loopback ni IP sin especificar.'
    }
    if (octets[0] >= 224 && octets[0] <= 239) {
      return 'No se permite bloquear direcciones multicast.'
    }
    return ''
  }
  if (isValidIpv6(candidate)) {
    const lower = candidate.toLowerCase()
    if (lower === '::' || lower === '::1' || lower === '0:0:0:0:0:0:0:1') {
      return 'No se permite bloquear loopback ni IP sin especificar.'
    }
    if (lower.startsWith('ff')) {
      return 'No se permite bloquear direcciones multicast.'
    }
    return ''
  }
  return 'Introduce una IPv4 o IPv6 valida.'
}

export default {
  name: 'ThorondorBloqueoIpsView',

  components: {
    ThorondorPageShell,
    ThorondorSectionHeader,
  },

  mixins: [thorondorBaseMixin],

  data() {
    return {
      draft: {
        ip: '',
        reason: '',
      },
      busy: false,
      refreshing: false,
      busyAction: '',
      statusMessage: '',
      statusTone: 'info',
      statusDetails: null,
    }
  },

  computed: {
    effectiveAgentId() {
      return this.selectedAgentId
    },

    selectedBlockedIps() {
      return this.effectiveAgentId
        ? this.thorondorState.blockedIpsByAgent[this.effectiveAgentId] || []
        : []
    },

    ipBlockOperation() {
      return this.effectiveAgentId
        ? this.thorondorState.ipBlockOperationsByAgent?.[this.effectiveAgentId] || null
        : null
    },

    latestResponseAction() {
      return (
        (this.$store.getters.thorondorResponseActions || []).find(
          (action) => action.agentId === this.effectiveAgentId,
        ) || null
      )
    },

    latestConnection() {
      return this.selectedConnectionHistory[0] || null
    },

    canSubmit() {
      return Boolean(this.effectiveAgentId && this.draft.ip && !this.ipValidationMessage)
    },

    ipValidationMessage() {
      return getIpValidationMessage(this.draft.ip)
    },

    agentHealthLabel() {
      if (!this.selectedAgentCard) return 'Sin agente'
      if (this.selectedAgentCard.lastStatus === 'error') return 'Error'
      if (this.selectedAgentCard.lastStatus === 'ok') return 'OK'
      return 'Pendiente'
    },

    ipBlockOperationLabel() {
      if (!this.ipBlockOperation) return 'Sin probar'
      if (this.ipBlockOperation.status === 'loading') return 'En curso'
      if (this.ipBlockOperation.status === 'success') return 'OK'
      if (this.ipBlockOperation.status === 'error') return 'Error'
      return 'Pendiente'
    },

    latestConnectionLabel() {
      if (!this.latestConnection) return 'Sin datos'
      return this.latestConnection.kind === 'success' ? 'OK' : 'Error'
    },

    latestConnectionDetail() {
      if (!this.latestConnection) return 'Todavia no hay polling para este sistema.'
      if (this.latestConnection.kind === 'success') {
        return `Última respuesta correcta en ${this.formatDateTime(this.latestConnection.timestamp)}.`
      }
      return this.latestConnection.error || 'El polling falló sin detalle.'
    },

    operationEndpointLabel() {
      return this.ipBlockOperation?.endpoint || (this.selectedAgent ? this.agentEndpoint(this.selectedAgent) : '-')
    },

    operationHttpLabel() {
      if (!this.ipBlockOperation) return 'Sin petición de bloqueo todavía.'
      const statusCode = Number(this.ipBlockOperation.statusCode) || 0
      const http = statusCode ? `HTTP ${statusCode}` : this.ipBlockOperation.method || 'Operación local'
      return `${http} - ${this.ipBlockOperation.message || 'sin mensaje'}`
    },

    latestResponseActionLabel() {
      if (!this.latestResponseAction) return 'Sin acciones'
      return this.latestResponseAction.action === 'block' ? 'Bloqueo' : 'Desbloqueo'
    },

    latestResponseActionDetail() {
      if (!this.latestResponseAction) return 'No se ha enviado ninguna acción manual en este agente.'
      const result = this.latestResponseAction.ok ? 'OK' : 'Error'
      return `${result} ${this.latestResponseAction.ip}: ${this.latestResponseAction.message || '-'}`
    },

    visibleFailureLabel() {
      if (this.ipBlockOperation?.status === 'error') return 'Bloqueo/consulta'
      if (this.selectedAgentCard?.lastStatus === 'error') return 'Polling'
      return 'Sin fallo activo'
    },

    visibleFailureDetail() {
      if (this.ipBlockOperation?.status === 'error') {
        return this.ipBlockOperation.detail || this.ipBlockOperation.message || 'El agente no pudo completar la operación.'
      }
      if (this.selectedAgentCard?.lastStatus === 'error') {
        return this.selectedAgentCard.lastError || 'El agente no responde al polling.'
      }
      return 'La Última información disponible no muestra errores.'
    },

    diagnosticHints() {
      const hints = [
        ...(this.ipBlockOperation?.hints || []),
        ...(this.statusHints || []),
      ].filter(Boolean)

      if (!hints.length && this.selectedAgentCard?.lastStatus === 'error') {
        hints.push('Comprueba que el agente está arrancado y que /health responde desde este navegador.')
        hints.push('Revisa URL, puerto, firewall, proxy frontal y si hay bloqueo mixed content HTTP/HTTPS.')
      }

      return Array.from(new Set(hints)).slice(0, 5)
    },

    diagnosticToneLabel() {
      if (this.ipBlockOperation?.status === 'error' || this.selectedAgentCard?.lastStatus === 'error') {
        return 'Error'
      }
      if (this.ipBlockOperation?.status === 'loading') return 'En curso'
      return 'Operativo'
    },

    diagnosticToneClass() {
      if (this.diagnosticToneLabel === 'Error') return 'chip-danger'
      if (this.diagnosticToneLabel === 'En curso') return 'chip-warning'
      return 'chip-success'
    },

    statusDetailText() {
      return this.statusDetails?.detail || ''
    },

    statusHints() {
      return Array.isArray(this.statusDetails?.hints) ? this.statusDetails.hints : []
    },

    selectedFailedOrigins() {
      const cutoff = Date.now() - 86400000
      const aggregate = new Map()
      ;(this.allSecurityEvents || [])
        .filter((event) => event.agentId === this.effectiveAgentId)
        .filter(
          (event) =>
            event.kind === 'failed_login' &&
            event.sourceIp &&
            !['sin-ip', 'win'].includes(event.sourceIp),
        )
        .filter((event) => new Date(event.timestamp).getTime() >= cutoff)
        .forEach((event) => {
          const current = aggregate.get(event.sourceIp) || {
            ip: event.sourceIp,
            count: 0,
            lastTimestamp: event.timestamp,
            lastUser: event.user || '-',
          }
          current.count += 1
          if (String(event.timestamp || '').localeCompare(current.lastTimestamp || '') > 0) {
            current.lastTimestamp = event.timestamp
            current.lastUser = event.user || '-'
          }
          aggregate.set(event.sourceIp, current)
        })

      return Array.from(aggregate.values())
        .sort((a, b) => b.count - a.count || b.lastTimestamp.localeCompare(a.lastTimestamp))
        .slice(0, 12)
    },
  },

  watch: {
    effectiveAgentId: {
      immediate: true,
      handler(value) {
        if (value && !this.thorondorState.blockedIpsByAgent[value]) {
          this.refreshBlocks()
        }
      },
    },
  },

  methods: {
    async refreshBlocks() {
      if (!this.effectiveAgentId) return
      this.refreshing = true
      try {
        await this.$store.dispatch('refreshThorondorBlockedIps', this.effectiveAgentId)
        this.setStatus('Bloqueos actualizados.', 'success')
      } catch (error) {
        this.setStatus(error.message, 'error', this.detailsFromError(error))
      } finally {
        this.refreshing = false
      }
    },

    async blockIp(ip = this.draft.ip, reason = this.draft.reason) {
      const normalizedIp = normalizeIpInput(ip)
      const validationMessage = getIpValidationMessage(normalizedIp)
      if (!this.effectiveAgentId || !normalizedIp) return
      if (validationMessage) {
        this.setStatus(validationMessage, 'error')
        return
      }
      this.busy = true
      this.busyAction = 'block'
      try {
        const response = await this.$store.dispatch('blockThorondorIp', {
          agentId: this.effectiveAgentId,
          ip: normalizedIp,
          reason: reason || 'manual',
        })
        const ok = response?.ok !== false
        this.setStatus(
          response?.message || 'Solicitud de bloqueo enviada.',
          ok ? 'success' : 'error',
          this.detailsFromResponse(response),
        )
      } catch (error) {
        this.setStatus(error.message, 'error', this.detailsFromError(error))
      } finally {
        this.busy = false
        this.busyAction = ''
      }
    },

    async unblockIp(ip) {
      const normalizedIp = normalizeIpInput(ip)
      const validationMessage = getIpValidationMessage(normalizedIp)
      if (!this.effectiveAgentId || !normalizedIp) return
      if (validationMessage) {
        this.setStatus(validationMessage, 'error')
        return
      }
      this.busy = true
      this.busyAction = 'unblock'
      try {
        const response = await this.$store.dispatch('unblockThorondorIp', {
          agentId: this.effectiveAgentId,
          ip: normalizedIp,
        })
        const ok = response?.ok !== false
        this.setStatus(
          response?.message || 'Solicitud de desbloqueo enviada.',
          ok ? 'success' : 'error',
          this.detailsFromResponse(response),
        )
      } catch (error) {
        this.setStatus(error.message, 'error', this.detailsFromError(error))
      } finally {
        this.busy = false
        this.busyAction = ''
      }
    },

    useOrigin(ip) {
      this.draft.ip = ip
      this.draft.reason = 'Intentos fallidos recientes'
    },

    setStatus(message, tone, details = null) {
      this.statusMessage = message
      this.statusTone = tone
      this.statusDetails = details
    },

    detailsFromError(error) {
      return {
        detail: error?.detail || '',
        hints: Array.isArray(error?.hints) ? error.hints : [],
      }
    },

    detailsFromResponse(response) {
      return {
        detail: response?.detail || response?.stderr || response?.stdout || response?.error || '',
        hints: Array.isArray(response?.hints) ? response.hints : [],
      }
    },
  },
}
</script>

<style scoped>
.ip-block-layout {
  display: grid;
  grid-template-columns: minmax(280px, 5fr) minmax(0, 7fr);
  gap: 16px;
}

.ip-control-grid {
  margin-bottom: 0;
}

.status-line {
  border: 1px solid rgba(176, 184, 194, 0.24);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
  color: #dbe5ef;
  padding: 0.75rem 0.9rem;
  line-height: 1.55;
}

.status-line--error {
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(127, 29, 29, 0.16);
  color: #fecaca;
}

.status-line--success {
  border-color: rgba(74, 222, 128, 0.34);
  background: rgba(22, 101, 52, 0.16);
  color: #bbf7d0;
}

.field-feedback {
  color: #fca5a5;
  font-size: 0.78rem;
  line-height: 1.45;
}

.status-detail,
.diagnostic-hints {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.85rem;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  color: rgba(226, 235, 244, 0.9);
}

.status-detail p,
.diagnostic-hints p {
  margin: 0;
}

.status-detail ul,
.diagnostic-hints ul {
  margin: 0;
  padding-left: 1.1rem;
}

.diagnostic-card {
  margin-top: 16px;
}

.diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.diagnostic-grid article {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.diagnostic-grid label {
  color: #a9bacb;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.diagnostic-grid strong,
.diagnostic-grid span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.diagnostic-grid strong {
  color: #f8fafc;
}

.diagnostic-grid span {
  color: rgba(203, 213, 225, 0.84);
  line-height: 1.5;
}

@media (max-width: 1199px) {
  .ip-block-layout {
    grid-template-columns: 1fr;
  }

  .diagnostic-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .diagnostic-grid {
    grid-template-columns: 1fr;
  }
}
</style>
