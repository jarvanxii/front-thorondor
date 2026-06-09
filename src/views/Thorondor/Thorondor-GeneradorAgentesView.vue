<template>
    <ThorondorPageShell>
        <section class="section-box intro-box generator-hero">
            <div class="section-topline generator-hero-top">
                <header class="module-header">
                    <span class="section-kicker">Generador dinámico</span>
                    <h1 class="section-name">Generador de agentes</h1>
                    <p class="section-copy">
                        Crea un instalador autocontenido para Windows o Linux con el agente, los logs seleccionados,
                        el autoarranque opcional y las reglas que usará el panel para consultar el host.
                    </p>
                </header>
                <aside class="generator-hero-summary" aria-label="Resumen del generador">
                    <span>Build</span>
                    <strong>Instalador único</strong>
                    <small>Genera el paquete, registra el host después y prueba el polling cuando el agente esté listo.</small>
                </aside>
            </div>

            <ul class="generator-flow-list" aria-label="Capacidades del generador">
                <li v-for="item in generatorHighlights" :key="item.label">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.copy }}</span>
                </li>
            </ul>
        </section>

        <section class="section-box">
            <div class="deployment-selector-panel">
                <div class="deployment-selector-copy">
                    <span class="section-kicker">Tipo de monitorización</span>
                    <h2 class="module-title">Selecciona la conexión del agente</h2>
                    <p class="module-copy">{{ selectedNetworkScopeCopy }}</p>
                </div>
                <div class="deployment-selector-control">
                    <label class="field-label" for="network-scope-select">Conexión</label>
                    <select id="network-scope-select" v-model="agentDraft.networkScope" class="form-select input-dark" @change="handleNetworkScopeChange">
                        <option v-for="scope in networkScopeOptions" :key="scope.value" :value="scope.value">
                            {{ scope.shortLabel }}
                        </option>
                    </select>
                </div>
            </div>

            <div class="os-selector-panel">
                <div class="os-selector-copy">
                    <span class="field-label">Sistema operativo objetivo</span>
                    <p class="os-hint">{{ selectedOsHint }}</p>
                </div>
                <label class="control-field os-family-control" for="target-os-family">
                    <span class="field-label">Sistema operativo</span>
                    <select id="target-os-family" :value="agentDraft.targetOs" class="form-select input-dark" @change="setTargetOs($event.target.value)">
                        <option v-for="item in osFamilyOptions" :key="item.value" :value="item.value">
                            {{ item.label }}
                        </option>
                    </select>
                </label>
                <div class="os-install-summary">
                    <div>
                        <strong>{{ simpleInstallTitle }}</strong>
                        <p>{{ simpleInstallCopy }}</p>
                    </div>
                </div>
            </div>

            <div class="control-grid">
                <div class="form-section-label full-span"><span>Identidad y sistema</span></div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="host-display-name">Nombre visible del host</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'displayName' }" aria-label="Ayuda sobre el nombre visible del host" @click.stop="togglePinnedHelp('displayName')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.displayName.title }}</strong>
                                    {{ fieldGuides.displayName.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="host-display-name" v-model="agentDraft.displayName" :placeholder="fieldGuides.displayName.placeholder" class="form-control input-dark" />
                </div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="system-name">Identificador técnico del sistema</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'systemName' }" aria-label="Ayuda sobre el identificador del sistema" @click.stop="togglePinnedHelp('systemName')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.systemName.title }}</strong>
                                    {{ fieldGuides.systemName.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="system-name" v-model="agentDraft.systemName" :placeholder="fieldGuides.systemName.placeholder" class="form-control input-dark" />
                </div>
                <div v-if="!isWindows" class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="distro">Familia Linux</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'distro' }" aria-label="Ayuda sobre la distribución Linux" @click.stop="togglePinnedHelp('distro')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.distro.title }}</strong>
                                    {{ fieldGuides.distro.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <select id="distro" v-model="agentDraft.distro" class="form-select input-dark" @change="handleDistroChange">
                        <option value="" disabled>Selecciona una familia Linux</option>
                        <option v-for="item in distroOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                </div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="os-version">{{ isWindows ? 'Modelo de Windows' : 'Modelo Linux' }}</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'osVersion' }" aria-label="Ayuda sobre la versión del sistema" @click.stop="togglePinnedHelp('osVersion')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.osVersion.title }}</strong>
                                    {{ fieldGuides.osVersion.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <select v-if="isWindows" id="os-version" v-model="agentDraft.osVersion" class="form-select input-dark">
                        <option value="" disabled>Selecciona versión de Windows</option>
                        <option v-for="item in windowsVersionOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                    <select v-else id="os-version" v-model="agentDraft.osVersion" class="form-select input-dark">
                        <option value="" disabled>Selecciona modelo Linux</option>
                        <option v-for="item in linuxOsModelOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                </div>
                <div class="form-section-label full-span"><span>Conexión y acceso</span></div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="receiver-url">{{ receiverUrlLabel }}</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'receiverUrl' }" aria-label="Ayuda sobre la URL accesible del agente" @click.stop="togglePinnedHelp('receiverUrl')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.receiverUrl.title }}</strong>
                                    {{ fieldGuides.receiverUrl.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="receiver-url" v-model="agentDraft.receiverUrl" :placeholder="receiverUrlPlaceholder" class="form-control input-dark" />
                </div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="central-api-base-url">URL publica de la API central</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'centralApiBaseUrl' }" aria-label="Ayuda sobre la API central" @click.stop="togglePinnedHelp('centralApiBaseUrl')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.centralApiBaseUrl.title }}</strong>
                                    {{ fieldGuides.centralApiBaseUrl.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="central-api-base-url" v-model="agentDraft.centralApiBaseUrl" :placeholder="fieldGuides.centralApiBaseUrl.placeholder" class="form-control input-dark" />
                </div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="central-enrollment-token">Token de enrolamiento</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'centralEnrollmentToken' }" aria-label="Ayuda sobre el token de enrolamiento" @click.stop="togglePinnedHelp('centralEnrollmentToken')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.centralEnrollmentToken.title }}</strong>
                                    {{ fieldGuides.centralEnrollmentToken.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="central-enrollment-token" v-model="centralEnrollmentToken" type="password" autocomplete="off" :placeholder="fieldGuides.centralEnrollmentToken.placeholder" class="form-control input-dark" />
                </div>
                <div v-if="!isLocalScope" class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="host-ip">{{ hostAddressLabel }}</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'hostIp' }" aria-label="Ayuda sobre la dirección del host" @click.stop="togglePinnedHelp('hostIp')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.hostIp.title }}</strong>
                                    {{ fieldGuides.hostIp.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="host-ip" v-model="agentDraft.hostIp" :placeholder="fieldGuides.hostIp.placeholder" class="form-control input-dark" />
                </div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="receiver-port">Puerto HTTP del agente</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'port' }" aria-label="Ayuda sobre el puerto del agente" @click.stop="togglePinnedHelp('port')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.port.title }}</strong>
                                    {{ fieldGuides.port.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="receiver-port" v-model.number="agentDraft.port" type="number" min="1" max="65535" :placeholder="fieldGuides.port.placeholder" class="form-control input-dark" />
                </div>
                <div class="form-section-label full-span"><span>Ejecución del servicio</span></div>
                <div class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="poll-interval">Intervalo de polling en segundos</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'intervalSeconds' }" aria-label="Ayuda sobre el intervalo de polling" @click.stop="togglePinnedHelp('intervalSeconds')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.intervalSeconds.title }}</strong>
                                    {{ fieldGuides.intervalSeconds.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="poll-interval" v-model.number="agentDraft.intervalSeconds" type="number" min="10" class="form-control input-dark" />
                </div>
                <div v-if="!isWindows" class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="install-user">Usuario del servicio en Linux</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'installUser' }" aria-label="Ayuda sobre el usuario del servicio" @click.stop="togglePinnedHelp('installUser')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.installUser.title }}</strong>
                                    {{ fieldGuides.installUser.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="install-user" v-model="agentDraft.installUser" :placeholder="fieldGuides.installUser.placeholder" class="form-control input-dark" />
                </div>
                <div v-if="!isWindows" class="control-field">
                    <div class="field-heading">
                        <label class="field-label" for="service-name">Nombre técnico del servicio</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'serviceName' }" aria-label="Ayuda sobre el nombre del servicio" @click.stop="togglePinnedHelp('serviceName')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.serviceName.title }}</strong>
                                    {{ fieldGuides.serviceName.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <input id="service-name" v-model="agentDraft.serviceName" :placeholder="fieldGuides.serviceName.placeholder" class="form-control input-dark" />
                </div>
                <div class="control-field full-span auto-start-field">
                    <div class="field-heading">
                        <label class="field-label mb-0">Arranque automático</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'generateSystemd' }" aria-label="Ayuda sobre la generación del archivo systemd" @click.stop="togglePinnedHelp('generateSystemd')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.generateSystemd.title }}</strong>
                                    {{ fieldGuides.generateSystemd.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <label class="toggle-line">
                        <input type="checkbox" v-model="agentDraft.autoStart" />
                        <span>{{ isWindows ? 'Registrar tarea programada para iniciar el agente al arrancar Windows' : 'Instalar unidad systemd para iniciar el agente al arrancar Linux' }}</span>
                    </label>
                </div>
                <div class="form-section-label full-span"><span>Logs y módulos</span></div>
                <div class="control-field full-span">
                    <div class="field-heading">
                        <span class="field-label">Fuentes de logs diagnósticos</span>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'additionalLogPaths' }" aria-label="Ayuda sobre las rutas de logs adicionales" @click.stop="togglePinnedHelp('additionalLogPaths')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.additionalLogPaths.title }}</strong>
                                    {{ fieldGuides.additionalLogPaths.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div class="diagnostic-log-toolbar">
                        <p>
                            El agente consultará solo las fuentes marcadas. Cada opción explica qué endpoint, archivo o patrón
                            se leerá dentro del sistema monitorizado.
                        </p>
                        <div class="log-preset-actions">
                            <button type="button" class="btn btn-quiet" @click="selectAllDiagnosticLogs">Seleccionar todas</button>
                            <button type="button" class="btn btn-quiet" @click="clearDiagnosticLogs">Limpiar selección</button>
                        </div>
                    </div>
                    <div class="diagnostic-log-grid">
                        <label
                            class="diagnostic-log-option"
                            :class="{ 'is-help-open': pinnedHelpKey === `log:${logOption.path}` }"
                            v-for="logOption in diagnosticLogOptions"
                            :key="logOption.path"
                        >
                            <input type="checkbox" v-model="selectedDiagnosticLogPaths" :value="logOption.path" />
                            <span class="diagnostic-log-copy">
                                <strong>{{ logOption.label }}</strong>
                                <code>{{ logOption.path }}</code>
                            </span>
                            <span class="context-help diagnostic-log-help">
                                <button
                                    type="button"
                                    class="help-trigger"
                                    :class="{ 'is-pinned': pinnedHelpKey === `log:${logOption.path}` }"
                                    :aria-label="`Ver qué consulta ${logOption.label}`"
                                    @click.stop.prevent="togglePinnedHelp(`log:${logOption.path}`)"
                                >
                                    ?
                                    <span class="help-popover log-help-popover" @click.stop>
                                        <strong>{{ logOption.label }}</strong>
                                        <span>{{ logOption.description }}</span>
                                        <code>{{ logOption.path }}</code>
                                    </span>
                                </button>
                            </span>
                        </label>
                    </div>
                </div>
                <div class="control-field full-span">
                    <div class="field-heading">
                        <label class="field-label">Módulos a activar</label>
                        <div class="context-help">
                            <button type="button" class="help-trigger" :class="{ 'is-pinned': pinnedHelpKey === 'modules' }" aria-label="Ayuda sobre los módulos a activar" @click.stop="togglePinnedHelp('modules')">
                                ?
                                <span class="help-popover" @click.stop>
                                    <strong>{{ fieldGuides.modules.title }}</strong>
                                    {{ fieldGuides.modules.copy }}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div class="diagnostic-log-toolbar module-toolbar">
                        <p>
                            El agente activará solo los módulos marcados. Cada opción indica qué bloque de telemetría o
                            seguridad se recogerá en el host.
                        </p>
                        <div class="log-preset-actions">
                            <button type="button" class="btn btn-quiet" @click="selectAllModules">Seleccionar todos</button>
                            <button type="button" class="btn btn-quiet" @click="clearModules">Limpiar selección</button>
                        </div>
                    </div>
                    <div class="diagnostic-log-grid module-grid">
                        <label
                            class="diagnostic-log-option module-option"
                            :class="{ 'is-help-open': pinnedHelpKey === `module:${moduleItem.key}` }"
                            v-for="moduleItem in moduleOptions"
                            :key="moduleItem.key"
                        >
                            <input type="checkbox" v-model="agentDraft.modules[moduleItem.key]" />
                            <span class="diagnostic-log-copy module-copy">
                                <strong>{{ moduleItem.label }}</strong>
                                <code>{{ moduleItem.key }}</code>
                            </span>
                            <span class="context-help diagnostic-log-help">
                                <button
                                    type="button"
                                    class="help-trigger"
                                    :class="{ 'is-pinned': pinnedHelpKey === `module:${moduleItem.key}` }"
                                    :aria-label="`Ver qué recoge ${moduleItem.label}`"
                                    @click.stop.prevent="togglePinnedHelp(`module:${moduleItem.key}`)"
                                >
                                    ?
                                    <span class="help-popover log-help-popover" @click.stop>
                                        <strong>{{ moduleItem.label }}</strong>
                                        <span>{{ moduleItem.description }}</span>
                                        <code>{{ moduleItem.key }}</code>
                                    </span>
                                </button>
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="generator-action-panel">
                <article class="generator-action-group action-group-primary">
                    <div class="action-group-copy">
                        <span>Instalador</span>
                        <strong>Crear instalador</strong>
                        <p>Solo crea el instalador con la configuración del formulario. No registra el host ni lanza polling.</p>
                    </div>
                    <div class="action-button-row">
                        <button class="btn btn-main" :disabled="!isGenerateReady" :title="generateButtonTitle" @click="generateAndDownload">Generar instalador</button>
                        <button class="btn btn-quiet" :disabled="!generatedBundle" @click="downloadGeneratedInstaller">Descargar último</button>
                    </div>
                </article>

                <article class="generator-action-group">
                    <div class="action-group-copy">
                        <span>Operación</span>
                        <strong>Registro y polling</strong>
                        <p>Registra el host en el panel cuando ya vayas a consultarlo. El polling solo prueba hosts registrados.</p>
                    </div>
                    <div class="action-button-row">
                        <button class="btn btn-subtle" :disabled="!isGenerateReady" @click="registerCurrentDraft">Registrar host</button>
                        <button class="btn btn-subtle" :disabled="!hasRegisteredHosts" :title="pollButtonTitle" @click="pollNow">Probar polling</button>
                        <button class="btn btn-quiet" @click="clearFormData">Borrar formulario</button>
                    </div>
                </article>

                <article class="generator-action-group persistence-action-group">
                    <div class="action-group-copy">
                        <span>Persistencia</span>
                        <strong>{{ persistenceModeTitle }}</strong>
                        <p>{{ persistenceModeDescription }}</p>
                    </div>
                    <div class="persistence-mode-grid" role="radiogroup" aria-label="Modo de persistencia de Thorondor">
                        <label
                            v-for="option in persistenceOptions"
                            :key="option.value"
                            class="persistence-mode-card"
                            :class="{ 'is-active': selectedPersistenceMode === option.value, 'is-disabled': option.disabled }"
                        >
                            <input
                                type="radio"
                                name="thorondor-persistence-mode"
                                :value="option.value"
                                :checked="selectedPersistenceMode === option.value"
                                :disabled="option.disabled"
                                @change="setPersistenceMode(option.value)"
                            />
                            <span class="mode-card-main">
                                <strong>{{ option.label }}</strong>
                                <small>{{ option.copy }}</small>
                            </span>
                            <span class="mode-card-status">{{ option.status }}</span>
                        </label>
                    </div>
                </article>
            </div>
            <p v-if="!isGenerateReady" class="form-status-hint">
                Completa los campos obligatorios para habilitar la generación: {{ missingRequiredFieldLabels.join(" / ") }}.
            </p>

            <div class="action-guide-grid">
                <article class="action-guide-card" v-for="item in actionHelpCards" :key="item.title">
                    <div class="action-guide-icon">?</div>
                    <div class="action-guide-body">
                        <strong>{{ item.title }}</strong>
                        <p>{{ item.copy }}</p>
                    </div>
                </article>
            </div>
        </section>

        <section class="section-box">
            <div class="row g-3">
                <div class="col-md-6 col-xl-3" v-for="item in storageCards" :key="item.label">
                    <div class="signal-card">
                        <label>{{ item.label }}</label>
                        <span :class="item.tone">{{ item.value }}</span>
                        <small>{{ item.note }}</small>
                    </div>
                </div>
            </div>
        </section>

        <section v-if="generatedBundle" class="section-box">
            <div class="verdict-card verdict-success mb-4">
                <div class="verdict-icon">
                    <span>OK</span>
                </div>
                <div class="verdict-body">
                    <strong>Paquete generado y listo para desplegar</strong>
                    <p>
                        El instalador se ha generado sin registrar el host automáticamente. Regístralo después cuando
                        quieras empezar a consultarlo desde el panel. En Windows se crea e instala un MSI real; en Linux
                        se ejecuta un único .sh con entorno Python aislado.
                    </p>
                </div>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Resumen de despliegue</h5>
                            <span class="mini-badge">Checklist</span>
                        </div>
                        <div class="deployment-summary">
                            <div class="summary-line">
                                <label>Host</label>
                                <span>{{ buildAgentRecordFromDraft(generatedSnapshot).displayName }}</span>
                            </div>
                            <div class="summary-line">
                                <label>Destino</label>
                                <span>{{ generatedSnapshot.receiverUrl }}</span>
                            </div>
                            <div class="summary-line">
                                <label>Alcance</label>
                                <span>{{ networkScopeLabel(generatedSnapshot) }}</span>
                            </div>
                            <div class="summary-line">
                                <label>Servicio</label>
                                <span>{{ generatedSnapshot.autoStart ? (generatedSnapshot.targetOs === 'windows' ? 'ThorondorAgent' : generatedBundle.serviceFileName) : 'Arranque manual' }}</span>
                            </div>
                            <div class="summary-line">
                                <label>Autoarranque</label>
                                <span>{{ generatedSnapshot.autoStart ? 'Activado' : 'Desactivado' }}</span>
                            </div>
                            <div class="summary-line">
                                <label>Intervalo</label>
                                <span>{{ generatedSnapshot.intervalSeconds }} segundos</span>
                            </div>
                            <div class="summary-line">
                                <label>Módulos</label>
                                <span>{{ summarizeModules(generatedSnapshot.modules) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Reglas JS de petición</h5>
                            <span class="mini-badge">Frontend</span>
                        </div>
                        <div class="output-box">
                            <pre class="result-pre">{{ prettyJson(requestRulePreview) }}</pre>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-3">
                <div class="card-head">
                    <h5>Instrucciones de instalación</h5>
                    <span class="mini-badge">Markdown</span>
                </div>
                <div class="output-box tall-output">
                    <ThorondorMarkdownArticle :source="generatedBundle.instructions" />
                </div>
            </div>

            <div class="single-installer-grid mt-1">
                <div class="tool-card installer-primary-card">
                    <div class="card-head">
                        <h5>{{ generatedSnapshot?.targetOs === 'windows' ? 'Instalador MSI de Windows' : 'Instalador Linux único' }}</h5>
                        <div class="card-actions">
                            <span class="mini-badge">{{ generatedSnapshot?.targetOs === 'windows' ? 'MSI' : '.sh' }}</span>
                            <button class="btn btn-main" @click="downloadTextFile(generatedBundle.installFileName, generatedBundle.installScript)">
                                {{ generatedSnapshot?.targetOs === 'windows' ? 'Descargar instalador MSI' : 'Descargar instalador Linux' }}
                            </button>
                            <button class="btn btn-quiet" @click="copyText(generatedBundle.installScript)">Copiar</button>
                        </div>
                    </div>
                    <div class="installer-summary-grid">
                        <div class="summary-line">
                            <label>Archivo a llevar al host</label>
                            <span>{{ generatedBundle.installFileName }}</span>
                        </div>
                        <div v-if="generatedSnapshot?.targetOs === 'windows'" class="summary-line">
                            <label>MSI resultante</label>
                            <span>{{ generatedBundle.msiFileName }} en el Escritorio</span>
                        </div>
                        <div class="summary-line">
                            <label>Agente embebido</label>
                            <span>{{ generatedBundle.agentFileName }}</span>
                        </div>
                        <div class="summary-line">
                            <label>Autoarranque</label>
                            <span>{{ generatedSnapshot.autoStart ? (generatedSnapshot.targetOs === 'windows' ? 'Task Scheduler' : generatedBundle.serviceFileName) : 'Manual' }}</span>
                        </div>
                    </div>
                    <div class="output-box fixed-output">
                        <pre class="result-pre">{{ generatedBundle.installScript }}</pre>
                    </div>
                    <article v-if="generatedSnapshot?.targetOs === 'windows'" class="msi-packaging-note">
                        <strong>Flujo Windows simplificado</strong>
                        <p>
                            Descarga un único archivo, ejecútalo como administrador y el propio asistente genera
                            {{ generatedBundle.msiFileName }}, lo guarda en el Escritorio y lo instala con msiexec.
                        </p>
                    </article>
                </div>

                <div class="tool-card">
                    <div class="card-head">
                        <h5>Contenido que genera el instalador</h5>
                        <span class="mini-badge">Embebido</span>
                    </div>
                    <div class="embedded-artifact-list">
                        <div class="embedded-artifact-row">
                            <label>Python</label>
                            <span>Escribe {{ generatedBundle.agentFileName }} en la ruta de instalación del sistema.</span>
                        </div>
                        <div class="embedded-artifact-row" v-if="generatedBundle.systemd">
                            <label>systemd</label>
                            <span>Crea {{ generatedBundle.serviceFileName }} y lo habilita solo si activaste el arranque automático.</span>
                        </div>
                        <div class="embedded-artifact-row" v-else-if="generatedSnapshot?.targetOs === 'windows'">
                            <label>Windows</label>
                            <span>Compila un MSI real y crea la tarea programada ThorondorAgent solo si activaste el arranque automático.</span>
                        </div>
                        <div class="embedded-artifact-row" v-if="generatedBundle.wixSource">
                            <label>MSI</label>
                            <span>El manifiesto WiX y el instalador PowerShell van embebidos dentro del asistente descargado.</span>
                        </div>
                        <div class="embedded-artifact-row">
                            <label>Dependencias</label>
                            <span>Instala Python/psutil cuando falta y prepara permisos básicos de lectura de logs.</span>
                        </div>
                        <div class="embedded-artifact-row">
                            <label>Validación</label>
                            <span>Usa las instrucciones generadas para comprobar /health y /telemetry con token tras ejecutar el instalador.</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </ThorondorPageShell>
</template>

<script>
import ThorondorMarkdownArticle from "@/components/Thorondor/ThorondorMarkdownArticle.vue";
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";
import {
    THORONDOR_DISTRO_OPTIONS,
    THORONDOR_OS_FAMILY_OPTIONS,
    THORONDOR_WINDOWS_VERSION_OPTIONS,
    THORONDOR_MODULE_KEYS,
    THORONDOR_NETWORK_SCOPE_OPTIONS,
    THORONDOR_LINUX_DIAGNOSTIC_LOG_PATHS,
    THORONDOR_WINDOWS_DIAGNOSTIC_LOG_PATHS,
    buildThorondorAgentDraft,
    getThorondorDefaultOsVersionForTarget,
    getThorondorDefaultLogPathsForOs,
    getThorondorLinuxModelOptions,
    isThorondorDefaultDiagnosticLogPathList,
    isLegacyThorondorAgentDraft,
    normalizeThorondorNetworkScope
} from "@/features/thorondor/data/thorondorDefaults";
import { buildThorondorAgentFiles } from "@/features/thorondor/services/thorondorGenerator";
import { buildThorondorRequestRules } from "@/features/thorondor/services/thorondorApi";

function cloneDraft(value) {
    return JSON.parse(JSON.stringify(value));
}

function parseDiagnosticLogPaths(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function buildDiagnosticLogOptions(paths, guides) {
    return paths.map((path) => ({
        path,
        label: guides[path]?.label || path,
        description: guides[path]?.description || `El agente leerá las últimas líneas disponibles de ${path}.`
    }));
}

const LINUX_DIAGNOSTIC_LOG_GUIDES = {
    "/var/log/nginx/access.log": {
        label: "Nginx access",
        description: "Consulta accesos HTTP servidos por Nginx para detectar tráfico extraño, rutas repetidas, códigos de respuesta y origen de peticiones."
    },
    "/var/log/nginx/error.log": {
        label: "Nginx errores",
        description: "Consulta errores de Nginx: fallos de upstream, permisos, certificados, timeouts y problemas de configuración."
    },
    "/var/log/apache2/access.log": {
        label: "Apache access",
        description: "Consulta accesos HTTP servidos por Apache para revisar IPs, rutas, códigos de respuesta y volumen de peticiones."
    },
    "/var/log/apache2/error.log": {
        label: "Apache errores",
        description: "Consulta errores de Apache: módulos, virtual hosts, permisos, PHP/FastCGI y fallos de servicio."
    },
    "/var/log/mysql/error.log": {
        label: "MySQL errores",
        description: "Consulta errores de MySQL o MariaDB: arranques, cierres, tablas dañadas, credenciales rechazadas y fallos de motor."
    },
    "/var/log/postgresql/postgresql-*-main.log": {
        label: "PostgreSQL",
        description: "Consulta logs de PostgreSQL mediante patrón glob para recoger el log activo de la instancia principal."
    },
    "/var/log/php/error.log": {
        label: "PHP errores",
        description: "Consulta errores de PHP: excepciones, warnings, rutas rotas y problemas de ejecución de aplicaciones web."
    },
    "/var/log/syslog": {
        label: "syslog",
        description: "Consulta el log general del sistema: servicios, red, kernel, tareas programadas y mensajes operativos."
    },
    "/var/log/auth.log": {
        label: "Autenticación",
        description: "Consulta autenticación Linux: SSH, sudo, PAM, sesiones abiertas, intentos fallidos y actividad de usuarios."
    },
    "/var/log/iptables.log": {
        label: "iptables",
        description: "Consulta eventos registrados por iptables para revisar bloqueos, drops y actividad de firewall."
    },
    "/var/log/snort/": {
        label: "Snort",
        description: "Consulta los archivos más recientes del directorio de Snort para recoger alertas IDS disponibles."
    }
};

const WINDOWS_DIAGNOSTIC_LOG_GUIDES = {
    "winlog://System": {
        label: "Eventos del sistema",
        description: "Consulta Get-WinEvent sobre System: servicios, drivers, reinicios, errores de hardware, red y fallos del sistema."
    },
    "winlog://Application": {
        label: "Eventos de aplicaciones",
        description: "Consulta Get-WinEvent sobre Application: errores de aplicaciones, runtimes, servicios de terceros y fallos de ejecución."
    },
    "winlog://Security": {
        label: "Eventos de seguridad",
        description: "Consulta Get-WinEvent sobre Security: inicios de sesión, fallos de autenticación, elevaciones y eventos de auditoría."
    },
    "C:\\inetpub\\logs\\LogFiles\\W3SVC*\\u_ex*.log": {
        label: "IIS access",
        description: "Consulta logs W3C de IIS de todos los sitios W3SVC para revisar accesos, códigos HTTP, rutas e IPs cliente."
    },
    "C:\\Windows\\System32\\LogFiles\\HTTPERR\\httperr*.log": {
        label: "HTTPERR",
        description: "Consulta errores del stack HTTP de Windows: rechazos, timeouts, errores de cola y peticiones que no llegan a IIS."
    },
    "C:\\nginx\\logs\\access.log": {
        label: "Nginx access",
        description: "Consulta accesos HTTP de Nginx en Windows: rutas solicitadas, IPs origen, códigos y volumen de tráfico."
    },
    "C:\\nginx\\logs\\error.log": {
        label: "Nginx errores",
        description: "Consulta errores de Nginx en Windows: upstreams, permisos, certificados, rutas y fallos de configuración."
    },
    "C:\\Apache24\\logs\\access.log": {
        label: "Apache24 access",
        description: "Consulta accesos HTTP de Apache instalado en C:\\Apache24."
    },
    "C:\\Apache24\\logs\\error.log": {
        label: "Apache24 errores",
        description: "Consulta errores de Apache instalado en C:\\Apache24: módulos, virtual hosts, permisos y fallos de servicio."
    },
    "C:\\xampp\\apache\\logs\\access.log": {
        label: "XAMPP Apache access",
        description: "Consulta accesos HTTP del Apache incluido en XAMPP."
    },
    "C:\\xampp\\apache\\logs\\error.log": {
        label: "XAMPP Apache errores",
        description: "Consulta errores del Apache incluido en XAMPP."
    },
    "C:\\ProgramData\\MySQL\\MySQL Server *\\Data\\*.err": {
        label: "MySQL errores",
        description: "Consulta archivos .err de MySQL en ProgramData usando glob para cubrir distintas versiones instaladas."
    },
    "C:\\Program Files\\PostgreSQL\\*\\data\\log\\postgresql-*.log": {
        label: "PostgreSQL",
        description: "Consulta logs de PostgreSQL instalados en Program Files usando patrón por versión."
    },
    "C:\\php\\logs\\php_error.log": {
        label: "PHP errores",
        description: "Consulta errores de PHP instalados en C:\\php."
    },
    "C:\\xampp\\php\\logs\\php_error_log": {
        label: "XAMPP PHP errores",
        description: "Consulta errores de PHP dentro de XAMPP."
    },
    "C:\\Windows\\Temp\\php_errors.log": {
        label: "PHP temp errores",
        description: "Consulta errores PHP escritos en la carpeta temporal de Windows."
    },
    "C:\\Windows\\System32\\LogFiles\\Firewall\\pfirewall.log": {
        label: "Windows Firewall",
        description: "Consulta el log de Windows Firewall si está activado: conexiones permitidas o bloqueadas y actividad de red filtrada."
    },
    "C:\\Snort\\log\\alert.ids": {
        label: "Snort alert.ids",
        description: "Consulta alertas IDS generadas por Snort en formato alert.ids."
    },
    "C:\\Snort\\log\\alert_fast.txt": {
        label: "Snort alert_fast",
        description: "Consulta alertas rápidas de Snort para ver firmas, prioridades, IPs y puertos implicados."
    }
};

const LINUX_DIAGNOSTIC_LOG_OPTIONS = buildDiagnosticLogOptions(
    THORONDOR_LINUX_DIAGNOSTIC_LOG_PATHS,
    LINUX_DIAGNOSTIC_LOG_GUIDES
);

const WINDOWS_DIAGNOSTIC_LOG_OPTIONS = buildDiagnosticLogOptions(
    THORONDOR_WINDOWS_DIAGNOSTIC_LOG_PATHS,
    WINDOWS_DIAGNOSTIC_LOG_GUIDES
);

const FIELD_GUIDES = {
    displayName: {
        title: "Para qué sirve este nombre",
        placeholder: "Ej. Servidor web de laboratorio",
        copy: "Es el nombre legible que verás en dashboard, detalle, reglas y alertas. Usa algo que te deje reconocer el equipo sin abrir su ficha técnica."
    },
    systemName: {
        title: "Identificador interno",
        placeholder: "Ej. srv-web-01",
        copy: "Se usa para construir IDs y nombres de archivos. Conviene que sea corto, estable y fácil de rastrear en Linux y en el frontend."
    },
    distro: {
        title: "Familia Linux real",
        copy: "Selecciona la familia del host para orientar la instalación, las rutas y los comandos de la guía. Si no encaja claramente, usa Otra."
    },
    osVersion: {
        title: "Modelo del sistema",
        placeholder: "Ej. Ubuntu 24.04 LTS, Rocky Linux 9 o Windows Server 2022",
        copy: "El modelo ayuda a orientar comandos, paquetes, grupos de lectura y compatibilidad del instalador generado."
    },
    receiverUrl: {
        title: "Por qué registrar esta URL",
        placeholder: "Ej. http://127.0.0.1:8765, http://192.168.1.50:8765 o https://thorondor.midominio.com",
        copy: "Es la direccion local o de red que queda registrada para comprobar el servicio del agente. La telemetria operativa viaja por la API central."
    },
    centralApiBaseUrl: {
        title: "API central alcanzable por el agente",
        placeholder: "Ej. https://api.thorondor.midominio.com o http://192.168.0.253:8082",
        copy: "Debe ser una URL absoluta alcanzable desde el host monitorizado. No uses /api aqui: esa ruta solo funciona dentro del navegador."
    },
    centralEnrollmentToken: {
        title: "Token de alta del agente",
        placeholder: "Pega el valor de THORONDOR_AGENT_ENROLLMENT_TOKEN",
        copy: "Autoriza el primer registro del agente en el back. El instalador genera ademas un token propio del agente y el back guarda solo su hash."
    },
    networkScope: {
        title: "Alcance de red",
        copy: "Clasifica cómo se alcanza el agente: Local, LAN o Remoto. En Remoto usa firewall restrictivo y HTTPS si la aplicación se sirve por HTTPS."
    },
    hostIp: {
        title: "Dirección operativa del host",
        placeholder: "Ej. 192.168.1.50, 203.0.113.20 o thorondor.midominio.com",
        copy: "Es opcional si la URL ya incluye la IP o el dominio. Rellénalo solo cuando quieras dejar una referencia clara del host monitorizado."
    },
    port: {
        title: "Puerto HTTP del agente",
        placeholder: "Ej. 8765",
        copy: "Debe coincidir con el puerto que escuchará el script, el que abras en firewall y el que luego probarás con curl desde la red."
    },
    intervalSeconds: {
        title: "Cadencia de muestreo",
        copy: "Define cada cuántos segundos quieres refrescar la telemetría. Es el ritmo base del agente y de las reglas de petición que genera el frontend."
    },
    installUser: {
        title: "Usuario del servicio",
        placeholder: "Ej. thorondor",
        copy: "Es la cuenta Linux que ejecutará el agente. Debe tener acceso a la carpeta de trabajo y, si procede, a grupos como adm o systemd-journal."
    },
    serviceName: {
        title: "Nombre técnico del servicio",
        placeholder: "Ej. thorondor-agent",
        copy: "Marca el nombre base de la unidad systemd que el instalador creará dentro del host. Cuanto más claro sea, más fácil será mantenerlo con systemctl y journalctl."
    },
    additionalLogPaths: {
        title: "Logs diagnósticos",
        copy: "Escribe una ruta por línea para incluir logs de aplicaciones, sistema, firewall o IDS. Puedes usar globs, directorios y en Windows fuentes winlog://System, winlog://Application o winlog://Security."
    },
    modules: {
        title: "Qué bloques recoger",
        copy: "Activa solo lo que te aporta valor. Menos módulos implica menos ruido, menos lecturas innecesarias y una telemetría más fácil de interpretar."
    },
    generateSystemd: {
        title: "Despliegue persistente",
        copy: "Actívalo si quieres que el instalador deje el agente arrancando automáticamente: systemd en Linux o una tarea programada en Windows. Si lo desactivas, solo deja el agente listo para arranque manual."
    }
};

const ACTION_HELP_CARDS = [
    {
        title: "Por qué registrar el host en el front",
        copy: "Registrar el host guarda en el navegador su ficha, sus endpoints y sus reglas de petición. Sin ese paso, el panel no sabe qué agente existe ni a dónde consultar sus datos."
    },
    {
        title: "Qué hace Probar polling",
        copy: "Lanza al instante un health check y una recogida de telemetría contra los hosts ya registrados. Sirve para validar conectividad, refrescar heartbeat y poblar alertas sin esperar al siguiente ciclo automático."
    }
];

const REQUIRED_GENERATION_FIELDS_LINUX = [
    { key: "displayName", label: "Nombre visible del host", id: "host-display-name" },
    { key: "systemName", label: "Identificador técnico del sistema", id: "system-name" },
    { key: "centralApiBaseUrl", label: "URL publica de la API central", id: "central-api-base-url" },
    { key: "centralEnrollmentToken", label: "Token de enrolamiento", id: "central-enrollment-token" },
    { key: "receiverUrl", label: "URL accesible del agente", id: "receiver-url" },
    { key: "port", label: "Puerto HTTP del agente", id: "receiver-port" }
];

const REQUIRED_GENERATION_FIELDS_WINDOWS = [
    { key: "displayName", label: "Nombre visible del host", id: "host-display-name" },
    { key: "systemName", label: "Identificador técnico del sistema", id: "system-name" },
    { key: "centralApiBaseUrl", label: "URL publica de la API central", id: "central-api-base-url" },
    { key: "centralEnrollmentToken", label: "Token de enrolamiento", id: "central-enrollment-token" },
    { key: "receiverUrl", label: "URL accesible del agente", id: "receiver-url" },
    { key: "port", label: "Puerto HTTP del agente", id: "receiver-port" }
];

function hasTrimmedText(value) {
    return String(value ?? "").trim().length > 0;
}

function hasValidHttpUrl(value) {
    if (!hasTrimmedText(value)) return false;

    try {
        const parsed = new URL(String(value).trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

function hasValidPort(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535;
}

function generateSecretToken(byteLength = 32) {
    const bytes = new Uint8Array(byteLength);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default {
    name: "ThorondorGeneradorAgentesView",

    components: {
        ThorondorMarkdownArticle,
        ThorondorPageShell
    },

    mixins: [thorondorBaseMixin],

    data() {
        return {
            agentDraft: buildThorondorAgentDraft(),
            generatedBundle: null,
            generatedSnapshot: null,
            centralEnrollmentToken: "",
            pinnedHelpKey: null
        };
    },

    computed: {
        isWindows() {
            return this.agentDraft.targetOs === "windows";
        },

        normalizedNetworkScope() {
            return normalizeThorondorNetworkScope(this.agentDraft.networkScope);
        },

        isLocalScope() {
            return this.normalizedNetworkScope === "local";
        },

        isLanScope() {
            return this.normalizedNetworkScope === "lan";
        },

        distroOptions() {
            return THORONDOR_DISTRO_OPTIONS;
        },

        osFamilyOptions() {
            return THORONDOR_OS_FAMILY_OPTIONS;
        },

        linuxOsModelOptions() {
            return getThorondorLinuxModelOptions(this.agentDraft.distro);
        },

        windowsVersionOptions() {
            return THORONDOR_WINDOWS_VERSION_OPTIONS;
        },

        currentOsVersionOptions() {
            return this.isWindows ? this.windowsVersionOptions : this.linuxOsModelOptions;
        },

        selectedOsHint() {
            return this.isWindows
                ? "Descarga un único asistente: genera ThorondorAgent.msi, lo deja en el Escritorio y lo instala con msiexec."
                : "Descarga un shell autocontenido. Detecta apt, dnf o pacman, crea un entorno Python aislado y prepara systemd si activas autoarranque.";
        },

        simpleInstallTitle() {
            return this.isWindows ? "Windows: MSI generado e instalado" : "Linux: un solo .sh con sudo";
        },

        simpleInstallCopy() {
            return this.isWindows
                ? "Ejecuta el asistente como administrador. No tendrás que tocar WiX ni mover archivos sueltos: el MSI se crea e instala en el propio Windows."
                : "Ejecuta el .sh con sudo. Puedes ajustar distro, usuario, rutas de logs, módulos y servicio sin montar piezas sueltas.";
        },

        moduleOptions() {
            return THORONDOR_MODULE_KEYS;
        },

        diagnosticLogOptions() {
            return this.isWindows ? WINDOWS_DIAGNOSTIC_LOG_OPTIONS : LINUX_DIAGNOSTIC_LOG_OPTIONS;
        },

        selectedDiagnosticLogPaths: {
            get() {
                return parseDiagnosticLogPaths(this.agentDraft.additionalLogPaths);
            },
            set(values) {
                const selectedPaths = new Set(Array.isArray(values) ? values : []);
                const orderedPaths = this.diagnosticLogOptions
                    .filter((item) => selectedPaths.has(item.path))
                    .map((item) => item.path);

                this.agentDraft.additionalLogPaths = orderedPaths.join("\n");
            }
        },

        networkScopeOptions() {
            return THORONDOR_NETWORK_SCOPE_OPTIONS;
        },

        selectedNetworkScopeCopy() {
            return this.networkScopeOptions.find((item) => item.value === this.normalizedNetworkScope)?.copy || "";
        },

        receiverUrlLabel() {
            if (this.isLocalScope) return "URL local del agente";
            if (this.isLanScope) return "URL LAN o VPN accesible desde este navegador";
            return "URL remota pública o DNS del agente";
        },

        receiverUrlPlaceholder() {
            if (this.isLocalScope) return "Ej. http://127.0.0.1:8765";
            if (this.isLanScope) return "Ej. http://192.168.1.50:8765 o http://10.8.0.12:8765";
            return "Ej. https://thorondor.midominio.com o http://203.0.113.20:8765";
        },

        hostAddressLabel() {
            if (this.isLanScope) return this.isWindows ? "IP privada o VPN del host Windows (opcional)" : "IP privada o VPN del host Linux (opcional)";
            return this.isWindows ? "IP pública o DNS del host Windows (opcional)" : "IP pública o DNS del host Linux (opcional)";
        },

        fieldGuides() {
            return FIELD_GUIDES;
        },

        actionHelpCards() {
            return ACTION_HELP_CARDS;
        },

        requiredFields() {
            return [...(this.isWindows ? REQUIRED_GENERATION_FIELDS_WINDOWS : REQUIRED_GENERATION_FIELDS_LINUX)];
        },

        missingRequiredFieldLabels() {
            return this.getMissingRequiredFields().map((field) => field.label);
        },

        isGenerateReady() {
            return this.missingRequiredFieldLabels.length === 0;
        },

        generateButtonTitle() {
            return this.isGenerateReady
                ? "Genera el paquete y descarga el instalador único sin registrar todavía el host."
                : `Completa primero: ${this.missingRequiredFieldLabels.join(", ")}`;
        },

        hasRegisteredHosts() {
            return this.dashboardCards.length > 0;
        },

        pollButtonTitle() {
            return this.hasRegisteredHosts
                ? "Ejecuta ahora el polling contra los hosts registrados."
                : "Registra al menos un host antes de lanzar polling.";
        },

        persistenceStatus() {
            return this.thorondorState.persistence || {};
        },

        selectedPersistenceMode() {
            return this.persistenceStatus.requestedMode || this.persistenceStatus.effectiveMode || "local";
        },

        persistenceEffectiveMode() {
            return this.persistenceStatus.effectiveMode || "local";
        },

        persistenceModeTitle() {
            if (this.selectedPersistenceMode === "cloud" && !this.persistenceStatus.cloudConfigured) {
                return "API no configurada";
            }

            return this.persistenceEffectiveMode === "cloud"
                ? "API del back activa"
                : "IndexedDB local activo";
        },

        persistenceModeDescription() {
            if (this.selectedPersistenceMode === "cloud" && !this.persistenceStatus.cloudConfigured) {
                return "Falta configurar la URL de la API. Mientras tanto Thorondor mantiene los datos en IndexedDB para no perder trabajo.";
            }

            if (this.persistenceEffectiveMode === "cloud") {
                return "Los cambios se guardan en IndexedDB como caché y se sincronizan con la API del back para tener persistencia centralizada.";
            }

            return "Los hosts, reglas, eventos y borradores se guardan solo en el navegador mediante IndexedDB.";
        },

        persistenceOptions() {
            const cloudConfigured = Boolean(this.persistenceStatus.cloudConfigured);
            const effectiveMode = this.persistenceEffectiveMode;

            return [
                {
                    value: "local",
                    label: "IndexedDB local",
                    copy: "Datos guardados en este navegador. Ideal para pruebas rápidas y laboratorio.",
                    status: effectiveMode === "local" ? "Activo" : "Disponible",
                    disabled: false
                },
                {
                    value: "cloud",
                    label: "API del back",
                    copy: cloudConfigured
                        ? "Persistencia centralizada en la API, con IndexedDB como caché local."
                        : "Configura VITE_THORONDOR_API_BASE_URL para activar la persistencia con API.",
                    status: cloudConfigured
                        ? (effectiveMode === "cloud" ? "Activo" : "Disponible")
                        : "Sin API",
                    disabled: !cloudConfigured
                }
            ];
        },

        generatorHighlights() {
            return [
                {
                    label: "Sin piezas sueltas",
                    copy: "Windows genera MSI y Linux descarga un .sh listo para ejecutar."
                },
                {
                    label: "Conexión clara",
                    copy: "URL, puerto y alcance definen desde dónde consultará el panel."
                },
                {
                    label: "Autoarranque",
                    copy: "Puedes dejar servicio/tarea al iniciar o usar ejecución manual."
                },
                {
                    label: "Flujo separado",
                    copy: "Generar, registrar y probar polling son pasos independientes."
                }
            ];
        },

        requestRulePreview() {
            const source = this.generatedSnapshot || this.agentDraft;
            return buildThorondorRequestRules(this.buildAgentRecordFromDraft(source));
        },

        storageCards() {
            return [
                {
                    label: "Hosts registrados",
                    value: String(this.dashboardCards.length),
                    tone: "tone-blue",
                    note: "Agentes persistidos según el modo de datos activo."
                },
                {
                    label: "Último polling",
                    value: this.thorondorLastPollAt ? this.formatRelativeTime(this.thorondorLastPollAt) : "Pendiente",
                    tone: "tone-success",
                    note: "El navegador ya puede probar los hosts guardados."
                },
                {
                    label: "Alertas activas",
                    value: String(this.activeAlerts.length),
                    tone: this.activeAlerts.length ? "tone-warning" : "tone-success",
                    note: "Visibles después de registrar el agente y empezar el polling."
                },
                {
                    label: "Persistencia",
                    value: this.persistenceEffectiveMode === "cloud" ? "API" : "IndexedDB",
                    tone: this.persistenceEffectiveMode === "cloud" ? "tone-success" : "tone-neutral",
                    note: this.persistenceModeDescription
                }
            ];
        }
    },

    watch: {
        agentDraft: {
            deep: true,
            handler(value) {
                this.$store.dispatch("saveThorondorGeneratorDraft", cloneDraft(value));
            }
        }
    },

    async mounted() {
        const persistedDraft = this.thorondorState.generatorDraft || buildThorondorAgentDraft();
        if (isLegacyThorondorAgentDraft(persistedDraft)) {
            this.agentDraft = buildThorondorAgentDraft();
            await this.$store.dispatch("clearThorondorGeneratorDraft");
        } else {
            this.agentDraft = this.normalizeDraftShape(persistedDraft);
        }

        if (typeof document !== "undefined") {
            document.addEventListener("click", this.handleOutsideHelpClick);
        }
    },

    beforeUnmount() {
        if (typeof document !== "undefined") {
            document.removeEventListener("click", this.handleOutsideHelpClick);
        }
    },

    methods: {
        setTargetOs(targetOs) {
            const normalizedTargetOs = targetOs === "windows" ? "windows" : "linux";
            const shouldReplaceLogPaths = !String(this.agentDraft.additionalLogPaths || "").trim()
                || isThorondorDefaultDiagnosticLogPathList(this.agentDraft.additionalLogPaths);
            const nextDistro = normalizedTargetOs === "windows"
                ? "Windows"
                : (THORONDOR_DISTRO_OPTIONS.includes(this.agentDraft.distro)
                    ? this.agentDraft.distro
                    : THORONDOR_DISTRO_OPTIONS[0]);
            const versionOptions = normalizedTargetOs === "windows"
                ? THORONDOR_WINDOWS_VERSION_OPTIONS
                : getThorondorLinuxModelOptions(nextDistro);
            const nextOsVersion = versionOptions.includes(this.agentDraft.osVersion)
                ? this.agentDraft.osVersion
                : getThorondorDefaultOsVersionForTarget(normalizedTargetOs, nextDistro);

            this.agentDraft = {
                ...this.agentDraft,
                targetOs: normalizedTargetOs,
                distro: nextDistro,
                osVersion: nextOsVersion,
                autoStart: this.agentDraft.autoStart !== false,
                generateSystemd: normalizedTargetOs === "windows" ? false : this.agentDraft.autoStart !== false,
                additionalLogPaths: shouldReplaceLogPaths
                    ? getThorondorDefaultLogPathsForOs(normalizedTargetOs)
                    : this.agentDraft.additionalLogPaths
            };
        },

        handleDistroChange() {
            const versionOptions = getThorondorLinuxModelOptions(this.agentDraft.distro);
            if (!versionOptions.includes(this.agentDraft.osVersion)) {
                this.agentDraft.osVersion = versionOptions[0] || "";
            }
        },

        selectAllDiagnosticLogs() {
            this.agentDraft.additionalLogPaths = this.diagnosticLogOptions.map((item) => item.path).join("\n");
        },

        clearDiagnosticLogs() {
            this.agentDraft.additionalLogPaths = "";
        },

        selectAllModules() {
            THORONDOR_MODULE_KEYS.forEach((item) => {
                this.agentDraft.modules[item.key] = true;
            });
        },

        clearModules() {
            THORONDOR_MODULE_KEYS.forEach((item) => {
                this.agentDraft.modules[item.key] = false;
            });
        },

        prettyJson(value) {
            return JSON.stringify(value, null, 2);
        },

        getMissingRequiredFields(source = this.agentDraft) {
            const draft = this.normalizeDraftShape(source);
            const baseFields = draft.targetOs === "windows" ? REQUIRED_GENERATION_FIELDS_WINDOWS : REQUIRED_GENERATION_FIELDS_LINUX;
            const fields = [...baseFields];

            return fields.filter(({ key }) => {
                if (key === "centralEnrollmentToken") return !hasTrimmedText(this.centralEnrollmentToken);
                if (key === "centralApiBaseUrl") return !hasValidHttpUrl(draft.centralApiBaseUrl);
                if (key === "receiverUrl") return !hasValidHttpUrl(draft.receiverUrl);
                if (key === "port") return !hasValidPort(draft.port);
                return !hasTrimmedText(draft[key]);
            });
        },

        focusFirstMissingField(source = this.agentDraft) {
            if (typeof document === "undefined") return;

            const firstMissingField = this.getMissingRequiredFields(source)[0];
            if (!firstMissingField?.id) return;

            document.getElementById(firstMissingField.id)?.focus();
        },

        normalizeDraftShape(source = {}) {
            const targetOs = source?.targetOs === "windows" ? "windows" : "linux";
            const base = buildThorondorAgentDraft(targetOs);
            const draft = cloneDraft(source || {});
            const additionalLogPaths = !draft.additionalLogPaths || isThorondorDefaultDiagnosticLogPathList(draft.additionalLogPaths)
                ? getThorondorDefaultLogPathsForOs(targetOs)
                : draft.additionalLogPaths;
            const requestedDistro = String(draft.distro ?? base.distro);
            const normalizedDistro = targetOs === "windows"
                ? "Windows"
                : (THORONDOR_DISTRO_OPTIONS.includes(requestedDistro) ? requestedDistro : base.distro);
            const versionOptions = targetOs === "windows"
                ? THORONDOR_WINDOWS_VERSION_OPTIONS
                : getThorondorLinuxModelOptions(normalizedDistro);
            const requestedOsVersion = String(draft.osVersion ?? base.osVersion);
            const normalizedOsVersion = versionOptions.includes(requestedOsVersion)
                ? requestedOsVersion
                : getThorondorDefaultOsVersionForTarget(targetOs, normalizedDistro);

            return {
                ...base,
                targetOs,
                displayName: String(draft.displayName ?? base.displayName),
                systemName: String(draft.systemName ?? base.systemName),
                distro: normalizedDistro,
                osVersion: normalizedOsVersion,
                receiverUrl: String(draft.receiverUrl ?? base.receiverUrl),
                centralApiBaseUrl: String(draft.centralApiBaseUrl ?? base.centralApiBaseUrl),
                networkScope: normalizeThorondorNetworkScope(draft.networkScope ?? base.networkScope),
                corsOrigin: String(draft.corsOrigin ?? base.corsOrigin),
                hostIp: String(draft.hostIp ?? base.hostIp),
                installUser: String(draft.installUser ?? base.installUser),
                serviceName: String(draft.serviceName ?? base.serviceName),
                notes: String(draft.notes ?? base.notes),
                port: draft.port === "" || draft.port === null || draft.port === undefined ? base.port : draft.port,
                intervalSeconds: draft.intervalSeconds === "" || draft.intervalSeconds === null || draft.intervalSeconds === undefined
                    ? base.intervalSeconds
                    : Number(draft.intervalSeconds) || base.intervalSeconds,
                additionalLogPaths: typeof additionalLogPaths === "string" ? additionalLogPaths : base.additionalLogPaths,
                modules: {
                    ...base.modules,
                    ...draft.modules
                },
                autoStart: draft.autoStart === undefined
                    ? (draft.generateSystemd === undefined ? base.autoStart : !!draft.generateSystemd)
                    : !!draft.autoStart,
                generateSystemd: targetOs === "windows"
                    ? false
                    : (draft.autoStart === undefined
                        ? (draft.generateSystemd === undefined ? base.generateSystemd : !!draft.generateSystemd)
                        : !!draft.autoStart)
            };
        },

        normalizeDraftForOutput(source = this.agentDraft) {
            const draft = this.normalizeDraftShape(source);
            const record = this.buildAgentRecordFromDraft(draft);

            return {
                ...draft,
                displayName: record.displayName,
                systemName: record.systemName,
                distro: draft.distro || "Otra",
                osVersion: draft.osVersion.trim(),
                receiverUrl: record.receiverUrl,
                centralApiBaseUrl: record.centralApiBaseUrl,
                centralEnrollmentToken: this.centralEnrollmentToken.trim(),
                agentToken: generateSecretToken(),
                networkScope: record.networkScope,
                corsOrigin: record.corsOrigin,
                hostIp: record.hostIp,
                port: record.port,
                intervalSeconds: record.intervalSeconds,
                installUser: record.installUser,
                serviceName: record.serviceName,
                modules: { ...draft.modules },
                autoStart: draft.autoStart !== false,
                generateSystemd: draft.targetOs !== "windows" && draft.autoStart !== false,
                additionalLogPaths: String(draft.additionalLogPaths || "")
            };
        },

        buildAgentRecordFromDraft(source = this.agentDraft) {
            const normalizedSource = this.normalizeDraftShape(source);
            const systemName = normalizedSource.systemName.trim() || "thorondor-host";
            const port = Number(normalizedSource.port) || 8765;
            const networkScope = normalizeThorondorNetworkScope(normalizedSource.networkScope);
            const configuredReceiverUrl = normalizedSource.receiverUrl.trim();
            let receiverUrlHost = "";

            try {
                receiverUrlHost = configuredReceiverUrl ? new URL(configuredReceiverUrl).hostname : "";
            } catch {
                receiverUrlHost = "";
            }

            const hostIp = networkScope === "local" ? "127.0.0.1" : (normalizedSource.hostIp.trim() || receiverUrlHost || "127.0.0.1");
            const receiverUrl = configuredReceiverUrl || `http://${hostIp}:${port}`;
            return {
                id: `${systemName}-${hostIp}-${port}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                displayName: normalizedSource.displayName.trim() || systemName,
                systemName,
                targetOs: normalizedSource.targetOs === "windows" ? "windows" : "linux",
                distro: normalizedSource.distro || "Otra",
                osVersion: normalizedSource.osVersion.trim(),
                receiverUrl,
                centralApiBaseUrl: normalizedSource.centralApiBaseUrl.trim(),
                networkScope,
                corsOrigin: normalizedSource.corsOrigin.trim() || "*",
                hostIp,
                port,
                intervalSeconds: Number(normalizedSource.intervalSeconds) || 30,
                additionalLogPaths: normalizedSource.additionalLogPaths,
                modules: { ...normalizedSource.modules },
                autoStart: normalizedSource.autoStart !== false,
                generateSystemd: normalizedSource.targetOs !== "windows" && normalizedSource.autoStart !== false,
                installUser: normalizedSource.installUser.trim() || "thorondor",
                serviceName: normalizedSource.serviceName.trim() || "thorondor-agent",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        },

        async registerCurrentDraft() {
            if (this.getMissingRequiredFields().length) {
                this.focusFirstMissingField();
                return;
            }

            const record = this.buildAgentRecordFromDraft(this.normalizeDraftForOutput());
            await this.$store.dispatch("registerThorondorAgent", record);
            this.$store.commit("setThorondorSelectedAgent", record.id);
        },

        async setPersistenceMode(mode) {
            if (mode === this.selectedPersistenceMode) return;
            await this.$store.dispatch("setThorondorPersistenceMode", mode);
        },

        async generateAndDownload() {
            if (!this.isGenerateReady) {
                this.focusFirstMissingField();
                return;
            }

            const draftSnapshot = cloneDraft(this.agentDraft);
            const normalizedDraft = this.normalizeDraftForOutput(draftSnapshot);

            this.generatedSnapshot = normalizedDraft;
            this.generatedBundle = buildThorondorAgentFiles(normalizedDraft);

            this.downloadTextFile(this.generatedBundle.installFileName, this.generatedBundle.installScript);
        },

        downloadGeneratedInstaller() {
            if (!this.generatedBundle) return;
            this.downloadTextFile(this.generatedBundle.installFileName, this.generatedBundle.installScript);
        },

        async clearFormData() {
            this.agentDraft = buildThorondorAgentDraft(this.agentDraft.targetOs);
            await this.$store.dispatch("clearThorondorGeneratorDraft");
        },

        handleNetworkScopeChange() {
            const scope = this.normalizedNetworkScope;
            const port = Number(this.agentDraft.port) || 8765;
            const currentReceiverUrl = String(this.agentDraft.receiverUrl || "");
            const currentHostIp = String(this.agentDraft.hostIp || "");
            const wasLocal = /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i.test(currentReceiverUrl)
                || currentHostIp === "127.0.0.1"
                || currentHostIp.toLowerCase() === "localhost";

            if (scope === "local") {
                this.agentDraft.hostIp = "127.0.0.1";
                this.agentDraft.receiverUrl = `http://127.0.0.1:${port}`;
                return;
            }

            if (scope === "lan") {
                if (wasLocal) {
                    this.agentDraft.receiverUrl = "";
                    this.agentDraft.hostIp = "";
                }
                return;
            }

            if (wasLocal) {
                this.agentDraft.receiverUrl = "";
                this.agentDraft.hostIp = "";
            }
        },

        togglePinnedHelp(key) {
            this.pinnedHelpKey = this.pinnedHelpKey === key ? null : key;
        },

        handleOutsideHelpClick(event) {
            if (!event.target?.closest(".context-help")) {
                this.pinnedHelpKey = null;
            }
        },

        downloadTextFile(filename, content) {
            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);
        },

        async copyText(text) {
            if (!navigator.clipboard?.writeText) return;
            await navigator.clipboard.writeText(text);
        }
    }
};
</script>

<style scoped>
.generator-hero {
    gap: 1.15rem;
    padding-bottom: 1.35rem;
}

.generator-hero-top {
    grid-template-columns: minmax(0, 1fr) minmax(230px, 300px);
    align-items: center;
}

.generator-hero .section-copy {
    max-width: 74ch;
    line-height: 1.62;
}

.generator-hero-summary {
    display: grid;
    gap: 0.35rem;
    padding: 0.2rem 0 0.2rem 1.2rem;
    border-left: 1px solid rgba(176, 184, 194, 0.18);
}

.generator-hero-summary span {
    width: fit-content;
    padding: 0.28rem 0.55rem;
    border: 1px solid rgba(176, 184, 194, 0.24);
    border-radius: 3px;
    background: var(--thorondor-soft-background);
    color: #dce6f2;
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.generator-hero-summary strong {
    color: #f8fafc;
    font-size: 1rem;
}

.generator-hero-summary small {
    color: rgba(203, 213, 225, 0.78);
    line-height: 1.5;
}

.generator-flow-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    padding: 0.95rem 0 0;
    margin: 0;
    border-top: 1px solid rgba(176, 184, 194, 0.14);
    list-style: none;
}

.generator-flow-list li {
    display: grid;
    gap: 0.4rem;
    min-width: 0;
    padding: 0 1rem;
    border-right: 1px solid rgba(176, 184, 194, 0.12);
}

.generator-flow-list li:first-child {
    padding-left: 0;
}

.generator-flow-list li:last-child {
    padding-right: 0;
    border-right: 0;
}

.generator-flow-list strong {
    color: #f3f7fb;
    font-size: 0.76rem;
    font-weight: 850;
    letter-spacing: 0.06em;
    line-height: 1.25;
    text-transform: uppercase;
}

.generator-flow-list span {
    color: rgba(203, 213, 225, 0.78);
    font-size: 0.86rem;
    line-height: 1.5;
}

@media (max-width: 980px) {
    .generator-hero-top {
        grid-template-columns: 1fr;
    }

    .generator-hero-summary {
        padding: 0.85rem 0 0;
        border-top: 1px solid rgba(176, 184, 194, 0.14);
        border-left: 0;
    }

    .generator-flow-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        row-gap: 0.9rem;
    }

    .generator-flow-list li:nth-child(2n) {
        padding-right: 0;
        border-right: 0;
    }

    .generator-flow-list li:nth-child(2n + 1) {
        padding-left: 0;
    }
}

@media (max-width: 540px) {
    .generator-flow-list {
        grid-template-columns: 1fr;
        padding-top: 0.65rem;
    }

    .generator-flow-list li {
        padding: 0.72rem 0;
        border-right: 0;
        border-bottom: 1px solid rgba(176, 184, 194, 0.11);
    }

    .generator-flow-list li:last-child {
        padding-bottom: 0;
        border-bottom: 0;
    }
}

.deployment-summary {
    display: grid;
    gap: 0.85rem;
}

.single-installer-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
    gap: 1rem;
    align-items: stretch;
}

.installer-primary-card {
    min-width: 0;
}

.installer-summary-grid,
.embedded-artifact-list {
    display: grid;
    gap: 0.85rem;
}

.msi-packaging-note {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.85rem;
    padding: 0.9rem 1rem;
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.msi-packaging-note strong {
    color: #f8fafc;
    font-size: 0.88rem;
}

.msi-packaging-note p {
    margin: 0;
    color: rgba(203, 213, 225, 0.86);
    line-height: 1.55;
}

.embedded-artifact-row {
    display: grid;
    gap: 0.3rem;
    padding-bottom: 0.8rem;
    border-bottom: 1px solid rgba(176, 184, 194, 0.18);
}

.embedded-artifact-row:last-child {
    padding-bottom: 0;
    border-bottom: 0;
}

.embedded-artifact-row label {
    color: rgba(198, 210, 222, 0.72);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.embedded-artifact-row span {
    color: #f4f8fb;
    line-height: 1.55;
}

.summary-line {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(176, 184, 194, 0.18);
}

.summary-line:last-child {
    border-bottom: 0;
    padding-bottom: 0;
}

.summary-line label {
    color: rgba(198, 210, 222, 0.72);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.summary-line span {
    color: #f4f8fb;
    text-align: right;
}

.control-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    column-gap: 0.85rem;
    row-gap: 0.95rem;
    align-items: start;
    margin-top: 1.05rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(176, 184, 194, 0.16);
}

.form-section-label {
    display: flex;
    grid-column: 1 / -1;
    align-items: center;
    gap: 0.75rem;
    margin: 0.15rem 0 -0.05rem;
    color: #e8edf4;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    line-height: 1.2;
    text-transform: uppercase;
}

.form-section-label:first-child {
    margin-top: 0;
}

.form-section-label::after {
    content: "";
    flex: 1 1 auto;
    height: 1px;
    background: linear-gradient(90deg, rgba(176, 184, 194, 0.32), rgba(176, 184, 194, 0.03));
}

.deployment-selector-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
    gap: 1.25rem;
    align-items: end;
    padding: 1.1rem;
    border: 1px solid rgba(176, 184, 194, 0.24);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.deployment-selector-copy {
    display: grid;
    gap: 0.45rem;
}

.deployment-selector-control {
    display: grid;
    gap: 0.45rem;
}

.log-preset-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.35rem;
}

.field-heading {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.34rem;
    min-height: 0;
    margin: 0;
}

.field-heading .field-label {
    margin: 0;
    flex: 0 1 auto;
    max-width: none;
    color: rgba(226, 232, 240, 0.92);
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1.18;
    text-transform: uppercase;
}

.control-field {
    display: grid;
    gap: 0.38rem;
    align-content: start;
    min-width: 0;
}

.control-field :is(.form-control, .form-select) {
    min-height: 2.72rem;
    border-radius: 4px;
    padding: 0.62rem 0.72rem;
    line-height: 1.35;
}

.control-field textarea.textarea-dark {
    min-height: 10rem;
    line-height: 1.45;
}

.diagnostic-log-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.9rem;
    padding: 0.7rem 0.75rem;
    border: 1px solid rgba(176, 184, 194, 0.18);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
}

.diagnostic-log-toolbar p {
    max-width: 58rem;
    margin: 0;
    color: rgba(203, 213, 225, 0.82);
    font-size: 0.84rem;
    line-height: 1.55;
}

.checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 0.5rem;
}

.diagnostic-log-grid {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.55rem;
    overflow: visible;
}

.diagnostic-log-option {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: flex-start;
    min-height: 4.85rem;
    padding: 0.72rem;
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
    color: #dce3eb;
    cursor: var(--cursor-pointer), pointer;
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
    overflow: visible;
}

.diagnostic-log-option:hover,
.diagnostic-log-option:focus-within,
.diagnostic-log-option.is-help-open {
    z-index: 5000;
    border-color: rgba(203, 213, 225, 0.42);
    background: var(--thorondor-nested-background);
    box-shadow: 0 12px 26px rgba(0, 0, 0, 0.24);
}

.diagnostic-log-option input {
    margin-top: 0.25rem;
    accent-color: #aeb8c4;
}

.diagnostic-log-copy {
    display: grid;
    gap: 0.28rem;
    min-width: 0;
}

.diagnostic-log-copy strong {
    color: #f1f5f9;
    font-size: 0.82rem;
    line-height: 1.25;
}

.diagnostic-log-copy code {
    display: block;
    max-width: 100%;
    color: rgba(186, 205, 230, 0.78);
    font-size: 0.73rem;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.context-help.diagnostic-log-help {
    align-self: flex-start;
    position: static;
    z-index: 20;
}

.context-help.diagnostic-log-help .help-trigger {
    position: static;
}

.context-help.diagnostic-log-help .help-popover {
    top: calc(100% + 0.45rem);
    right: 0.72rem;
    left: 0.72rem;
    width: auto;
}

.context-help.diagnostic-log-help .help-popover::before {
    right: 0.9rem;
    left: auto;
}

.toggle-line {
    min-height: 2.65rem;
    padding: 0.62rem 0.72rem;
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
    line-height: 1.35;
}

.auto-start-field .toggle-line {
    min-height: 0;
    align-items: flex-start;
}

.context-help {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    margin-top: 0;
    z-index: 10;
}

.context-help:hover,
.context-help:focus-within {
    z-index: 3000;
}

.help-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.08rem;
    height: 1.08rem;
    border-radius: 4px;
    border: 1px solid rgba(176, 184, 194, 0.32);
    background: var(--thorondor-nested-background);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
    color: #dbe5ef;
    font-size: 0.58rem;
    font-weight: 700;
    cursor: var(--cursor-pointer), pointer;
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.help-trigger:hover,
.help-trigger.is-pinned {
    z-index: 3001;
    border-color: rgba(203, 213, 225, 0.62);
    background: var(--thorondor-soft-background);
    color: #ffffff;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
}

.help-popover {
    position: absolute;
    top: calc(100% + 0.8rem);
    right: 0;
    width: min(320px, calc(100vw - 3rem));
    padding: 0.95rem 1rem;
    border-radius: 4px;
    border: 1px solid rgba(176, 184, 194, 0.36);
    background: var(--thorondor-panel-background);
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
    color: rgba(225, 234, 244, 0.95);
    font-size: 0.84rem;
    line-height: 1.65;
    text-align: left;
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 4000;
}

.help-popover::before {
    content: "";
    position: absolute;
    top: -7px;
    right: 14px;
    width: 14px;
    height: 14px;
    border-top: 1px solid rgba(176, 184, 194, 0.36);
    border-left: 1px solid rgba(176, 184, 194, 0.36);
    background: var(--thorondor-panel-background);
    transform: rotate(45deg);
}

.help-popover strong {
    display: block;
    margin-bottom: 0.35rem;
    color: #f8fbff;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.log-help-popover {
    width: min(390px, calc(100vw - 3rem));
}

.log-help-popover span {
    display: block;
    margin-bottom: 0.65rem;
}

.log-help-popover code {
    display: block;
    padding: 0.45rem 0.55rem;
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
    color: #dce8f7;
    font-size: 0.76rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
    white-space: normal;
}

.help-trigger:hover .help-popover,
.help-trigger.is-pinned .help-popover {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

.action-guide-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 1rem;
}

.generator-action-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.9rem;
    margin-top: 1.15rem;
}

.generator-action-group {
    display: grid;
    gap: 0.9rem;
    align-content: space-between;
    padding: 1rem;
    border: 1px solid rgba(176, 184, 194, 0.2);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.action-group-primary {
    border-color: rgba(229, 236, 246, 0.32);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.persistence-action-group {
    grid-column: 1 / -1;
}

.action-group-copy {
    display: grid;
    gap: 0.32rem;
}

.action-group-copy span {
    color: rgba(194, 211, 232, 0.78);
    font-size: 0.69rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.action-group-copy strong {
    color: #f7fbff;
    font-size: 1rem;
}

.action-group-copy p {
    margin: 0;
    color: rgba(212, 224, 236, 0.8);
    font-size: 0.84rem;
    line-height: 1.55;
}

.action-button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
}

.generator-action-group .btn:disabled {
    opacity: 0.5;
    cursor: var(--cursor-not-allowed), not-allowed;
    box-shadow: none;
    transform: none;
    filter: saturate(0.7);
}

.persistence-mode-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
}

.persistence-mode-card {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.7rem;
    align-items: center;
    min-height: 5rem;
    padding: 0.85rem;
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
    color: #e7edf5;
    cursor: var(--cursor-pointer), pointer;
    transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.persistence-mode-card:hover {
    border-color: rgba(229, 236, 246, 0.42);
    background: var(--thorondor-nested-background);
    transform: translateY(-1px);
}

.persistence-mode-card.is-active {
    border-color: rgba(234, 242, 252, 0.62);
    background: var(--thorondor-nested-background);
}

.persistence-mode-card.is-disabled {
    opacity: 0.56;
    cursor: var(--cursor-not-allowed), not-allowed;
    transform: none;
}

.persistence-mode-card input {
    width: 1rem;
    height: 1rem;
    accent-color: #d8e3ef;
}

.mode-card-main {
    display: grid;
    gap: 0.22rem;
    min-width: 0;
}

.mode-card-main strong {
    color: #f7fbff;
    font-size: 0.9rem;
}

.mode-card-main small {
    color: rgba(203, 213, 225, 0.76);
    font-size: 0.78rem;
    line-height: 1.45;
}

.mode-card-status {
    justify-self: end;
    padding: 0.28rem 0.48rem;
    border: 1px solid rgba(176, 184, 194, 0.24);
    border-radius: 3px;
    background: var(--thorondor-soft-background);
    color: #e7edf5;
    font-size: 0.67rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.btn-main:disabled {
    opacity: 0.56;
    cursor: var(--cursor-not-allowed), not-allowed;
    box-shadow: none;
    transform: none;
    filter: saturate(0.75);
}

.form-status-hint {
    margin: 0.85rem 0 0;
    color: rgba(209, 221, 233, 0.84);
    font-size: 0.83rem;
    line-height: 1.6;
}

.action-guide-card {
    display: flex;
    gap: 0.9rem;
    align-items: flex-start;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid rgba(176, 184, 194, 0.24);
    background: var(--thorondor-nested-background);
}

.action-guide-icon {
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
    border: 1px solid rgba(176, 184, 194, 0.36);
    background: var(--thorondor-soft-background);
    color: #dbe5ef;
    font-size: 0.88rem;
    font-weight: 700;
}

.action-guide-body strong {
    display: block;
    margin-bottom: 0.35rem;
    color: #f4f8fb;
}

.action-guide-body p {
    margin: 0;
    color: rgba(218, 229, 240, 0.84);
    line-height: 1.65;
}

@media (max-width: 767px) {
    .control-grid {
        grid-template-columns: 1fr;
        row-gap: 0.85rem;
        padding-top: 0.8rem;
    }

    .form-section-label {
        margin-top: 0.25rem;
        font-size: 0.68rem;
    }

    .field-heading {
        min-height: auto;
        gap: 0.32rem;
    }

    .field-heading .field-label {
        font-size: 0.71rem;
    }

    .help-popover {
        left: 0;
        right: auto;
    }

    .help-popover::before {
        left: 14px;
        right: auto;
    }

    .action-guide-grid {
        grid-template-columns: 1fr;
    }

    .generator-action-panel,
    .persistence-mode-grid {
        grid-template-columns: 1fr;
    }

    .generator-action-group {
        padding: 0.85rem;
    }

    .action-button-row {
        align-items: stretch;
        flex-direction: column;
    }

    .action-button-row .btn {
        width: 100%;
        justify-content: center;
    }

    .persistence-mode-card {
        grid-template-columns: auto minmax(0, 1fr);
    }

    .mode-card-status {
        grid-column: 2;
        justify-self: start;
    }

    .single-installer-grid {
        grid-template-columns: 1fr;
    }

    .deployment-selector-panel {
        grid-template-columns: 1fr;
    }

    .checkbox-grid {
        grid-template-columns: 1fr;
    }

    .diagnostic-log-toolbar {
        align-items: stretch;
        flex-direction: column;
    }

    .diagnostic-log-grid {
        grid-template-columns: 1fr;
    }

    .diagnostic-log-option {
        min-height: 0;
    }

    .diagnostic-log-help .help-popover {
        left: 0.72rem;
        right: 0.72rem;
    }

    .diagnostic-log-help .help-popover::before {
        left: auto;
        right: 0.9rem;
    }
}

.os-selector-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
    gap: 1rem;
    align-items: end;
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid rgba(176, 184, 194, 0.2);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
}

.os-selector-copy {
    display: grid;
    gap: 0.35rem;
}

.os-family-control {
    align-self: stretch;
}

.os-install-summary {
    grid-column: 1 / -1;
    display: grid;
    gap: 0.35rem;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(176, 184, 194, 0.16);
}

.os-install-summary strong {
    display: block;
    margin-bottom: 0.28rem;
    color: #f8fafc;
    font-size: 0.92rem;
}

.os-install-summary p {
    margin: 0;
    color: rgba(203, 213, 225, 0.82);
    font-size: 0.82rem;
    line-height: 1.55;
}

.os-hint {
    margin: 0;
    font-size: 0.81rem;
    color: rgba(193, 213, 247, 0.7);
    line-height: 1.55;
}

@media (max-width: 767px) {
    .os-selector-panel {
        grid-template-columns: 1fr;
    }
}
</style>
