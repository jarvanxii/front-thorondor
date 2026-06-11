<template>
    <ThorondorPageShell>
        <section class="section-box intro-box generator-builder-section">
            <div class="section-topline generator-hero-top">
                <header class="module-header">
                    <span class="section-kicker">Instalador de agentes</span>
                    <h1 class="section-name">Generador de agentes</h1>
                    <p class="section-copy">
                        Completa nombre, IP o DNS, puerto y sistema operativo. Thorondor genera un único instalador con
                        key agents, detección automática, persistencia y autoarranque.
                    </p>
                </header>
                <aside class="generator-hero-summary" aria-label="Resumen del generador">
                    <span>Un fichero</span>
                    <strong>{{ agentDraft.targetOs === 'windows' ? 'thorondor-installer.ps1' : 'thorondor-installer.sh' }}</strong>
                    <small>{{ persistenceModeTitle }}</small>
                </aside>
            </div>

            <div class="generator-intake-grid">
                <div class="generator-setup-panel">
                    <div class="generator-setup-copy">
                        <span class="section-kicker">Generación rápida</span>
                        <h2 class="module-title">Datos del host</h2>
                        <p class="module-copy">
                            El instalador incluye la configuración necesaria. No tienes que elegir módulos, rutas de logs
                            ni servicios internos.
                        </p>
                    </div>
                    <div class="generator-setup-controls">
                        <label class="control-field" for="target-os-family">
                            <span class="field-label">Sistema operativo</span>
                            <select id="target-os-family" :value="agentDraft.targetOs" class="form-select input-dark" @change="setTargetOs($event.target.value)">
                                <option v-for="item in osFamilyOptions" :key="item.value" :value="item.value">
                                    {{ item.label }}
                                </option>
                            </select>
                        </label>
                    </div>
                </div>

                <article class="generator-persistence-panel">
                    <div class="action-group-copy">
                        <span>Persistencia</span>
                        <strong>{{ persistenceModeTitle }}</strong>
                        <p>{{ persistenceModeDescription }}</p>
                    </div>
                    <div class="persistence-mode-grid persistence-mode-grid-compact" role="radiogroup" aria-label="Modo de persistencia de Thorondor">
                        <label
                            v-for="option in persistenceOptions"
                            :key="option.value"
                            class="persistence-mode-card"
                            :class="{ 'is-active': selectedPersistenceMode === option.value, 'is-disabled': option.disabled || persistenceModeChanging }"
                        >
                            <input
                                type="radio"
                                name="thorondor-persistence-mode"
                                :value="option.value"
                                :checked="selectedPersistenceMode === option.value"
                                :disabled="option.disabled || persistenceModeChanging"
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
        </section>

        <section class="section-box generator-form-section">
            <div class="control-grid">
                <div class="form-section-label full-span"><span>Datos mínimos</span></div>
                <div class="control-field wide-field">
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
                <div class="control-field wide-field">
                    <div class="field-heading">
                        <label class="field-label" for="host-ip">IP o DNS del host</label>
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
                        <label class="field-label" for="agent-port">Puerto del agente</label>
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
                    <input
                        id="agent-port"
                        v-model.number="agentDraft.port"
                        :placeholder="fieldGuides.port.placeholder"
                        class="form-control input-dark"
                        inputmode="numeric"
                        min="1"
                        max="65535"
                        type="number"
                    />
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
                        <p>Registra el agente en el panel cuando ya vayas a consultarlo. El polling solo prueba agentes registrados.</p>
                    </div>
                    <div class="action-button-row">
                        <button class="btn btn-subtle" :disabled="!isGenerateReady" @click="registerCurrentDraft">Registrar host</button>
                        <button class="btn btn-subtle" :disabled="!hasRegisteredHosts" :title="pollButtonTitle" @click="pollNow">Probar polling</button>
                        <button class="btn btn-quiet" @click="clearFormData">Borrar formulario</button>
                    </div>
                </article>

            </div>
        </section>

        <section v-if="generatedBundle" class="section-box generated-installer-section">
            <div class="verdict-card verdict-success mb-3">
                <div class="verdict-icon">
                    <span>OK</span>
                </div>
                <div class="verdict-body">
                    <strong>Instalador listo</strong>
                    <p>
                        Descarga {{ generatedBundle.installFileName }}, cópialo al host y ejecútalo con permisos elevados.
                        Después registra el agente si quieres empezar a consultarlo desde Thorondor.
                    </p>
                </div>
            </div>

            <div class="deployment-steps-grid mb-3">
                <article class="deployment-step-card">
                    <span>1</span>
                    <strong>Descarga el instalador</strong>
                    <small>{{ generatedBundle.installFileName }}</small>
                </article>
                <article class="deployment-step-card">
                    <span>2</span>
                    <strong>Ejecútalo en el host</strong>
                    <small>{{ generatedSnapshot.targetOs === 'windows' ? 'PowerShell como administrador' : 'sudo o root' }}</small>
                </article>
                <article class="deployment-step-card">
                    <span>3</span>
                    <strong>Valida y registra</strong>
                    <small>{{ generatedSnapshot.receiverUrl }}</small>
                </article>
            </div>

            <div class="tool-card mb-3">
                <div class="card-head">
                    <h5>Instalador</h5>
                    <div class="card-actions">
                        <span class="mini-badge">{{ generatedSnapshot?.targetOs === 'windows' ? '.ps1' : '.sh' }}</span>
                        <button class="btn btn-main" @click="downloadTextFile(generatedBundle.installFileName, generatedBundle.installScript)">
                            Descargar instalador
                        </button>
                        <button class="btn btn-quiet" @click="copyText(generatedBundle.installScript)">Copiar script</button>
                    </div>
                </div>
                <div class="deployment-summary deployment-summary-compact">
                    <div class="summary-line">
                        <label>Host</label>
                        <span>{{ buildAgentRecordFromDraft(generatedSnapshot).displayName }}</span>
                    </div>
                    <div class="summary-line">
                        <label>Puerto</label>
                        <span>{{ generatedSnapshot.port }}</span>
                    </div>
                    <div class="summary-line">
                        <label>Persistencia</label>
                        <span>{{ generatedSnapshot.persistenceMode === 'cloud' ? 'Servidor Thorondor' : 'IndexedDB local' }}</span>
                    </div>
                    <div class="summary-line">
                        <label>Desinstalar</label>
                        <span>{{ generatedUninstallPath }}</span>
                    </div>
                </div>
                <details class="script-details">
                    <summary>Ver script generado</summary>
                    <div class="output-box fixed-output">
                        <pre class="result-pre">{{ generatedBundle.installScript }}</pre>
                    </div>
                </details>
            </div>

            <div class="tool-card mb-3">
                <div class="card-head">
                    <h5>Instrucciones</h5>
                    <span class="mini-badge">{{ generatedSnapshot?.targetOs === 'windows' ? 'Windows' : 'Linux' }}</span>
                </div>
                <div class="output-box tall-output">
                    <ThorondorMarkdownArticle :source="generatedBundle.instructions" />
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
    THORONDOR_AGENT_FIXED_PORT,
    THORONDOR_AGENT_FIXED_SERVICE_NAME,
    THORONDOR_DISTRO_OPTIONS,
    THORONDOR_OS_FAMILY_OPTIONS,
    THORONDOR_WINDOWS_VERSION_OPTIONS,
    buildThorondorAgentDraft,
    getThorondorDefaultOsVersionForTarget,
    getThorondorLinuxModelOptions,
    isLegacyThorondorAgentDraft
} from "@/features/thorondor/data/thorondorDefaults";
import { buildThorondorAgentFiles } from "@/features/thorondor/services/thorondorGenerator";

function cloneDraft(value) {
    return JSON.parse(JSON.stringify(value));
}

const FIELD_GUIDES = {
    displayName: {
        title: "Nombre visible",
        placeholder: "Nombre visible del host",
        copy: "Etiqueta usada en dashboard, detalle, reglas y alertas."
    },
    hostIp: {
        title: "Host monitorizado",
        placeholder: "127.0.0.1, 192.168.0.25 o servidor.midominio.com",
        copy: "IP o DNS del sistema donde se ejecutará el agente. Puedes usar una IP pública, privada o un DNS."
    },
    port: {
        title: "Puerto de acceso",
        placeholder: String(THORONDOR_AGENT_FIXED_PORT),
        copy: "Puerto HTTP por el que Thorondor consultará /health y /telemetry. Úsalo para diferenciar túneles sobre la misma IP pública."
    }
};

const REQUIRED_GENERATION_FIELDS_LINUX = [
    { key: "displayName", label: "Nombre visible del host", id: "host-display-name" },
    { key: "hostIp", label: "IP o DNS del host", id: "host-ip" },
    { key: "port", label: "Puerto del agente", id: "agent-port" }
];

const REQUIRED_GENERATION_FIELDS_WINDOWS = [
    { key: "displayName", label: "Nombre visible del host", id: "host-display-name" },
    { key: "hostIp", label: "IP o DNS del host", id: "host-ip" },
    { key: "port", label: "Puerto del agente", id: "agent-port" }
];

function hasTrimmedText(value) {
    return String(value ?? "").trim().length > 0;
}

function normalizeHostAddress(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";

    try {
        const parsed = new URL(rawValue.includes("://") ? rawValue : `http://${rawValue}`);
        return parsed.hostname || rawValue;
    } catch {
        return rawValue
            .replace(/^https?:\/\//i, "")
            .replace(/\/.*$/, "")
            .replace(/:\d+$/, "")
            .trim();
    }
}

function extractPortFromAddress(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue) return 0;

    try {
        const parsed = new URL(rawValue.includes("://") ? rawValue : `http://${rawValue}`);
        return normalizeAgentPort(parsed.port, 0);
    } catch {
        const match = rawValue.match(/:(\d{1,5})(?:\/.*)?$/);
        return match ? normalizeAgentPort(match[1], 0) : 0;
    }
}

function normalizeAgentPort(value, fallback = THORONDOR_AGENT_FIXED_PORT) {
    const port = Number.parseInt(String(value ?? "").trim(), 10);
    if (Number.isInteger(port) && port >= 1 && port <= 65535) {
        return port;
    }
    return fallback;
}

function isValidAgentPort(value) {
    const port = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function isLocalHostAddress(value) {
    const host = normalizeHostAddress(value).toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
}

function inferNetworkScopeFromHost(value) {
    return isLocalHostAddress(value) ? "local" : "lan";
}

function buildReceiverUrlFromHost(value, port = THORONDOR_AGENT_FIXED_PORT) {
    const host = normalizeHostAddress(value) || "127.0.0.1";
    const hostForUrl = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
    return `http://${hostForUrl}:${port}`;
}

function clearTemplateOnlyDraftFields(draft = {}) {
    const copy = { ...draft };
    const noIdentity = !hasTrimmedText(copy.displayName);

    if (!noIdentity) return copy;

    if (String(copy.receiverUrl || "") === `http://127.0.0.1:${THORONDOR_AGENT_FIXED_PORT}`) copy.receiverUrl = "";
    if (String(copy.hostIp || "") === "127.0.0.1") copy.hostIp = "";
    if (String(copy.installUser || "") === "thorondor") copy.installUser = "";
    if (String(copy.serviceName || "") === THORONDOR_AGENT_FIXED_SERVICE_NAME) copy.serviceName = "";
    if (Number(copy.port) === THORONDOR_AGENT_FIXED_PORT) copy.port = "";
    if (Number(copy.intervalSeconds) === 30) copy.intervalSeconds = "";
    if (hasTrimmedText(copy.centralApiBaseUrl)) copy.centralApiBaseUrl = "";

    return copy;
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
            pinnedHelpKey: null,
            persistenceModeChanging: false
        };
    },

    computed: {
        isWindows() {
            return this.agentDraft.targetOs === "windows";
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

        fieldGuides() {
            return FIELD_GUIDES;
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
                ? "Genera y descarga el instalador único."
                : `Completa primero: ${this.missingRequiredFieldLabels.join(", ")}`;
        },

        hasRegisteredHosts() {
            return this.dashboardCards.length > 0;
        },

        pollButtonTitle() {
            return this.hasRegisteredHosts
                ? "Ejecuta ahora el polling contra los agentes registrados."
                : "Registra al menos un agente antes de lanzar polling.";
        },

        persistenceStatus() {
            return this.thorondorState.persistence || {};
        },

        currentSessionUser() {
            return this.thorondorState.session?.user || null;
        },

        currentUserKeyAgents() {
            return String(this.currentSessionUser?.keyAgents || this.currentSessionUser?.key_agents || "").trim();
        },

        isCurrentUserAuthorized() {
            return Boolean(
                this.currentSessionUser?.canUseCloudPersistence
                    || this.currentSessionUser?.usuarioAutorizado
                    || this.currentSessionUser?.usuario_autorizado
            );
        },

        selectedPersistenceMode() {
            return this.persistenceStatus.requestedMode || this.persistenceStatus.effectiveMode || "local";
        },

        persistenceEffectiveMode() {
            return this.persistenceStatus.effectiveMode || "local";
        },

        canUseDatabasePersistence() {
            return Boolean(this.persistenceStatus.cloudAllowed && this.isCurrentUserAuthorized);
        },

        persistenceModeTitle() {
            if (!this.canUseDatabasePersistence) {
                return "IndexedDB local obligatorio";
            }

            if (this.selectedPersistenceMode === "cloud" && !this.persistenceStatus.cloudConfigured) {
                return "API no configurada";
            }

            return this.persistenceEffectiveMode === "cloud"
                ? "Servidor Thorondor activo"
                : "IndexedDB local activo";
        },

        persistenceModeDescription() {
            if (!this.canUseDatabasePersistence) {
                return this.persistenceStatus.cloudAccessReason || "Usuario no autorizado para usar BBDD por API.";
            }

            if (this.selectedPersistenceMode === "cloud" && !this.persistenceStatus.cloudConfigured) {
                return "API sin configurar. Thorondor usa IndexedDB local.";
            }

            if (this.persistenceEffectiveMode === "cloud") {
                return "Logs, eventos, alertas y agentes se guardan en la BBDD del servidor. IndexedDB queda como caché local.";
            }

            return "Agentes, reglas, eventos y borradores se guardan en este navegador.";
        },

        persistenceOptions() {
            const cloudConfigured = Boolean(this.persistenceStatus.cloudConfigured);
            const effectiveMode = this.persistenceEffectiveMode;
            const cloudDisabledReason = !this.isCurrentUserAuthorized
                ? "Usuario no autorizado"
                : !this.persistenceStatus.cloudAllowed
                    ? "Sin permiso"
                    : !cloudConfigured
                        ? "Sin API"
                        : "";

            return [
                {
                    value: "local",
                    label: "IndexedDB local",
                    copy: "Guarda logs y eventos en este navegador. El instalador no sincroniza contra la API central.",
                    status: effectiveMode === "local" ? "Activo" : "Disponible",
                    disabled: false
                },
                {
                    value: "cloud",
                    label: "Servidor Thorondor",
                    copy: cloudDisabledReason
                        ? "Requiere usuario autorizado por un admin."
                        : "Guarda logs y eventos en la BBDD del servidor mediante API autenticada.",
                    status: cloudDisabledReason || (effectiveMode === "cloud" ? "Activo" : "Disponible"),
                    disabled: Boolean(cloudDisabledReason)
                }
            ];
        },

        generatedUninstallPath() {
            if (!this.generatedSnapshot) return "";
            return this.generatedSnapshot.targetOs === "windows"
                ? "C:\\ProgramData\\Thorondor-Agent\\thorondor-uninstaller.ps1"
                : "/opt/thorondor-agent/thorondor-uninstaller.sh";
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
                autoStart: true,
                generateSystemd: normalizedTargetOs !== "windows"
            };
        },

        handleDistroChange() {
            const versionOptions = getThorondorLinuxModelOptions(this.agentDraft.distro);
            if (!versionOptions.includes(this.agentDraft.osVersion)) {
                this.agentDraft.osVersion = versionOptions[0] || "";
            }
        },

        getMissingRequiredFields(source = this.agentDraft) {
            const draft = this.normalizeDraftShape(source);
            const baseFields = draft.targetOs === "windows" ? REQUIRED_GENERATION_FIELDS_WINDOWS : REQUIRED_GENERATION_FIELDS_LINUX;
            const fields = [...baseFields];

            return fields.filter(({ key }) => {
                if (key === "hostIp") return !hasTrimmedText(normalizeHostAddress(draft.hostIp));
                if (key === "port") {
                    const rawPort = source?.port
                        ?? (extractPortFromAddress(source?.hostIp) || extractPortFromAddress(source?.receiverUrl) || draft.port);
                    return !isValidAgentPort(rawPort);
                }
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
            const draft = clearTemplateOnlyDraftFields(cloneDraft(source || {}));
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
            const displayName = String(draft.displayName ?? base.displayName);
            const hostIp = normalizeHostAddress(draft.hostIp || draft.receiverUrl || base.hostIp);
            const port = normalizeAgentPort(
                draft.port || extractPortFromAddress(draft.hostIp) || extractPortFromAddress(draft.receiverUrl) || base.port
            );
            const receiverUrl = hostIp ? buildReceiverUrlFromHost(hostIp, port) : "";

            return {
                ...base,
                targetOs,
                displayName,
                systemName: displayName.trim(),
                distro: normalizedDistro,
                osVersion: normalizedOsVersion,
                receiverUrl,
                centralApiBaseUrl: String(draft.centralApiBaseUrl ?? base.centralApiBaseUrl),
                networkScope: hostIp ? inferNetworkScopeFromHost(hostIp) : base.networkScope,
                corsOrigin: String(draft.corsOrigin ?? base.corsOrigin),
                hostIp,
                installUser: String(draft.installUser ?? base.installUser),
                serviceName: THORONDOR_AGENT_FIXED_SERVICE_NAME,
                keyAgents: String(draft.keyAgents ?? draft.agentToken ?? base.keyAgents ?? this.currentUserKeyAgents ?? ""),
                agentToken: String(draft.keyAgents ?? draft.agentToken ?? base.agentToken ?? this.currentUserKeyAgents ?? ""),
                centralEnrollmentToken: String(draft.centralEnrollmentToken ?? base.centralEnrollmentToken ?? ""),
                persistenceMode: draft.persistenceMode === "cloud" ? "cloud" : "local",
                notes: String(draft.notes ?? base.notes),
                port,
                intervalSeconds: draft.intervalSeconds === "" || draft.intervalSeconds === null || draft.intervalSeconds === undefined
                    ? base.intervalSeconds
                    : Number(draft.intervalSeconds) || base.intervalSeconds,
                additionalLogPaths: "",
                modules: {},
                autoStart: true,
                generateSystemd: targetOs !== "windows"
            };
        },

        normalizeDraftForOutput(source = this.agentDraft) {
            const draft = this.normalizeDraftShape(source);
            const record = this.buildAgentRecordFromDraft(draft);
            const persistenceMode = this.canUseDatabasePersistence && this.persistenceEffectiveMode === "cloud"
                ? "cloud"
                : "local";
            const keyAgents = String(draft.keyAgents || draft.agentToken || this.currentUserKeyAgents || generateSecretToken()).trim();
            const centralEnrollmentToken = "";

            return {
                ...draft,
                displayName: record.displayName,
                systemName: record.systemName,
                distro: draft.distro || "Otra",
                osVersion: draft.osVersion.trim(),
                receiverUrl: record.receiverUrl,
                centralApiBaseUrl: persistenceMode === "cloud" ? record.centralApiBaseUrl : "",
                centralEnrollmentToken,
                keyAgents,
                agentToken: keyAgents,
                persistenceMode,
                centralSyncEnabled: persistenceMode === "cloud",
                networkScope: record.networkScope,
                corsOrigin: record.corsOrigin,
                hostIp: record.hostIp,
                port: record.port,
                intervalSeconds: record.intervalSeconds,
                installUser: record.installUser,
                serviceName: THORONDOR_AGENT_FIXED_SERVICE_NAME,
                modules: {},
                autoStart: true,
                generateSystemd: draft.targetOs !== "windows",
                additionalLogPaths: ""
            };
        },

        buildAgentRecordFromDraft(source = this.agentDraft) {
            const normalizedSource = this.normalizeDraftShape(source);
            const displayName = normalizedSource.displayName.trim();
            const systemName = displayName || "thorondor-host";
            const port = normalizeAgentPort(normalizedSource.port);
            const hostIp = normalizeHostAddress(normalizedSource.hostIp) || "127.0.0.1";
            const networkScope = inferNetworkScopeFromHost(hostIp);
            const receiverUrl = buildReceiverUrlFromHost(hostIp, port);
            return {
                id: `${systemName}-${hostIp}-${port}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                displayName: displayName || systemName,
                systemName,
                targetOs: normalizedSource.targetOs === "windows" ? "windows" : "linux",
                distro: normalizedSource.distro || "Otra",
                osVersion: normalizedSource.osVersion.trim(),
                receiverUrl,
                centralApiBaseUrl: normalizedSource.persistenceMode === "cloud" ? normalizedSource.centralApiBaseUrl.trim() : "",
                persistenceMode: normalizedSource.persistenceMode === "cloud" ? "cloud" : "local",
                centralSyncEnabled: normalizedSource.persistenceMode === "cloud",
                keyAgents: String(normalizedSource.keyAgents || normalizedSource.agentToken || "").trim(),
                agentToken: String(normalizedSource.keyAgents || normalizedSource.agentToken || "").trim(),
                centralEnrollmentToken: String(normalizedSource.centralEnrollmentToken || "").trim(),
                networkScope,
                corsOrigin: normalizedSource.corsOrigin.trim() || "*",
                hostIp,
                port,
                intervalSeconds: Number(normalizedSource.intervalSeconds) || 30,
                additionalLogPaths: "",
                modules: {},
                autoStart: true,
                generateSystemd: normalizedSource.targetOs !== "windows",
                installUser: normalizedSource.installUser.trim() || "thorondor",
                serviceName: THORONDOR_AGENT_FIXED_SERVICE_NAME,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        },

        async registerCurrentDraft() {
            if (this.getMissingRequiredFields().length) {
                this.focusFirstMissingField();
                return;
            }

            const normalizedDraft = this.normalizeDraftForOutput();
            this.agentDraft = this.normalizeDraftShape({
                ...this.agentDraft,
                keyAgents: normalizedDraft.keyAgents,
                agentToken: normalizedDraft.keyAgents,
                centralEnrollmentToken: normalizedDraft.centralEnrollmentToken,
                persistenceMode: normalizedDraft.persistenceMode
            });
            const record = this.buildAgentRecordFromDraft(normalizedDraft);
            await this.$store.dispatch("registerThorondorAgent", record);
            this.$store.commit("setThorondorSelectedAgent", record.id);
        },

        async setPersistenceMode(mode) {
            if (mode === this.selectedPersistenceMode) return;
            const option = this.persistenceOptions.find((item) => item.value === mode);
            if (option?.disabled) return;
            this.persistenceModeChanging = true;
            try {
                await this.$store.dispatch("setThorondorPersistenceMode", mode);
                this.agentDraft = this.normalizeDraftShape({
                    ...this.agentDraft,
                    persistenceMode: mode === "cloud" ? "cloud" : "local"
                });
            } finally {
                this.persistenceModeChanging = false;
            }
        },

        async generateAndDownload() {
            if (!this.isGenerateReady) {
                this.focusFirstMissingField();
                return;
            }

            const draftSnapshot = cloneDraft(this.agentDraft);
            const normalizedDraft = this.normalizeDraftForOutput(draftSnapshot);

            this.agentDraft = this.normalizeDraftShape({
                ...this.agentDraft,
                keyAgents: normalizedDraft.keyAgents,
                agentToken: normalizedDraft.keyAgents,
                centralEnrollmentToken: normalizedDraft.centralEnrollmentToken,
                persistenceMode: normalizedDraft.persistenceMode
            });
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
.generator-builder-section {
    gap: 1.15rem;
    padding-bottom: 1.05rem;
}

.generator-hero-top {
    grid-template-columns: minmax(0, 1fr) minmax(230px, 300px);
    align-items: center;
}

.generator-builder-section .section-copy {
    max-width: 74ch;
    line-height: 1.62;
}

.generator-intake-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(330px, 0.75fr);
    gap: 0.85rem;
    align-items: stretch;
    margin-top: 1rem;
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

.deployment-summary {
    display: grid;
    gap: 0.85rem;
}

.generator-form-section {
    overflow: visible;
}

.deployment-steps-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    align-items: stretch;
}

.deployment-step-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.2rem 0.75rem;
    align-content: start;
    padding: 0.9rem;
    border: 1px solid rgba(236, 194, 119, 0.2);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.deployment-step-card > span {
    display: grid;
    grid-row: 1 / 3;
    width: 2rem;
    height: 2rem;
    place-items: center;
    border: 1px solid rgba(236, 194, 119, 0.28);
    border-radius: 4px;
    background: rgba(236, 194, 119, 0.1);
    color: #f3cf8c;
    font-size: 0.82rem;
    font-weight: 900;
}

.deployment-step-card strong {
    color: #f8fafc;
    font-size: 0.92rem;
    line-height: 1.25;
}

.deployment-step-card small {
    overflow-wrap: anywhere;
    color: rgba(203, 213, 225, 0.82);
    font-size: 0.8rem;
    line-height: 1.4;
}

.installer-primary-card {
    min-width: 0;
}

.deployment-summary-compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem 1.1rem;
    padding-top: 0.8rem;
    border-top: 1px solid rgba(176, 184, 194, 0.14);
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

.script-details {
    margin-top: 0.85rem;
    border-top: 1px solid rgba(176, 184, 194, 0.14);
    padding-top: 0.85rem;
}

.script-details summary {
    width: fit-content;
    color: #f0bc6a;
    font-size: 0.78rem;
    font-weight: 850;
    cursor: var(--cursor-pointer), pointer;
}

.script-details .output-box {
    margin-top: 0.75rem;
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

.generator-setup-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.55fr);
    gap: 1rem 1.2rem;
    align-items: start;
    padding: 1rem;
    border: 1px solid rgba(176, 184, 194, 0.24);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.generator-persistence-panel {
    display: grid;
    gap: 0.9rem;
    align-content: start;
    padding: 1rem;
    border: 1px solid rgba(176, 184, 194, 0.24);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.generator-setup-copy {
    display: grid;
    gap: 0.36rem;
    align-content: start;
}

.generator-setup-copy .module-title {
    margin: 0;
    font-size: clamp(1.2rem, 2vw, 1.55rem);
    line-height: 1.12;
}

.generator-setup-copy .module-copy {
    max-width: 72ch;
    margin: 0;
    color: rgba(212, 224, 236, 0.84);
    font-size: 0.91rem;
    line-height: 1.52;
}

.generator-setup-controls {
    display: grid;
    grid-template-columns: minmax(220px, 1fr);
    gap: 0.72rem;
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

.control-field.wide-field {
    grid-column: span 2;
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
    padding: 0.82rem 0.9rem;
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
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
    gap: 0.72rem;
    overflow: visible;
}

.module-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.diagnostic-log-option {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: flex-start;
    min-height: 6rem;
    padding: 0.92rem;
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
    z-index: 650;
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
    gap: 0.34rem;
    min-width: 0;
}

.diagnostic-log-copy strong {
    color: #f1f5f9;
    font-size: 0.86rem;
    line-height: 1.25;
}

.diagnostic-log-copy code {
    display: block;
    max-width: 100%;
    color: rgba(186, 205, 230, 0.78);
    font-size: 0.73rem;
    line-height: 1.42;
    overflow: hidden;
    text-overflow: clip;
    white-space: pre-line;
    overflow-wrap: anywhere;
}

.module-option {
    min-height: 5.25rem;
}

.module-copy code {
    white-space: normal;
}

.context-help.diagnostic-log-help {
    align-self: flex-start;
    position: relative;
    z-index: 700;
}

.context-help.diagnostic-log-help .help-trigger {
    position: relative;
    z-index: 710;
}

.context-help.diagnostic-log-help .help-popover {
    top: calc(100% + 0.62rem);
    right: 0;
    left: auto;
    width: min(340px, calc(100vw - 3rem));
    z-index: 800;
}

.context-help.diagnostic-log-help .help-popover::before {
    right: 0.1rem;
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
    z-index: 40;
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
    z-index: 41;
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
    z-index: 500;
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

.persistence-mode-grid-compact {
    grid-template-columns: 1fr;
    gap: 0.62rem;
}

.persistence-mode-card {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.7rem;
    align-items: center;
    min-height: 5rem;
    padding: 0.78rem;
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

@media (max-width: 1180px) {
    .generator-intake-grid {
        grid-template-columns: 1fr;
    }

    .persistence-mode-grid-compact {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 767px) {
    .generator-hero-top,
    .generator-intake-grid {
        grid-template-columns: 1fr;
    }

    .generator-hero-summary {
        padding: 0.85rem 0 0;
        border-top: 1px solid rgba(176, 184, 194, 0.18);
        border-left: 0;
    }

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

    .control-field.wide-field {
        grid-column: auto;
    }

    .help-popover {
        left: 0;
        right: auto;
    }

    .help-popover::before {
        left: 14px;
        right: auto;
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

    .deployment-steps-grid,
    .deployment-summary-compact {
        grid-template-columns: 1fr;
    }

    .generator-setup-panel {
        grid-template-columns: 1fr;
    }

    .generator-setup-controls {
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
        right: 0;
        left: auto;
        width: min(320px, calc(100vw - 3rem));
    }

    .diagnostic-log-help .help-popover::before {
        left: auto;
        right: 0.1rem;
    }
}

</style>
