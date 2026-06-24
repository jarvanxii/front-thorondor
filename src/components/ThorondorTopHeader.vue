<template>
  <header class="thorondor-primary-header">
    <button class="sidebar-toggle" type="button" aria-label="Abrir navegación" @click="$emit('open-sidebar')">
      <span></span><span></span><span></span>
    </button>

    <RouterLink :to="{ name: 'thorondor-information' }" class="thorondor-brand" aria-label="Thorondor SIEM">
      <img class="brand-logo" :src="thorondorHeaderLogo" alt="Thorondor SIEM" />
    </RouterLink>

    <nav class="thorondor-top-nav" aria-label="Navegación principal">
      <RouterLink v-for="item in navItems" :key="item.routeName" :to="routeFor(item)" class="top-nav-link">
        {{ item.label }}
      </RouterLink>
    </nav>

    <nav class="thorondor-account-nav" aria-label="Ajustes de usuario">
      <span
        class="authorization-status"
        :class="{ 'is-authorized': isCurrentUserAuthorized }"
        :aria-label="authorizationStatusLabel"
        :title="authorizationStatusLabel"
        aria-live="polite"
      >
        <span class="authorization-status-dot" aria-hidden="true"></span>
        <span class="authorization-status-label">{{ authorizationStatusCompactLabel }}</span>
      </span>

      <button class="error-square" :class="{ 'is-empty': !thorondorErrors.length }" type="button" aria-label="Ver incidencias de Thorondor"
        aria-haspopup="menu" :aria-expanded="errorMenuOpen.toString()" @click.stop="toggleErrorMenu">
        <span></span>
        <strong>{{ thorondorErrors.length }}</strong>
      </button>

      <transition name="settings-menu">
        <section v-if="errorMenuOpen" class="settings-dropdown error-dropdown" role="menu">
          <header class="settings-dropdown-header">
            <span>Incidencias recientes</span>
            <strong>Errores de operación</strong>
            <small>Polling, persistencia, bloqueo de IPs y peticiones al agente.</small>
          </header>
          <article v-for="error in thorondorErrors" :key="error.id" class="error-menu-item">
            <strong>{{ error.message }}</strong>
            <small>{{ formatErrorTime(error.timestamp) }}</small>
          </article>
          <article v-if="!thorondorErrors.length" class="error-menu-item error-menu-item--empty">
            <strong>Sin incidencias activas</strong>
          </article>
        </section>
      </transition>

      <button class="settings-square" type="button" aria-label="Abrir ajustes de usuario" aria-haspopup="menu"
        :aria-expanded="settingsMenuOpen.toString()" @click.stop="toggleSettingsMenu">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path
            d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.05 2.05 0 0 1-2.9 2.9l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.08 1.65V21a2.05 2.05 0 0 1-4.1 0v-.08a1.8 1.8 0 0 0-1.08-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2.05 2.05 0 0 1-2.9-2.9l.05-.05A1.8 1.8 0 0 0 4.1 15a1.8 1.8 0 0 0-1.65-1.08H2.4a2.05 2.05 0 0 1 0-4.1h.05A1.8 1.8 0 0 0 4.1 8.74a1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.05 2.05 0 0 1 2.9-2.9l.05.05a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 9.7 2.57V2.5a2.05 2.05 0 0 1 4.1 0v.08a1.8 1.8 0 0 0 1.08 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.05 2.05 0 0 1 2.9 2.9l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.08h.08a2.05 2.05 0 0 1 0 4.1h-.08A1.8 1.8 0 0 0 19.4 15Z" />
        </svg>
      </button>

      <transition name="settings-menu">
        <section v-if="settingsMenuOpen" class="settings-dropdown settings-account-dropdown" role="menu">
          <header class="settings-profile-card">
            <span class="settings-profile-avatar" aria-hidden="true">{{ operatorInitials }}</span>
            <span class="settings-profile-main">
              <span class="settings-profile-kicker">Usuario activo</span>
              <strong>{{ operatorDisplayName }}</strong>
              <small>{{ operatorSessionLabel }}</small>
            </span>
            <span
              class="settings-profile-status"
              :class="{ 'is-authorized': isCurrentUserAuthorized }"
            >
              {{ isCurrentUserAuthorized ? 'Autorizado' : 'No autorizado' }}
            </span>
          </header>

          <section class="settings-menu-list" aria-label="Opciones de ajustes">
            <button v-for="item in visibleAccountMenuItems" :key="item.key" type="button" class="settings-menu-item"
              role="menuitem" @click="openSettingsModal(item.key)">
              <span class="settings-menu-accent" :class="`settings-menu-accent--${item.key}`" aria-hidden="true"></span>
              <span class="settings-menu-copy">
                <strong>{{ item.label }}</strong>
                <span>{{ item.copy }}</span>
              </span>
              <span class="settings-menu-arrow" aria-hidden="true"></span>
            </button>
          </section>

          <div class="settings-menu-footer settings-menu-footer--action">
            <button type="button" class="settings-logout-button" role="menuitem" :disabled="logoutLoading"
              @click="handleLogout">
              <span class="settings-logout-mark" aria-hidden="true"></span>
              <span>{{ logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión' }}</span>
            </button>
          </div>
        </section>
      </transition>
    </nav>

    <Teleport to="body">
      <transition name="settings-modal">
        <div v-if="activeSettingsModal" class="settings-modal-backdrop" role="dialog" aria-modal="true"
          :aria-labelledby="activeSettingsModalId" @click.self="closeSettingsModal">
          <section class="settings-modal" :class="{ 'settings-modal--admin': activeSettingsModal === 'admin' }">
            <header class="settings-modal-header">
              <div>
                <span>{{ activeSettingsModalConfig.kicker }}</span>
                <h2 :id="activeSettingsModalId">{{ activeSettingsModalConfig.label }}</h2>
                <p>{{ activeSettingsModalConfig.copy }}</p>
              </div>
              <button class="settings-modal-close" type="button"
                :aria-label="`Cerrar ${activeSettingsModalConfig.label}`" @click="closeSettingsModal">
                X
              </button>
            </header>

            <div class="settings-modal-body">
              <section v-if="activeSettingsModal === 'account'" class="settings-modal-grid">
                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Perfil local</span>
                    <strong>Identidad del operador</strong>
                    <small>Estos datos complementan la sesión OAuth/JWT activa y solo ajustan la vista local.</small>
                  </div>
                  <div class="settings-form-grid">
                    <label class="settings-field">
                      <span>Nombre visible</span>
                      <input v-model.trim="operatorSettings.displayName" type="text" placeholder="Nombre visible" />
                    </label>
                    <label class="settings-field settings-field--full">
                      <span>Email de alertas</span>
                      <input v-model.trim="operatorSettings.alertEmail" type="email" placeholder="Email de alertas" />
                    </label>
                  </div>
                </article>

                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Seguridad</span>
                    <strong>Confirmaciones y acceso</strong>
                    <small>Preparado para que las acciones sensibles no se ejecuten por accidente.</small>
                  </div>
                  <label v-for="item in securitySettingItems" :key="item.key" class="settings-switch-row">
                    <input v-model="operatorSettings.security[item.key]" type="checkbox" />
                    <span class="switch-control" aria-hidden="true"></span>
                    <span>
                      <strong>{{ item.label }}</strong>
                      <small>{{ item.copy }}</small>
                    </span>
                  </label>
                </article>

                <article class="settings-modal-panel settings-modal-panel--full key-agents-panel">
                  <div class="modal-panel-heading">
                    <span>Agentes</span>
                    <strong>Key agents predeterminada</strong>
                    <small>Se aplica solo a agentes nuevos. Cada agente ya registrado conserva su propia clave operativa.</small>
                  </div>
                  <div class="settings-status-strip">
                    <strong>Clave del perfil</strong>
                    <span>Usa una clave larga. Si quieres rotar un agente existente, hazlo desde la vista Agentes.</span>
                  </div>
                  <div class="settings-form-grid">
                    <label class="settings-field settings-field--full">
                      <span>Key agents para nuevos agentes</span>
                      <input
                        v-model.trim="keyAgentsDraft"
                        :type="keyAgentsVisible ? 'text' : 'password'"
                        autocomplete="off"
                        placeholder="Clave de 32 a 128 caracteres"
                      />
                    </label>
                  </div>
                  <div class="key-agents-actions">
                    <button class="settings-modal-secondary" type="button" @click="keyAgentsVisible = !keyAgentsVisible">
                      {{ keyAgentsVisible ? 'Ocultar' : 'Mostrar' }}
                    </button>
                    <button class="settings-modal-secondary" type="button" :disabled="keyAgentsSaving" @click="generateKeyAgentsDraft">
                      Generar nueva
                    </button>
                    <button class="settings-modal-primary" type="button" :disabled="keyAgentsSaving" @click="saveKeyAgents">
                      {{ keyAgentsSaving ? 'Guardando...' : 'Guardar key agents' }}
                    </button>
                  </div>
                  <p
                    v-if="keyAgentsFeedback"
                    class="settings-feedback key-agents-feedback"
                    :class="keyAgentsFeedback.type === 'error' ? 'is-error' : 'is-success'"
                  >
                    {{ keyAgentsFeedback.message }}
                  </p>
                </article>
              </section>

              <section v-else-if="activeSettingsModal === 'preferences'" class="settings-modal-panel">
                <div class="modal-panel-heading">
                  <span>Panel</span>
                  <strong>Preferencias de visualización</strong>
                  <small>Se aplican de forma local y se guardan en el navegador.</small>
                </div>
                <div class="settings-form-grid">
                  <label class="settings-field">
                    <span>Zona horaria</span>
                    <select v-model="operatorSettings.timezone">
                      <option>Europe/Madrid</option>
                      <option>UTC</option>
                      <option>America/New_York</option>
                    </select>
                  </label>
                  <label class="settings-field">
                    <span>Resumen operativo</span>
                    <select v-model="operatorSettings.digestCadence">
                      <option>Tiempo real</option>
                      <option>Cada hora</option>
                      <option>Diario</option>
                    </select>
                  </label>
                  <label class="settings-field">
                    <span>Densidad</span>
                    <select v-model="operatorSettings.density">
                      <option>Compacta</option>
                      <option>Equilibrada</option>
                      <option>Amplia</option>
                    </select>
                  </label>
                  <label class="settings-field">
                    <span>Retención local</span>
                    <output class="settings-readonly-value">{{ retentionDays }} días</output>
                  </label>
                </div>
              </section>

              <section v-else-if="activeSettingsModal === 'email'" class="settings-modal-panel">
                <div class="modal-panel-heading">
                  <span>SMTP activo</span>
                  <strong>Avisos de incidencias del SIEM</strong>
                  <small>Configura cuándo Thorondor enviará correos ante alertas generadas por la telemetría.</small>
                </div>
                <div class="settings-status-strip" :class="{ 'is-error': !isCurrentUserAuthorized }">
                  <strong>{{ emailAlertStatusTitle }}</strong>
                  <span>{{ emailAlertStatusCopy }}</span>
                </div>
                <div class="settings-form-grid">
                  <label class="settings-switch-row settings-field--full">
                    <input v-model="emailAlertSettings.enabled" type="checkbox" :disabled="!isCurrentUserAuthorized || emailAlertLoading" />
                    <span class="switch-control" aria-hidden="true"></span>
                    <span>
                      <strong>Enviar alertas por email</strong>
                      <small>Thorondor enviará un correo cuando la API registre una alerta de las severidades seleccionadas.</small>
                    </span>
                  </label>
                  <label class="settings-field settings-field--full">
                    <span>Email de destino</span>
                    <input
                      v-model.trim="emailAlertSettings.recipientEmail"
                      type="email"
                      :disabled="!isCurrentUserAuthorized || emailAlertLoading"
                      :placeholder="emailAlertSettings.effectiveRecipientEmail || currentSessionUser?.email || 'operador@thorondor.app'"
                    />
                  </label>
                </div>
                <div class="mail-rule-grid">
                  <label v-for="rule in emailSettingItems" :key="rule.key" class="settings-switch-row">
                    <input v-model="emailAlertSettings[rule.key]" type="checkbox" :disabled="!isCurrentUserAuthorized || emailAlertLoading" />
                    <span class="switch-control" aria-hidden="true"></span>
                    <span>
                      <strong>{{ rule.label }}</strong>
                      <small>{{ rule.copy }}</small>
                    </span>
                  </label>
                </div>
                <button
                  class="settings-modal-secondary settings-test-mail-button"
                  type="button"
                  :disabled="!isCurrentUserAuthorized || emailAlertTesting || emailAlertLoading"
                  @click="sendEmailAlertTest"
                >
                  {{ emailAlertTesting ? 'Enviando prueba...' : 'Enviar correo de prueba' }}
                </button>
              </section>

              <section v-else-if="activeSettingsModal === 'persistence'" class="settings-modal-grid">
                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Datos</span>
                    <strong>{{ persistenceModeTitle }}</strong>
                    <small>{{ persistenceModeDescription }}</small>
                  </div>
                  <div class="settings-persistence-grid" role="radiogroup" aria-label="Persistencia de Thorondor">
                    <label v-for="option in persistenceOptions" :key="option.value" class="settings-persistence-card"
                      :class="{ 'is-active': selectedPersistenceMode === option.value, 'is-disabled': option.disabled }">
                      <input type="radio" name="thorondor-header-persistence-mode" :value="option.value"
                        :checked="selectedPersistenceMode === option.value"
                        :disabled="option.disabled || persistenceChanging" @change="setPersistenceMode(option.value)" />
                      <span>
                        <strong>{{ option.label }}</strong>
                        <small>{{ option.copy }}</small>
                      </span>
                      <em>{{ option.status }}</em>
                    </label>
                  </div>
                </article>

                <article class="settings-modal-panel">
                  <div class="modal-panel-heading">
                    <span>Workspace</span>
                    <strong>Uso actual</strong>
                    <small>Resumen rápido de lo que tiene cargado la consola.</small>
                  </div>
                  <div class="settings-metric-grid">
                    <div>
                      <span>Agentes</span>
                      <strong>{{ dashboardCards.length }}</strong>
                    </div>
                    <div>
                      <span>Alertas activas</span>
                      <strong>{{ activeAlerts.length }}</strong>
                    </div>
                    <div>
                      <span>Retención</span>
                      <strong>{{ retentionDays }} días</strong>
                    </div>
                    <div>
                      <span>Workspace</span>
                      <strong>{{ persistenceStatus.workspaceId || 'default' }}</strong>
                    </div>
                  </div>
                </article>
              </section>

              <section v-else-if="activeSettingsModal === 'admin'" class="settings-modal-panel admin-settings-panel">
                <div class="modal-panel-heading">
                  <span>Panel admin</span>
                  <strong>Administración de Thorondor</strong>
                  <small>Usuarios, permisos, actividad de la aplicación y auditoría operativa desde la API.</small>
                </div>

                <div class="admin-toolbar">
                  <div>
                    <strong>{{ adminUsers.length || adminTotals.total || 0 }} usuarios</strong>
                    <span>{{ adminLoading || adminLogsLoading ? 'Consultando API...' : 'Permisos, actividad y trazabilidad' }}</span>
                  </div>
                  <div class="admin-toolbar-actions">
                    <button class="settings-modal-secondary" type="button" :disabled="adminLoading" @click="loadAdminUsers()">
                      {{ adminLoading ? 'Usuarios...' : 'Actualizar usuarios' }}
                    </button>
                    <button class="settings-modal-primary" type="button" :disabled="adminLogsLoading" @click="loadAdminLogs()">
                      {{ adminLogsLoading ? 'Logs...' : 'Actualizar logs' }}
                    </button>
                  </div>
                </div>

                <div class="admin-stat-grid">
                  <div v-for="card in adminSummaryCards" :key="card.key">
                    <span>{{ card.label }}</span>
                    <strong>{{ card.value }}</strong>
                    <small>{{ card.copy }}</small>
                  </div>
                </div>

                <p v-if="adminFeedback" class="settings-feedback" :class="adminFeedback.type === 'error' ? 'is-error' : 'is-success'">
                  {{ adminFeedback.message }}
                </p>

                <div class="admin-tabs" role="tablist" aria-label="Secciones del panel admin">
                  <button
                    v-for="tab in adminTabs"
                    :key="tab.key"
                    type="button"
                    role="tab"
                    :aria-selected="adminActiveTab === tab.key"
                    :class="{ 'is-active': adminActiveTab === tab.key }"
                    @click="adminActiveTab = tab.key"
                  >
                    <strong>{{ tab.label }}</strong>
                    <span>{{ tab.copy }}</span>
                  </button>
                </div>

                <section v-if="adminActiveTab === 'users'" class="admin-tab-panel">
                  <div class="admin-filter-bar">
                    <label class="settings-field">
                      <span>Buscar usuario</span>
                      <input v-model.trim="adminUserQuery" type="search" placeholder="Email, nombre o proveedor" />
                    </label>
                    <label class="settings-field">
                      <span>Estado</span>
                      <select v-model="adminUserStatusFilter">
                        <option value="">Todos</option>
                        <option value="admin">Administradores</option>
                        <option value="authorized">Autorizados</option>
                        <option value="pending">Pendientes</option>
                        <option value="disabled">Deshabilitados</option>
                      </select>
                    </label>
                  </div>

                  <div class="admin-users-list" role="list" aria-label="Usuarios de la plataforma">
                    <article v-for="user in filteredAdminUsers" :key="user.id" class="admin-user-row" role="listitem">
                      <span class="admin-user-avatar" aria-hidden="true">{{ adminUserInitials(user) }}</span>
                      <span class="admin-user-main">
                        <strong>{{ user.displayName || user.display_name || user.email || user.id }}</strong>
                        <small>{{ user.email || user.preferredProvider || user.id }}</small>
                      </span>
                      <span class="admin-user-pills">
                        <em :class="{ 'is-active': user.enabled !== false }">
                          {{ user.enabled === false ? 'Deshabilitado' : 'Activo' }}
                        </em>
                        <em :class="{ 'is-active': user.usuarioAdmin || user.usuario_admin }">
                          {{ user.usuarioAdmin || user.usuario_admin ? 'Admin' : 'No admin' }}
                        </em>
                        <em :class="{ 'is-active': user.usuarioAutorizado || user.usuario_autorizado }">
                          {{ user.usuarioAutorizado || user.usuario_autorizado ? 'BBDD API' : 'Solo IDB' }}
                        </em>
                      </span>
                      <span class="admin-user-meta">
                        <small>Acceso</small>
                        <strong>{{ formatAdminDate(user.lastLoginAt || user.last_login_at) }}</strong>
                      </span>
                      <span class="admin-user-meta">
                        <small>Proveedor</small>
                        <strong>{{ adminProviderLabel(user) }}</strong>
                      </span>
                      <span class="admin-user-actions">
                        <button
                          class="settings-admin-action"
                          :class="{ 'settings-admin-action--danger': user.enabled !== false }"
                          type="button"
                          :disabled="adminSavingUserId === user.id || (currentSessionUser?.id === user.id && user.enabled !== false)"
                          :title="currentSessionUser?.id === user.id && user.enabled !== false ? 'No puedes deshabilitar tu propia cuenta.' : ''"
                          @click="toggleAdminUserField(user, 'enabled', user.enabled === false)"
                        >
                          {{ user.enabled === false ? 'Activar' : 'Desactivar' }}
                        </button>
                        <button
                          class="settings-admin-action"
                          type="button"
                          :disabled="adminSavingUserId === user.id || (currentSessionUser?.id === user.id && (user.usuarioAdmin || user.usuario_admin))"
                          :title="currentSessionUser?.id === user.id && (user.usuarioAdmin || user.usuario_admin) ? 'No puedes retirarte tu propio rol admin.' : ''"
                          @click="toggleAdminUserField(user, 'usuarioAdmin', !(user.usuarioAdmin || user.usuario_admin))"
                        >
                          {{ user.usuarioAdmin || user.usuario_admin ? 'Quitar admin' : 'Hacer admin' }}
                        </button>
                        <button
                          class="settings-admin-action settings-admin-action--primary"
                          type="button"
                          :disabled="adminSavingUserId === user.id"
                          @click="toggleUserAuthorization(user)"
                        >
                          {{ user.usuarioAutorizado || user.usuario_autorizado ? 'Quitar BBDD' : 'Autorizar BBDD' }}
                        </button>
                      </span>
                    </article>

                    <p v-if="!filteredAdminUsers.length && !adminLoading" class="admin-empty-state">
                      No hay usuarios que coincidan con el filtro actual.
                    </p>
                  </div>
                </section>

                <section v-else class="admin-tab-panel">
                  <div class="admin-filter-bar admin-filter-bar--logs">
                    <label class="settings-field">
                      <span>Usuario</span>
                      <select v-model="adminLogFilters.userId">
                        <option value="">Todos</option>
                        <option v-for="user in adminUsers" :key="user.id" :value="user.id">
                          {{ user.displayName || user.email || user.id }}
                        </option>
                      </select>
                    </label>
                    <label class="settings-field">
                      <span>Categoría</span>
                      <select v-model="adminLogFilters.category">
                        <option value="">Todas</option>
                        <option value="auth">Auth</option>
                        <option value="admin">Admin</option>
                        <option value="security">Security</option>
                        <option value="system">System</option>
                      </select>
                    </label>
                    <label class="settings-field">
                      <span>Severidad</span>
                      <select v-model="adminLogFilters.severity">
                        <option value="">Todas</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                    </label>
                    <label class="settings-field admin-log-search-field">
                      <span>Texto</span>
                      <input v-model.trim="adminLogFilters.query" type="search" placeholder="Acción, IP, email o mensaje" />
                    </label>
                    <button class="settings-modal-primary" type="button" :disabled="adminLogsLoading" @click="loadAdminLogs()">
                      Filtrar logs
                    </button>
                  </div>

                  <div class="admin-logs-list" role="table" aria-label="Logs de aplicación">
                    <article class="admin-log-row admin-log-row--head" role="row">
                      <span>Fecha</span>
                      <span>Usuario</span>
                      <span>Acción</span>
                      <span>Estado</span>
                      <span>IP</span>
                    </article>
                    <article v-for="log in adminLogs" :key="log.id" class="admin-log-row" role="row">
                      <span>
                        <strong>{{ formatAdminDate(log.createdAt || log.created_at) }}</strong>
                        <small>{{ formatAdminCategory(log.category) }}</small>
                      </span>
                      <span>
                        <strong>{{ log.displayName || log.display_name || log.userEmail || log.user_email || 'Sistema' }}</strong>
                        <small>{{ log.userEmail || log.user_email || log.userId || log.user_id || '-' }}</small>
                      </span>
                      <span>
                        <strong>{{ log.action }}</strong>
                        <small>{{ log.message || '-' }}</small>
                      </span>
                      <span>
                        <em class="admin-log-severity" :class="`is-${log.severity || 'info'}`">{{ formatAdminSeverity(log.severity) }}</em>
                        <small>{{ log.status || 'ok' }}</small>
                      </span>
                      <span>
                        <strong>{{ log.ipAddress || log.ip_address || '-' }}</strong>
                        <small>{{ formatUserAgent(log.userAgent || log.user_agent) }}</small>
                      </span>
                    </article>

                    <p v-if="!adminLogs.length && !adminLogsLoading" class="admin-empty-state">
                      Sin logs para el filtro actual.
                    </p>
                  </div>
                </section>
              </section>
            </div>

            <footer class="settings-modal-footer">
              <span v-if="settingsFeedback"
                :class="['settings-feedback', settingsFeedbackTone === 'error' ? 'is-error' : 'is-success']">
                {{ settingsFeedback }}
              </span>
              <div>
                <button type="button" class="settings-modal-secondary" @click="closeSettingsModal">Cerrar</button>
                <button v-if="activeSettingsModal !== 'admin'" type="button" class="settings-modal-primary" :disabled="settingsActionDisabled"
                  @click="saveOperatorSettings">
                  {{ settingsActionLabel }}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </transition>
    </Teleport>
  </header>
</template>

<script>
import thorondorHeaderLogo from '@/assets/images/brand/thorondor_header.png'
import { THORONDOR_TOP_NAV_ITEMS } from '@/features/thorondor/data/thorondorNavigation'
import {
  fetchThorondorAdminLogs,
  fetchThorondorAdminUsers,
  updateThorondorAdminUser,
} from '@/features/thorondor/services/thorondorAuth'
import {
  fetchThorondorEmailAlertSettings,
  sendThorondorEmailAlertTest,
  updateThorondorEmailAlertSettings,
} from '@/features/thorondor/services/thorondorCentralApi'

const THORONDOR_OPERATOR_SETTINGS_KEY = 'thorondor.operator.settings'

function buildDefaultOperatorSettings() {
  return {
    displayName: '',
    alertEmail: '',
    timezone: 'Europe/Madrid',
    digestCadence: 'Tiempo real',
    density: 'Equilibrada',
    security: {
      confirmSensitiveActions: true,
      lockInactiveSession: true,
      twoFactorPrepared: false,
    },
    emailRules: {
      criticalAlerts: true,
      authFailures: true,
      commandAudit: false,
      dailyDigest: false,
    },
  }
}

function buildDefaultEmailAlertSettings() {
  return {
    enabled: false,
    recipientEmail: '',
    effectiveRecipientEmail: '',
    notifyCritical: true,
    notifyDanger: true,
    notifyWarning: false,
  }
}

function generateKeyAgentsValue(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function mergeOperatorSettings(value = {}) {
  const defaults = buildDefaultOperatorSettings()
  const displayName = value.displayName === 'Adm 3' ? '' : value.displayName
  const alertEmail = value.alertEmail === 'admin@thorondor.local' ? '' : value.alertEmail

  return {
    ...defaults,
    ...value,
    displayName: displayName ?? defaults.displayName,
    alertEmail: alertEmail ?? defaults.alertEmail,
    security: {
      ...defaults.security,
      ...value.security,
    },
    emailRules: {
      ...defaults.emailRules,
      ...value.emailRules,
    },
  }
}

export default {
  name: 'ThorondorTopHeader',

  emits: ['open-sidebar'],

  data() {
    return {
      thorondorHeaderLogo,
      navItems: THORONDOR_TOP_NAV_ITEMS,
      settingsMenuOpen: false,
      errorMenuOpen: false,
      activeSettingsModal: null,
      settingsSaving: false,
      settingsFeedback: '',
      settingsFeedbackTone: 'success',
      logoutLoading: false,
      persistenceChanging: false,
      operatorSettings: buildDefaultOperatorSettings(),
      keyAgentsDraft: '',
      keyAgentsVisible: false,
      keyAgentsSaving: false,
      keyAgentsFeedback: null,
      emailAlertSettings: buildDefaultEmailAlertSettings(),
      emailAlertLoading: false,
      emailAlertTesting: false,
      emailAlertLoaded: false,
      accountMenuItems: [
        {
          key: 'account',
          kicker: 'Cuenta',
          label: 'Cuenta y seguridad',
          copy: 'Perfil, acceso y confirmaciones',
        },
        {
          key: 'preferences',
          kicker: 'Experiencia',
          label: 'Preferencias',
          copy: 'Zona horaria, densidad y retención',
        },
        {
          key: 'email',
          kicker: 'Notificaciones',
          label: 'Alertas por email',
          copy: 'Avisos reales de incidencias',
        },
        {
          key: 'persistence',
          kicker: 'Workspace',
          label: 'Persistencia y uso',
          copy: 'Datos, retención y sincronización',
        },
        {
          key: 'admin',
          kicker: 'Admin',
          label: 'Panel admin',
          copy: 'Usuarios, permisos y logs',
          adminOnly: true,
        },
      ],
      securitySettingItems: [
        {
          key: 'confirmSensitiveActions',
          label: 'Confirmar acciones sensibles',
          copy: 'Pedir confirmación antes de bloqueos, desbloqueos y comandos administrativos.',
        },
        {
          key: 'lockInactiveSession',
          label: 'Bloquear sesiones inactivas',
          copy: 'Cerrar la vista local tras inactividad aunque la sesión OAuth siga activa.',
        },
        {
          key: 'twoFactorPrepared',
          label: 'Doble factor preparado',
          copy: 'Reserva la opción para exigir 2FA desde el proveedor OAuth cuando se active la política.',
        },
      ],
      emailSettingItems: [
        {
          key: 'notifyCritical',
          label: 'Críticas',
          copy: 'Disco casi lleno y cualquier incidencia marcada como crítica.',
        },
        {
          key: 'notifyDanger',
          label: 'Altas',
          copy: 'CPU, RAM, servicios caídos y fuerza bruta probable.',
        },
        {
          key: 'notifyWarning',
          label: 'Medias',
          copy: 'Eventos relevantes que conviene revisar sin urgencia crítica.',
        },
      ],
      adminUsers: [],
      adminTotals: {},
      adminLoading: false,
      adminLoaded: false,
      adminSavingUserId: '',
      adminFeedback: null,
      adminActiveTab: 'users',
      adminTabs: [
        {
          key: 'users',
          label: 'Usuarios',
          copy: 'Permisos y autorización',
        },
        {
          key: 'logs',
          label: 'Logs',
          copy: 'Actividad de aplicación',
        },
      ],
      adminUserQuery: '',
      adminUserStatusFilter: '',
      adminLogs: [],
      adminLogTotals: {},
      adminLogsLoading: false,
      adminLogsLoaded: false,
      adminLogFilters: {
        userId: '',
        category: '',
        severity: '',
        query: '',
        limit: 250,
      },
    }
  },

  computed: {
    thorondorState() {
      return this.$store.state.thorondor || {}
    },

    selectedAgentId() {
      return this.thorondorState.selectedAgentId
    },

    thorondorErrors() {
      return (this.thorondorState.errors || []).slice(0, 6)
    },

    dashboardCards() {
      return this.$store.getters.thorondorDashboardCards || []
    },

    activeAlerts() {
      return (this.thorondorState.alerts || []).filter((alert) => alert.status === 'active')
    },

    currentSessionUser() {
      return this.thorondorState.session?.user || null
    },

    currentUserKeyAgents() {
      return String(this.currentSessionUser?.keyAgents || this.currentSessionUser?.key_agents || '').trim()
    },

    isCurrentUserAuthorized() {
      return Boolean(
        this.currentSessionUser?.canUseCloudPersistence ||
          this.currentSessionUser?.usuarioAutorizado ||
          this.currentSessionUser?.usuario_autorizado,
      )
    },

    isCurrentUserAdmin() {
      return Boolean(
        this.currentSessionUser?.usuarioAdmin ||
          this.currentSessionUser?.usuario_admin ||
          this.currentSessionUser?.isAdmin ||
          this.currentSessionUser?.is_admin ||
          this.currentSessionUser?.admin,
      )
    },

    authorizationStatusLabel() {
      return this.isCurrentUserAuthorized ? 'usuario autorizado' : 'usuario no autorizado'
    },

    authorizationStatusCompactLabel() {
      return this.isCurrentUserAuthorized ? 'Autorizado' : 'Sin autorizar'
    },

    retentionDays() {
      return this.thorondorState.retentionDays || 30
    },

    persistenceStatus() {
      return this.thorondorState.persistence || {}
    },

    selectedPersistenceMode() {
      return this.persistenceStatus.requestedMode || this.persistenceStatus.effectiveMode || 'local'
    },

    persistenceEffectiveMode() {
      return this.persistenceStatus.effectiveMode || 'local'
    },

    canUseDatabasePersistence() {
      return Boolean(this.persistenceStatus.cloudAllowed && this.isCurrentUserAuthorized)
    },

    visibleAccountMenuItems() {
      return this.accountMenuItems.filter((item) => !item.adminOnly || this.isCurrentUserAdmin)
    },

    activeSettingsModalConfig() {
      return (
        this.visibleAccountMenuItems.find((item) => item.key === this.activeSettingsModal) ||
        this.visibleAccountMenuItems[0] ||
        this.accountMenuItems[0]
      )
    },

    activeSettingsModalId() {
      return `thorondor-settings-${this.activeSettingsModal || 'panel'}`
    },

    operatorDisplayName() {
      const localDisplayName = String(this.operatorSettings.displayName || '').trim()
      if (localDisplayName) {
        return localDisplayName
      }

      const sessionDisplayName = String(
        this.currentSessionUser?.displayName ||
          this.currentSessionUser?.display_name ||
          this.currentSessionUser?.name ||
          this.currentSessionUser?.username ||
          this.currentSessionUser?.email?.split?.('@')?.[0] ||
          '',
      ).trim()

      return sessionDisplayName || 'Usuario local'
    },

    operatorInitials() {
      const words = this.operatorDisplayName
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean)

      return words
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase() || 'TH'
    },

    operatorSessionLabel() {
      return this.currentSessionUser?.email || 'Sesión activa'
    },

    persistenceModeTitle() {
      if (!this.canUseDatabasePersistence) {
        return 'IndexedDB local obligatorio'
      }

      if (this.selectedPersistenceMode === 'cloud' && !this.persistenceStatus.cloudConfigured) {
        return 'API no configurada'
      }

      return this.persistenceEffectiveMode === 'cloud'
        ? 'API del back activa'
        : 'IndexedDB local activo'
    },

    persistenceModeDescription() {
      if (!this.canUseDatabasePersistence) {
        return this.persistenceStatus.cloudAccessReason || 'Usuario no autorizado para usar BBDD por API.'
      }

      if (this.selectedPersistenceMode === 'cloud' && !this.persistenceStatus.cloudConfigured) {
        return 'Falta configurar la URL de la API. La consola mantiene IndexedDB para no perder datos.'
      }

      if (this.persistenceEffectiveMode === 'cloud') {
        return 'Los cambios se guardan en IndexedDB como caché y se sincronizan con la API del back.'
      }

      return 'Agentes, reglas, eventos y preferencias se guardan solo en este navegador mediante IndexedDB.'
    },

    persistenceOptions() {
      const cloudConfigured = Boolean(this.persistenceStatus.cloudConfigured)
      const effectiveMode = this.persistenceEffectiveMode
      const cloudDisabledReason = !this.isCurrentUserAuthorized
        ? 'Usuario no autorizado'
        : !this.persistenceStatus.cloudAllowed
          ? 'Sin permiso'
          : !cloudConfigured
            ? 'Sin API'
            : ''

      return [
        {
          value: 'local',
          label: 'IndexedDB local',
          copy: 'Datos en este navegador. Útil para pruebas, laboratorio y uso sin servidor central.',
          status: effectiveMode === 'local' ? 'Activo' : 'Disponible',
          disabled: false,
        },
        {
          value: 'cloud',
          label: 'API del back',
          copy: cloudDisabledReason
            ? 'Requiere usuario autorizado por un admin.'
            : 'Persistencia centralizada en la API, con IndexedDB como caché local.',
          status: cloudDisabledReason || (effectiveMode === 'cloud' ? 'Activo' : 'Disponible'),
          disabled: Boolean(cloudDisabledReason),
        },
      ]
    },

    emailAlertStatusTitle() {
      if (!this.isCurrentUserAuthorized) {
        return 'Usuario no autorizado'
      }
      if (this.emailAlertLoading) {
        return 'Consultando configuración'
      }
      return this.emailAlertSettings.enabled ? 'Avisos por email activos' : 'Avisos por email desactivados'
    },

    emailAlertStatusCopy() {
      if (!this.isCurrentUserAuthorized) {
        return 'Solo usuarios autorizados pueden recibir avisos de incidencias por SMTP.'
      }
      if (this.emailAlertLoading) {
        return 'Thorondor está leyendo tus preferencias desde la API.'
      }
      const email = this.emailAlertSettings.recipientEmail || this.emailAlertSettings.effectiveRecipientEmail
      return email
        ? `Destino: ${email}. Se enviará un correo por cada alerta nueva que coincida con tus filtros.`
        : 'Usará el email verificado de tu cuenta si no defines un destino alternativo.'
    },

    adminSummaryCards() {
      const usersTotal = Number(this.adminTotals.total || this.adminUsers.length || 0)
      const admins = Number(this.adminTotals.admins || 0)
      const authorized = Number(this.adminTotals.authorized || 0)
      const pending = Math.max(usersTotal - authorized, 0)
      const logTotal = Number(this.adminLogTotals.total || 0)
      const log24h = Number(this.adminLogTotals.last24h || 0)
      const warnings = Number(this.adminLogTotals.warnings || 0)
      const errors = Number(this.adminLogTotals.errors || 0)

      return [
        {
          key: 'users',
          label: 'Usuarios',
          value: usersTotal,
          copy: `${admins} admin`,
        },
        {
          key: 'authorized',
          label: 'Autorizados',
          value: authorized,
          copy: `${pending} pendientes`,
        },
        {
          key: 'logs24h',
          label: 'Logs 24h',
          value: log24h,
          copy: `${logTotal} total`,
        },
        {
          key: 'risk',
          label: 'Revisar',
          value: warnings + errors,
          copy: `${errors} errores`,
        },
      ]
    },

    filteredAdminUsers() {
      const query = String(this.adminUserQuery || '').trim().toLowerCase()
      const status = this.adminUserStatusFilter

      return this.adminUsers.filter((user) => {
        const isAdmin = Boolean(user.usuarioAdmin || user.usuario_admin)
        const isAuthorized = Boolean(user.usuarioAutorizado || user.usuario_autorizado)
        const isEnabled = user.enabled !== false

        if (status === 'admin' && !isAdmin) return false
        if (status === 'authorized' && !isAuthorized) return false
        if (status === 'pending' && isAuthorized) return false
        if (status === 'disabled' && isEnabled) return false

        if (!query) return true

        return [
          user.id,
          user.email,
          user.displayName,
          user.display_name,
          user.preferredProvider,
          user.preferred_provider,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
    },

    settingsActionDisabled() {
      if (this.activeSettingsModal === 'email') {
        return this.settingsSaving || this.emailAlertLoading || !this.isCurrentUserAuthorized
      }
      return this.settingsSaving || this.keyAgentsSaving
    },

    settingsActionLabel() {
      return this.settingsSaving ? 'Guardando...' : 'Guardar ajustes'
    },
  },

  watch: {
    '$route.fullPath'() {
      this.closeSettingsMenu()
      this.closeErrorMenu()
      this.closeSettingsModal()
    },
  },

  mounted() {
    this.loadOperatorSettings()
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.handleDocumentClick)
      document.addEventListener('keydown', this.handleDocumentKeydown)
    }
  },

  beforeUnmount() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.handleDocumentClick)
      document.removeEventListener('keydown', this.handleDocumentKeydown)
    }
  },

  methods: {
    toggleSettingsMenu() {
      this.settingsMenuOpen = !this.settingsMenuOpen
      if (this.settingsMenuOpen) {
        this.closeErrorMenu()
        this.closeSettingsModal()
      }
    },

    toggleErrorMenu() {
      this.errorMenuOpen = !this.errorMenuOpen
      if (this.errorMenuOpen) {
        this.closeSettingsMenu()
        this.closeSettingsModal()
      }
    },

    closeSettingsMenu() {
      this.settingsMenuOpen = false
    },

    closeErrorMenu() {
      this.errorMenuOpen = false
    },

    async handleLogout() {
      if (this.logoutLoading) return

      this.logoutLoading = true
      try {
        await this.$store.dispatch('logoutThorondorSession')
        this.closeSettingsMenu()
        this.closeErrorMenu()
        this.closeSettingsModal()

        if (this.$route.name !== 'thorondor-login') {
          await this.$router.replace({ name: 'thorondor-login' })
        }
      } finally {
        this.logoutLoading = false
      }
    },

    openSettingsModal(key) {
      if (key === 'admin' && !this.isCurrentUserAdmin) {
        return
      }

      this.activeSettingsModal = key
      this.settingsFeedback = ''
      this.settingsFeedbackTone = 'success'
      this.closeSettingsMenu()
      this.closeErrorMenu()

      if (key === 'admin' && !this.adminLoaded && !this.adminLoading) {
        this.loadAdminUsers({ silent: true })
      }

      if (key === 'admin' && !this.adminLogsLoaded && !this.adminLogsLoading) {
        this.loadAdminLogs({ silent: true })
      }

      if (key === 'email' && this.isCurrentUserAuthorized && !this.emailAlertLoaded && !this.emailAlertLoading) {
        this.loadEmailAlertSettings()
      }

      if (key === 'account') {
        this.syncKeyAgentsDraft()
      }
    },

    closeSettingsModal() {
      this.activeSettingsModal = null
      this.settingsSaving = false
      this.persistenceChanging = false
      this.settingsFeedback = ''
    },

    async loadAdminUsers(options = {}) {
      if (!this.isCurrentUserAdmin || this.adminLoading) return

      try {
        this.adminLoading = true
        this.adminFeedback = options.silent ? null : this.adminFeedback
        const payload = await fetchThorondorAdminUsers()
        this.adminUsers = Array.isArray(payload?.users) ? payload.users : []
        this.adminTotals = payload?.totals || {}
        this.adminLoaded = true
        if (!options.silent) {
          this.adminFeedback = { type: 'success', message: 'Usuarios actualizados.' }
        }
      } catch (error) {
        this.adminFeedback = {
          type: 'error',
          message: error.message || 'No se pudieron consultar los usuarios.',
        }
      } finally {
        this.adminLoading = false
      }
    },

    async loadAdminLogs(options = {}) {
      if (!this.isCurrentUserAdmin || this.adminLogsLoading) return

      try {
        this.adminLogsLoading = true
        this.adminFeedback = options.silent ? null : this.adminFeedback
        const payload = await fetchThorondorAdminLogs(this.adminLogFilters)
        this.adminLogs = Array.isArray(payload?.logs) ? payload.logs : []
        this.adminLogTotals = payload?.totals || {}
        this.adminLogsLoaded = true
        if (!options.silent) {
          this.adminFeedback = { type: 'success', message: 'Logs de aplicación actualizados.' }
        }
      } catch (error) {
        this.adminFeedback = {
          type: 'error',
          message: error.message || 'No se pudieron consultar los logs de aplicación.',
        }
      } finally {
        this.adminLogsLoading = false
      }
    },

    async toggleUserAuthorization(user) {
      if (!user?.id || this.adminSavingUserId) return

      const nextValue = !(user.usuarioAutorizado || user.usuario_autorizado)
      await this.toggleAdminUserField(user, 'usuarioAutorizado', nextValue)
    },

    async toggleAdminUserField(user, field, nextValue) {
      if (!user?.id || this.adminSavingUserId) return

      try {
        this.adminSavingUserId = user.id
        const updated = await updateThorondorAdminUser(user.id, { [field]: nextValue })
        this.adminUsers = this.adminUsers.map((item) => (item.id === user.id ? updated : item))
        await this.loadAdminUsers({ silent: true })
        await this.loadAdminLogs({ silent: true })
        if (this.currentSessionUser?.id === user.id) {
          await this.$store.dispatch('refreshThorondorSession')
        }
        this.adminFeedback = {
          type: 'success',
          message: this.adminUserUpdateMessage(field, nextValue),
        }
      } catch (error) {
        this.adminFeedback = {
          type: 'error',
          message: error.message || 'No se pudo actualizar el usuario.',
        }
      } finally {
        this.adminSavingUserId = ''
      }
    },

    adminUserUpdateMessage(field, enabled) {
      if (field === 'enabled') {
        return enabled ? 'Usuario activado.' : 'Usuario deshabilitado.'
      }
      if (field === 'usuarioAdmin') {
        return enabled ? 'Usuario marcado como administrador.' : 'Permiso admin retirado.'
      }
      if (field === 'usuarioAutorizado') {
        return enabled
          ? 'Usuario autorizado para BBDD por API.'
          : 'Usuario limitado a persistencia IndexedDB.'
      }
      return 'Usuario actualizado.'
    },

    adminProviderLabel(user) {
      const provider = String(user?.preferredProvider || user?.preferred_provider || '').trim()
      if (provider) return provider
      const identities = Array.isArray(user?.identities) ? user.identities : []
      return identities.map((item) => item.provider).filter(Boolean).join(', ') || '-'
    },

    adminUserInitials(user) {
      const source = String(user?.displayName || user?.display_name || user?.email || user?.id || 'U')
      return source
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase()
    },

    formatAdminDate(value) {
      if (!value) return '-'

      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value

      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    },

    formatAdminCategory(value) {
      const category = String(value || '').trim().toLowerCase()
      return (
        {
          auth: 'Autenticación',
          admin: 'Administración',
          security: 'Seguridad',
          system: 'Sistema',
        }[category] || category || '-'
      )
    },

    formatAdminSeverity(value) {
      const severity = String(value || '').trim().toLowerCase()
      return (
        {
          info: 'Info',
          warning: 'Aviso',
          error: 'Error',
        }[severity] || severity || 'Info'
      )
    },

    formatUserAgent(value) {
      const userAgent = String(value || '').trim()
      if (!userAgent) return '-'
      if (userAgent.length <= 46) return userAgent
      return `${userAgent.slice(0, 43)}...`
    },

    handleDocumentClick(event) {
      if (!this.$el?.contains(event.target)) {
        this.closeSettingsMenu()
        this.closeErrorMenu()
      }
    },

    handleDocumentKeydown(event) {
      if (event.key === 'Escape') {
        if (this.activeSettingsModal) {
          this.closeSettingsModal()
          return
        }
        this.closeSettingsMenu()
        this.closeErrorMenu()
      }
    },

    syncKeyAgentsDraft() {
      this.keyAgentsDraft = this.currentUserKeyAgents
      this.keyAgentsFeedback = null
    },

    generateKeyAgentsDraft() {
      this.keyAgentsDraft = generateKeyAgentsValue()
      this.keyAgentsVisible = true
      this.keyAgentsFeedback = {
        type: 'info',
        message: 'Nueva key agents preparada. Guarda para aplicarla a nuevos agentes.',
      }
    },

    async saveKeyAgents() {
      const value = String(this.keyAgentsDraft || '').trim()
      if (value.length < 32 || value.length > 128) {
        this.keyAgentsFeedback = {
          type: 'error',
          message: 'La key agents debe tener entre 32 y 128 caracteres.',
        }
        return
      }

      this.keyAgentsSaving = true
      this.keyAgentsFeedback = null
      try {
        const user = await this.$store.dispatch('updateThorondorKeyAgents', { keyAgents: value })
        this.keyAgentsDraft = String(user?.keyAgents || user?.key_agents || value).trim()
        this.keyAgentsFeedback = {
          type: 'success',
          message: 'Key agents predeterminada guardada. Los agentes existentes conservan su clave actual.',
        }
      } catch (error) {
        this.keyAgentsFeedback = {
          type: 'error',
          message: error.message || 'No se pudo guardar la key agents.',
        }
      } finally {
        this.keyAgentsSaving = false
      }
    },

    loadOperatorSettings() {
      if (typeof window === 'undefined') return

      try {
        const rawValue = window.localStorage.getItem(THORONDOR_OPERATOR_SETTINGS_KEY)
        const parsedValue = rawValue ? JSON.parse(rawValue) : {}
        this.operatorSettings = mergeOperatorSettings(parsedValue)
        this.applyOperatorSettings()
      } catch {
        this.operatorSettings = buildDefaultOperatorSettings()
        this.applyOperatorSettings()
      }
    },

    applyOperatorSettings() {
      if (typeof document === 'undefined') return

      document.documentElement.dataset.thorondorDensity = String(
        this.operatorSettings.density || 'Equilibrada',
      )
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
    },

    async saveOperatorSettings() {
      if (this.activeSettingsModal === 'email') {
        await this.saveEmailAlertSettings()
        return
      }

      this.settingsSaving = true
      this.settingsFeedback = ''

      try {
        this.operatorSettings = mergeOperatorSettings(this.operatorSettings)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            THORONDOR_OPERATOR_SETTINGS_KEY,
            JSON.stringify(this.operatorSettings),
          )
        }
        this.applyOperatorSettings()
        this.settingsFeedbackTone = 'success'
        this.settingsFeedback = 'Ajustes guardados en este navegador.'
      } catch {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = 'No se pudieron guardar los ajustes locales.'
      } finally {
        this.settingsSaving = false
      }
    },

    normalizeEmailAlertSettings(value = {}) {
      return {
        ...buildDefaultEmailAlertSettings(),
        ...value,
        enabled: Boolean(value.enabled),
        recipientEmail: String(value.recipientEmail || '').trim(),
        effectiveRecipientEmail: String(value.effectiveRecipientEmail || '').trim(),
        notifyCritical: value.notifyCritical !== false,
        notifyDanger: value.notifyDanger !== false,
        notifyWarning: Boolean(value.notifyWarning),
      }
    },

    async loadEmailAlertSettings() {
      if (!this.isCurrentUserAuthorized || this.emailAlertLoading) return

      this.emailAlertLoading = true
      this.settingsFeedback = ''
      try {
        const payload = await fetchThorondorEmailAlertSettings()
        this.emailAlertSettings = this.normalizeEmailAlertSettings(payload)
        this.emailAlertLoaded = true
      } catch (error) {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = error.message || 'No se pudo consultar la configuración de alertas por email.'
      } finally {
        this.emailAlertLoading = false
      }
    },

    async saveEmailAlertSettings() {
      if (!this.isCurrentUserAuthorized || this.settingsSaving) return

      this.settingsSaving = true
      this.settingsFeedback = ''
      try {
        const payload = await updateThorondorEmailAlertSettings({
          enabled: this.emailAlertSettings.enabled,
          recipientEmail: this.emailAlertSettings.recipientEmail,
          notifyCritical: this.emailAlertSettings.notifyCritical,
          notifyDanger: this.emailAlertSettings.notifyDanger,
          notifyWarning: this.emailAlertSettings.notifyWarning,
        })
        this.emailAlertSettings = this.normalizeEmailAlertSettings(payload)
        this.emailAlertLoaded = true
        this.settingsFeedbackTone = 'success'
        this.settingsFeedback = 'Alertas por email guardadas en la API.'
      } catch (error) {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = error.message || 'No se pudieron guardar las alertas por email.'
      } finally {
        this.settingsSaving = false
      }
    },

    async sendEmailAlertTest() {
      if (!this.isCurrentUserAuthorized || this.emailAlertTesting) return

      this.emailAlertTesting = true
      this.settingsFeedback = ''
      try {
        const savedSettings = await updateThorondorEmailAlertSettings({
          enabled: this.emailAlertSettings.enabled,
          recipientEmail: this.emailAlertSettings.recipientEmail,
          notifyCritical: this.emailAlertSettings.notifyCritical,
          notifyDanger: this.emailAlertSettings.notifyDanger,
          notifyWarning: this.emailAlertSettings.notifyWarning,
        })
        this.emailAlertSettings = this.normalizeEmailAlertSettings(savedSettings)
        const payload = await sendThorondorEmailAlertTest()
        this.emailAlertSettings = this.normalizeEmailAlertSettings(payload)
        this.emailAlertLoaded = true
        this.settingsFeedbackTone = 'success'
        this.settingsFeedback = payload?.message || 'Correo de prueba enviado.'
      } catch (error) {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = error.message || 'No se pudo enviar el correo de prueba.'
      } finally {
        this.emailAlertTesting = false
      }
    },

    async setPersistenceMode(mode) {
      if (mode === this.selectedPersistenceMode || this.persistenceChanging) return
      const option = this.persistenceOptions.find((item) => item.value === mode)
      if (option?.disabled) {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = option.status || 'Usuario no autorizado para usar BBDD por API.'
        return
      }

      this.persistenceChanging = true
      this.settingsFeedback = ''

      try {
        await this.$store.dispatch('setThorondorPersistenceMode', mode)
        this.settingsFeedbackTone = 'success'
        this.settingsFeedback =
          mode === 'cloud'
            ? 'Persistencia con API activada.'
            : 'Persistencia local con IndexedDB activada.'
      } catch (error) {
        this.settingsFeedbackTone = 'error'
        this.settingsFeedback = `No se pudo cambiar la persistencia: ${error.message}`
      } finally {
        this.persistenceChanging = false
      }
    },

    routeFor(item) {
      const query = { ...(item.query || {}) }

      if (item.agentScoped && this.selectedAgentId) {
        query.agent = this.selectedAgentId
      }

      return Object.keys(query).length
        ? { name: item.routeName, query }
        : { name: item.routeName }
    },

    formatErrorTime(timestamp) {
      if (!timestamp) return 'Sin hora'
      return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(timestamp))
    },
  },
}
</script>

<style scoped>
.thorondor-primary-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 9000;
  display: grid;
  grid-template-columns: minmax(190px, 240px) minmax(0, 1fr) minmax(92px, auto);
  width: 100%;
  height: var(--main-header-height);
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(236, 194, 119, 0.2);
  background: var(--thorondor-panel-background);
  box-shadow:
    0 10px 24px rgba(4, 8, 7, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
}

.thorondor-brand {
  display: inline-flex;
  width: min(100%, 240px);
  min-width: 0;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  text-decoration: none;
  box-shadow: none;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.thorondor-brand:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.brand-logo {
  display: block;
  width: min(100%, 226px);
  height: 44px;
  object-fit: contain;
  object-position: left center;
  filter: contrast(1.06) drop-shadow(0 5px 10px rgba(0, 0, 0, 0.24));
}

.thorondor-top-nav {
  --top-nav-button-width: 148px;
  --top-nav-button-height: var(--main-header-height);
  --top-nav-gap: 0px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(112px, var(--top-nav-button-width));
  justify-self: center;
  width: min(100%, calc((var(--top-nav-button-width) * 6) + (var(--top-nav-gap) * 5)));
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: var(--top-nav-gap);
  overflow-x: auto;
  min-height: var(--main-header-height);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  scrollbar-width: none;
}

.thorondor-top-nav::-webkit-scrollbar {
  display: none;
}

.top-nav-link {
  position: relative;
  display: inline-flex;
  width: var(--top-nav-button-width);
  height: var(--top-nav-button-height);
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 12px;
  border: 0;
  border-left: 1px solid rgba(236, 194, 119, 0.12);
  border-right: 1px solid rgba(205, 213, 210, 0.08);
  border-radius: 0;
  background: transparent;
  color: rgba(226, 234, 244, 0.78);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.15;
  text-decoration: none;
  text-align: center;
  white-space: nowrap;
  box-shadow: none;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease,
    box-shadow 0.16s ease;
}

.top-nav-link::after {
  position: absolute;
  right: 12%;
  bottom: 0;
  left: 12%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(236, 194, 119, 0.92), transparent);
  opacity: 0;
  transform: scaleX(0.35);
  transform-origin: center;
  content: "";
  transition:
    opacity 0.18s ease,
    transform 0.22s ease,
    box-shadow 0.18s ease;
}

.top-nav-link:hover {
  border-left-color: rgba(236, 194, 119, 0.24);
  border-right-color: rgba(236, 194, 119, 0.18);
  background:
    radial-gradient(circle at 50% 0%, rgba(236, 194, 119, 0.12), transparent 72%),
    linear-gradient(180deg, rgba(236, 194, 119, 0.06), rgba(255, 255, 255, 0));
  color: #f5d99d;
  transform: translateY(-1px);
  box-shadow:
    inset 0 0 18px rgba(236, 194, 119, 0.1),
    inset 0 1px 0 rgba(255, 240, 180, 0.04);
}

.top-nav-link.router-link-active {
  border-left-color: rgba(236, 194, 119, 0.32);
  border-right-color: rgba(236, 194, 119, 0.22);
  background:
    radial-gradient(circle at 50% -10%, rgba(236, 194, 119, 0.16), transparent 72%),
    linear-gradient(180deg, rgba(236, 194, 119, 0.09), rgba(236, 194, 119, 0.025));
  color: #fff2cf;
  box-shadow:
    inset 0 0 22px rgba(236, 194, 119, 0.12),
    inset 0 1px 0 rgba(255, 240, 180, 0.05);
}

.top-nav-link:hover::after,
.top-nav-link.router-link-active::after {
  opacity: 1;
  transform: scaleX(1);
  box-shadow: 0 0 12px rgba(236, 194, 119, 0.46);
}

.thorondor-account-nav {
  position: relative;
  display: inline-flex;
  justify-self: end;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.authorization-status {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-height: 0;
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: rgba(252, 165, 165, 0.72);
  box-shadow: none;
  flex: 0 0 auto;
}

.authorization-status.is-authorized {
  color: rgba(134, 239, 172, 0.72);
}

.authorization-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 14%, transparent);
  flex: 0 0 auto;
}

.authorization-status-label {
  overflow: hidden;
  max-width: 84px;
  color: currentColor;
  font-size: 0.68rem;
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-square {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border: 1px solid rgba(205, 213, 210, 0.18);
  border-radius: 4px;
  background: var(--thorondor-flat-background);
  color: #e8eee7;
  flex: 0 0 auto;
  cursor: var(--cursor-pointer), pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 4px 10px rgba(5, 9, 8, 0.12);
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.error-square {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid rgba(248, 113, 113, 0.42);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(69, 24, 27, 0.96), rgba(28, 14, 18, 0.98));
  color: #fecaca;
  cursor: var(--cursor-pointer), pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 18px rgba(0, 0, 0, 0.22);
}

.error-square span {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #f87171;
  box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.14);
}

.error-square strong {
  color: #fee2e2;
  font-size: 0.78rem;
  font-weight: 900;
}

.error-square:hover,
.error-square[aria-expanded='true'] {
  border-color: rgba(254, 202, 202, 0.58);
  background: linear-gradient(180deg, rgba(91, 28, 34, 0.98), rgba(38, 16, 22, 0.98));
}

.error-square.is-empty {
  border-color: rgba(205, 213, 210, 0.24);
  background: var(--thorondor-nested-background);
  color: #d9e2ec;
}

.error-square.is-empty span {
  background: #6b7280;
  box-shadow: 0 0 0 4px rgba(156, 163, 175, 0.12);
}

.error-menu-item--empty {
  cursor: default;
}

.settings-square {
  width: 44px;
}

.settings-square:hover,
.settings-square[aria-expanded='true'] {
  border-color: rgba(236, 194, 119, 0.34);
  background: var(--thorondor-flat-soft-background);
  color: #f8fafc;
}

.settings-square svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.settings-dropdown {
  position: fixed;
  top: var(--main-header-height);
  right: 24px;
  z-index: 9100;
  display: grid;
  width: min(344px, calc(100vw - 48px));
  max-height: calc(100vh - var(--main-header-height));
  overflow: auto;
  border: 1px solid rgba(236, 194, 119, 0.2);
  border-top-color: rgba(236, 194, 119, 0.3);
  border-radius: 0 0 4px 4px;
  background:
    linear-gradient(145deg, rgba(236, 194, 119, 0.018), transparent 44%),
    linear-gradient(145deg, #273129, #202922 62%, #1b241e);
  box-shadow:
    0 12px 28px rgba(5, 9, 8, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.026);
  transform-origin: top right;
  clip-path: inset(0 0 0 0);
  will-change: max-height, opacity, clip-path;
  scrollbar-width: thin;
  scrollbar-color: rgba(186, 196, 188, 0.34) transparent;
}

.settings-dropdown-header,
.settings-menu-footer {
  display: grid;
  gap: 3px;
  padding: 14px 16px;
}

.settings-dropdown-header {
  border-bottom: 1px solid rgba(205, 213, 210, 0.13);
  background: var(--thorondor-flat-soft-background);
}

.settings-account-dropdown {
  gap: 0;
  padding: 8px;
}

.settings-profile-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px 8px 12px;
  border: 0;
  border-bottom: 1px solid rgba(205, 213, 210, 0.12);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.settings-profile-avatar {
  display: none;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 1px solid rgba(236, 194, 119, 0.34);
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(244, 208, 143, 0.18), rgba(110, 76, 35, 0.18));
  color: #f3cf8c;
  font-size: 0.82rem;
  font-weight: 900;
}

.settings-profile-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.settings-profile-kicker {
  color: #d6a15c;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.settings-profile-main strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 0.98rem;
  line-height: 1.18;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-profile-main small {
  overflow: hidden;
  color: #aab6ad;
  font-size: 0.78rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-profile-status {
  align-self: start;
  padding: 4px 7px;
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 999px;
  background: transparent;
  color: #efb2b2;
  font-size: 0.62rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.settings-profile-status.is-authorized {
  border-color: rgba(143, 214, 173, 0.24);
  background: transparent;
  color: #aee8c4;
}

.settings-dropdown-header span,
.settings-menu-footer > span {
  color: #aab6ad;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-dropdown-header strong {
  color: #f8fafc;
  font-size: 1rem;
}

.settings-dropdown-header small,
.settings-menu-footer small,
.settings-menu-copy span {
  color: #aab6ad;
  line-height: 1.45;
}

.settings-menu-list {
  display: grid;
  gap: 1px;
  padding: 7px 0;
}

.settings-menu-item {
  display: grid;
  grid-template-columns: 7px minmax(0, 1fr) 14px;
  width: 100%;
  gap: 11px;
  align-items: center;
  min-height: 48px;
  padding: 8px 9px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #e8eee7;
  cursor: var(--cursor-pointer), pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 0.16s ease,
    background 0.16s ease;
}

.settings-menu-accent {
  position: relative;
  display: block;
  width: 4px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: transparent;
}

.settings-menu-accent::before {
  position: absolute;
  inset: 0;
  width: 4px;
  height: 100%;
  border-radius: inherit;
  background: #d6a15c;
  opacity: 0.72;
  content: '';
}

.settings-menu-accent--account::before {
  background: #f3cf8c;
}

.settings-menu-accent--preferences::before {
  background: #8fd6ad;
}

.settings-menu-accent--email::before {
  background: #e0b875;
}

.settings-menu-accent--persistence::before {
  background: #86efac;
}

.settings-menu-accent--admin::before {
  background: #fbbf24;
}

.settings-menu-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.error-dropdown {
  right: 76px;
}

.error-menu-item {
  display: grid;
  gap: 5px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(248, 113, 113, 0.12);
}

.error-menu-item strong {
  color: #fee2e2;
  font-size: 0.84rem;
  line-height: 1.45;
}

.error-menu-item small {
  color: #fca5a5;
}

.settings-menu-item strong {
  color: #f3f7f1;
  font-size: 0.84rem;
  line-height: 1.2;
}

.settings-menu-copy span {
  overflow: hidden;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-menu-arrow {
  position: relative;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.settings-menu-arrow::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-top: 1.5px solid #9ba89e;
  border-right: 1.5px solid #9ba89e;
  content: '';
  transform: translate(-62%, -50%) rotate(45deg);
}

.settings-menu-item:hover,
.settings-menu-item:focus-visible {
  border-color: rgba(236, 194, 119, 0.18);
  background: rgba(236, 194, 119, 0.045);
  outline: none;
}

.settings-menu-item:hover .settings-menu-arrow::before,
.settings-menu-item:focus-visible .settings-menu-arrow::before {
  border-color: #f3cf8c;
}

.settings-menu-footer {
  border-top: 1px solid rgba(205, 213, 210, 0.11);
  background: transparent;
}

.settings-menu-footer--action {
  gap: 0;
  padding: 8px 0 0;
}

.settings-logout-button {
  display: inline-flex;
  width: 100%;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 4px;
  background: transparent;
  color: #efb2b2;
  cursor: var(--cursor-pointer), pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 850;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease,
    opacity 0.16s ease;
}

.settings-logout-mark {
  position: relative;
  width: 15px;
  height: 15px;
  border: 2px solid currentColor;
  border-right: 0;
  border-radius: 2px;
  opacity: 0.9;
}

.settings-logout-mark::before {
  position: absolute;
  top: 50%;
  left: 7px;
  width: 9px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  content: '';
  transform: translateY(-50%);
}

.settings-logout-mark::after {
  position: absolute;
  top: 50%;
  left: 13px;
  width: 6px;
  height: 6px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  content: '';
  transform: translate(-50%, -50%) rotate(45deg);
}

.settings-logout-button:hover,
.settings-logout-button:focus-visible {
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(127, 29, 29, 0.14);
  color: #fee2e2;
  outline: none;
}

.settings-logout-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.settings-menu-enter-active,
.settings-menu-leave-active {
  transition:
    max-height 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    clip-path 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.settings-menu-enter-from,
.settings-menu-leave-to {
  max-height: 0;
  clip-path: inset(0 0 100% 0);
}

.settings-modal-backdrop {
  position: fixed;
  inset: var(--main-header-height) 0 0;
  z-index: 9200;
  display: grid;
  place-items: center;
  padding: clamp(12px, 2.4vw, 28px);
  background: rgba(12, 18, 15, 0.72);
  backdrop-filter: blur(10px);
}

.settings-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(940px, 100%);
  max-height: min(760px, calc(100dvh - var(--main-header-height) - 24px));
  overflow: hidden;
  border: 1px solid rgba(205, 213, 210, 0.22);
  border-radius: 4px;
  background: var(--thorondor-panel-background);
  box-shadow:
    0 20px 52px rgba(4, 8, 7, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.045);
}

.settings-modal--admin {
  width: min(1240px, 100%);
}

.settings-modal-header,
.settings-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
}

.settings-modal-header {
  border-bottom: 1px solid rgba(205, 213, 210, 0.16);
  background: var(--thorondor-soft-background);
}

.settings-modal-header div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.settings-modal-header span,
.modal-panel-heading span {
  color: #9aa6b3;
  font-size: 0.72rem;
  font-weight: 850;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.settings-modal-header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  line-height: 1.05;
}

.settings-modal-header p,
.modal-panel-heading small {
  margin: 0;
  color: #aab6ad;
  line-height: 1.5;
}

.settings-modal-close {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(205, 213, 210, 0.24);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  color: #edf3eb;
  cursor: var(--cursor-pointer), pointer;
  font-weight: 900;
}

.settings-modal-close:hover {
  border-color: rgba(229, 236, 246, 0.45);
  background: var(--thorondor-nested-background);
}

.settings-modal-body {
  min-height: 0;
  overflow: auto;
  padding: 18px 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(205, 213, 210, 0.35) transparent;
}

.settings-modal-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
  gap: 14px;
}

.settings-modal-panel {
  display: grid;
  gap: 14px;
  align-content: start;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(205, 213, 210, 0.16);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
}

.settings-modal-panel--full {
  grid-column: 1 / -1;
}

.key-agents-panel {
  gap: 12px;
}

.key-agents-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.key-agents-feedback {
  margin: 0;
}

.modal-panel-heading {
  display: grid;
  gap: 5px;
}

.modal-panel-heading strong {
  color: #f8fafc;
  font-size: 1rem;
}

.settings-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.settings-field {
  position: relative;
  display: grid;
  gap: 6px;
  min-width: 0;
}

.settings-field--full {
  grid-column: 1 / -1;
}

.settings-field span {
  color: #b7c4d3;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings-field input,
.settings-field select,
.settings-readonly-value {
  width: 100%;
  min-height: 40px;
  border: 1px solid rgba(205, 213, 210, 0.2);
  border-radius: 3px;
  background: var(--thorondor-soft-background);
  color: #f8fafc;
  font: inherit;
  outline: none;
  padding: 0 11px;
}

.settings-field select {
  appearance: none;
  padding-right: 42px;
  background:
    linear-gradient(45deg, transparent 50%, var(--thorondor-gold-strong) 50%)
      calc(100% - 19px) calc(50% - 3px) / 6px 6px no-repeat,
    linear-gradient(135deg, var(--thorondor-gold-strong) 50%, transparent 50%)
      calc(100% - 14px) calc(50% - 3px) / 6px 6px no-repeat,
    linear-gradient(90deg, transparent calc(100% - 34px), rgba(236, 194, 119, 0.11) calc(100% - 34px)),
    var(--thorondor-soft-background);
  border-color: rgba(236, 194, 119, 0.26);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.settings-field select:hover {
  border-color: rgba(236, 194, 119, 0.44);
  background:
    linear-gradient(45deg, transparent 50%, #ffe0a6 50%)
      calc(100% - 19px) calc(50% - 3px) / 6px 6px no-repeat,
    linear-gradient(135deg, #ffe0a6 50%, transparent 50%)
      calc(100% - 14px) calc(50% - 3px) / 6px 6px no-repeat,
    linear-gradient(90deg, transparent calc(100% - 34px), rgba(236, 194, 119, 0.16) calc(100% - 34px)),
    var(--thorondor-nested-background);
}

.settings-field select option {
  background: #1f2a25;
  color: #f8fafc;
}

.settings-readonly-value {
  display: flex;
  align-items: center;
  color: #9aa6b3;
}

.settings-field input:focus,
.settings-field select:focus {
  border-color: rgba(236, 194, 119, 0.56);
  box-shadow: 0 0 0 3px rgba(218, 166, 92, 0.12);
}

.settings-field select:focus {
  background:
    linear-gradient(45deg, transparent 50%, #ffe0a6 50%)
      calc(100% - 19px) calc(50% - 3px) / 6px 6px no-repeat,
    linear-gradient(135deg, #ffe0a6 50%, transparent 50%)
      calc(100% - 14px) calc(50% - 3px) / 6px 6px no-repeat,
    linear-gradient(90deg, transparent calc(100% - 34px), rgba(236, 194, 119, 0.18) calc(100% - 34px)),
    var(--thorondor-nested-background);
}

.settings-field input:disabled {
  color: #9aa6b3;
  cursor: not-allowed;
}

.settings-switch-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid rgba(205, 213, 210, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.settings-switch-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-control {
  position: relative;
  width: 38px;
  height: 21px;
  border: 1px solid rgba(205, 213, 210, 0.28);
  border-radius: 999px;
  background: var(--thorondor-nested-background);
  transition: background 0.16s ease, border-color 0.16s ease;
}

.switch-control::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #9aa6b3;
  transition: transform 0.16s ease, background 0.16s ease;
}

.settings-switch-row input:checked+.switch-control {
  border-color: rgba(110, 231, 183, 0.45);
  background: rgba(16, 185, 129, 0.18);
}

.settings-switch-row input:checked+.switch-control::after {
  transform: translateX(17px);
  background: #6ee7b7;
}

.settings-switch-row span:last-child {
  display: grid;
  gap: 4px;
}

.settings-switch-row strong {
  color: #f3f7f1;
  font-size: 0.9rem;
}

.settings-switch-row small {
  color: #aab6ad;
  line-height: 1.45;
}

.settings-status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(251, 191, 36, 0.22);
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.08);
}

.settings-status-strip strong {
  color: #fde68a;
  font-size: 0.86rem;
}

.settings-status-strip span {
  color: #d8c897;
  font-size: 0.82rem;
}

.settings-status-strip.is-error {
  border-color: rgba(248, 113, 113, 0.28);
  background: rgba(69, 24, 27, 0.28);
}

.settings-status-strip.is-error strong {
  color: #fecaca;
}

.settings-status-strip.is-error span {
  color: #f1b6b6;
}

.settings-test-mail-button {
  justify-self: start;
}

.admin-settings-panel {
  gap: 14px;
}

.admin-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
  border: 1px solid rgba(205, 213, 210, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.admin-toolbar div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.admin-toolbar strong {
  color: #f8fafc;
  font-size: 0.92rem;
}

.admin-toolbar span {
  color: #aab6ad;
  font-size: 0.82rem;
}

.admin-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.admin-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.admin-stat-grid div {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(205, 213, 210, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.admin-stat-grid span {
  color: #aab6ad;
  font-size: 0.7rem;
  font-weight: 850;
  text-transform: uppercase;
}

.admin-stat-grid strong {
  color: #f8fafc;
  font-size: 1rem;
}

.admin-stat-grid small {
  overflow: hidden;
  color: #91a0b1;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.admin-tabs button {
  display: grid;
  gap: 3px;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid rgba(205, 213, 210, 0.16);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  color: #dde7df;
  cursor: var(--cursor-pointer), pointer;
  font: inherit;
  text-align: left;
}

.admin-tabs button.is-active {
  border-color: rgba(236, 194, 119, 0.36);
  background: rgba(236, 194, 119, 0.09);
  color: #f8fafc;
}

.admin-tabs strong {
  font-size: 0.86rem;
}

.admin-tabs span {
  color: #aab6ad;
  font-size: 0.76rem;
}

.admin-tab-panel {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.admin-filter-bar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 240px);
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px solid rgba(205, 213, 210, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.admin-filter-bar--logs {
  grid-template-columns: minmax(160px, 0.8fr) minmax(132px, 0.55fr) minmax(132px, 0.55fr) minmax(220px, 1fr) auto;
}

.admin-log-search-field {
  min-width: 0;
}

.admin-users-list {
  display: grid;
  gap: 8px;
  max-height: min(48vh, 460px);
  overflow: auto;
  padding-right: 2px;
}

.admin-user-row {
  display: grid;
  grid-template-columns: 40px minmax(160px, 1.1fr) minmax(170px, 0.95fr) minmax(110px, 0.55fr) minmax(90px, 0.5fr) minmax(255px, auto);
  gap: 10px;
  align-items: center;
  min-width: 1040px;
  padding: 10px;
  border: 1px solid rgba(205, 213, 210, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.admin-user-avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(236, 194, 119, 0.26);
  border-radius: 50%;
  background: rgba(236, 194, 119, 0.08);
  color: #f3cf8c;
  font-size: 0.78rem;
  font-weight: 900;
}

.admin-user-main,
.admin-user-meta {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.admin-user-main strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-user-main small,
.admin-user-meta small {
  overflow: hidden;
  color: #aab6ad;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-user-meta strong {
  color: #dde7df;
  font-size: 0.8rem;
  font-weight: 800;
}

.admin-user-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.admin-user-pills em {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(205, 213, 210, 0.16);
  border-radius: 999px;
  color: #aab6ad;
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 850;
  white-space: nowrap;
}

.admin-user-pills em.is-active {
  border-color: rgba(74, 222, 128, 0.32);
  color: #bbf7d0;
  background: rgba(18, 83, 49, 0.2);
}

.admin-user-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.settings-admin-action {
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid rgba(236, 194, 119, 0.34);
  border-radius: 4px;
  background: rgba(214, 161, 92, 0.1);
  color: #f3cf8c;
  cursor: var(--cursor-pointer), pointer;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 900;
  white-space: nowrap;
}

.settings-admin-action--primary {
  border-color: rgba(74, 222, 128, 0.32);
  background: rgba(18, 83, 49, 0.18);
  color: #bbf7d0;
}

.settings-admin-action--danger {
  border-color: rgba(248, 113, 113, 0.24);
  background: rgba(127, 29, 29, 0.14);
  color: #fecaca;
}

.settings-admin-action:hover,
.settings-admin-action:focus-visible {
  border-color: rgba(236, 194, 119, 0.58);
  background: rgba(214, 161, 92, 0.16);
  outline: none;
}

.settings-admin-action--primary:hover,
.settings-admin-action--primary:focus-visible {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(18, 83, 49, 0.28);
}

.settings-admin-action--danger:hover,
.settings-admin-action--danger:focus-visible {
  border-color: rgba(248, 113, 113, 0.42);
  background: rgba(127, 29, 29, 0.22);
}

.settings-admin-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.admin-empty-state {
  margin: 0;
  padding: 14px;
  border: 1px dashed rgba(205, 213, 210, 0.22);
  border-radius: 4px;
  color: #aab6ad;
  text-align: center;
}

.admin-logs-list {
  display: grid;
  gap: 6px;
  max-height: min(48vh, 470px);
  overflow: auto;
  padding-right: 2px;
}

.admin-log-row {
  display: grid;
  grid-template-columns: minmax(130px, 0.8fr) minmax(190px, 1fr) minmax(220px, 1.25fr) minmax(95px, 0.5fr) minmax(150px, 0.8fr);
  gap: 10px;
  align-items: center;
  min-width: 920px;
  padding: 10px;
  border: 1px solid rgba(205, 213, 210, 0.12);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.admin-log-row--head {
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 34px;
  background: var(--thorondor-flat-background);
}

.admin-log-row--head span {
  color: #aab6ad;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-log-row span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.admin-log-row strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-log-row small {
  overflow: hidden;
  color: #aab6ad;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-log-severity {
  display: inline-flex;
  width: fit-content;
  min-height: 22px;
  align-items: center;
  padding: 0 8px;
  border: 1px solid rgba(143, 214, 173, 0.28);
  border-radius: 999px;
  background: rgba(33, 118, 80, 0.16);
  color: #c6f6d8;
  font-size: 0.68rem;
  font-style: normal;
  font-weight: 900;
}

.admin-log-severity.is-warning {
  border-color: rgba(251, 191, 36, 0.34);
  background: rgba(146, 64, 14, 0.18);
  color: #fde68a;
}

.admin-log-severity.is-error {
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(127, 29, 29, 0.22);
  color: #fecaca;
}

.mail-rule-grid,
.settings-persistence-grid {
  display: grid;
  gap: 10px;
}

.settings-persistence-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(205, 213, 210, 0.16);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
  cursor: var(--cursor-pointer), pointer;
}

.settings-persistence-card.is-active {
  border-color: rgba(229, 236, 246, 0.52);
  background: var(--thorondor-nested-background);
}

.settings-persistence-card.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.settings-persistence-card input {
  width: 16px;
  height: 16px;
  accent-color: #d5dfd7;
}

.settings-persistence-card span {
  display: grid;
  gap: 3px;
}

.settings-persistence-card strong {
  color: #f8fafc;
  font-size: 0.9rem;
}

.settings-persistence-card small {
  color: #aab6ad;
  line-height: 1.42;
}

.settings-persistence-card em {
  justify-self: end;
  padding: 0.25rem 0.46rem;
  border: 1px solid rgba(205, 213, 210, 0.22);
  border-radius: 3px;
  color: #dde7df;
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settings-metric-grid div {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(205, 213, 210, 0.14);
  border-radius: 4px;
  background: var(--thorondor-soft-background);
}

.settings-metric-grid span {
  color: #9aa6b3;
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-metric-grid strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 1.04rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-modal-footer {
  border-top: 1px solid rgba(205, 213, 210, 0.16);
  background: var(--thorondor-soft-background);
}

.settings-modal-footer div {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.settings-modal-secondary,
.settings-modal-primary {
  min-height: 38px;
  border-radius: 4px;
  padding: 0 14px;
  cursor: var(--cursor-pointer), pointer;
  font-weight: 850;
}

.settings-modal-secondary {
  border: 1px solid rgba(205, 213, 210, 0.2);
  background: var(--thorondor-soft-background);
  color: #dde7df;
}

.settings-modal-primary {
  border: 1px solid rgba(229, 236, 246, 0.34);
  background: linear-gradient(180deg, rgba(232, 236, 228, 0.92), rgba(205, 213, 210, 0.9));
  color: #101410;
}

.settings-modal-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.settings-feedback {
  color: #9ff0c8;
  font-size: 0.84rem;
  line-height: 1.4;
}

.settings-feedback.is-error {
  color: #fca5a5;
}

.settings-modal-enter-active,
.settings-modal-leave-active {
  transition: opacity 0.18s ease;
}

.settings-modal-enter-active .settings-modal,
.settings-modal-leave-active .settings-modal {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.settings-modal-enter-from,
.settings-modal-leave-to {
  opacity: 0;
}

.settings-modal-enter-from .settings-modal,
.settings-modal-leave-to .settings-modal {
  opacity: 0;
  transform: translateY(10px);
}

.sidebar-toggle {
  display: none;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(205, 213, 210, 0.22);
  border-radius: 4px;
  background: var(--thorondor-nested-background);
}

.sidebar-toggle span {
  display: block;
  width: 18px;
  height: 2px;
  margin: 2px 0;
  border-radius: 2px;
  background: #dce3eb;
}

@media (max-width: 1040px) {
  .thorondor-primary-header {
    grid-template-columns: 42px minmax(146px, 190px) minmax(0, 1fr) auto;
    gap: 10px;
    padding: 0 14px;
  }

  .brand-logo {
    width: min(100%, 184px);
    height: 40px;
  }

  .settings-dropdown {
    right: 14px;
    width: min(344px, calc(100vw - 28px));
  }

  .error-dropdown {
    right: 64px;
  }

  .sidebar-toggle {
    display: grid;
  }

  .thorondor-top-nav {
    --top-nav-button-width: 126px;
    justify-self: center;
    width: 100%;
    min-width: 0;
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .thorondor-primary-header {
    grid-template-columns: 38px minmax(118px, 146px) minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    height: var(--main-header-height);
    padding: 0 12px;
  }

  .thorondor-top-nav {
    --top-nav-button-width: 118px;
    --top-nav-button-height: 34px;
    --top-nav-gap: 6px;
    width: 100%;
    justify-content: flex-start;
    min-height: var(--top-nav-button-height);
    padding: 0 1px;
  }

  .settings-menu-copy span,
  .settings-menu-footer small {
    display: none;
  }

  .brand-logo {
    width: min(100%, 140px);
    height: 36px;
  }

  .top-nav-link {
    padding: 0 8px;
    border-radius: 4px;
    font-size: 0.68rem;
  }

  .settings-square,
  .error-square,
  .sidebar-toggle {
    width: 38px;
    height: 38px;
  }

  .authorization-status {
    gap: 5px;
    padding: 0;
  }

  .authorization-status-label {
    max-width: 72px;
    font-size: 0.62rem;
  }

  .error-dropdown {
    right: 14px;
  }

  .settings-modal-backdrop {
    align-items: stretch;
    padding: 10px;
  }

  .settings-modal {
    width: 100%;
    max-height: calc(100dvh - var(--main-header-height) - 20px);
  }

  .settings-modal-grid,
  .settings-form-grid {
    grid-template-columns: 1fr;
  }

  .admin-toolbar,
  .admin-toolbar-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-filter-bar,
  .admin-filter-bar--logs {
    grid-template-columns: 1fr;
  }

  .admin-filter-bar .settings-modal-primary {
    width: 100%;
  }

  .settings-field--full {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .thorondor-brand {
    width: 118px;
  }

  .brand-logo {
    width: 118px;
    height: 34px;
  }
}

@media (max-width: 520px) {
  .thorondor-primary-header {
    grid-template-columns: 36px minmax(94px, 104px) minmax(0, 1fr) auto;
    gap: 6px;
    padding: 0 8px;
  }

  .thorondor-top-nav {
    --top-nav-button-width: 112px;
    --top-nav-button-height: 32px;
    --top-nav-gap: 5px;
  }

  .thorondor-brand {
    width: 102px;
  }

  .brand-logo {
    width: 102px;
    height: 32px;
  }

  .settings-square,
  .error-square,
  .sidebar-toggle {
    width: 36px;
    height: 36px;
  }

  .authorization-status {
    gap: 0;
    width: 10px;
    justify-content: center;
    padding: 0;
  }

  .authorization-status-label {
    display: none;
  }

  .sidebar-toggle span {
    width: 16px;
  }

  .top-nav-link {
    padding: 0 6px;
    font-size: 0.64rem;
  }

  .settings-dropdown {
    right: 10px;
    width: calc(100vw - 20px);
  }

  .settings-modal-backdrop {
    padding: 0;
  }

  .settings-modal {
    max-height: calc(100dvh - var(--main-header-height));
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .settings-modal-header,
  .settings-modal-footer {
    align-items: stretch;
    flex-direction: column;
    padding: 14px;
  }

  .settings-modal-header {
    flex-direction: row;
    align-items: flex-start;
  }

  .settings-modal-body {
    padding: 14px;
  }

  .settings-modal-panel {
    padding: 13px;
  }

  .settings-modal-footer div,
  .settings-modal-secondary,
  .settings-modal-primary {
    width: 100%;
  }

  .settings-modal-footer div {
    margin-left: 0;
  }

  .settings-status-strip,
  .settings-persistence-card {
    align-items: flex-start;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .settings-status-strip {
    flex-direction: column;
  }

  .settings-persistence-card em {
    grid-column: 2;
    justify-self: start;
  }

  .settings-metric-grid {
    grid-template-columns: 1fr;
  }

  .admin-stat-grid,
  .admin-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
