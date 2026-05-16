<template>
  <ThorondorPageShell>
    <ThorondorSectionHeader
      kicker="Motor de reglas"
      :title="selectedAgent ? `Reglas de ${selectedAgent.displayName}` : 'Reglas del host'"
      copy="Configura las condiciones que convierten telemetria y eventos en alertas para el ordenador monitorizado seleccionado. Cada host mantiene su propio conjunto de reglas."
      badge="Rules"
      :badge-note="`${selectedRules.length} reglas configuradas para este host.`"
    />

    <section class="section-box">
      <section class="rules-layout">
        <article class="tool-card active-rules-card">
          <header class="card-head">
            <h5>Reglas activas</h5>
            <button
              class="btn btn-quiet"
              type="button"
              :disabled="!selectedAgentId"
              @click="resetHostRules"
            >
              Restaurar base
            </button>
          </header>
          <section class="table-wrap">
            <table class="table table-dark align-middle mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Umbral</th>
                  <th>Ambito</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rule in selectedRules" :key="rule.id">
                  <td>{{ rule.name }}</td>
                  <td>{{ humanizeRuleType(rule.type) }}</td>
                  <td>{{ formatRuleThreshold(rule) }}</td>
                  <td>{{ agentNameById(rule.scope) }}</td>
                  <td>
                    <span class="state-chip" :class="rule.enabled ? 'chip-success' : 'chip-muted'">
                      {{ rule.enabled ? 'Activa' : 'Pausada' }}
                    </span>
                  </td>
                  <td>
                    <nav class="table-actions" aria-label="Acciones de regla">
                      <button class="btn btn-quiet" @click="editRule(rule)">Editar</button>
                      <button class="btn btn-quiet" @click="toggleRule(rule)">
                        {{ rule.enabled ? 'Pausar' : 'Activar' }}
                      </button>
                      <button class="btn btn-quiet danger-text" @click="deleteRule(rule.id)">
                        Eliminar
                      </button>
                    </nav>
                  </td>
                </tr>
                <tr v-if="!selectedRules.length">
                  <td colspan="6" class="text-muted">
                    Este host aun no tiene reglas. Puedes restaurar la base recomendada o crear una
                    regla nueva.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>

        <aside class="rule-studio">
          <article class="tool-card rule-helper-card">
            <header class="card-head">
              <h5>Plantillas recomendadas</h5>
              <span class="mini-badge">Presets</span>
            </header>
            <nav class="preset-grid" aria-label="Plantillas de reglas">
              <button
                v-for="preset in rulePresets"
                :key="preset.type"
                class="preset-pill"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </button>
            </nav>
            <section class="helper-list">
              <article class="helper-item" v-for="note in helperNotes" :key="note.title">
                <strong>{{ note.title }}</strong>
                <p>{{ note.copy }}</p>
              </article>
            </section>
          </article>

          <article class="tool-card rule-preview-card">
            <header class="card-head">
              <h5>Resumen de la regla</h5>
              <span class="mini-badge">{{ ruleDraft.enabled ? 'Activa' : 'Pausada' }}</span>
            </header>
            <section class="rule-preview-grid">
              <article class="preview-line">
                <label>Nombre</label>
                <span>{{ ruleDraft.name || 'Sin nombre todavia' }}</span>
              </article>
              <article class="preview-line">
                <label>Tipo</label>
                <span>{{ humanizeRuleType(ruleDraft.type) }}</span>
              </article>
              <article class="preview-line">
                <label>Ambito</label>
                <span>{{
                  ruleDraft.scope ? agentNameById(ruleDraft.scope) : 'Selecciona un host'
                }}</span>
              </article>
              <article class="preview-line">
                <label>Condicion</label>
                <span>{{ formatRuleThreshold(ruleDraft) }}</span>
              </article>
              <article class="preview-line">
                <label>Ventana</label>
                <span>{{ ruleDraft.durationMinutes }} minutos</span>
              </article>
            </section>
          </article>

          <article class="tool-card rule-editor-card">
            <header class="card-head">
              <h5>{{ ruleDraft.id ? 'Editar regla' : 'Nueva regla' }}</h5>
              <span class="mini-badge">Editor</span>
            </header>
            <section class="control-grid compact-grid">
              <label class="control-field" for="rule-name">
                <span class="field-label">Nombre</span>
                <input id="rule-name" v-model="ruleDraft.name" class="form-control input-dark" />
              </label>
              <label class="control-field" for="rule-type">
                <span class="field-label">Tipo</span>
                <select id="rule-type" v-model="ruleDraft.type" class="form-select input-dark">
                  <option v-for="type in ruleTypeOptions" :key="type" :value="type">
                    {{ humanizeRuleType(type) }}
                  </option>
                </select>
              </label>
              <label class="control-field" for="rule-threshold">
                <span class="field-label">Umbral</span>
                <input
                  id="rule-threshold"
                  v-model.number="ruleDraft.threshold"
                  type="number"
                  min="1"
                  class="form-control input-dark"
                />
              </label>
              <label class="control-field" for="rule-duration">
                <span class="field-label">Minutos</span>
                <input
                  id="rule-duration"
                  v-model.number="ruleDraft.durationMinutes"
                  type="number"
                  min="1"
                  class="form-control input-dark"
                />
              </label>
              <label class="control-field full-span" for="rule-scope">
                <span class="field-label">Host</span>
                <select
                  id="rule-scope"
                  v-model="ruleDraft.scope"
                  class="form-select input-dark"
                  disabled
                >
                  <option value="">Selecciona un host</option>
                  <option v-if="selectedAgent" :value="selectedAgentId">
                    {{ selectedAgent.displayName }}
                  </option>
                </select>
              </label>
              <label class="control-field full-span" for="rule-description">
                <span class="field-label">Descripcion operativa</span>
                <textarea
                  id="rule-description"
                  v-model="ruleDraft.description"
                  rows="3"
                  class="form-control input-dark textarea-dark"
                ></textarea>
              </label>
              <section class="control-field full-span">
                <label class="toggle-line">
                  <input type="checkbox" v-model="ruleDraft.enabled" />
                  <span>Regla activada</span>
                </label>
              </section>
            </section>

            <nav class="inline-actions" aria-label="Acciones de editor de reglas">
              <button class="btn btn-main" :disabled="!selectedAgentId" @click="saveRule">
                Guardar regla
              </button>
              <button class="btn btn-subtle" @click="resetRuleDraft">Limpiar</button>
            </nav>
          </article>
        </aside>
      </section>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from '@/components/Thorondor/ThorondorPageShell.vue'
import ThorondorSectionHeader from '@/components/Thorondor/ThorondorSectionHeader.vue'
import thorondorBaseMixin from '@/features/thorondor/mixins/thorondorBaseMixin'

export default {
  name: 'ThorondorReglasMonitorizacionView',

  components: {
    ThorondorPageShell,
    ThorondorSectionHeader,
  },

  mixins: [thorondorBaseMixin],

  data() {
    return {
      ruleDraft: this.createEmptyRule(),
    }
  },

  watch: {
    selectedAgentId() {
      if (!this.ruleDraft.id) {
        this.ruleDraft.scope = this.selectedAgentId || ''
      }
    },
  },

  computed: {
    ruleTypeOptions() {
      return [
        'cpu',
        'ram',
        'disk',
        'failedLogins',
        'unknownLoginIp',
        'criticalFileChange',
        'heartbeat',
        'sudoUnauthorized',
        'newUser',
        'networkExposure',
      ]
    },

    rulePresets() {
      return [
        {
          label: 'CPU alta',
          name: 'CPU sostenida alta',
          type: 'cpu',
          threshold: 85,
          durationMinutes: 5,
          description: 'Alerta si la CPU permanece alta varios minutos.',
        },
        {
          label: 'RAM alta',
          name: 'RAM alta sostenida',
          type: 'ram',
          threshold: 90,
          durationMinutes: 3,
          description: 'Detecta presion de memoria sostenida.',
        },
        {
          label: 'Disco alto',
          name: 'Disco en nivel alto',
          type: 'disk',
          threshold: 90,
          durationMinutes: 10,
          description: 'Advierte de particiones cerca del limite.',
        },
        {
          label: 'Heartbeat perdido',
          name: 'Agente sin heartbeat reciente',
          type: 'heartbeat',
          threshold: 3,
          durationMinutes: 3,
          description: 'Marca agentes sin respuesta reciente.',
        },
        {
          label: 'Logins fallidos',
          name: 'Rafaga de logins fallidos',
          type: 'failedLogins',
          threshold: 5,
          durationMinutes: 10,
          description: 'Detecta rafagas de autenticacion fallida.',
        },
      ]
    },

    helperNotes() {
      return [
        {
          title: 'Empieza por reglas simples',
          copy: 'CPU, RAM, disco y heartbeat suelen darte la mejor base para validar que la monitorizacion funciona bien.',
        },
        {
          title: 'Evita umbrales demasiado bajos',
          copy: 'Si disparas alertas por ruido normal del sistema, el panel perdera valor operativo en muy poco tiempo.',
        },
        {
          title: 'Ajusta por host cuando haga falta',
          copy: 'Los servidores mas cargados o los equipos de laboratorio no deberian compartir siempre los mismos umbrales.',
        },
      ]
    },
  },

  methods: {
    createEmptyRule() {
      return {
        id: '',
        name: '',
        type: 'cpu',
        enabled: true,
        threshold: 80,
        durationMinutes: 5,
        scope: this.selectedAgentId || '',
        description: '',
      }
    },

    humanizeRuleType(type) {
      const map = {
        cpu: 'CPU sostenida alta',
        ram: 'RAM alta',
        disk: 'Disco alto',
        failedLogins: 'Fallos de login',
        unknownLoginIp: 'Login desde IP desconocida',
        criticalFileChange: 'Cambio en archivo critico',
        heartbeat: 'Heartbeat ausente',
        sudoUnauthorized: 'Sudo no autorizado',
        newUser: 'Nuevo usuario o grupo',
        networkExposure: 'Puerto sensible expuesto',
      }
      return map[type] || type
    },

    formatRuleThreshold(rule) {
      if (rule.type === 'heartbeat') {
        return `Sin heartbeat durante ${rule.threshold} min`
      }
      if (rule.type === 'failedLogins') {
        return `${rule.threshold} eventos en ${rule.durationMinutes} min`
      }
      if (['cpu', 'ram', 'disk'].includes(rule.type)) {
        return `${rule.threshold}% durante ${rule.durationMinutes} min`
      }
      return `Umbral ${rule.threshold}`
    },

    applyPreset(preset) {
      this.ruleDraft = {
        ...this.ruleDraft,
        name: preset.name || preset.label,
        type: preset.type,
        threshold: preset.threshold,
        durationMinutes: preset.durationMinutes,
        scope: this.selectedAgentId || '',
        description: preset.description,
      }
    },

    resetRuleDraft() {
      this.ruleDraft = this.createEmptyRule()
    },

    editRule(rule) {
      this.ruleDraft = { ...rule }
    },

    async saveRule() {
      if (!this.selectedAgentId) return

      const fallbackNames = {
        cpu: 'CPU sostenida alta',
        ram: 'RAM alta',
        disk: 'Disco alto',
        failedLogins: 'Exceso de logins fallidos',
        unknownLoginIp: 'Login desde IP desconocida',
        criticalFileChange: 'Cambio en archivo critico',
        heartbeat: 'Agente sin heartbeat',
        sudoUnauthorized: 'Sudo no autorizado',
        newUser: 'Nuevo usuario',
        networkExposure: 'Puerto sensible expuesto',
      }

      const rule = {
        ...this.ruleDraft,
        id: this.ruleDraft.id || `${this.selectedAgentId}-rule-${Date.now()}`,
        name: this.ruleDraft.name || fallbackNames[this.ruleDraft.type],
        scope: this.selectedAgentId,
        description: this.ruleDraft.description || 'Regla creada desde el panel de monitorizacion.',
      }
      await this.$store.dispatch('saveThorondorRule', rule)
      this.resetRuleDraft()
    },

    async deleteRule(ruleId) {
      await this.$store.dispatch('deleteThorondorRule', ruleId)
    },

    async toggleRule(rule) {
      await this.$store.dispatch('saveThorondorRule', {
        ...rule,
        enabled: !rule.enabled,
      })
    },

    async resetHostRules() {
      if (!this.selectedAgentId) return
      await this.$store.dispatch('resetThorondorRulesForAgent', this.selectedAgentId)
      this.resetRuleDraft()
    },
  },
}
</script>

<style scoped>
.rules-layout {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(320px, 5fr);
  gap: 16px;
  align-items: start;
}

.rule-studio {
  display: grid;
  gap: 1rem;
}

.active-rules-card {
  align-content: start;
}

.active-rules-card table {
  min-width: 860px;
}

.active-rules-card .table-wrap {
  align-self: start;
}

.rule-helper-card,
.rule-preview-card,
.rule-editor-card {
  background: linear-gradient(180deg, rgba(28, 33, 40, 0.98), rgba(16, 20, 26, 0.98));
  border: 1px solid rgba(176, 184, 194, 0.18);
}

.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.preset-pill {
  border: 1px solid rgba(176, 184, 194, 0.28);
  background: rgba(42, 47, 55, 0.54);
  color: #dce6ef;
  border-radius: 4px;
  padding: 0.55rem 0.9rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.preset-pill:hover {
  background: rgba(55, 61, 70, 0.88);
  border-color: rgba(169, 186, 203, 0.48);
}

.helper-list {
  display: grid;
  gap: 0.9rem;
}

.helper-item strong {
  display: block;
  color: #f4f8fb;
  margin-bottom: 0.3rem;
}

.helper-item p {
  margin: 0;
  color: rgba(218, 229, 240, 0.82);
}

.rule-preview-grid {
  display: grid;
  gap: 0.85rem;
}

.preview-line {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(176, 184, 194, 0.16);
}

.preview-line:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.preview-line label {
  color: rgba(198, 210, 222, 0.7);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-line span {
  color: #eef4f9;
  text-align: right;
}

@media (max-width: 1500px) {
  .rules-layout {
    grid-template-columns: 1fr;
  }

  .rule-studio {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rule-editor-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1199px) {
  .rules-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .rule-studio {
    grid-template-columns: 1fr;
  }

  .rule-editor-card {
    grid-column: auto;
  }
}
</style>
