<template>
  <ThorondorPageShell>
    <section class="section-box settings-hero">
      <div class="module-header">
        <span class="section-kicker">Ajustes</span>
        <h1 class="module-title">Cuenta y seguridad</h1>
        <p class="module-copy">
          Cuenta, seguridad, preferencias, notificaciones y persistencia del workspace.
        </p>
      </div>

      <div class="settings-user-summary">
        <img :src="thorondorLogo" alt="" />
        <div>
          <span>Usuario activo</span>
          <strong>{{ currentDisplayName }}</strong>
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
            <input id="display-name" v-model="settings.displayName" class="form-control input-dark" type="text" placeholder="Nombre visible" />
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
            <input id="alert-email" v-model="settings.alertEmail" class="form-control input-dark" type="email" placeholder="Email de alertas" />
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
          <label class="field-label" for="retention">Retención local</label>
          <output id="retention" class="form-control input-dark readonly-field">{{ retentionDays }} días</output>
        </div>
      </div>
    </section>

    <section id="alertas-email" class="section-box settings-panel">
      <div class="section-topline">
        <div class="module-header">
          <span class="section-kicker">Notificaciones</span>
          <h2 class="module-title">Alertas por email</h2>
          <p class="module-copy">
            Configuración SMTP pendiente. Sin envío de correo en esta fase.
          </p>
        </div>
        <div class="phase-badge-block">
          <span class="phase-badge">Pendiente</span>
          <small>SMTP pendiente de integración.</small>
        </div>
      </div>

      <div class="mail-grid">
        <label v-for="rule in mailRules" :key="rule.id" class="mail-rule mail-rule--disabled">
          <input v-model="rule.enabled" type="checkbox" disabled />
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
            Último intento cloud: {{ persistenceStatus.lastError }}
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
            <label>Retención</label>
            <span>{{ retentionDays }} días</span>
          </div>
          <div class="mini-stat">
            <label>Datos</label>
            <span>{{ persistenceShortLabel }}</span>
          </div>
        </div>
      </article>
    </section>

    <section v-if="isSessionAdmin" id="panel-admin" class="section-box settings-panel admin-panel">
      <div class="section-topline">
        <div class="module-header">
          <span class="section-kicker">Panel admin</span>
          <h2 class="module-title">Usuarios de la plataforma</h2>
          <p class="module-copy">
            Gestión de acceso cloud y revisión de cuentas registradas.
          </p>
        </div>
        <button class="btn btn-main" type="button" :disabled="adminLoading" @click="loadAdminUsers()">
          {{ adminLoading ? "Consultando..." : "Actualizar usuarios" }}
        </button>
      </div>

      <div class="admin-stat-grid">
        <div class="mini-stat">
          <label>Total</label>
          <span>{{ adminTotals.total || 0 }}</span>
        </div>
        <div class="mini-stat">
          <label>Admin</label>
          <span>{{ adminTotals.admins || 0 }}</span>
        </div>
        <div class="mini-stat">
          <label>Autorizados</label>
          <span>{{ adminTotals.authorized || 0 }}</span>
        </div>
        <div class="mini-stat">
          <label>Solo IDB</label>
          <span>{{ adminTotals.localOnly || 0 }}</span>
        </div>
      </div>

      <p v-if="adminFeedback" class="settings-feedback" :class="`settings-feedback--${adminFeedback.type}`">
        {{ adminFeedback.message }}
      </p>

      <div class="admin-users-table-wrap">
        <table class="admin-users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Proveedor</th>
              <th>Permisos</th>
              <th>Ultimo acceso</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in adminUsers" :key="user.id">
              <td>
                <strong>{{ user.displayName || "Usuario" }}</strong>
                <small>{{ user.email || user.id }}</small>
              </td>
              <td>{{ user.preferredProvider || "-" }}</td>
              <td>
                <div class="permission-pills">
                  <span :class="['permission-pill', user.usuarioAdmin ? 'is-admin' : '']">
                    {{ user.usuarioAdmin ? "Admin" : "No admin" }}
                  </span>
                  <span :class="['permission-pill', user.usuarioAutorizado ? 'is-authorized' : '']">
                    {{ user.usuarioAutorizado ? "BBDD API" : "Solo IDB" }}
                  </span>
                </div>
              </td>
              <td>{{ formatAdminDate(user.lastLoginAt) }}</td>
              <td>
                <button
                  class="btn btn-main btn-compact"
                  type="button"
                  :disabled="adminSavingUserId === user.id"
                  @click="toggleUserAuthorization(user)"
                >
                  {{ user.usuarioAutorizado ? "Quitar BBDD" : "Autorizar BBDD" }}
                </button>
              </td>
            </tr>
            <tr v-if="!adminUsers.length && !adminLoading">
              <td colspan="5" class="admin-empty-row">Sin usuarios cargados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </ThorondorPageShell>
</template>

<script>
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";
import {
  fetchThorondorAdminUsers,
  updateThorondorAdminUserAuthorization
} from "@/features/thorondor/services/thorondorAuth";
import thorondorLogo from "@/assets/images/brand/logo_thorondor.png";

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
        displayName: "",
        role: "Administrador",
        alertEmail: "",
        timezone: "Europe/Madrid",
        digestCadence: "Tiempo real",
        density: "Equilibrada"
      },
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
          copy: "Preparado para activarlo cuando exista autenticación remota.",
          enabled: false
        }
      ],
      mailRules: [
        {
          id: "critical-alerts",
          label: "Alertas críticas",
          copy: "CPU, memoria, disco, heartbeat caido y reglas marcadas como críticas.",
          enabled: true
        },
        {
          id: "auth-failures",
          label: "Intentos fallidos",
          copy: "Picos de autenticación fallida y orígenes repetidos por sistema.",
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
      ],
      adminUsers: [],
      adminTotals: {},
      adminLoading: false,
      adminLoaded: false,
      adminSavingUserId: "",
      adminFeedback: null
    };
  },

  computed: {
    currentSessionUser() {
      return this.thorondorState.session?.user || null;
    },

    currentDisplayName() {
      return this.currentSessionUser?.displayName || this.settings.displayName || "Operador local";
    },

    isSessionAdmin() {
      return Boolean(this.currentSessionUser?.usuarioAdmin || this.currentSessionUser?.usuario_admin);
    },

    canUseCloudPersistence() {
      return Boolean(
        this.currentSessionUser?.canUseCloudPersistence ||
          this.currentSessionUser?.usuarioAutorizado ||
          this.currentSessionUser?.usuario_autorizado
      );
    },

    settingsSections() {
      const sections = [
        { id: "cuenta-seguridad", label: "Cuenta y seguridad", copy: "Perfil, rol y acceso" },
        { id: "preferencias", label: "Preferencias", copy: "Vista, zona horaria y retencion" },
        { id: "alertas-email", label: "Alertas por email", copy: "Pendiente SMTP" },
        { id: "persistencia-datos", label: "Persistencia", copy: "Datos y uso" }
      ];

      if (this.isSessionAdmin) {
        sections.push({ id: "panel-admin", label: "Panel admin", copy: "Usuarios y permisos" });
      }

      return sections;
    },

    retentionDays() {
      return this.thorondorState.retentionDays || 30;
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
      if (this.isSessionAdmin) {
        return this.canUseCloudPersistence
          ? `${this.storageModeLabel} - admin autorizado`
          : `${this.storageModeLabel} - admin sin BBDD API`;
      }

      return this.canUseCloudPersistence
        ? `${this.storageModeLabel} - usuario autorizado`
        : `${this.storageModeLabel} - solo IDB`;
    },

    storageModeCopy() {
      return this.isCloudPersistence
        ? "Workspace sincronizado con base de datos para consultar histórico desde cualquier sesión."
        : "Workspace local, ideal para laboratorio y primeros despliegues.";
    },

    persistenceLabel() {
      if (this.persistenceStatus.syncStatus === "cloud-degraded") {
        return "Cloud en espera, caché local activa";
      }

      return this.isCloudPersistence ? "Base de datos cloud + caché local" : "IndexedDB local";
    },

    persistenceShortLabel() {
      return this.isCloudPersistence ? "Cloud" : "Local";
    },

    persistenceCopy() {
      if (this.persistenceStatus.syncStatus === "cloud-blocked") {
        return this.persistenceStatus.cloudAccessReason || "Esta cuenta no esta autorizada para usar BBDD por API.";
      }

      if (this.isCloudPersistence) {
        return `Workspace ${this.persistenceStatus.workspaceId || "default"} sincronizado con la API. IndexedDB queda como caché del navegador.`;
      }

      return "El modo local conserva agentes, logs, alertas y reglas en IndexedDB de este navegador.";
    }
  },

  watch: {
    isSessionAdmin: {
      immediate: true,
      handler(value) {
        if (value && !this.adminLoaded && !this.adminLoading) {
          this.loadAdminUsers({ silent: true });
        }
      }
    }
  },

  methods: {
    async loadAdminUsers(options = {}) {
      if (!this.isSessionAdmin || this.adminLoading) return;

      try {
        this.adminLoading = true;
        const payload = await fetchThorondorAdminUsers();
        this.adminUsers = Array.isArray(payload?.users) ? payload.users : [];
        this.adminTotals = payload?.totals || {};
        this.adminLoaded = true;
        if (!options.silent) {
          this.adminFeedback = { type: "success", message: "Usuarios actualizados." };
        }
      } catch (error) {
        this.adminFeedback = {
          type: "error",
          message: error.message || "No se pudieron consultar los usuarios."
        };
      } finally {
        this.adminLoading = false;
      }
    },

    async toggleUserAuthorization(user) {
      if (!user?.id || this.adminSavingUserId) return;

      const nextValue = !(user.usuarioAutorizado || user.usuario_autorizado);
      try {
        this.adminSavingUserId = user.id;
        const updated = await updateThorondorAdminUserAuthorization(user.id, nextValue);
        this.adminUsers = this.adminUsers.map((item) => (item.id === user.id ? updated : item));
        await this.loadAdminUsers({ silent: true });
        if (this.currentSessionUser?.id === user.id) {
          await this.$store.dispatch("refreshThorondorSession");
        }
        this.adminFeedback = {
          type: "success",
          message: nextValue
            ? "Usuario autorizado para BBDD por API."
            : "Usuario limitado a persistencia IndexedDB."
        };
      } catch (error) {
        this.adminFeedback = {
          type: "error",
          message: error.message || "No se pudo actualizar el permiso."
        };
      } finally {
        this.adminSavingUserId = "";
      }
    },

    formatAdminDate(value) {
      if (!value) return "-";

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;

      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
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
  border: 1px solid var(--thorondor-gold-line);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
}

.settings-user-summary img {
  width: 58px;
  height: 58px;
  border-radius: 4px;
  object-fit: contain;
  background: var(--thorondor-soft-background);
  box-shadow: inset 0 0 0 1px rgba(236, 194, 119, 0.16);
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  background: var(--thorondor-nested-background);
  color: #dce3eb;
  text-decoration: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 14px 30px rgba(0, 0, 0, 0.2);
}

.settings-tabs a:hover {
  border-color: rgba(213, 219, 226, 0.28);
  background: var(--thorondor-soft-background);
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
  background: var(--thorondor-soft-background);
}

.mail-rule--disabled {
  opacity: 0.72;
}

.mail-rule--disabled input {
  cursor: not-allowed;
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
  background: var(--thorondor-soft-background);
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
  background: var(--thorondor-soft-background);
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

.admin-panel {
  margin-top: 24px;
}

.admin-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.settings-feedback {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid rgba(176, 184, 194, 0.18);
  border-radius: 4px;
  color: #dce3eb;
  background: var(--thorondor-soft-background);
}

.settings-feedback--success {
  border-color: rgba(74, 222, 128, 0.36);
  color: #bbf7d0;
}

.settings-feedback--error {
  border-color: rgba(248, 113, 113, 0.38);
  color: #fecaca;
}

.admin-users-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.admin-users-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}

.admin-users-table th,
.admin-users-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(176, 184, 194, 0.12);
  text-align: left;
  vertical-align: middle;
}

.admin-users-table th {
  color: #9fb0c3;
  font-size: 0.75rem;
  letter-spacing: 0;
  text-transform: uppercase;
}

.admin-users-table td {
  color: #dce3eb;
}

.admin-users-table td strong,
.admin-users-table td small {
  display: block;
}

.admin-users-table td strong {
  color: #f8fafc;
}

.admin-users-table td small {
  color: #9fb0c3;
  margin-top: 3px;
}

.permission-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  color: #9fb0c3;
  background: var(--thorondor-soft-background);
  font-size: 0.78rem;
  font-weight: 800;
}

.permission-pill.is-admin {
  border-color: rgba(96, 165, 250, 0.36);
  color: #bfdbfe;
}

.permission-pill.is-authorized {
  border-color: rgba(74, 222, 128, 0.36);
  color: #bbf7d0;
}

.btn-compact {
  min-height: 36px;
  padding: 8px 12px;
  font-size: 0.78rem;
  white-space: nowrap;
}

.admin-empty-row {
  color: #9fb0c3 !important;
  text-align: center !important;
}

@media (max-width: 1180px) {
  .settings-hero,
  .settings-grid,
  .settings-tabs,
  .mail-grid,
  .admin-stat-grid {
    grid-template-columns: 1fr;
  }

  .settings-user-summary {
    justify-self: stretch;
  }
}
</style>
