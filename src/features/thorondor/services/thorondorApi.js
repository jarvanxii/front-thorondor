function normalizeBaseUrl(agent) {
  const raw = String(agent?.receiverUrl || "").trim();
  const host = String(agent?.hostIp || "").trim();
  const port = String(agent?.port || "").trim();

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }

  if (host && port) {
    return `http://${host}:${port}`;
  }

  if (host) {
    return `http://${host}`;
  }

  return "";
}

function buildJsonHeaders(agent = {}) {
  const keyAgents = String(agent?.keyAgents || agent?.key_agents || agent?.agentToken || agent?.token || "").trim();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(keyAgents ? {
      "X-Thorondor-Key-Agents": keyAgents,
      "X-Thorondor-Agent-Token": keyAgents
    } : {})
  };
}

export class ThorondorRequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ThorondorRequestError";
    this.status = details.status || 0;
    this.statusText = details.statusText || "";
    this.method = details.method || "";
    this.endpoint = details.endpoint || "";
    this.payload = details.payload || null;
    this.code = details.code || "";
    this.hints = details.hints || [];
    this.detail = details.detail || "";
  }
}

function normalizeResponseMessage(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload.trim();

  return [
    payload.message,
    payload.error,
    payload.detail,
    payload.stderr,
    payload.stdout
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

async function readResponsePayload(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildRequestHints({ status, endpoint, payload, isNetworkError }) {
  if (status === 401) {
    return [
      "El agente o el proxy ha rechazado la petición por autenticación.",
      "Revisa la configuración del endpoint, del proxy frontal o del agente instalado."
    ];
  }

  if (status === 404) {
    return [
      "La URL apunta a un servicio que no expone los endpoints de Thorondor.",
      "Comprueba que el host registrado usa la URL base del agente y que el agente instalado está actualizado."
    ];
  }

  if (status === 400) {
    return [
      normalizeResponseMessage(payload) || "El agente rechazó la petición por validación.",
      "Revisa IP, payload y reglas de seguridad del agente."
    ].filter(Boolean);
  }

  if (status >= 500) {
    return [
      "El agente ha fallado ejecutando la operación.",
      "Revisa permisos de firewall, sudoers, Task Scheduler/systemd y logs del agente en el host."
    ];
  }

  if (isNetworkError) {
    const isHttpsAppToHttpAgent =
      typeof window !== "undefined"
      && window.location?.protocol === "https:"
      && String(endpoint || "").startsWith("http://");

    return [
      "El navegador no pudo conectar con el agente: servicio parado, IP/puerto incorrectos, firewall, DNS o CORS.",
      isHttpsAppToHttpAgent
        ? "La app está en HTTPS y el agente está en HTTP; el navegador puede bloquear la petición por mixed content. Usa HTTPS o un túnel/proxy seguro."
        : "",
      "Comprueba /health desde la misma maquina que abre Thorondor."
    ].filter(Boolean);
  }

  return [];
}

function buildHttpError(errorLabel, response, payload, context) {
  const payloadMessage = normalizeResponseMessage(payload);
  const statusLabel = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const message = payloadMessage
    ? `${errorLabel} fallida (${statusLabel}): ${payloadMessage}`
    : `${errorLabel} fallida (${statusLabel})`;

  return new ThorondorRequestError(message, {
    ...context,
    status: response.status,
    statusText: response.statusText,
    payload,
    detail: payloadMessage,
    code: payload?.error || `HTTP_${response.status}`,
    hints: buildRequestHints({ status: response.status, endpoint: context.endpoint, payload })
  });
}

function buildNetworkError(errorLabel, error, context, timeoutMs) {
  if (error?.name === "AbortError") {
    return new ThorondorRequestError(
      `${errorLabel} agotada tras ${Math.round(timeoutMs / 1000)}s: ${context.endpoint}`,
      {
        ...context,
        code: "TIMEOUT",
        detail: "Tiempo de espera agotado",
        hints: [
          "El agente no respondió dentro del timeout configurado.",
          "Comprueba que el proceso está vivo, que el puerto escucha y que la red permite la conexión."
        ]
      }
    );
  }

  return new ThorondorRequestError(
    `${errorLabel} no pudo conectar con ${context.endpoint}: ${error?.message || "fallo de red"}`,
    {
      ...context,
      code: "NETWORK_ERROR",
      detail: error?.message || "Fallo de red",
      hints: buildRequestHints({ endpoint: context.endpoint, isNetworkError: true })
    }
  );
}

async function fetchJsonWithTimeout(url, agent, errorLabel) {
  const timeoutMs = Math.max(3000, Number(agent?.requestTimeoutMs) || 10000);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const context = { method: "GET", endpoint: url };

  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: buildJsonHeaders(agent),
      signal: controller.signal
    });
    const payload = await readResponsePayload(response);

    if (!response.ok) {
      throw buildHttpError(errorLabel, response, payload, context);
    }

    return payload;
  } catch (error) {
    if (error instanceof ThorondorRequestError) {
      throw error;
    }
    throw buildNetworkError(errorLabel, error, context, timeoutMs);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function postJsonWithTimeout(url, agent, payload, errorLabel) {
  const timeoutMs = Math.max(3000, Number(agent?.requestTimeoutMs) || 10000);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const context = { method: "POST", endpoint: url };

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      headers: buildJsonHeaders(agent),
      body: JSON.stringify(payload || {}),
      signal: controller.signal
    });
    const responsePayload = await readResponsePayload(response);

    if (!response.ok) {
      throw buildHttpError(errorLabel, response, responsePayload, context);
    }

    return responsePayload;
  } catch (error) {
    if (error instanceof ThorondorRequestError) {
      throw error;
    }
    throw buildNetworkError(errorLabel, error, context, timeoutMs);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function buildThorondorAgentEndpoints(agent) {
  const baseUrl = normalizeBaseUrl(agent);

  return {
    baseUrl,
    healthUrl: `${baseUrl}/health`,
    telemetryUrl: `${baseUrl}/telemetry`,
    logsUrl: `${baseUrl}/logs`,
    blocksUrl: `${baseUrl}/response/blocks`,
    blockIpUrl: `${baseUrl}/response/block-ip`,
    unblockIpUrl: `${baseUrl}/response/unblock-ip`,
    userManagementUrl: `${baseUrl}/response/user-management`,
    serviceManagementUrl: `${baseUrl}/response/service-management`,
    safeActionUrl: `${baseUrl}/response/safe-action`
  };
}

export async function fetchThorondorHealth(agent) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return fetchJsonWithTimeout(endpoints.healthUrl, agent, "Health check");
}

export async function fetchThorondorTelemetry(agent) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return fetchJsonWithTimeout(endpoints.telemetryUrl, agent, "Telemetry");
}

export async function fetchThorondorBlockedIps(agent) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return fetchJsonWithTimeout(endpoints.blocksUrl, agent, "Consulta de bloqueos");
}

export async function blockThorondorIp(agent, payload) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return postJsonWithTimeout(endpoints.blockIpUrl, agent, payload, "Bloqueo de IP");
}

export async function unblockThorondorIp(agent, payload) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return postJsonWithTimeout(endpoints.unblockIpUrl, agent, payload, "Desbloqueo de IP");
}

export async function manageThorondorAgentUser(agent, payload) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return postJsonWithTimeout(endpoints.userManagementUrl, agent, payload, "Gestión de usuario");
}

export async function manageThorondorAgentService(agent, payload) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return postJsonWithTimeout(endpoints.serviceManagementUrl, agent, payload, "Gestión de servicio");
}

export async function executeThorondorAgentSafeAction(agent, payload) {
  const endpoints = buildThorondorAgentEndpoints(agent);
  if (!endpoints.baseUrl) {
    throw new Error("Endpoint del agente no configurado");
  }

  return postJsonWithTimeout(endpoints.safeActionUrl, agent, payload, "AcciÃ³n segura");
}

export function buildThorondorRequestRules(agent) {
  const paused = Boolean(
    agent?.siemPaused ||
    agent?.siem_paused ||
    agent?.pollingPaused ||
    agent?.polling_paused ||
    agent?.monitoringPaused ||
    agent?.paused
  );
  if (paused) {
    return [];
  }

  const endpoints = buildThorondorAgentEndpoints(agent);

  return [
    {
      id: `${agent.id}-health`,
      agentId: agent.id,
      type: "health",
      intervalSeconds: Math.max(15, Number(agent.intervalSeconds) || 30),
      method: "GET",
      url: endpoints.healthUrl,
      headers: buildJsonHeaders(agent)
    },
    {
      id: `${agent.id}-telemetry`,
      agentId: agent.id,
      type: "telemetry",
      intervalSeconds: Math.max(15, Number(agent.intervalSeconds) || 30),
      method: "GET",
      url: endpoints.telemetryUrl,
      headers: buildJsonHeaders(agent)
    }
  ];
}
