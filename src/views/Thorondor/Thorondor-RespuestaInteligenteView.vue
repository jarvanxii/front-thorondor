<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Automatización defensiva"
      title="Respuesta Inteligente"
      copy="Patrones configurables que detectan actividad anómala y pueden encolar acciones automáticas auditadas."
      badge="SIEM"
      :badge-note="`${enabledPolicies.length} políticas activas.`"
    />

    <section class="section-box smart-summary">
      <article class="mini-stat">
        <label>Políticas</label>
        <span>{{ policies.length }}</span>
      </article>
      <article class="mini-stat">
        <label>Automáticas</label>
        <span>{{ automaticPolicies.length }}</span>
      </article>
      <article class="mini-stat">
        <label>Coincidencias</label>
        <span>{{ detectedMatches.length }}</span>
      </article>
      <article class="mini-stat">
        <label>Host</label>
        <span>{{ selectedAgent ? selectedAgent.displayName : 'Sin selección' }}</span>
      </article>
    </section>

    <section class="section-box">
      <section class="smart-layout">
        <article class="tool-card">
          <header class="card-head">
            <h5>Políticas configuradas</h5>
            <nav class="table-actions" aria-label="Acciones de políticas">
              <button class="btn btn-quiet" type="button" @click="newPolicy">Nueva</button>
              <button class="btn btn-quiet" type="button" :disabled="polling" @click="pollAndEvaluate">
                {{ polling ? 'Evaluando...' : 'Evaluar ahora' }}
              </button>
            </nav>
          </header>

          <section class="table-wrap">
            <table class="table table-dark align-middle mb-0">
              <thead>
                <tr>
                  <th>Política</th>
                  <th>Patrón</th>
                  <th>Acción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="policy in policies" :key="policy.id">
                  <td>
                    <strong>{{ policy.name }}</strong>
                    <small>{{ policy.description || 'Sin descripción operativa.' }}</small>
                  </td>
                  <td>{{ triggerLabel(policy.triggerType) }}</td>
                  <td>{{ actionLabel(policy.actionType) }}</td>
                  <td>
                    <span class="state-chip" :class="policy.enabled ? 'chip-success' : 'chip-muted'">
                      {{ policy.enabled ? 'Activa' : 'Pausada' }}
                    </span>
                    <span class="state-chip" :class="policy.autoExecute ? 'chip-danger' : 'chip-warning'">
                      {{ policy.autoExecute ? 'Auto' : 'Manual' }}
                    </span>
                  </td>
                  <td>
                    <nav class="table-actions" aria-label="Acciones de política">
                      <button class="btn btn-quiet" type="button" @click="editPolicy(policy)">Editar</button>
                      <button class="btn btn-quiet" type="button" @click="togglePolicy(policy)">
                        {{ policy.enabled ? 'Pausar' : 'Activar' }}
                      </button>
                      <button class="btn btn-quiet danger-text" type="button" @click="deletePolicy(policy)">
                        Eliminar
                      </button>
                    </nav>
                  </td>
                </tr>
                <tr v-if="!policies.length">
                  <td colspan="5" class="text-muted">
                    No hay políticas de respuesta inteligente configuradas.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>

        <aside class="smart-studio">
          <article class="tool-card">
            <header class="card-head">
              <h5>{{ draft.id ? 'Editar política' : 'Nueva política' }}</h5>
              <span class="mini-badge">Control</span>
            </header>

            <section class="control-grid compact-grid">
              <label class="control-field full-span" for="smart-name">
                <span class="field-label">Nombre</span>
                <input id="smart-name" v-model.trim="draft.name" class="form-control input-dark" placeholder="Nombre de la política" />
              </label>

              <label class="control-field" for="smart-trigger">
                <span class="field-label">Patrón</span>
                <select id="smart-trigger" v-model="draft.triggerType" class="form-select input-dark" @change="applyTriggerDefaults">
                  <option v-for="type in triggerTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </label>

              <label class="control-field" for="smart-action">
                <span class="field-label">Acción</span>
                <select id="smart-action" v-model="draft.actionType" class="form-select input-dark">
                  <option v-for="action in actionTypes" :key="action.value" :value="action.value">
                    {{ action.label }}
                  </option>
                </select>
              </label>

              <label class="control-field" for="smart-threshold">
                <span class="field-label">Umbral</span>
                <input id="smart-threshold" v-model.number="draft.threshold" class="form-control input-dark" type="number" min="1" placeholder="Eventos" />
              </label>

              <label class="control-field" for="smart-window">
                <span class="field-label">Ventana</span>
                <input id="smart-window" v-model.number="draft.durationMinutes" class="form-control input-dark" type="number" min="1" placeholder="Minutos" />
              </label>

              <label class="control-field" for="smart-cooldown">
                <span class="field-label">Cooldown</span>
                <input id="smart-cooldown" v-model.number="draft.cooldownMinutes" class="form-control input-dark" type="number" min="1" placeholder="Minutos" />
              </label>


              <label class="control-field full-span" for="smart-description">
                <span class="field-label">Descripción</span>
                <textarea
                  id="smart-description"
                  v-model.trim="draft.description"
                  class="form-control input-dark textarea-dark"
                  rows="3"
                  placeholder="Qué patrón detecta y qué respuesta debe lanzar"
                ></textarea>
              </label>

              <section class="control-field full-span toggle-stack">
                <label class="toggle-line">
                  <input v-model="draft.enabled" type="checkbox" />
                  <span>Política activa</span>
                </label>
                <label class="toggle-line">
                  <input v-model="draft.autoExecute" type="checkbox" />
                  <span>Ejecutar acción automáticamente cuando haya coincidencia</span>
                </label>
              </section>
            </section>

            <p v-if="feedback.message" class="status-line" :class="feedback.type === 'error' ? 'status-line--error' : 'status-line--success'">
              {{ feedback.message }}
            </p>

            <nav class="inline-actions" aria-label="Guardar política">
              <button class="btn btn-main" type="button" :disabled="saving || !canSaveDraft" @click="savePolicy">
                {{ saving ? 'Guardando...' : 'Guardar política' }}
              </button>
              <button class="btn btn-subtle" type="button" @click="newPolicy">Limpiar</button>
            </nav>
          </article>
        </aside>
      </section>
    </section>

    <section class="section-box">
      <article class="tool-card">
        <header class="card-head">
          <h5>Coincidencias actuales</h5>
          <span class="mini-badge">{{ detectedMatches.length }}</span>
        </header>

        <section class="table-wrap">
          <table class="table table-dark table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Política</th>
                <th>Sujeto</th>
                <th>Eventos</th>
                <th>Acción</th>
                <th>Estado</th>
                <th>Ejecutar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="match in detectedMatches" :key="match.id">
                <td>
                  <strong>{{ match.policyName }}</strong>
                  <small>{{ triggerLabel(match.triggerType) }}</small>
                </td>
                <td>
                  <code class="inline-code">{{ match.subject }}</code>
                  <small v-if="match.sourceIp && match.sourceIp !== match.subject">IP {{ match.sourceIp }}</small>
                </td>
                <td>{{ match.count }} / {{ match.threshold }}</td>
                <td>{{ actionLabel(match.actionType) }}</td>
                <td>
                  <span class="state-chip" :class="match.inCooldown ? 'chip-warning' : 'chip-danger'">
                    {{ match.inCooldown ? 'Cooldown' : match.autoExecute ? 'Auto lista' : 'Manual' }}
                  </span>
                </td>
                <td>
                  <button
                    class="btn btn-quiet"
                    type="button"
                    :disabled="executingId === match.id || match.inCooldown"
                    @click="executeMatch(match)"
                  >
                    {{ executingId === match.id ? 'Ejecutando...' : 'Ejecutar' }}
                  </button>
                </td>
              </tr>
              <tr v-if="!detectedMatches.length">
                <td colspan="6" class="text-muted">
                  No hay patrones activos para el host seleccionado.
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
import {
  THORONDOR_SMART_ACTION_TYPES,
  THORONDOR_SMART_TRIGGER_TYPES,
  createThorondorSmartResponseDraft,
  evaluateThorondorSmartResponses,
  smartActionLabel,
  smartTriggerLabel,
} from '@/features/thorondor/services/thorondorSmartResponses'

export default {
  name: 'ThorondorRespuestaInteligenteView',

  components: {
    ThorondorPageShell,
    ThorondorSectionHeader,
  },

  mixins: [thorondorBaseMixin],

  data() {
    return {
      draft: createThorondorSmartResponseDraft(),
      saving: false,
      polling: false,
      executingId: '',
      feedback: {
        type: '',
        message: '',
      },
    }
  },

  computed: {
    triggerTypes() {
      return THORONDOR_SMART_TRIGGER_TYPES
    },

    actionTypes() {
      return THORONDOR_SMART_ACTION_TYPES
    },

    policies() {
      if (!this.selectedAgentId) return []
      return (this.thorondorState.smartResponses || []).filter(
        (policy) => policy.scope === this.selectedAgentId,
      )
    },

    enabledPolicies() {
      return this.policies.filter((policy) => policy.enabled)
    },

    automaticPolicies() {
      return this.enabledPolicies.filter((policy) => policy.autoExecute)
    },

    detectedMatches() {
      if (!this.selectedAgent) return []
      return evaluateThorondorSmartResponses({
        agent: this.selectedAgent,
        policies: this.policies,
        securityEvents: this.selectedSecurityEvents,
        logs: this.selectedAgentLogs,
        responseActions: this.$store.getters.thorondorResponseActions || [],
      }).sort((a, b) => b.count - a.count || a.policyName.localeCompare(b.policyName))
    },

    canSaveDraft() {
      return Boolean(
        this.selectedAgentId &&
          this.draft.name &&
          this.draft.threshold > 0 &&
          this.draft.durationMinutes > 0,
      )
    },
  },

  watch: {
    selectedAgentId: {
      immediate: true,
      handler(value) {
        if (!this.draft.id) {
          this.draft.scope = value || ''
        }
      },
    },
  },

  methods: {
    triggerLabel: smartTriggerLabel,
    actionLabel: smartActionLabel,

    newPolicy() {
      this.draft = createThorondorSmartResponseDraft(this.selectedAgentId || '')
      this.feedback = { type: '', message: '' }
    },

    editPolicy(policy) {
      this.draft = { ...policy }
      this.feedback = { type: '', message: '' }
    },

    applyTriggerDefaults() {
      if (this.draft.triggerType === 'failed_logins_by_user') {
        this.draft.threshold = this.draft.threshold || 5
        this.draft.durationMinutes = this.draft.durationMinutes || 10
        this.draft.actionType = this.draft.actionType || 'lock-user'
      }
      if (this.draft.triggerType === 'suspicious_requests_by_ip') {
        this.draft.threshold = this.draft.threshold || 20
        this.draft.durationMinutes = this.draft.durationMinutes || 5
        this.draft.actionType = this.draft.actionType || 'block-ip'
      }
    },

    async savePolicy() {
      if (!this.canSaveDraft) return
      this.saving = true
      try {
        const policy = {
          ...this.draft,
          id: this.draft.id || `smart-response-${Date.now()}`,
          scope: this.selectedAgentId,
          updatedAt: new Date().toISOString(),
        }
        await this.$store.dispatch('saveThorondorSmartResponse', policy)
        this.newPolicy()
        this.feedback = { type: 'success', message: 'Política guardada.' }
      } catch (error) {
        this.feedback = { type: 'error', message: error.message || 'No se pudo guardar la política.' }
      } finally {
        this.saving = false
      }
    },

    async deletePolicy(policy) {
      try {
        await this.$store.dispatch('deleteThorondorSmartResponse', policy.id)
        if (this.draft.id === policy.id) this.newPolicy()
        this.feedback = { type: 'success', message: 'Política eliminada.' }
      } catch (error) {
        this.feedback = { type: 'error', message: error.message || 'No se pudo eliminar la política.' }
      }
    },

    async togglePolicy(policy) {
      await this.$store.dispatch('saveThorondorSmartResponse', {
        ...policy,
        enabled: !policy.enabled,
      })
    },

    async pollAndEvaluate() {
      this.polling = true
      try {
        await this.pollNow()
        if (this.selectedAgentId) {
          await this.$store.dispatch('evaluateThorondorSmartResponsesForAgent', this.selectedAgentId)
        }
        this.feedback = { type: 'success', message: 'Evaluación completada.' }
      } catch (error) {
        this.feedback = { type: 'error', message: error.message || 'No se pudo evaluar.' }
      } finally {
        this.polling = false
      }
    },

    async executeMatch(match) {
      this.executingId = match.id
      try {
        await this.$store.dispatch('executeThorondorSmartResponse', match)
        this.feedback = { type: 'success', message: 'Acción inteligente encolada o registrada.' }
      } catch (error) {
        this.feedback = { type: 'error', message: error.message || 'No se pudo ejecutar la acción.' }
      } finally {
        this.executingId = ''
      }
    },
  },
}
</script>

<style scoped>
.smart-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.smart-layout {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(340px, 4fr);
  gap: 16px;
  align-items: start;
}

.smart-studio {
  display: grid;
  gap: 16px;
}

.table td strong,
.table td small {
  display: block;
}

.table td small {
  margin-top: 4px;
  color: #aeb8c5;
  line-height: 1.4;
}

.toggle-stack {
  display: grid;
  gap: 10px;
}

.status-line {
  margin: 12px 0 0;
  border: 1px solid rgba(176, 184, 194, 0.24);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
  color: #dbe5ef;
  padding: 0.75rem 0.9rem;
  line-height: 1.5;
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

@media (max-width: 1320px) {
  .smart-layout,
  .smart-summary {
    grid-template-columns: 1fr;
  }
}
</style>
