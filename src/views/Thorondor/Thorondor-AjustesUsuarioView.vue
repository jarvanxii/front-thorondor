<template>
  <ThorondorPageShell>
    <section class="section-box settings-hero">
      <div class="module-header">
        <span class="section-kicker">Ajustes</span>
        <h1 class="module-title">Cuenta y seguridad</h1>
        <p class="module-copy">
          Centro de control del operador: cuenta, seguridad, preferencias, notificaciones y persistencia del workspace.
        </p>
      </div>

      <div class="settings-user-summary">
        <img :src="thorondorLogo" alt="" />
        <div>
          <span>Usuario activo</span>
          <strong>Adm 3</strong>
          <small>{{ accountSummary }}</small>
        </div>
      </div>
    </section>

    <nav class="settings-tabs" aria-label="Secciones de ajustes">
      <a v-for="item in settingsSections" :key="item.id" :href="`#${item.id}`">
        <strong>{{ item.label }}</strong>
        <span>{{ item.copy }}</span>
      </a>
    </nav>

    <section id="cuenta-seguridad" class="settings-grid">
      <article class="section-box settings-panel">
        <div class="card-head">
          <h2>Perfil de cuenta</h2>
          <span class="mini-badge">Cuenta</span>
        </div>

        <div class="control-grid compact-grid">
          <div class="control-field">
            <label class="field-label" for="display-name">Nombre visible</label>
            <input id="display-name" v-model="settings.displayName" class="form-control input-dark" type="text" />
          </div>
          <div class="control-field">
            <label class="field-label" for="user-role">Rol</label>
            <select id="user-role" v-model="settings.role" class="form-select input-dark">
              <option>Administrador</option>
              <option>Operador</option>
              <option>Solo lectura</option>
            </select>
          </div>
          <div class="control-field full-span">
            <label class="field-label" for="alert-email">Email de alertas</label>
            <input id="alert-email" v-model="settings.alertEmail" class="form-control input-dark" type="email" />
          </div>
        </div>
      </article>

      <article class="section-box settings-panel">
        <div class="card-head">
          <h2>Seguridad de acceso</h2>
          <span class="mini-badge">Security</span>
        </div>

        <div class="security-list">
          <label v-for="item in securityOptions" :key="item.id" class="security-row">
            <input v-model="item.enabled" type="checkbox" />
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.copy }}</small>
            </span>
          </label>
        </div>
      </article>
    </section>

    <section id="preferencias" class="section-box settings-panel">
      <div class="section-topline">
        <div class="module-header">
          <span class="section-kicker">Preferencias</span>
          <h2 class="module-title">Experiencia del panel</h2>
        </div>
        <div class="phase-badge-block">
          <span class="phase-badge">UI</span>
          <small>Ajustes locales del workspace.</small>
        </div>
      </div>

      <div class="control-grid">
        <div class="control-field">
          <label class="field-label" for="timezone">Zona horaria</label>
          <select id="timezone" v-model="settings.timezone" class="form-select input-dark">
            <option>Europe/Madrid</option>
            <option>UTC</option>
            <option>America/New_York</option>
          </select>
        </div>
        <div class="control-field">
          <label class="field-label" for="cadence">Resumen</label>
          <select id="cadence" v-model="settings.digestCadence" class="form-select input-dark">
            <option>Tiempo real</option>
            <option>Cada hora</option>
            <option>Diario</option>
          </select>
        </div>
        <div class="control-field">
          <label class="field-label" for="density">Densidad</label>
          <select id="density" v-model="settings.density" class="form-select input-dark">
            <option>Compacta</option>
            <option>Equilibrada</option>
            <option>Amplia</option>
          </select>
        </div>
        <div class="control-field">
          <label class="field-label" for="retention">Retencion local</label>
          <input id="retention" :value="`${retentionDays} dias`" class="form-control input-dark" type="text" disabled />
        </div>
      </div>
    </section>

    <section id="alertas-email" class="section-box settings-panel">
      <div class="section-topline">
        <div class="module-header">
          <span class="section-kicker">Notificaciones</span>
          <h2 class="module-title">Alertas por email</h2>
          <p class="module-copy">
            Preparado para activar envios cuando conectemos el proveedor de correo. La experiencia ya queda ordenada por
            severidad y tipo de evento.
          </p>
        </div>
        <div class="phase-badge-block">
          <span class="phase-badge">Mail</span>
          <small>{{ enabledMailRules }} reglas activadas</small>
        </div>
      </div>

      <div class="mail-grid">
        <label v-for="rule in mailRules" :key="rule.id" class="mail-rule">
          <input v-model="rule.enabled" type="checkbox" />
          <span>
            <strong>{{ rule.label }}</strong>
            <small>{{ rule.copy }}</small>
          </span>
        </label>
      </div>
    </section>

    <section id="persistencia-datos" class="settings-grid">
      <article class="section-box settings-panel">
        <div class="card-head">
          <h2>Persistencia y uso</h2>
          <span class="mini-badge">Datos</span>
        </div>

        <div class="billing-line">
          <div>
            <span>Modo actual</span>
            <strong>{{ storageModeLabel }}</strong>
            <small>{{ storageModeCopy }}</small>
          </div>
          <button class="btn btn-main" type="button" disabled>Sin acciones pendientes</button>
        </div>

        <div class="persistence-line">
          <span>Persistencia de datos</span>
          <strong>{{ persistenceLabel }}</strong>
          <small>{{ persistenceCopy }}</small>
          <small v-if="persistenceStatus.lastError" class="settings-warning">
            Ultimo intento cloud: {{ persistenceStatus.lastError }}
          </small>
        </div>
      </article>

      <article class="section-box settings-panel">
        <div class="card-head">
          <h2>Uso del workspace</h2>
          <span class="mini-badge">Resumen</span>
        </div>

        <div class="mini-grid">
          <div class="mini-stat">
            <label>Sistemas</label>
            <span>{{ dashboardCards.length }}</span>
          </div>
          <div class="mini-stat">
            <label>Alertas activas</label>
            <span>{{ activeAlerts.length }}</span>
          </div>
          <div class="mini-stat">
            <label>Retencion</label>
            <span>{{ retentionDays }} dias</span>
          </div>
          <div class="mini-stat">
            <label>Datos</label>
            <span>{{ persistenceShortLabel }}</span>
          </div>
        </div>
      </article>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";
import thorondorLogo from "@/assets/images/Thorondor-logo.png";

export default {
  name: "ThorondorAjustesUsuarioView",

  components: {
    ThorondorPageShell
  },

  mixins: [thorondorBaseMixin],

  data() {
    return {
      thorondorLogo,
      settings: {
        displayName: "Adm 3",
        role: "Administrador",
        alertEmail: "admin@thorondor.local",
        timezone: "Europe/Madrid",
        digestCadence: "Tiempo real",
        density: "Equilibrada"
      },
      settingsSections: [
        { id: "cuenta-seguridad", label: "Cuenta y seguridad", copy: "Perfil, rol y acceso" },
        { id: "preferencias", label: "Preferencias", copy: "Vista, zona horaria y retencion" },
        { id: "alertas-email", label: "Alertas por email", copy: "Avisos y resumenes" },
        { id: "persistencia-datos", label: "Persistencia", copy: "Datos y uso" }
      ],
      securityOptions: [
        {
          id: "confirm-actions",
          label: "Confirmar acciones sensibles",
          copy: "Pedir confirmacion antes de operaciones administrativas.",
          enabled: true
        },
        {
          id: "inactive-session",
          label: "Bloquear sesiones inactivas",
          copy: "Cerrar acceso local tras un periodo prolongado sin actividad.",
          enabled: true
        },
        {
          id: "two-factor",
          label: "Doble factor",
          copy: "Preparado para activarlo cuando exista autenticacion remota.",
          enabled: false
        }
      ],
      mailRules: [
        {
          id: "critical-alerts",
          label: "Alertas criticas",
          copy: "CPU, memoria, disco, heartbeat caido y reglas marcadas como criticas.",
          enabled: true
        },
        {
          id: "auth-failures",
          label: "Intentos fallidos",
          copy: "Picos de autenticacion fallida y origenes repetidos por sistema.",
          enabled: true
        },
        {
          id: "command-audit",
          label: "Comandos sensibles",
          copy: "Actividad de sudo, comandos administrativos y cambios relevantes.",
          enabled: false
        },
        {
          id: "daily-digest",
          label: "Resumen diario",
          copy: "Estado agregado de sistemas, alertas y eventos recientes.",
          enabled: false
        }
      ]
    };
  },

  computed: {
    retentionDays() {
      return this.thorondorState.retentionDays || 30;
    },

    enabledMailRules() {
      return this.mailRules.filter((rule) => rule.enabled).length;
    },

    persistenceStatus() {
      return this.thorondorState.persistence || {};
    },

    isCloudPersistence() {
      return this.persistenceStatus.effectiveMode === "cloud";
    },

    storageModeLabel() {
      return this.isCloudPersistence ? "Base de datos sincronizada" : "IndexedDB local";
    },

    accountSummary() {
      return `${this.storageModeLabel} - Administrador principal`;
    },

    storageModeCopy() {
      return this.isCloudPersistence
        ? "Workspace sincronizado con base de datos para consultar historico desde cualquier sesion."
        : "Workspace local, ideal para laboratorio y primeros despliegues.";
    },

    persistenceLabel() {
      if (this.persistenceStatus.syncStatus === "cloud-degraded") {
        return "Cloud en espera, cache local activa";
      }

      return this.isCloudPersistence ? "Base de datos cloud + cache local" : "IndexedDB local";
    },

    persistenceShortLabel() {
      return this.isCloudPersistence ? "Cloud" : "Local";
    },

    persistenceCopy() {
      if (this.isCloudPersistence) {
        return `Workspace ${this.persistenceStatus.workspaceId || "default"} sincronizado con la API. IndexedDB queda como cache del navegador.`;
      }

      return "El modo local conserva agentes, logs, alertas y reglas en IndexedDB de este navegador.";
    }
  }
};
</script>

<style scoped>
.settings-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 24px;
  align-items: center;
}

.settings-user-summary {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  justify-self: end;
  width: min(100%, 360px);
  padding: 14px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: rgba(16, 20, 26, 0.54);
}

.settings-user-summary img {
  width: 58px;
  height: 58px;
  border-radius: 4px;
  object-fit: cover;
}

.settings-user-summary div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.settings-user-summary span,
.settings-user-summary small {
  color: #9fb0c3;
}

.settings-user-summary strong {
  color: #f8fafc;
  font-size: 1.05rem;
}

.settings-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.settings-tabs a {
  display: grid;
  gap: 4px;
  min-height: 82px;
  align-content: center;
  padding: 14px 16px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background:
    linear-gradient(180deg, rgba(28, 33, 40, 0.94), rgba(16, 20, 26, 0.97));
  color: #dce3eb;
  text-decoration: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 14px 30px rgba(0, 0, 0, 0.2);
}

.settings-tabs a:hover {
  border-color: rgba(213, 219, 226, 0.28);
  background:
    linear-gradient(180deg, rgba(35, 40, 48, 0.98), rgba(20, 24, 30, 0.98));
  transform: translateY(-1px);
}

.settings-tabs strong {
  color: #f8fafc;
  font-size: 0.94rem;
}

.settings-tabs span {
  color: #95a7ba;
  font-size: 0.78rem;
  line-height: 1.4;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.95fr);
  gap: 24px;
}

.settings-panel {
  display: grid;
  gap: 18px;
  align-content: start;
}

.card-head h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.05rem;
  font-weight: 800;
}

.security-list {
  display: grid;
  gap: 10px;
}

.security-row,
.mail-rule {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px;
  border: 1px solid rgba(176, 184, 194, 0.15);
  border-radius: 4px;
  background: rgba(16, 20, 26, 0.52);
}

.security-row input,
.mail-rule input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: #aeb8c4;
}

.security-row span,
.mail-rule span {
  display: grid;
  gap: 5px;
}

.security-row strong,
.mail-rule strong {
  color: #f8fafc;
}

.security-row small,
.mail-rule small {
  color: #9fb0c3;
  line-height: 1.55;
}

.mail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.billing-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(176, 184, 194, 0.15);
  border-radius: 4px;
  background: rgba(16, 20, 26, 0.52);
}

.billing-line div {
  display: grid;
  gap: 4px;
}

.billing-line span,
.billing-line small {
  color: #9fb0c3;
}

.billing-line strong {
  color: #f8fafc;
  font-size: 1.05rem;
}

.persistence-line {
  display: grid;
  gap: 5px;
  padding: 16px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: rgba(16, 20, 26, 0.52);
}

.persistence-line span,
.persistence-line small {
  color: #9fb0c3;
}

.persistence-line strong {
  color: #edf2f7;
  font-size: 1rem;
}

.settings-warning {
  color: #fbbf24 !important;
}

@media (max-width: 1180px) {
  .settings-hero,
  .settings-grid,
  .settings-tabs,
  .mail-grid {
    grid-template-columns: 1fr;
  }

  .settings-user-summary {
    justify-self: stretch;
  }
}
</style>
