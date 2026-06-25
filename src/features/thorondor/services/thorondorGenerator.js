import {
  THORONDOR_AGENT_FIXED_PORT,
  THORONDOR_AGENT_FIXED_SERVICE_NAME,
  THORONDOR_AGENT_POLL_INTERVAL_DEFAULT_SECONDS,
  THORONDOR_AGENT_POLL_INTERVAL_MAX_SECONDS,
  THORONDOR_AGENT_POLL_INTERVAL_MIN_SECONDS,
  THORONDOR_LINUX_DIAGNOSTIC_LOG_PATHS,
  THORONDOR_MODULE_KEYS,
  THORONDOR_WINDOWS_DIAGNOSTIC_LOG_PATHS,
  getThorondorDefaultOsVersionForTarget,
  normalizeThorondorAgentPollIntervalSeconds
} from "@/features/thorondor/data/thorondorDefaults";

function serializeBoolean(value) {
  return value ? "True" : "False";
}

function pythonList(list) {
  return `[${(list || []).map((item) => JSON.stringify(item)).join(", ")}]`;
}

function pythonBooleanDict(record) {
  const entries = Object.entries(record || {})
    .map(([key, value]) => `    ${JSON.stringify(key)}: ${serializeBoolean(value)}`)
    .join(",\n");
  return `{\n${entries}\n}`;
}

function normalizeReceiverBaseUrl(config) {
  const raw = String(config.receiverUrl || "").trim().replace(/\/+$/, "");
  if (raw) return raw;

  const host = String(config.hostIp || "127.0.0.1").trim();
  const port = Number(config.port) || THORONDOR_AGENT_FIXED_PORT;
  return `http://${host}:${port}`;
}

function normalizeServiceName(config) {
  const raw = String(config.serviceName || THORONDOR_AGENT_FIXED_SERVICE_NAME)
    .trim()
    .replace(/\.service$/i, "")
    .replace(/[^a-zA-Z0-9_.@-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return raw || THORONDOR_AGENT_FIXED_SERVICE_NAME;
}

function buildServiceFileName(config) {
  return `${normalizeServiceName(config)}.service`;
}

function normalizeWindowsPackageName(config) {
  const raw = String(config.systemName || config.displayName || THORONDOR_AGENT_FIXED_SERVICE_NAME)
    .trim()
    .replace(/[^a-zA-Z0-9_. -]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "");

  return raw || THORONDOR_AGENT_FIXED_SERVICE_NAME;
}

function escapeXmlAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function powerShellSingleQuotedString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function base64Utf8(value) {
  if (typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(String(value), "utf8").toString("base64");
  }

  const bytes = new TextEncoder().encode(String(value));
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function deterministicGuid(seed) {
  const bytes = [];
  let hash = 0x811c9dc5;
  const source = String(seed || THORONDOR_AGENT_FIXED_SERVICE_NAME);

  for (let index = 0; index < source.length + 48; index += 1) {
    const charCode = source.charCodeAt(index % source.length) + index * 17;
    hash ^= charCode;
    hash = Math.imul(hash, 0x01000193) >>> 0;
    bytes.push(hash & 0xff);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`.toUpperCase();
}

function resolveListenHost(config) {
  return config.networkScope === "local" ? "127.0.0.1" : "0.0.0.0";
}

function normalizeAgentId(config) {
  const raw = `${config.systemName || config.displayName || THORONDOR_AGENT_FIXED_SERVICE_NAME}-${config.hostIp || "local"}-${Number(config.port) || THORONDOR_AGENT_FIXED_PORT}`;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || THORONDOR_AGENT_FIXED_SERVICE_NAME;
}

function normalizeCentralApiBaseUrl(config) {
  if (config.centralSyncEnabled === false || config.persistenceMode === "local") {
    return "";
  }

  const fromDraft = String(config.centralApiBaseUrl || "").trim();
  const fromEnv = String(
    import.meta.env.VITE_THORONDOR_AGENT_CENTRAL_API_BASE_URL
      || import.meta.env.VITE_THORONDOR_API_BASE_URL
      || import.meta.env.VITE_API_BASE_URL
      || ""
  ).trim();
  return (fromDraft || fromEnv).replace(/\/+$/, "");
}

function generateAgentToken(byteLength = 32) {
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

export function buildThorondorAgentFiles(draft = {}) {
  const normalizedTargetOs = draft.targetOs === "windows" ? "windows" : "linux";
  const normalizedDistro = normalizedTargetOs === "windows"
    ? "Windows"
    : String(draft.distro || "Ubuntu/Debian").trim();
  const normalizedOsVersion = String(
    draft.osVersion || getThorondorDefaultOsVersionForTarget(normalizedTargetOs, normalizedDistro)
  ).trim();
  const displayName = String(draft.displayName || draft.systemName || THORONDOR_AGENT_FIXED_SERVICE_NAME).trim();
  const systemName = String(draft.systemName || draft.displayName || THORONDOR_AGENT_FIXED_SERVICE_NAME).trim();
  const logPaths = normalizedTargetOs === "windows"
    ? THORONDOR_WINDOWS_DIAGNOSTIC_LOG_PATHS
    : THORONDOR_LINUX_DIAGNOSTIC_LOG_PATHS;

  const config = {
    ...draft,
    targetOs: normalizedTargetOs,
    displayName,
    systemName,
    distro: normalizedDistro,
    osVersion: normalizedOsVersion,
    logPaths
  };
  config.agentId = config.agentId || normalizeAgentId(config);
  config.keyAgents = String(config.keyAgents || config.key_agents || config.agentToken || generateAgentToken()).trim();
  config.agentToken = config.keyAgents;
  config.centralEnrollmentToken = String(config.centralEnrollmentToken || "").trim();
  config.persistenceMode = config.persistenceMode === "cloud" ? "cloud" : "local";
  config.centralSyncEnabled = config.persistenceMode === "cloud" && config.centralSyncEnabled !== false;
  config.centralApiBaseUrl = normalizeCentralApiBaseUrl(config);
  config.intervalSeconds = normalizeThorondorAgentPollIntervalSeconds(config.intervalSeconds);

  const isWindows = config.targetOs === "windows";
  const shouldBuildSystemd = !isWindows && config.generateSystemd && config.autoStart !== false;

  return {
    agentFileName: "thorondor-agent.py",
    serviceFileName: shouldBuildSystemd ? buildServiceFileName(config) : null,
    installFileName: isWindows ? "thorondor-installer.ps1" : "thorondor-installer.sh",
    windowsInstallFileName: null,
    msiFileName: null,
    wixFileName: null,
    msiBuildFileName: null,
    python: buildThorondorPythonAgent(config),
    systemd: shouldBuildSystemd ? buildThorondorSystemdUnit(config) : null,
    installScript: isWindows ? buildThorondorWindowsStandaloneInstallScript(config) : buildThorondorInstallScript(config),
    windowsInstallScript: null,
    wixSource: null,
    msiBuildScript: null,
    instructions: buildThorondorInstallInstructions(config)
  };
}

export function buildThorondorPythonAgent(config) {
  const moduleCandidates = THORONDOR_MODULE_KEYS.reduce((acc, item) => {
    acc[item.key] = true;
    return acc;
  }, {});

  return `#!/usr/bin/env python3
import json
import glob
import hmac
import ipaddress
import os
import platform
import re
import shutil
import shlex
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from hashlib import sha256
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

try:
    import psutil
except ImportError:
    print("ERROR: falta psutil. Ejecuta: python3 -m pip install psutil", file=sys.stderr)
    sys.exit(1)

HOST_LABEL = ${JSON.stringify(config.displayName)}
SYSTEM_NAME = ${JSON.stringify(config.systemName)}
AGENT_ID = ${JSON.stringify(config.agentId)}
AGENT_VERSION = "1.1.0"
DISTRO = ${JSON.stringify(config.distro)}
OS_VERSION = ${JSON.stringify(config.osVersion)}
LISTEN_HOST = ${JSON.stringify(resolveListenHost(config))}
LISTEN_PORT = ${Number(config.port) || THORONDOR_AGENT_FIXED_PORT}
DEFAULT_POLL_INTERVAL_SECONDS = ${Number(config.intervalSeconds) || THORONDOR_AGENT_POLL_INTERVAL_DEFAULT_SECONDS}
MIN_POLL_INTERVAL_SECONDS = ${THORONDOR_AGENT_POLL_INTERVAL_MIN_SECONDS}
MAX_POLL_INTERVAL_SECONDS = ${THORONDOR_AGENT_POLL_INTERVAL_MAX_SECONDS}
POLL_INTERVAL_SECONDS = DEFAULT_POLL_INTERVAL_SECONDS
CENTRAL_API_BASE_URL = ${JSON.stringify(config.centralApiBaseUrl)}
PERSISTENCE_MODE = ${JSON.stringify(config.persistenceMode)}
KEY_AGENTS = ${JSON.stringify(config.keyAgents)}
AGENT_TOKEN = KEY_AGENTS
CENTRAL_ENROLLMENT_TOKEN = ${JSON.stringify(config.centralEnrollmentToken)}
INSTALL_USER = ${JSON.stringify(config.installUser || "thorondor")}
NETWORK_SCOPE = ${JSON.stringify(config.networkScope || "lan")}
CORS_ORIGIN = ${JSON.stringify(String(config.corsOrigin || "*").trim() || "*")}
IS_WINDOWS = platform.system() == "Windows"
MODULE_CANDIDATES = ${pythonBooleanDict(moduleCandidates)}
MODULES = dict(MODULE_CANDIDATES)
CANDIDATE_LOG_PATHS = ${pythonList(config.logPaths)}
CRITICAL_FILES = (
    [
        os.path.join(os.environ.get("SystemRoot", "C:\\\\Windows"), "System32", "drivers", "etc", "hosts"),
        os.path.join(os.environ.get("SystemRoot", "C:\\\\Windows"), "System32", "drivers", "etc", "services"),
    ]
    if IS_WINDOWS
    else ["/etc/passwd", "/etc/shadow", "/etc/sudoers", "/etc/hosts"]
)
BASELINE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".thorondor-baseline.json")
INVENTORY_BASELINE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".thorondor-inventory-baseline.json")
DETECTED_LOG_PATHS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".thorondor-log-sources.json")
DETECTED_MODULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".thorondor-modules.json")
MAX_LOG_LINES = 60
MAX_CUSTOM_LOG_FILES = 8
HEADERS = {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Thorondor-Key-Agents, X-Thorondor-Agent-Token",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
}
CENTRAL_WARNING_INTERVAL_SECONDS = 300
_CENTRAL_LAST_WARNING_AT = 0
_CENTRAL_LAST_WARNING_MESSAGE = ""
TELEMETRY_INITIAL_WAIT_SECONDS = 8
_TELEMETRY_CACHE = None
_TELEMETRY_CACHE_AT = 0
_TELEMETRY_CACHE_REFRESHING = False
_TELEMETRY_CACHE_ERROR = ""
_TELEMETRY_CACHE_LOCK = threading.Lock()


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def telemetry_cache_ttl_seconds():
    return max(120, min(300, int(POLL_INTERVAL_SECONDS) * 4))


def log_central_warning(message):
    global _CENTRAL_LAST_WARNING_AT, _CENTRAL_LAST_WARNING_MESSAGE
    now = time.time()
    text = str(message or "").strip()
    if text == _CENTRAL_LAST_WARNING_MESSAGE and now - _CENTRAL_LAST_WARNING_AT < CENTRAL_WARNING_INTERVAL_SECONDS:
        return
    _CENTRAL_LAST_WARNING_AT = now
    _CENTRAL_LAST_WARNING_MESSAGE = text
    print(f"[thorondor] aviso: no se pudo sincronizar con API central: {text}", file=sys.stderr)


def central_api_root():
    base = str(CENTRAL_API_BASE_URL or "").rstrip("/")
    if not base:
        return ""
    parsed = urlparse(base)
    if not parsed.scheme or not parsed.netloc:
        return ""
    if base.endswith("/thorondor/api"):
        return base
    return base + "/thorondor/api"


def central_request(method, path, payload=None, enrollment=False):
    root = central_api_root()
    if not root:
        return None

    data = None
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": f"Thorondor-Agent/{AGENT_VERSION}",
        "X-Thorondor-Key-Agents": KEY_AGENTS,
        "X-Thorondor-Agent-Token": KEY_AGENTS
    }
    if enrollment and CENTRAL_ENROLLMENT_TOKEN:
        headers["X-Thorondor-Agent-Enroll-Token"] = CENTRAL_ENROLLMENT_TOKEN
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(root + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=15) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw.strip() else None


def normalize_poll_interval_seconds(value, fallback=None):
    if value is None or value == "":
        return fallback
    try:
        candidate = int(float(str(value).strip()))
    except Exception:
        return fallback
    return max(MIN_POLL_INTERVAL_SECONDS, min(MAX_POLL_INTERVAL_SECONDS, candidate))


def read_poll_interval_seconds(response):
    if not isinstance(response, dict):
        return None
    agent = response.get("agent") if isinstance(response.get("agent"), dict) else {}
    for value in (
        response.get("pollIntervalSeconds"),
        response.get("poll_interval_seconds"),
        response.get("intervalSeconds"),
        agent.get("pollIntervalSeconds"),
        agent.get("poll_interval_seconds"),
        agent.get("intervalSeconds"),
    ):
        normalized = normalize_poll_interval_seconds(value, None)
        if normalized is not None:
            return normalized
    return None


def apply_poll_interval_from_response(response):
    global POLL_INTERVAL_SECONDS
    next_interval = read_poll_interval_seconds(response)
    if next_interval is None:
        return POLL_INTERVAL_SECONDS
    if next_interval != POLL_INTERVAL_SECONDS:
        print(f"[thorondor] intervalo de polling actualizado: {next_interval}s")
        POLL_INTERVAL_SECONDS = next_interval
    return POLL_INTERVAL_SECONDS


def register_with_central():
    if not central_api_root():
        return None

    payload = {
        "id": AGENT_ID,
        "agent": {
            "id": AGENT_ID,
            "version": AGENT_VERSION,
            "hostLabel": HOST_LABEL,
            "systemName": SYSTEM_NAME,
            "distro": DISTRO,
            "osVersion": OS_VERSION,
            "targetOs": "windows" if IS_WINDOWS else "linux",
            "listenPort": LISTEN_PORT,
            "networkScope": NETWORK_SCOPE,
            "endpoint": f"http://{find_local_ip()}:{LISTEN_PORT}",
            "pollIntervalSeconds": POLL_INTERVAL_SECONDS,
            "intervalSeconds": POLL_INTERVAL_SECONDS,
            "modules": MODULES
        },
        "heartbeat": now_iso()
    }
    return central_request("POST", "/agents/register", payload, enrollment=True)


def central_response_paused(response):
    if not isinstance(response, dict):
        return False
    agent = response.get("agent") if isinstance(response.get("agent"), dict) else {}
    return bool(
        response.get("paused")
        or response.get("siemPaused")
        or response.get("pollingPaused")
        or agent.get("siemPaused")
        or agent.get("pollingPaused")
    )


def run_command(command):
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=12,
            check=False
        )
        return completed.stdout.strip() if completed.returncode == 0 else ""
    except Exception:
        return ""


def run_command_result(command, timeout=12):
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            check=False
        )
        return {
            "ok": completed.returncode == 0,
            "exitCode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip()
        }
    except Exception as exc:
        return {
            "ok": False,
            "exitCode": -1,
            "stdout": "",
            "stderr": str(exc)
        }


def to_number(value, default=0):
    try:
        if value is None or value == "":
            return default
        return float(str(value).replace(",", ".").strip())
    except Exception:
        return default


def to_int(value, default=0):
    try:
        return int(float(str(value).replace(",", ".").strip()))
    except Exception:
        return default


def parse_json_output(text, fallback=None):
    if fallback is None:
        fallback = []
    try:
        raw = json.loads(str(text or "").strip())
    except Exception:
        return fallback
    return raw


def as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def powershell_json(script, timeout=15):
    result = run_command_result(["powershell", "-NoProfile", "-NonInteractive", "-Command", script], timeout=timeout)
    if not result.get("ok") or not result.get("stdout"):
        return []
    return parse_json_output(result.get("stdout"), [])


def windows_event_props(event):
    props = event.get("props") or event.get("Properties") or []
    if isinstance(props, dict):
        props = list(props.values())
    return props if isinstance(props, list) else []


def windows_event_prop(event, index, default=""):
    props = windows_event_props(event)
    try:
        value = props[index]
        return "" if value is None else str(value).strip()
    except Exception:
        return default


def windows_event_values(message, label):
    values = re.findall(rf"{re.escape(label)}:\\s*([^\\r\\n]+)", str(message or ""), re.IGNORECASE)
    return [value.strip() for value in values if value and value.strip() and value.strip() != "-"]


def windows_event_account(message, fallback="unknown"):
    names = [
        value for value in windows_event_values(message, "Account Name")
        if value and not value.endswith("$")
    ]
    return names[-1] if names else fallback


def normalize_event_protocol(value, message=""):
    raw = f"{value or ''} {message or ''}".lower()
    if "sudo" in raw:
        return "sudo"
    if "sshd" in raw or "ssh" in raw:
        return "ssh"
    if "rdp" in raw or "remoteinteractive" in raw or "remote interactive" in raw:
        return "rdp"
    if "winrm" in raw or "powershell remoting" in raw:
        return "winrm"
    return "local"


def valid_source_ip(value):
    text = str(value or "").strip().lower()
    return text not in ["", "sin-ip", "win", "local", "localhost", "127.0.0.1", "::1", "-"]


def windows_event_source_ip(message, fallback=""):
    values = windows_event_values(message, "Source Network Address") or windows_event_values(message, "Source Address")
    return values[-1] if values else fallback


def with_admin(command):
    if IS_WINDOWS:
        return command
    if hasattr(os, "geteuid") and os.geteuid() == 0:
        return command
    if shutil.which("sudo"):
        return ["sudo", "-n"] + command
    return command


def validate_blockable_ip(raw_ip, requester_ip=""):
    try:
        parsed = ipaddress.ip_address(str(raw_ip or "").strip())
    except ValueError as exc:
        raise ValueError("IP no valida") from exc

    if parsed.is_loopback or parsed.is_multicast or parsed.is_unspecified:
        raise ValueError("No se permite bloquear loopback, multicast o IP sin especificar")
    if requester_ip and str(parsed) == requester_ip:
        raise ValueError("No se permite bloquear la IP que está gestionando el agente ahora mismo")

    return str(parsed)


def clean_firewall_reason(reason):
    value = re.sub(r"[^A-Za-z0-9 ._:@/-]", "", str(reason or "manual")).strip()
    return value[:80] or "manual"


def windows_firewall_rule_name(ip_address):
    return f"Thorondor Block {ip_address}"


def parse_json_items(raw):
    try:
        parsed = json.loads(raw or "[]")
        if isinstance(parsed, dict):
            return [parsed]
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass
    return []


def list_windows_blocked_ips():
    ps_script = (
        "$rules = Get-NetFirewallRule -ErrorAction SilentlyContinue | "
        "Where-Object { $_.DisplayName -like 'Thorondor Block *' }; "
        "$items = foreach ($rule in $rules) { "
        "$filter = $rule | Get-NetFirewallAddressFilter; "
        "[pscustomobject]@{ ip=($filter.RemoteAddress -join ','); rule=$rule.DisplayName; enabled=$rule.Enabled; provider='windows-firewall' } "
        "}; $items | ConvertTo-Json -Depth 3 -Compress"
    )
    result = run_command_result(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script], timeout=15)
    items = parse_json_items(result["stdout"]) if result["ok"] else []
    return [
        {
            "ip": str(item.get("ip", "")).split(",")[0],
            "rule": item.get("rule", ""),
            "enabled": item.get("enabled", ""),
            "provider": item.get("provider", "windows-firewall")
        }
        for item in items
        if isinstance(item, dict)
        if item.get("ip")
    ]


def iptables_binary_for(ip_address):
    if ":" in ip_address:
        return shutil.which("ip6tables")
    return shutil.which("iptables")


def parse_iptables_blocks(binary):
    if not binary:
        return []

    result = run_command_result(with_admin([binary, "-S", "INPUT"]))
    if not result["ok"]:
        return []

    items = []
    for line in result["stdout"].splitlines():
        if "THORONDOR_BLOCK" not in line:
            continue
        try:
            parts = shlex.split(line)
        except ValueError:
            continue
        if "-s" not in parts:
            continue
        source = parts[parts.index("-s") + 1].split("/")[0]
        comment = ""
        if "--comment" in parts:
            comment = parts[parts.index("--comment") + 1]
        items.append({
            "ip": source,
            "rule": comment or "THORONDOR_BLOCK",
            "enabled": True,
            "provider": os.path.basename(binary)
        })
    return items


def list_ufw_blocks():
    ufw_binary = shutil.which("ufw")
    if not ufw_binary:
        return []

    result = run_command_result(with_admin([ufw_binary, "status", "numbered"]))
    if not result["ok"]:
        return []

    items = []
    for line in result["stdout"].splitlines():
        if "THORONDOR_BLOCK" not in line:
            continue
        ip_match = re.search(r"(\\d+\\.\\d+\\.\\d+\\.\\d+)", line)
        if not ip_match:
            continue
        items.append({
            "ip": ip_match.group(1),
            "rule": "THORONDOR_BLOCK",
            "enabled": True,
            "provider": "ufw"
        })
    return items


def firewalld_binary():
    return shutil.which("firewall-cmd")


def firewalld_family_for(ip_address):
    return "ipv6" if ":" in ip_address else "ipv4"


def parse_firewalld_direct_blocks(family):
    binary = firewalld_binary()
    if not binary:
        return []

    result = run_command_result(with_admin([binary, "--direct", "--get-rules", family, "filter", "INPUT"]))
    if not result["ok"]:
        return []

    items = []
    for line in result["stdout"].splitlines():
        if "THORONDOR_BLOCK" not in line:
            continue
        try:
            parts = shlex.split(line)
        except ValueError:
            continue
        if "-s" not in parts:
            continue
        source = parts[parts.index("-s") + 1].split("/")[0]
        items.append({
            "ip": source,
            "rule": "THORONDOR_BLOCK",
            "enabled": True,
            "provider": "firewalld-direct"
        })
    return items


def list_firewalld_blocks():
    items = []
    for family in ["ipv4", "ipv6"]:
        items.extend(parse_firewalld_direct_blocks(family))
    return items


def list_linux_blocked_ips():
    items = []
    for binary in [shutil.which("iptables"), shutil.which("ip6tables")]:
        items.extend(parse_iptables_blocks(binary))
    items.extend(list_ufw_blocks())
    items.extend(list_firewalld_blocks())
    return items


def list_blocked_ips():
    return list_windows_blocked_ips() if IS_WINDOWS else list_linux_blocked_ips()


def firewall_error_hints(result, provider):
    text = f"{result.get('stdout', '')} {result.get('stderr', '')}".lower()
    hints = []
    if "sudo" in text or "permission" in text or "not permitted" in text or "access is denied" in text:
        hints.append("El agente no tiene permisos para modificar el firewall. Revisa sudoers en Linux o ejecución elevada en Windows.")
    if "not found" in text or "no se encontró" in text:
        hints.append("No se encontró un proveedor de firewall compatible en el host.")
    if provider == "firewalld-direct":
        hints.append("Se intentó usar firewalld direct. Comprueba que firewalld está activo y que firewall-cmd funciona con permisos.")
    if provider in ["iptables", "ip6tables"]:
        hints.append("Se intentó usar iptables/ip6tables. Comprueba que el backend está disponible y que el usuario del agente tiene NOPASSWD.")
    if provider == "ufw":
        hints.append("Se intentó usar ufw. Comprueba que ufw está instalado y acepta reglas desde el usuario del agente.")
    return hints


def firewall_response_payload(action, ip_address, result, provider, changed=None, blocked=None):
    ok = bool(result.get("ok"))
    message = result.get("stdout") or result.get("stderr") or (
        "Operación completada" if ok else "No se pudo completar la operación"
    )
    return {
        "ok": ok,
        "changed": ok if changed is None else bool(changed),
        "ip": ip_address,
        "provider": provider,
        "exitCode": result.get("exitCode"),
        "stdout": result.get("stdout", ""),
        "stderr": result.get("stderr", ""),
        "error": "" if ok else message,
        "hints": [] if ok else firewall_error_hints(result, provider),
        "blocked": blocked if blocked is not None else list_blocked_ips(),
        "message": message or ("IP bloqueada" if action == "block" else "IP desbloqueada")
    }


def block_ip(raw_ip, reason="manual", requester_ip=""):
    ip_address = validate_blockable_ip(raw_ip, requester_ip)
    existing = [item for item in list_blocked_ips() if item.get("ip") == ip_address]
    if existing:
        return {
            "ok": True,
            "changed": False,
            "ip": ip_address,
            "blocked": list_blocked_ips(),
            "message": "La IP ya estaba bloqueada por Thorondor"
        }

    clean_reason = clean_firewall_reason(reason)
    if IS_WINDOWS:
        rule_name = windows_firewall_rule_name(ip_address)
        ps_script = (
            "New-NetFirewallRule -DisplayName '" + rule_name + "' "
            "-Direction Inbound -RemoteAddress '" + ip_address + "' -Action Block -Profile Any -ErrorAction Stop | Out-Null"
        )
        result = run_command_result(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script], timeout=15)
        provider = "windows-firewall"
    else:
        binary = iptables_binary_for(ip_address)
        if binary:
            provider = os.path.basename(binary)
            result = run_command_result(with_admin([
                binary, "-I", "INPUT", "-s", ip_address, "-m", "comment",
                "--comment", f"THORONDOR_BLOCK {clean_reason}", "-j", "DROP"
            ]))
            if not result["ok"] and firewalld_binary():
                provider = "firewalld-direct"
                family = firewalld_family_for(ip_address)
                result = run_command_result(with_admin([
                    firewalld_binary(), "--direct", "--add-rule", family, "filter", "INPUT", "0",
                    "-s", ip_address, "-m", "comment", "--comment", f"THORONDOR_BLOCK {clean_reason}", "-j", "DROP"
                ]))
        elif shutil.which("ufw"):
            provider = "ufw"
            result = run_command_result(with_admin([shutil.which("ufw"), "deny", "from", ip_address, "comment", "THORONDOR_BLOCK"]))
        elif firewalld_binary():
            provider = "firewalld-direct"
            family = firewalld_family_for(ip_address)
            result = run_command_result(with_admin([
                firewalld_binary(), "--direct", "--add-rule", family, "filter", "INPUT", "0",
                "-s", ip_address, "-m", "comment", "--comment", f"THORONDOR_BLOCK {clean_reason}", "-j", "DROP"
            ]))
        else:
            provider = "none"
            result = {
                "ok": False,
                "exitCode": -1,
                "stdout": "",
                "stderr": "No se encontró iptables, ip6tables ni ufw"
            }

    return firewall_response_payload("block", ip_address, result, provider)


def unblock_ip(raw_ip):
    ip_address = validate_blockable_ip(raw_ip)
    changed = False
    messages = []
    diagnostics = []

    if IS_WINDOWS:
        rule_name = windows_firewall_rule_name(ip_address)
        ps_script = (
            "Get-NetFirewallRule -ErrorAction SilentlyContinue | "
            "Where-Object { $_.DisplayName -eq '" + rule_name + "' } | "
            "Remove-NetFirewallRule -ErrorAction Stop"
        )
        result = run_command_result(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script], timeout=15)
        changed = result["ok"]
        messages.append(result["stdout"] or result["stderr"])
        diagnostics.append({"provider": "windows-firewall", **result})
    else:
        binary = iptables_binary_for(ip_address)
        if binary:
            rules = run_command_result(with_admin([binary, "-S", "INPUT"]))
            if rules["ok"]:
                for line in rules["stdout"].splitlines():
                    if ip_address not in line or "THORONDOR_BLOCK" not in line:
                        continue
                    try:
                        parts = shlex.split(line)
                    except ValueError:
                        continue
                    if parts and parts[0] == "-A":
                        parts[0] = "-D"
                    result = run_command_result(with_admin([binary] + parts))
                    changed = changed or result["ok"]
                    messages.append(result["stdout"] or result["stderr"])
                    diagnostics.append({"provider": os.path.basename(binary), **result})
        if shutil.which("ufw"):
            result = run_command_result(with_admin([shutil.which("ufw"), "delete", "deny", "from", ip_address]))
            changed = changed or result["ok"]
            messages.append(result["stdout"] or result["stderr"])
            diagnostics.append({"provider": "ufw", **result})
        if firewalld_binary():
            family = firewalld_family_for(ip_address)
            rules = run_command_result(with_admin([firewalld_binary(), "--direct", "--get-rules", family, "filter", "INPUT"]))
            if rules["ok"]:
                for line in rules["stdout"].splitlines():
                    if ip_address not in line or "THORONDOR_BLOCK" not in line:
                        continue
                    try:
                        parts = shlex.split(line)
                    except ValueError:
                        continue
                    result = run_command_result(with_admin([
                        firewalld_binary(), "--direct", "--remove-rule", family, "filter", "INPUT"
                    ] + parts))
                    changed = changed or result["ok"]
                    messages.append(result["stdout"] or result["stderr"])
                    diagnostics.append({"provider": "firewalld-direct", **result})

    failed_diagnostics = [item for item in diagnostics if not item.get("ok")]
    hints = []
    for item in failed_diagnostics:
        hints.extend(firewall_error_hints(item, item.get("provider", "firewall")))
    return {
        "ok": changed,
        "changed": changed,
        "ip": ip_address,
        "blocked": list_blocked_ips(),
        "diagnostics": diagnostics,
        "error": "" if changed else "No habia reglas Thorondor para esa IP",
        "hints": [] if changed else hints,
        "message": " ".join([message for message in messages if message]).strip() or ("IP desbloqueada" if changed else "No habia reglas Thorondor para esa IP")
    }


def find_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except Exception:
        return socket.gethostbyname(socket.gethostname())


def read_tail(path, lines=MAX_LOG_LINES):
    if not path or not os.path.exists(path):
        return []
    if os.path.isdir(path):
        return []
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as handler:
            content = handler.readlines()[-lines:]
        return [line.rstrip("\\n") for line in content]
    except Exception:
        return []


def collect_windows_event_log_lines(log_name, lines=MAX_LOG_LINES):
    if not IS_WINDOWS:
        return []

    safe_name = re.sub(r"[^A-Za-z0-9_ ./-]", "", str(log_name or "")).strip()
    if not safe_name:
        return []

    try:
        ps_script = (
            "Get-WinEvent -LogName '" + safe_name + "' -MaxEvents " + str(int(lines)) + " 2>$null "
            "| Select-Object @{N='ts';E={$_.TimeCreated.ToString('o')}},@{N='lvl';E={$_.LevelDisplayName}},@{N='id';E={$_.Id}},@{N='msg';E={$_.Message}} "
            "| ConvertTo-Json -Depth 2 -Compress"
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True, text=True, timeout=15
        )
        output = []
        if result.returncode == 0 and result.stdout.strip():
            raw = json.loads(result.stdout)
            if isinstance(raw, dict):
                raw = [raw]
            for event in raw:
                output.append(
                    f"[{event.get('ts', '')}] [{event.get('lvl', '')}] [{event.get('id', '')}] {str(event.get('msg', ''))[:300]}"
                )
        return output
    except Exception:
        return []


def windows_event_log_exists(log_name):
    if not IS_WINDOWS:
        return False

    safe_name = re.sub(r"[^A-Za-z0-9_ ./-]", "", str(log_name or "")).strip()
    if not safe_name:
        return False

    try:
        ps_script = "if (Get-WinEvent -ListLog '" + safe_name + "' -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0
    except Exception:
        return False


def detect_log_source(source):
    source_text = str(source or "").strip()
    if not source_text:
        return []

    lower_source = source_text.lower()
    if IS_WINDOWS and (lower_source.startswith("winlog://") or lower_source.startswith("eventlog://")):
        log_name = source_text.split("://", 1)[1].strip()
        return [f"winlog://{log_name}"] if windows_event_log_exists(log_name) else []

    candidates = glob.glob(source_text) if any(char in source_text for char in "*?[]") else [source_text]
    detected = []

    for candidate in candidates[:MAX_CUSTOM_LOG_FILES]:
        if os.path.isdir(candidate):
            try:
                has_files = any(
                    os.path.isfile(os.path.join(candidate, item))
                    for item in os.listdir(candidate)
                )
                if has_files:
                    detected.append(candidate)
            except Exception:
                continue
        elif os.path.isfile(candidate):
            detected.append(candidate)

    return detected


def detect_available_log_paths():
    detected = []
    seen = set()

    for source in CANDIDATE_LOG_PATHS:
        for path in detect_log_source(source):
            if path in seen:
                continue
            seen.add(path)
            detected.append(path)

    return detected


def save_detected_log_paths(paths):
    payload = {
        "detectedAt": now_iso(),
        "paths": list(paths or [])
    }
    try:
        with open(DETECTED_LOG_PATHS_PATH, "w", encoding="utf-8") as handler:
            json.dump(payload, handler, indent=2)
    except Exception:
        pass


def load_detected_log_paths():
    try:
        with open(DETECTED_LOG_PATHS_PATH, "r", encoding="utf-8") as handler:
            payload = json.load(handler)
        paths = payload.get("paths") if isinstance(payload, dict) else payload
        if isinstance(paths, list):
            return [str(item).strip() for item in paths if str(item).strip()]
    except Exception:
        return None
    return None


def get_additional_log_paths():
    detected = load_detected_log_paths()
    if detected is not None:
        return detected

    detected = detect_available_log_paths()
    save_detected_log_paths(detected)
    return detected


def run_log_detection_cli():
    detected = detect_available_log_paths()
    save_detected_log_paths(detected)
    print(json.dumps({
        "ok": True,
        "detected": detected,
        "count": len(detected),
        "configPath": DETECTED_LOG_PATHS_PATH
    }, ensure_ascii=False))


def path_exists_any(paths):
    return any(os.path.exists(path) for path in paths)


def command_exists(*names):
    return any(shutil.which(name) for name in names)


def psutil_network_connections_available():
    try:
        psutil.net_connections(kind="inet")
        return True
    except Exception:
        return False


def psutil_network_rates_available():
    try:
        return bool(psutil.net_io_counters(pernic=True))
    except Exception:
        return False


def docker_available():
    docker_binary = shutil.which("docker")
    if not docker_binary:
        return False
    result = run_command_result([docker_binary, "ps", "--format", "{{.ID}}"], timeout=6)
    return result["ok"]


def hardware_monitoring_available():
    try:
        if collect_temperatures() or collect_fans() or collect_battery() or collect_gpu_info():
            return True
    except Exception:
        pass
    return False


def update_monitoring_available():
    if IS_WINDOWS:
        return command_exists("powershell", "pwsh")
    return command_exists("apt", "dnf", "pacman", "checkupdates")


def smart_monitoring_available():
    if IS_WINDOWS:
        return command_exists("powershell", "pwsh")
    return command_exists("smartctl") and command_exists("lsblk")


def security_log_available():
    if IS_WINDOWS:
        return windows_event_log_exists("Security")
    return path_exists_any(["/var/log/auth.log", "/var/log/secure"])


def normalize_module_flags(value):
    source = value if isinstance(value, dict) else {}
    normalized = {}
    for key in MODULE_CANDIDATES.keys():
        normalized[key] = bool(source.get(key, False))
    normalized["systemMetrics"] = True
    normalized["networkConnections"] = bool(source.get("networkConnections", True))
    return normalized


def detect_available_modules():
    detected_logs = get_additional_log_paths()
    has_security_log = security_log_available()
    modules = {
        "systemMetrics": True,
        "securityLogs": has_security_log,
        "sudoCommands": has_security_log,
        "fileIntegrity": any(os.path.exists(path) for path in CRITICAL_FILES),
        "networkConnections": psutil_network_connections_available(),
        "applicationLogs": bool(detected_logs),
        "networkRates": psutil_network_rates_available(),
        "establishedConnections": psutil_network_connections_available(),
        "hardwareMonitor": hardware_monitoring_available(),
        "dockerMonitor": docker_available(),
        "updateMonitor": update_monitoring_available(),
        "loginHistory": has_security_log if IS_WINDOWS else command_exists("last"),
        "smartMonitor": smart_monitoring_available()
    }
    return normalize_module_flags(modules)


def save_detected_modules(modules):
    payload = {
        "detectedAt": now_iso(),
        "modules": normalize_module_flags(modules)
    }
    try:
        with open(DETECTED_MODULES_PATH, "w", encoding="utf-8") as handler:
            json.dump(payload, handler, indent=2)
    except Exception:
        pass


def load_detected_modules():
    try:
        with open(DETECTED_MODULES_PATH, "r", encoding="utf-8") as handler:
            payload = json.load(handler)
        modules = payload.get("modules") if isinstance(payload, dict) else payload
        if isinstance(modules, dict):
            return normalize_module_flags(modules)
    except Exception:
        return None
    return None


def get_active_modules():
    modules = load_detected_modules()
    if modules is not None:
        return modules

    modules = detect_available_modules()
    save_detected_modules(modules)
    return modules


def refresh_active_modules():
    global MODULES
    MODULES = get_active_modules()
    return MODULES


def run_module_detection_cli():
    modules = detect_available_modules()
    save_detected_modules(modules)
    print(json.dumps({
        "ok": True,
        "modules": modules,
        "enabled": [key for key, enabled in modules.items() if enabled],
        "disabled": [key for key, enabled in modules.items() if not enabled],
        "configPath": DETECTED_MODULES_PATH
    }, ensure_ascii=False))


def expand_log_source(source):
    source_text = str(source or "").strip()
    if not source_text:
        return []

    lower_source = source_text.lower()
    if IS_WINDOWS and (lower_source.startswith("winlog://") or lower_source.startswith("eventlog://")):
        log_name = source_text.split("://", 1)[1].strip()
        return [{"path": f"winlog://{log_name}", "lines": collect_windows_event_log_lines(log_name, MAX_LOG_LINES)}]

    candidates = glob.glob(source_text) if any(char in source_text for char in "*?[]") else [source_text]
    entries = []

    for candidate in candidates[:MAX_CUSTOM_LOG_FILES]:
        if os.path.isdir(candidate):
            try:
                files = [
                    os.path.join(candidate, item)
                    for item in os.listdir(candidate)
                    if os.path.isfile(os.path.join(candidate, item))
                ]
                files.sort(key=lambda path: os.path.getmtime(path), reverse=True)
                for file_path in files[:MAX_CUSTOM_LOG_FILES]:
                    entries.append({"path": file_path, "lines": read_tail(file_path, MAX_LOG_LINES)})
            except Exception:
                continue
        elif os.path.isfile(candidate):
            entries.append({"path": candidate, "lines": read_tail(candidate, MAX_LOG_LINES)})

    return entries


def get_auth_log_path():
    if IS_WINDOWS:
        return "Windows Security Event Log"
    candidates = ["/var/log/auth.log", "/var/log/secure"]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return ""


def detect_syslog_path():
    if IS_WINDOWS:
        return ""
    candidates = ["/var/log/syslog", "/var/log/messages"]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return ""


def collect_windows_security_events():
    events = []
    try:
        ps_script = (
            "Get-WinEvent -LogName Security -MaxEvents 100 "
            "-FilterXPath '*[System[EventID=4624 or EventID=4625 or EventID=4648 or EventID=4672 or EventID=4688 or EventID=4720 or EventID=4722 or EventID=4725 or EventID=4726 or EventID=4728 or EventID=4729 or EventID=4732 or EventID=4733 or EventID=4738]]' "
            "2>$null | ForEach-Object { "
            "  [pscustomobject]@{ id=$_.Id; ts=$_.TimeCreated.ToString('o'); msg=$_.Message; props=@($_.Properties | ForEach-Object { $_.Value }) } "
            "} | ConvertTo-Json -Depth 4 -Compress"
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode == 0 and result.stdout.strip():
            raw = json.loads(result.stdout)
            if isinstance(raw, dict):
                raw = [raw]
            for evt in raw:
                eid = to_int(evt.get("id"), 0)
                ts = evt.get("ts", now_iso())
                msg = str(evt.get("msg", ""))
                username = windows_event_prop(evt, 5) if eid in (4624, 4625, 4648) else windows_event_prop(evt, 1)
                username = username or windows_event_account(msg)
                source_ip = windows_event_prop(evt, 18 if eid == 4624 else 19) if eid in (4624, 4625) else ""
                source_ip = source_ip or windows_event_source_ip(msg, "win")
                logon_type = windows_event_prop(evt, 8 if eid == 4624 else 10) if eid in (4624, 4625) else ""
                protocol = "rdp" if str(logon_type) == "10" else normalize_event_protocol("windows", msg)
                if eid == 4625:
                    events.append({"kind": "failed_login", "user": username, "sourceIp": source_ip, "protocol": protocol, "logonType": logon_type, "message": msg[:600], "timestamp": ts})
                elif eid in (4624, 4648):
                    events.append({"kind": "successful_login", "user": username, "sourceIp": source_ip, "protocol": protocol, "logonType": logon_type, "message": msg[:600], "timestamp": ts})
                elif eid == 4672:
                    events.append({
                        "kind": "sudo_command",
                        "user": username,
                        "sourceIp": "win",
                        "protocol": "windows-privilege",
                        "command": "Windows special privileges assigned",
                        "message": msg[:600],
                        "timestamp": ts
                    })
                elif eid == 4688:
                    process_name = windows_event_prop(evt, 5) or (windows_event_values(msg, "New Process Name") or [""])[-1]
                    command = windows_event_prop(evt, 8) or (windows_event_values(msg, "Process Command Line") or [process_name])[-1]
                    events.append({
                        "kind": "command_execution",
                        "user": username,
                        "sourceIp": "win",
                        "protocol": "windows-process",
                        "process": process_name,
                        "command": command,
                        "message": msg[:600],
                        "timestamp": ts
                    })
                elif eid in (4720, 4722, 4725, 4726, 4728, 4729, 4732, 4733, 4738):
                    target_user = windows_event_prop(evt, 0) or windows_event_account(msg, username)
                    action_by_id = {
                        4720: "new_user",
                        4722: "user_enabled",
                        4725: "user_disabled",
                        4726: "user_deleted",
                        4728: "group_member_added",
                        4729: "group_member_removed",
                        4732: "group_member_added",
                        4733: "group_member_removed",
                        4738: "user_account_change"
                    }
                    events.append({
                        "kind": action_by_id.get(eid, "user_account_change"),
                        "user": username,
                        "subject": target_user,
                        "sourceIp": "win",
                        "protocol": "windows-account",
                        "message": msg[:600],
                        "timestamp": ts
                    })
    except Exception:
        return []
    return events[-80:]


def collect_windows_logs():
    try:
        ps_script = (
            "Get-WinEvent -LogName System -MaxEvents 60 2>$null "
            "| Select-Object @{N='ts';E={$_.TimeCreated.ToString('o')}},@{N='lvl';E={$_.LevelDisplayName}},@{N='msg';E={$_.Message}} "
            "| ConvertTo-Json -Depth 2 -Compress"
        )
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
            capture_output=True, text=True, timeout=15
        )
        lines = []
        if result.returncode == 0 and result.stdout.strip():
            raw = json.loads(result.stdout)
            if isinstance(raw, dict):
                raw = [raw]
            lines = [f"[{e.get('ts','')}] [{e.get('lvl','')}] {str(e.get('msg',''))[:200]}" for e in raw]
        return lines
    except Exception:
        return []


def file_hash(path):
    if not os.path.exists(path):
        return ""
    digest = sha256()
    with open(path, "rb") as handler:
        while True:
            chunk = handler.read(4096)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def load_baseline():
    if not os.path.exists(BASELINE_PATH):
        return {}
    try:
        with open(BASELINE_PATH, "r", encoding="utf-8") as handler:
            return json.load(handler)
    except Exception:
        return {}


def save_baseline(data):
    try:
        with open(BASELINE_PATH, "w", encoding="utf-8") as handler:
            json.dump(data, handler, indent=2)
    except Exception:
        pass


def collect_integrity_events():
    baseline = load_baseline()
    current = {}
    events = []

    for path in CRITICAL_FILES:
        new_hash = file_hash(path)
        current[path] = new_hash
        old_hash = baseline.get(path)
        if old_hash and new_hash and old_hash != new_hash:
            events.append({
                "kind": "critical_file_change",
                "file": path,
                "oldHash": old_hash,
                "newHash": new_hash,
                "timestamp": now_iso()
            })

    save_baseline(current)
    return events


def format_connection_address(address):
    if not address:
        return ""
    ip = getattr(address, "ip", "")
    port = getattr(address, "port", "")
    if not ip and isinstance(address, (tuple, list)) and len(address) >= 2:
        ip = address[0]
        port = address[1]
    return f"{ip}:{port}" if ip or port else ""


def connection_ip(address):
    if not address:
        return ""
    return getattr(address, "ip", "") or (address[0] if isinstance(address, (tuple, list)) and address else "")


def connection_port(address):
    if not address:
        return None
    return getattr(address, "port", None) if hasattr(address, "port") else (address[1] if isinstance(address, (tuple, list)) and len(address) > 1 else None)


def connection_protocol(connection):
    try:
        if connection.type == socket.SOCK_DGRAM:
            return "udp"
    except Exception:
        pass
    return "tcp"


def connection_family(connection):
    try:
        if connection.family == socket.AF_INET6:
            return "IPv6"
    except Exception:
        pass
    return "IPv4"


def process_brief(pid):
    if not pid:
        return {"process": "", "user": "", "cmdline": ""}
    try:
        process = psutil.Process(pid)
        cmdline = process.cmdline()
        return {
            "process": process.name(),
            "user": process.username(),
            "cmdline": " ".join(cmdline[:12]) if cmdline else ""
        }
    except Exception:
        return {"process": "", "user": "", "cmdline": ""}


def collect_processes(limit=200):
    sampled = []
    for process in psutil.process_iter(["pid", "name", "username", "memory_percent", "cmdline", "status", "create_time", "exe", "num_threads"]):
        try:
            process.cpu_percent(None)
            sampled.append(process)
        except Exception:
            continue

    time.sleep(0.12)
    processes = []
    for process in sampled:
        try:
            info = process.info
            cmdline = info.get("cmdline") or []
            memory_info = process.memory_info()
            create_time = info.get("create_time")
            processes.append({
                "pid": info.get("pid"),
                "ppid": process.ppid(),
                "name": info.get("name") or "",
                "user": info.get("username") or "",
                "status": info.get("status") or "",
                "cpuPercent": round(process.cpu_percent(None) or 0, 2),
                "memoryPercent": round(info.get("memory_percent") or 0, 2),
                "memoryRss": getattr(memory_info, "rss", 0),
                "memoryVms": getattr(memory_info, "vms", 0),
                "threads": info.get("num_threads") or 0,
                "createdAt": datetime.fromtimestamp(create_time).isoformat() if create_time else "",
                "exe": info.get("exe") or "",
                "cmdline": " ".join(cmdline[:12]) if cmdline else ""
            })
        except Exception:
            continue

    processes.sort(key=lambda item: (item["cpuPercent"], item["memoryPercent"], item["memoryRss"]), reverse=True)
    return processes[:limit]


def collect_open_ports(limit=300):
    ports = []
    try:
        for connection in psutil.net_connections(kind="inet"):
            if not connection.laddr:
                continue
            proto = connection_protocol(connection)
            status = connection.status or ("OPEN" if proto == "udp" else "")
            if proto == "tcp" and status != psutil.CONN_LISTEN:
                continue
            owner = process_brief(connection.pid)
            ports.append({
                "ip": connection_ip(connection.laddr),
                "port": connection_port(connection.laddr),
                "proto": proto,
                "family": connection_family(connection),
                "status": status,
                "pid": connection.pid,
                "process": owner.get("process", ""),
                "user": owner.get("user", ""),
                "cmdline": owner.get("cmdline", "")
            })
    except Exception:
        pass
    ports.sort(key=lambda item: (str(item.get("proto") or ""), int(item.get("port") or 0), str(item.get("ip") or "")))
    return ports[:limit]


def collect_network_interfaces():
    payload = []
    addresses = psutil.net_if_addrs()
    counters = psutil.net_io_counters(pernic=True)

    for name, addrs in addresses.items():
        ipv4 = [item.address for item in addrs if getattr(item, "family", None) == socket.AF_INET]
        stats = counters.get(name)
        payload.append({
            "name": name,
            "ipv4": ipv4,
            "bytesSent": getattr(stats, "bytes_sent", 0),
            "bytesRecv": getattr(stats, "bytes_recv", 0)
        })
    return payload


def collect_users():
    if IS_WINDOWS:
        rows = []
        query_result = run_command_result(["query", "user"], timeout=8)
        if query_result.get("ok") and query_result.get("stdout"):
            for line in query_result.get("stdout", "").splitlines()[1:]:
                text = line.strip().lstrip(">").strip()
                if not text:
                    continue
                match = re.match(r"^(?P<name>\\S+)\\s+(?P<session>\\S+)\\s+(?P<id>\\d+)\\s+(?P<state>\\S+)\\s+(?P<idle>\\S+)\\s+(?P<logon>.+)$", text)
                if match:
                    rows.append({
                        "name": match.group("name"),
                        "terminal": match.group("session"),
                        "host": "windows",
                        "started": 0,
                        "sessionId": match.group("id"),
                        "state": match.group("state"),
                        "logonTime": match.group("logon").strip()
                    })
            if rows:
                return rows

    result = []
    try:
        for user in psutil.users():
            result.append({
                "name": user.name,
                "terminal": user.terminal,
                "host": user.host,
                "started": user.started,
                "sessionId": "",
                "state": ""
            })
    except Exception:
        pass
    return result


PRIVILEGED_GROUP_NAMES = {
    "root",
    "sudo",
    "wheel",
    "adm",
    "admin",
    "docker",
    "lxd",
    "systemd-journal",
    "administrators",
    "administradores",
    "backup operators",
    "operadores de copia",
    "remote desktop users",
    "usuarios de escritorio remoto",
}


def normalize_account_name(value):
    text = str(value or "").strip()
    if "\\\\" in text:
        text = text.split("\\\\")[-1]
    return text


def is_privileged_group_name(name):
    return normalize_account_name(name).lower() in PRIVILEGED_GROUP_NAMES


def is_safe_account_value(value, label):
    text = str(value or "").strip()
    if not text:
        return False, f"{label} requerido"
    if len(text) > 128:
        return False, f"{label} demasiado largo"
    if text.startswith("-"):
        return False, f"{label} no puede empezar por guion"
    if not re.match(r"^[A-Za-z0-9_.@\\\\ -]+$", text):
        return False, f"{label} contiene caracteres no permitidos"
    return True, ""


def ps_quote(value):
    return "'" + str(value or "").replace("'", "''") + "'"


def collect_windows_user_inventory():
    script = r"""
$ErrorActionPreference = 'SilentlyContinue'
$users = @(Get-LocalUser | ForEach-Object {
  [pscustomobject]@{
    name = $_.Name
    fullName = $_.FullName
    description = $_.Description
    enabled = [bool]$_.Enabled
    disabled = -not [bool]$_.Enabled
    locked = $false
    passwordRequired = [bool]$_.PasswordRequired
    passwordExpires = [bool]$_.PasswordExpires
    userMayChangePassword = [bool]$_.UserMayChangePassword
    lastLogin = if ($_.LastLogon) { $_.LastLogon.ToString('o') } else { $null }
    sid = $_.SID.Value
    groups = @()
    privileged = $false
    system = $false
  }
})
$groups = @(Get-LocalGroup | ForEach-Object {
  $groupName = $_.Name
  $members = @(Get-LocalGroupMember -Group $groupName -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
  [pscustomobject]@{
    name = $groupName
    description = $_.Description
    sid = $_.SID.Value
    members = $members
  }
})
[pscustomobject]@{
  users = $users
  groups = $groups
} | ConvertTo-Json -Depth 6 -Compress
"""
    raw = run_command(["powershell", "-NoProfile", "-NonInteractive", "-Command", script])
    try:
        payload = json.loads(raw)
    except Exception:
        payload = {"users": [], "groups": []}

    users = payload.get("users") or []
    groups = payload.get("groups") or []
    if isinstance(users, dict):
        users = [users]
    if isinstance(groups, dict):
        groups = [groups]

    membership = {}
    normalized_groups = []
    for group in groups:
        members = group.get("members") or []
        if isinstance(members, str):
            members = [members]
        group_name = normalize_account_name(group.get("name"))
        clean_members = [normalize_account_name(member) for member in members if normalize_account_name(member)]
        privileged = is_privileged_group_name(group_name)
        normalized_groups.append({
            "name": group_name,
            "description": group.get("description") or "",
            "sid": group.get("sid") or "",
            "members": clean_members,
            "privileged": privileged,
            "system": group_name.lower() in ["system", "trustedinstaller"]
        })
        for member in clean_members:
            membership.setdefault(member.lower(), []).append(group_name)

    normalized_users = []
    for user in users:
        name = normalize_account_name(user.get("name"))
        user_groups = sorted(set(membership.get(name.lower(), [])))
        privileged = any(is_privileged_group_name(group) for group in user_groups)
        normalized_users.append({
            "name": name,
            "fullName": user.get("fullName") or "",
            "description": user.get("description") or "",
            "sid": user.get("sid") or "",
            "enabled": bool(user.get("enabled")),
            "disabled": bool(user.get("disabled")),
            "locked": bool(user.get("locked")),
            "system": name.endswith("$") or name.lower() in ["defaultaccount", "guest", "invitado", "wdagutilityaccount"],
            "privileged": privileged,
            "groups": user_groups,
            "primaryGroup": "",
            "home": "",
            "shell": "",
            "lastLogin": user.get("lastLogin") or "",
            "passwordStatus": "required" if user.get("passwordRequired") else "not-required"
        })

    return {
        "collectedAt": now_iso(),
        "os": "windows",
        "users": normalized_users,
        "groups": normalized_groups,
        "privilegedGroups": sorted([group["name"] for group in normalized_groups if group.get("privileged")])
    }


def collect_linux_password_status():
    statuses = {}
    passwd_binary = shutil.which("passwd")
    if not passwd_binary:
        return statuses
    result = run_command_result(with_admin([passwd_binary, "-S", "-a"]), timeout=8)
    if not result.get("ok"):
        return statuses
    for line in result.get("stdout", "").splitlines():
        parts = line.split()
        if len(parts) >= 2:
            statuses[parts[0]] = parts[1]
    return statuses


def collect_linux_user_inventory():
    try:
        import grp
        import pwd
    except Exception:
        return {"collectedAt": now_iso(), "os": "linux", "users": [], "groups": [], "privilegedGroups": []}

    passwd_entries = list(pwd.getpwall())
    group_entries = list(grp.getgrall())
    group_by_gid = {entry.gr_gid: entry.gr_name for entry in group_entries}
    members_by_group = {entry.gr_name: set(entry.gr_mem or []) for entry in group_entries}
    for entry in passwd_entries:
        primary_group = group_by_gid.get(entry.pw_gid)
        if primary_group:
            members_by_group.setdefault(primary_group, set()).add(entry.pw_name)

    password_statuses = collect_linux_password_status()
    normalized_groups = []
    for entry in group_entries:
        group_name = entry.gr_name
        members = sorted(members_by_group.get(group_name, set()))
        normalized_groups.append({
            "name": group_name,
            "gid": entry.gr_gid,
            "members": members,
            "privileged": is_privileged_group_name(group_name),
            "system": entry.gr_gid < 1000
        })

    normalized_users = []
    for entry in passwd_entries:
        user_groups = sorted([
            group_name
            for group_name, members in members_by_group.items()
            if entry.pw_name in members
        ])
        password_status = password_statuses.get(entry.pw_name, "")
        locked = password_status in ["L", "LK"]
        disabled_shell = os.path.basename(entry.pw_shell or "").lower() in ["false", "nologin"]
        privileged = entry.pw_uid == 0 or any(is_privileged_group_name(group) for group in user_groups)
        normalized_users.append({
            "name": entry.pw_name,
            "uid": entry.pw_uid,
            "gid": entry.pw_gid,
            "fullName": (entry.pw_gecos or "").split(",")[0],
            "home": entry.pw_dir,
            "shell": entry.pw_shell,
            "enabled": not locked and not disabled_shell,
            "disabled": locked or disabled_shell,
            "locked": locked,
            "system": entry.pw_uid < 1000 and entry.pw_uid != 0,
            "privileged": privileged,
            "groups": user_groups,
            "primaryGroup": group_by_gid.get(entry.pw_gid, ""),
            "lastLogin": "",
            "passwordStatus": password_status
        })

    return {
        "collectedAt": now_iso(),
        "os": "linux",
        "users": normalized_users,
        "groups": normalized_groups,
        "privilegedGroups": sorted([group["name"] for group in normalized_groups if group.get("privileged")])
    }


def collect_user_inventory():
    return collect_windows_user_inventory() if IS_WINDOWS else collect_linux_user_inventory()


def execute_windows_user_management(command_type, username, group_name):
    if command_type in ["disable-user", "lock-user"]:
        script = f"Disable-LocalUser -Name {ps_quote(username)}"
    elif command_type in ["enable-user", "unlock-user"]:
        script = f"Enable-LocalUser -Name {ps_quote(username)}"
    elif command_type == "add-user-to-group":
        script = f"Add-LocalGroupMember -Group {ps_quote(group_name)} -Member {ps_quote(username)}"
    elif command_type == "remove-user-from-group":
        script = f"Remove-LocalGroupMember -Group {ps_quote(group_name)} -Member {ps_quote(username)} -Confirm:$false"
    else:
        return {"ok": False, "error": f"Comando de usuario no soportado: {command_type}"}
    return run_command_result(["powershell", "-NoProfile", "-NonInteractive", "-Command", script], timeout=20)


def execute_linux_user_management(command_type, username, group_name):
    usermod_binary = shutil.which("usermod")
    if command_type in ["disable-user", "lock-user"]:
        if not usermod_binary:
            return {"ok": False, "error": "usermod no disponible"}
        return run_command_result(with_admin([usermod_binary, "-L", username]), timeout=20)
    if command_type in ["enable-user", "unlock-user"]:
        if not usermod_binary:
            return {"ok": False, "error": "usermod no disponible"}
        return run_command_result(with_admin([usermod_binary, "-U", username]), timeout=20)
    if command_type == "add-user-to-group":
        if not usermod_binary:
            return {"ok": False, "error": "usermod no disponible"}
        return run_command_result(with_admin([usermod_binary, "-aG", group_name, username]), timeout=20)
    if command_type == "remove-user-from-group":
        gpasswd_binary = shutil.which("gpasswd")
        if not gpasswd_binary:
            return {"ok": False, "error": "gpasswd no disponible"}
        return run_command_result(with_admin([gpasswd_binary, "-d", username, group_name]), timeout=20)
    return {"ok": False, "error": f"Comando de usuario no soportado: {command_type}"}


def execute_user_management_command(command_type, payload):
    command_type = str(command_type or "").strip()
    if command_type == "refresh-user-inventory":
        return {"ok": True, "userInventory": collect_user_inventory(), "message": "Inventario de usuarios recogido"}

    username = normalize_account_name(payload.get("username") or payload.get("user") or "")
    ok, error = is_safe_account_value(username, "Usuario")
    if not ok:
        return {"ok": False, "error": error}

    group_required = command_type in ["add-user-to-group", "remove-user-from-group"]
    group_name = normalize_account_name(payload.get("group") or payload.get("groupName") or "")
    if group_required:
        ok, error = is_safe_account_value(group_name, "Grupo")
        if not ok:
            return {"ok": False, "error": error}

    result = execute_windows_user_management(command_type, username, group_name) if IS_WINDOWS else execute_linux_user_management(command_type, username, group_name)
    success = bool(result.get("ok"))
    message = "Operación de usuario ejecutada" if success else (result.get("error") or result.get("stderr") or "No se pudo ejecutar la operación")
    return {
        "ok": success,
        "type": command_type,
        "username": username,
        "group": group_name,
        "stdout": result.get("stdout", ""),
        "stderr": result.get("stderr", ""),
        "returncode": result.get("returncode"),
        "message": message,
        "userInventory": collect_user_inventory() if success else None
    }


def collect_host_health_summary():
    disks = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({
                "mountpoint": part.mountpoint,
                "device": part.device,
                "percent": usage.percent,
                "free": usage.free,
                "total": usage.total
            })
        except Exception:
            continue
    return {
        "ok": True,
        "checkedAt": now_iso(),
        "hostname": socket.gethostname(),
        "uptimeSeconds": int(time.time() - psutil.boot_time()),
        "cpuTotal": psutil.cpu_percent(interval=0.2),
        "memoryPercent": psutil.virtual_memory().percent,
        "diskMaxPercent": max([item.get("percent", 0) for item in disks] or [0]),
        "disks": disks[:20],
        "connectedUsers": collect_users(),
        "failedServices": collect_failed_services(),
        "openPorts": collect_open_ports(limit=80)
    }


def execute_session_management_command(command_type, payload):
    command_type = str(command_type or "").strip()
    if command_type == "list-connected-users":
        return {"ok": True, "users": collect_users(), "message": "Usuarios conectados recogidos"}

    if command_type != "terminate-user-session":
        return {"ok": False, "error": f"Comando de sesión no soportado: {command_type}"}

    username = normalize_account_name(payload.get("username") or payload.get("user") or "")
    session_id = str(payload.get("sessionId") or payload.get("session_id") or "").strip()
    ok, error = is_safe_account_value(username, "Usuario")
    if not ok:
        return {"ok": False, "error": error}

    if IS_WINDOWS:
        target_id = session_id
        if not target_id:
            for item in collect_users():
                if str(item.get("name") or "").lower() == username.lower() and item.get("sessionId"):
                    target_id = str(item.get("sessionId"))
                    break
        if not target_id or not re.fullmatch(r"\\d+", target_id):
            return {"ok": False, "error": "ID de sesión Windows requerido para cerrar la sesión"}
        result = run_command_result(["logoff", target_id], timeout=20)
    else:
        loginctl = shutil.which("loginctl")
        if not loginctl:
            return {"ok": False, "error": "loginctl no disponible. No se cerrará la sesión con métodos destructivos."}
        result = run_command_result(with_admin([loginctl, "terminate-user", username]), timeout=20)

    return {
        "ok": bool(result.get("ok")),
        "username": username,
        "sessionId": session_id,
        "stdout": result.get("stdout", ""),
        "stderr": result.get("stderr", ""),
        "message": "Sesión de usuario cerrada" if result.get("ok") else "No se pudo cerrar la sesión de usuario",
        "connectedUsers": collect_users() if result.get("ok") else None
    }


def collect_temperatures():
    if IS_WINDOWS:
        try:
            ps = (
                "Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue "
                "| Select-Object InstanceName,@{N='CurrentCelsius';E={[math]::Round(($_.CurrentTemperature / 10) - 273.15, 1)}} "
                "| ConvertTo-Json -Compress"
            )
            sensors = []
            for item in as_list(powershell_json(ps, timeout=10)):
                celsius = to_number(item.get("CurrentCelsius"), None)
                if celsius is None or celsius < -20 or celsius > 140:
                    continue
                sensors.append({
                    "source": "ACPI",
                    "label": item.get("InstanceName") or "Thermal zone",
                    "current": celsius,
                    "high": 85,
                    "critical": 100
                })
            return sensors
        except Exception:
            return []

    try:
        temps = psutil.sensors_temperatures()
        output = []
        for key, readings in temps.items():
            for reading in readings:
                output.append({
                    "source": key,
                    "label": reading.label or key,
                    "current": reading.current,
                    "high": getattr(reading, "high", None),
                    "critical": getattr(reading, "critical", None)
                })
        if output:
            return output
    except Exception:
        pass

    output = []
    try:
        for temp_file in glob.glob("/sys/class/thermal/thermal_zone*/temp"):
            zone_dir = os.path.dirname(temp_file)
            try:
                raw_value = read_tail(temp_file, 1)[0]
                celsius = to_number(raw_value, 0)
                if celsius > 1000:
                    celsius = celsius / 1000
                label = os.path.basename(zone_dir)
                type_file = os.path.join(zone_dir, "type")
                if os.path.exists(type_file):
                    label = read_tail(type_file, 1)[0] or label
                if -20 <= celsius <= 140:
                    output.append({
                        "source": "sysfs",
                        "label": label,
                        "current": round(celsius, 1),
                        "high": 85,
                        "critical": 100
                    })
            except Exception:
                continue
        return output
    except Exception:
        return []


def parse_sudo_event(line, timestamp, fallback_ip):
    sudo_match = re.search(r"sudo:\\s+([^:]+?)\\s*:\\s*(.+)", line)
    username = sudo_match.group(1).strip() if sudo_match else "desconocido"
    details = sudo_match.group(2) if sudo_match else line
    field_pairs = dict((key, value.strip()) for key, value in re.findall(r"([A-Z_]+)=([^;]+)", details))
    command_match = re.search(r"COMMAND=(.+)$", details)
    command = command_match.group(1).strip() if command_match else ""

    return {
        "kind": "sudo_command",
        "user": username,
        "sourceIp": fallback_ip,
        "protocol": "sudo",
        "runAs": field_pairs.get("USER", ""),
        "tty": field_pairs.get("TTY", ""),
        "cwd": field_pairs.get("PWD", ""),
        "command": command,
        "message": line,
        "timestamp": timestamp
    }


def parse_auth_events(lines):
    events = []
    for line in lines:
        lower = line.lower()
        timestamp = now_iso()
        ip_match = re.search(r"(\\d+\\.\\d+\\.\\d+\\.\\d+)", line)
        user_match = re.search(r"for\\s+(invalid user\\s+)?([a-zA-Z0-9._-]+)", line) or re.search(r"user=([a-zA-Z0-9._-]+)", line)
        username = user_match.group(user_match.lastindex or 1) if user_match else "desconocido"
        ip_address = ip_match.group(1) if ip_match else "sin-ip"
        protocol = normalize_event_protocol("", line)

        if "failed password" in lower or "authentication failure" in lower:
            events.append({
                "kind": "failed_login",
                "user": username,
                "sourceIp": ip_address,
                "protocol": protocol,
                "message": line,
                "timestamp": timestamp
            })
        elif "accepted password" in lower or "session opened" in lower:
            events.append({
                "kind": "successful_login",
                "user": username,
                "sourceIp": ip_address,
                "protocol": protocol,
                "message": line,
                "timestamp": timestamp
            })
        elif "sudo" in lower:
            events.append(parse_sudo_event(line, timestamp, ip_address))
        elif "useradd" in lower or "new user" in lower or "groupadd" in lower:
            events.append({
                "kind": "new_user",
                "subject": username,
                "protocol": "account",
                "message": line,
                "timestamp": timestamp
            })
    return events[-80:]


def counter_rows(counter, limit=8):
    return [
        {"value": key, "count": value}
        for key, value in sorted(counter.items(), key=lambda item: (-item[1], str(item[0])))[:limit]
    ]


def build_security_access_summary(security, blocked_ips):
    events = as_list(security.get("events") if isinstance(security, dict) else [])
    failed = [event for event in events if isinstance(event, dict) and event.get("kind") == "failed_login"]
    successful = [event for event in events if isinstance(event, dict) and event.get("kind") == "successful_login"]
    sudo = [event for event in events if isinstance(event, dict) and event.get("kind") == "sudo_command"]
    blocked = as_list(blocked_ips)

    users = {}
    ips = {}
    protocols = {}
    for event in failed:
        user = str(event.get("user") or "desconocido").strip() or "desconocido"
        ip = str(event.get("sourceIp") or "sin-ip").strip() or "sin-ip"
        protocol = normalize_event_protocol(event.get("protocol"), event.get("message"))
        users[user] = users.get(user, 0) + 1
        if valid_source_ip(ip):
            ips[ip] = ips.get(ip, 0) + 1
        protocols[protocol] = protocols.get(protocol, 0) + 1
    for event in sudo:
        protocols["sudo"] = protocols.get("sudo", 0) + 1

    top_ip = counter_rows(ips, 1)
    top_user = counter_rows(users, 1)
    repeated_ips = [item for item in counter_rows(ips, 10) if item["count"] >= 2]
    attacked_users = counter_rows(users, 10)
    blocked_ip_values = {
        str(item.get("ip") or "").strip()
        for item in blocked
        if isinstance(item, dict) and item.get("ip")
    }
    unblocked_repeated = [
        item for item in repeated_ips
        if item["value"] not in blocked_ip_values
    ]

    if unblocked_repeated and unblocked_repeated[0]["count"] >= 5:
        recommendation = f"Bloquear {unblocked_repeated[0]['value']} y revisar el usuario {top_user[0]['value'] if top_user else 'afectado'}."
        severity = "danger"
    elif len(failed) >= 5:
        recommendation = "Revisar accesos fallidos, confirmar origen y ajustar reglas de respuesta inteligente."
        severity = "warning"
    elif sudo:
        recommendation = "Revisar comandos privilegiados recientes y validar que corresponden a operación autorizada."
        severity = "warning"
    else:
        recommendation = "Sin patrón de acceso anómalo en la muestra actual."
        severity = "ok"

    return {
        "collectedAt": now_iso(),
        "failedLogins": len(failed),
        "successfulLogins": len(successful),
        "sudoEvents": len(sudo),
        "blockedIps": len(blocked),
        "repeatedIps": repeated_ips,
        "attackedUsers": attacked_users,
        "protocols": counter_rows(protocols, 8),
        "topIp": top_ip[0] if top_ip else None,
        "topUser": top_user[0] if top_user else None,
        "recommendation": recommendation,
        "severity": severity
    }


def collect_security():
    auth_log = get_auth_log_path()
    if IS_WINDOWS:
        events = collect_windows_security_events()
        if MODULES["fileIntegrity"]:
            events.extend(collect_integrity_events())
        return {"authLogPath": auth_log, "events": events, "authTail": []}

    auth_lines = read_tail(auth_log, MAX_LOG_LINES)
    events = parse_auth_events(auth_lines)
    if MODULES["fileIntegrity"]:
        events.extend(collect_integrity_events())
    return {"authLogPath": auth_log, "events": events, "authTail": auth_lines}


def collect_logs():
    custom_logs = []
    for path in get_additional_log_paths():
        custom_logs.extend(expand_log_source(path))

    if IS_WINDOWS:
        win_lines = collect_windows_logs()
        return {
            "syslogPath": "",
            "syslogTail": [],
            "journalTail": win_lines,
            "kernelErrors": [],
            "customLogs": custom_logs
        }

    syslog_path = detect_syslog_path()
    journal_output = run_command(["journalctl", "-n", str(MAX_LOG_LINES), "--no-pager"])
    return {
        "syslogPath": syslog_path,
        "syslogTail": read_tail(syslog_path, MAX_LOG_LINES),
        "journalTail": journal_output.splitlines()[-MAX_LOG_LINES:],
        "kernelErrors": collect_kernel_errors(),
        "customLogs": custom_logs
    }


def collect_kernel_errors():
    binary = shutil.which("dmesg")
    if not binary:
        return []
    result = run_command_result(with_admin([binary]), timeout=8)
    if not result["ok"]:
        return []
    return [line for line in result["stdout"].splitlines() if "error" in line.lower()][-25:]


_NET_IO_PREV = {}
_NET_IO_LOCK = threading.Lock()


def collect_network_rates():
    global _NET_IO_PREV
    counters = psutil.net_io_counters(pernic=True)
    now = time.time()
    rates = []
    with _NET_IO_LOCK:
        for name, stats in counters.items():
            prev = _NET_IO_PREV.get(name)
            elapsed = now - prev["ts"] if prev else 0
            if prev and elapsed > 0:
                send_rate = (stats.bytes_sent - prev["sent"]) / elapsed
                recv_rate = (stats.bytes_recv - prev["recv"]) / elapsed
            else:
                send_rate = 0
                recv_rate = 0
            rates.append({
                "name": name,
                "sendBytesPerSec": round(max(send_rate, 0), 1),
                "recvBytesPerSec": round(max(recv_rate, 0), 1)
            })
            _NET_IO_PREV[name] = {"ts": now, "sent": stats.bytes_sent, "recv": stats.bytes_recv}
    return rates


def collect_established_connections():
    result = []
    try:
        for conn in psutil.net_connections(kind="inet"):
            if conn.status == "ESTABLISHED" and conn.raddr:
                owner = process_brief(conn.pid)
                result.append({
                    "pid": conn.pid,
                    "process": owner.get("process", ""),
                    "user": owner.get("user", ""),
                    "cmdline": owner.get("cmdline", ""),
                    "proto": connection_protocol(conn),
                    "family": connection_family(conn),
                    "localIp": connection_ip(conn.laddr),
                    "localPort": connection_port(conn.laddr),
                    "remoteIp": connection_ip(conn.raddr),
                    "remotePort": connection_port(conn.raddr),
                    "localAddr": format_connection_address(conn.laddr),
                    "remoteAddr": format_connection_address(conn.raddr),
                    "status": conn.status
                })
    except Exception:
        pass
    result.sort(key=lambda item: (str(item.get("process") or ""), int(item.get("pid") or 0), str(item.get("remoteAddr") or "")))
    return result[:120]


def collect_failed_services():
    if IS_WINDOWS:
        try:
            ps = "Get-Service | Where-Object {$_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic'} | Select-Object Name,DisplayName | ConvertTo-Json -Compress"
            result = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps], capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and result.stdout.strip():
                raw = json.loads(result.stdout)
                if isinstance(raw, dict):
                    raw = [raw]
                return [{"name": s.get("Name", ""), "description": s.get("DisplayName", ""), "activeState": "stopped"} for s in raw]
        except Exception:
            pass
        return []
    try:
        out = run_command(["systemctl", "--failed", "--no-pager", "--no-legend", "--plain"])
        services = []
        for line in out.splitlines():
            parts = line.split()
            if parts:
                services.append({
                    "name": parts[0],
                    "activeState": parts[1] if len(parts) > 1 else "failed",
                    "subState": parts[2] if len(parts) > 2 else ""
                })
        return services
    except Exception:
        return []


def service_action_supported():
    if IS_WINDOWS:
        return command_exists("powershell", "pwsh")
    return bool(shutil.which("systemctl"))


def normalize_service_name(value):
    raw = str(value or "").strip()
    raw = raw.replace("\\\\", "").replace("/", "")
    return re.sub(r"[^A-Za-z0-9_.@:-]", "", raw)[:160]


def collect_windows_service_inventory():
    ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
$serviceEvents = @{}
try {
  Get-WinEvent -LogName System -ProviderName 'Service Control Manager' -MaxEvents 160 |
    Where-Object { $_.Id -in 7000,7001,7009,7011,7023,7024,7031,7034 } |
    ForEach-Object {
      $message = $_.Message
      $name = ''
      if ($message -match "The (.+?) service") { $name = $Matches[1] }
      if ($name -and -not $serviceEvents.ContainsKey($name)) {
        $serviceEvents[$name] = [pscustomobject]@{
          id = $_.Id
          timestamp = $_.TimeCreated.ToString('o')
          message = $message
        }
      }
    }
} catch { }
Get-CimInstance Win32_Service |
  Sort-Object Name |
  Select-Object -First 260 |
  ForEach-Object {
    $recent = $serviceEvents[$_.Name]
    if (-not $recent) { $recent = $serviceEvents[$_.DisplayName] }
    [pscustomobject]@{
      name = $_.Name
      displayName = $_.DisplayName
      description = $_.Description
      activeState = $_.State
      subState = $_.Status
      loadState = ''
      startup = $_.StartMode
      startName = $_.StartName
      pid = [int]($_.ProcessId -as [int])
      exitCode = [int]($_.ExitCode -as [int])
      canManage = $true
      recentFailure = $recent
    }
  } | ConvertTo-Json -Depth 5 -Compress
"""
    services = []
    for item in as_list(powershell_json(ps, timeout=22)):
        if not isinstance(item, dict):
            continue
        services.append({
            "name": item.get("name", ""),
            "displayName": item.get("displayName", "") or item.get("name", ""),
            "description": item.get("description", ""),
            "activeState": item.get("activeState", ""),
            "subState": item.get("subState", ""),
            "loadState": item.get("loadState", ""),
            "startup": item.get("startup", ""),
            "startName": item.get("startName", ""),
            "pid": to_int(item.get("pid"), 0),
            "exitCode": to_int(item.get("exitCode"), 0),
            "canManage": bool(item.get("canManage", True)),
            "recentFailure": item.get("recentFailure") if isinstance(item.get("recentFailure"), dict) else None
        })
    return services


def collect_linux_service_inventory():
    if not shutil.which("systemctl"):
        return []
    startup = {}
    unit_files = run_command_result(["systemctl", "list-unit-files", "--type=service", "--no-pager", "--no-legend"], timeout=5)
    if unit_files.get("ok"):
        for line in unit_files.get("stdout", "").splitlines():
            parts = line.split()
            if len(parts) >= 2:
                startup[parts[0]] = parts[1]

    services = []
    units = run_command_result(["systemctl", "list-units", "--type=service", "--all", "--no-pager", "--no-legend", "--plain"], timeout=6)
    if units.get("ok"):
        for line in units.get("stdout", "").splitlines():
            parts = line.split(None, 4)
            if not parts:
                continue
            name = parts[0]
            services.append({
                "name": name,
                "displayName": name,
                "description": parts[4] if len(parts) > 4 else "",
                "loadState": parts[1] if len(parts) > 1 else "",
                "activeState": parts[2] if len(parts) > 2 else "",
                "subState": parts[3] if len(parts) > 3 else "",
                "startup": startup.get(name, ""),
                "startName": "",
                "pid": 0,
                "exitCode": 0,
                "canManage": True,
                "recentFailure": None
            })
    services.sort(key=lambda item: (item.get("activeState") != "failed", item.get("activeState") != "active", item.get("name", "")))
    return services[:260]


def collect_service_inventory():
    return collect_windows_service_inventory() if IS_WINDOWS else collect_linux_service_inventory()


def execute_service_management_command(command_type, payload):
    command_type = str(command_type or "").strip()
    if command_type == "refresh-service-inventory":
        return {"ok": True, "serviceInventory": collect_service_inventory(), "message": "Inventario de servicios actualizado"}

    service_name = normalize_service_name(payload.get("serviceName") or payload.get("name") or payload.get("service") or "")
    if not service_name:
        return {"ok": False, "error": "Servicio requerido"}
    if command_type not in ["start-service", "stop-service", "restart-service"]:
        return {"ok": False, "error": f"Comando de servicio no soportado: {command_type}"}

    if IS_WINDOWS:
        action = {
            "start-service": "Start-Service",
            "stop-service": "Stop-Service",
            "restart-service": "Restart-Service"
        }[command_type]
        force = " -Force" if command_type in ["stop-service", "restart-service"] else ""
        script = f"{action} -Name {ps_quote(service_name)}{force}; Start-Sleep -Seconds 1"
        result = run_command_result(["powershell", "-NoProfile", "-NonInteractive", "-Command", script], timeout=30)
    else:
        systemctl = shutil.which("systemctl")
        if not systemctl:
            return {"ok": False, "error": "systemctl no disponible"}
        result = run_command_result(with_admin([systemctl, command_type.split("-", 1)[0], service_name]), timeout=30)

    success = bool(result.get("ok"))
    return {
        "ok": success,
        "type": command_type,
        "serviceName": service_name,
        "stdout": result.get("stdout", ""),
        "stderr": result.get("stderr", ""),
        "message": "Operación de servicio ejecutada" if success else (result.get("stderr") or result.get("error") or "No se pudo ejecutar la operación"),
        "serviceInventory": collect_service_inventory() if success else None
    }


def collect_windows_scheduled_tasks():
    ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
Get-ScheduledTask |
  Sort-Object TaskPath,TaskName |
  Select-Object -First 220 |
  ForEach-Object {
    $info = $null
    try { $info = $_ | Get-ScheduledTaskInfo } catch { }
    [pscustomobject]@{
      name = $_.TaskName
      path = $_.TaskPath
      state = $_.State.ToString()
      enabled = ($_.State.ToString() -ne 'Disabled')
      author = $_.Author
      description = $_.Description
      lastRunTime = if ($info -and $info.LastRunTime) { $info.LastRunTime.ToString('o') } else { '' }
      nextRunTime = if ($info -and $info.NextRunTime) { $info.NextRunTime.ToString('o') } else { '' }
      lastResult = if ($info) { [int]$info.LastTaskResult } else { $null }
      source = 'TaskScheduler'
    }
  } | ConvertTo-Json -Depth 4 -Compress
"""
    tasks = []
    for item in as_list(powershell_json(ps, timeout=22)):
        if not isinstance(item, dict):
            continue
        tasks.append({
            "name": item.get("name", ""),
            "path": item.get("path", ""),
            "state": item.get("state", ""),
            "enabled": bool(item.get("enabled", False)),
            "author": item.get("author", ""),
            "description": item.get("description", ""),
            "lastRunTime": item.get("lastRunTime", ""),
            "nextRunTime": item.get("nextRunTime", ""),
            "lastResult": item.get("lastResult"),
            "source": item.get("source", "TaskScheduler")
        })
    return tasks


def collect_linux_scheduled_tasks():
    tasks = []
    if shutil.which("systemctl"):
        result = run_command_result(["systemctl", "list-timers", "--all", "--no-pager", "--no-legend", "--plain"], timeout=5)
        if result.get("ok"):
            for line in result.get("stdout", "").splitlines()[:140]:
                parts = line.split()
                if len(parts) >= 5:
                    unit = parts[-2] if len(parts) >= 2 else ""
                    activates = parts[-1] if len(parts) >= 1 else ""
                    tasks.append({
                        "name": unit,
                        "path": activates,
                        "state": "timer",
                        "enabled": True,
                        "author": "systemd",
                        "description": line,
                        "lastRunTime": "",
                        "nextRunTime": " ".join(parts[:2]) if len(parts) > 2 else "",
                        "lastResult": "",
                        "source": "systemd-timer"
                    })
    cron_sources = ["/etc/crontab"]
    cron_sources.extend(glob.glob("/etc/cron.d/*")[:60])
    for path in cron_sources:
        if not os.path.isfile(path):
            continue
        for index, line in enumerate(read_tail(path, 80)):
            text = line.strip()
            if not text or text.startswith("#"):
                continue
            tasks.append({
                "name": f"{os.path.basename(path)}:{index + 1}",
                "path": path,
                "state": "cron",
                "enabled": True,
                "author": "root" if path.startswith("/etc") else "",
                "description": text[:240],
                "lastRunTime": "",
                "nextRunTime": "",
                "lastResult": "",
                "source": "cron"
            })
            if len(tasks) >= 220:
                return tasks
    user_cron = run_command_result(["sh", "-c", "crontab -l 2>/dev/null"], timeout=3)
    if user_cron.get("ok"):
        for index, line in enumerate(user_cron.get("stdout", "").splitlines()):
            text = line.strip()
            if not text or text.startswith("#"):
                continue
            tasks.append({
                "name": f"user-crontab:{index + 1}",
                "path": "crontab -l",
                "state": "cron",
                "enabled": True,
                "author": INSTALL_USER,
                "description": text[:240],
                "lastRunTime": "",
                "nextRunTime": "",
                "lastResult": "",
                "source": "cron"
            })
            if len(tasks) >= 220:
                break
    return tasks[:220]


def collect_scheduled_tasks():
    return collect_windows_scheduled_tasks() if IS_WINDOWS else collect_linux_scheduled_tasks()


def collect_fans():
    if IS_WINDOWS:
        try:
            ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance Win32_Fan | ForEach-Object {
  [pscustomobject]@{
    source = 'Win32_Fan'
    label = if ($_.Name) { $_.Name } elseif ($_.DeviceID) { $_.DeviceID } else { 'Fan' }
    rpm = [int]($_.DesiredSpeed -as [int])
    status = $_.Status
  }
} | ConvertTo-Json -Depth 3 -Compress
"""
            fans = []
            for item in as_list(powershell_json(ps, timeout=10)):
                if not isinstance(item, dict):
                    continue
                fans.append({
                    "source": item.get("source", "Win32_Fan"),
                    "label": item.get("label", "Fan"),
                    "rpm": to_int(item.get("rpm"), 0),
                    "status": item.get("status", "")
                })
            return fans
        except Exception:
            pass
        return []
    try:
        fans = psutil.sensors_fans()
        result = []
        for source, readings in fans.items():
            for reading in readings:
                result.append({"source": source, "label": reading.label or source, "rpm": reading.current})
        return result
    except Exception:
        return []


def collect_battery():
    try:
        bat = psutil.sensors_battery()
        if bat is None:
            return None
        secs = bat.secsleft if bat.secsleft not in (psutil.POWER_TIME_UNLIMITED, psutil.POWER_TIME_UNKNOWN) else -1
        return {
            "percent": round(bat.percent, 1),
            "secsLeft": secs,
            "powerPlugged": bat.power_plugged
        }
    except Exception:
        return None


def collect_smart_data():
    if IS_WINDOWS:
        try:
            ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
$physical = @()
try {
  $physical = @(Get-PhysicalDisk | ForEach-Object {
    [pscustomobject]@{
      device = $_.FriendlyName
      model = $_.FriendlyName
      serialNumber = $_.SerialNumber
      sizeBytes = [int64]$_.Size
      mediaType = $_.MediaType
      healthStatus = $_.HealthStatus.ToString()
      operationalStatus = ($_.OperationalStatus -join ', ')
      canPool = $_.CanPool
    }
  })
} catch { }
$drives = @(Get-CimInstance Win32_DiskDrive | ForEach-Object {
  [pscustomobject]@{
    device = $_.DeviceID
    model = $_.Model
    serialNumber = ($_.SerialNumber -as [string]).Trim()
    sizeBytes = [int64]$_.Size
    mediaType = $_.MediaType
    healthStatus = $_.Status
    operationalStatus = ''
    canPool = $null
  }
})
$predict = @()
try {
  $predict = @(Get-CimInstance -Namespace root/wmi -ClassName MSStorageDriver_FailurePredictStatus | ForEach-Object {
    [pscustomobject]@{
      instanceName = $_.InstanceName
      predictFailure = [bool]$_.PredictFailure
      reason = [int]($_.Reason -as [int])
    }
  })
} catch { }
[pscustomobject]@{
  physical = $physical
  drives = $drives
  predict = $predict
} | ConvertTo-Json -Depth 5 -Compress
"""
            raw = powershell_json(ps, timeout=18)
            if not isinstance(raw, dict):
                return []
            prediction = as_list(raw.get("predict"))
            rows = as_list(raw.get("physical")) or as_list(raw.get("drives"))
            disks = []
            for index, item in enumerate(rows):
                if not isinstance(item, dict):
                    continue
                pred = prediction[index] if index < len(prediction) and isinstance(prediction[index], dict) else {}
                predict_failure = pred.get("predictFailure") if pred else None
                attrs = {
                    "HealthStatus": item.get("healthStatus", ""),
                    "OperationalStatus": item.get("operationalStatus", ""),
                    "PredictFailure": predict_failure,
                    "FailureReason": pred.get("reason", "") if pred else ""
                }
                disks.append({
                    "device": item.get("device", "") or item.get("model", ""),
                    "model": item.get("model", ""),
                    "serialNumber": item.get("serialNumber", ""),
                    "sizeBytes": to_int(item.get("sizeBytes"), 0),
                    "mediaType": item.get("mediaType", ""),
                    "healthStatus": item.get("healthStatus", ""),
                    "predictFailure": bool(predict_failure) if predict_failure is not None else False,
                    "attributes": attrs
                })
            return disks
        except Exception:
            return []
    smartctl_binary = shutil.which("smartctl")
    if not smartctl_binary:
        return []
    try:
        lsblk = run_command(["lsblk", "-dno", "NAME,TYPE"])
        disks = []
        for line in lsblk.splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "disk":
                dev = f"/dev/{parts[0]}"
                result = run_command_result(with_admin([smartctl_binary, "-H", "-A", "-j", dev]), timeout=5)
                out = result["stdout"] if result["ok"] else ""
                try:
                    data = json.loads(out)
                    device_info = data.get("device", {}) if isinstance(data, dict) else {}
                    model = data.get("model_name") or data.get("model_family") or ""
                    serial = data.get("serial_number") or ""
                    smart_status = data.get("smart_status", {}) if isinstance(data, dict) else {}
                    passed = smart_status.get("passed")
                    attrs = data.get("ata_smart_attributes", {}).get("table", [])
                    useful = {}
                    for attr in attrs:
                        name = attr.get("name", "")
                        if name in ("Reallocated_Sector_Ct", "Pending_Sector_Count",
                                    "Uncorrectable_Sector_Count", "Temperature_Celsius", "Power_On_Hours"):
                            useful[name] = attr.get("raw", {}).get("value", 0)
                    disks.append({
                        "device": dev,
                        "model": model,
                        "serialNumber": serial,
                        "type": device_info.get("type", ""),
                        "healthStatus": "OK" if passed is True else ("FAIL" if passed is False else ""),
                        "predictFailure": passed is False,
                        "attributes": useful
                    })
                except Exception:
                    disks.append({"device": dev, "attributes": {}})
        return disks
    except Exception:
        return []


def collect_login_history():
    if IS_WINDOWS:
        try:
            ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
Get-WinEvent -LogName Security -MaxEvents 40 -FilterXPath '*[System[EventID=4624 or EventID=4625]]' 2>$null |
  ForEach-Object {
    [pscustomobject]@{
      id=$_.Id
      ts=$_.TimeCreated.ToString('o')
      msg=$_.Message
      props=@($_.Properties | ForEach-Object { $_.Value })
    }
  } | ConvertTo-Json -Depth 4 -Compress
"""
            rows = []
            for event in as_list(powershell_json(ps, timeout=15)):
                if not isinstance(event, dict):
                    continue
                eid = to_int(event.get("id"), 0)
                msg = str(event.get("msg", ""))
                username = windows_event_prop(event, 5) or windows_event_account(msg)
                source_ip = windows_event_prop(event, 18 if eid == 4624 else 19) or windows_event_source_ip(msg, "local")
                logon_type = windows_event_prop(event, 8)
                state = "OK" if eid == 4624 else "FAIL"
                rows.append(f"[{event.get('ts', '')}] {state} user={username} source={source_ip} logonType={logon_type}")
            return rows[:30]
        except Exception:
            return []
    try:
        out = run_command(["last", "-n", "30", "-F"])
        lines = [line for line in out.splitlines()
                 if line.strip() and not line.startswith("wtmp") and "reboot" not in line.lower()]
        return lines[:30]
    except Exception:
        return []


def collect_pending_updates():
    checked_at = now_iso()
    if IS_WINDOWS:
        try:
            ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
$updates = @()
try {
  $updates = @((New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search('IsInstalled=0').Updates | ForEach-Object { $_.Title })
} catch { }
$rebootPaths = @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending',
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired',
  'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager'
)
$reboot = $false
foreach ($path in $rebootPaths) {
  if (Test-Path $path) {
    if ($path -like '*Session Manager') {
      try {
        $value = (Get-ItemProperty -Path $path -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations
        if ($value) { $reboot = $true }
      } catch { }
    } else {
      $reboot = $true
    }
  }
}
$os = Get-CimInstance Win32_OperatingSystem
[pscustomobject]@{
  manager = 'Windows Update'
  count = $updates.Count
  updates = $updates
  rebootRequired = $reboot
  lastBootTime = if ($os.LastBootUpTime) { $os.LastBootUpTime.ToString('o') } else { '' }
  installDate = if ($os.InstallDate) { $os.InstallDate.ToString('o') } else { '' }
} | ConvertTo-Json -Depth 4 -Compress
"""
            raw = powershell_json(ps, timeout=35)
            if isinstance(raw, dict):
                updates = as_list(raw.get("updates"))
                return {
                    "checkedAt": checked_at,
                    "manager": raw.get("manager", "Windows Update"),
                    "count": to_int(raw.get("count"), len(updates)),
                    "updates": [str(item) for item in updates[:25]],
                    "rebootRequired": bool(raw.get("rebootRequired", False)),
                    "lastBootTime": raw.get("lastBootTime", ""),
                    "installDate": raw.get("installDate", "")
                }
        except Exception:
            pass
        return {"checkedAt": checked_at, "manager": "Windows Update", "count": 0, "updates": [], "rebootRequired": False, "lastBootTime": "", "installDate": ""}
    try:
        manager = ""
        lines = []
        if shutil.which("apt"):
            manager = "apt"
            out = run_command(["apt", "list", "--upgradable", "-qq"])
            lines = [line for line in out.splitlines() if line.strip() and line != "Listing..."]
        elif shutil.which("dnf"):
            manager = "dnf"
            result = run_command_result(["dnf", "check-update", "-q"], timeout=30)
            if result.get("ok") or result.get("exitCode") == 100:
                lines = [line for line in result.get("stdout", "").splitlines() if line.strip() and not line.startswith("Last metadata")]
        elif shutil.which("yum"):
            manager = "yum"
            result = run_command_result(["yum", "check-update", "-q"], timeout=30)
            if result.get("ok") or result.get("exitCode") == 100:
                lines = [line for line in result.get("stdout", "").splitlines() if line.strip()]
        elif shutil.which("zypper"):
            manager = "zypper"
            result = run_command_result(["zypper", "--non-interactive", "list-updates"], timeout=30)
            if result.get("ok") or result.get("exitCode") in (100, 101, 102):
                lines = [line for line in result.get("stdout", "").splitlines() if "|" in line and not line.lower().startswith("repository")]
        elif shutil.which("checkupdates"):
            manager = "pacman"
            out = run_command(["checkupdates"])
            lines = [line for line in out.splitlines() if line.strip()]
        return {
            "checkedAt": checked_at,
            "manager": manager or "desconocido",
            "count": len(lines),
            "updates": lines[:25],
            "rebootRequired": os.path.exists("/var/run/reboot-required"),
            "lastBootTime": datetime.fromtimestamp(psutil.boot_time(), timezone.utc).isoformat().replace("+00:00", "Z"),
            "installDate": ""
        }
    except Exception:
        pass
    return {"checkedAt": checked_at, "manager": "desconocido", "count": 0, "updates": [], "rebootRequired": False, "lastBootTime": "", "installDate": ""}


def firewall_rule_managed_by_thorondor(name):
    return "thorondor block" in str(name or "").lower() or "THORONDOR_BLOCK" in str(name or "")


def firewall_rule_ip(name):
    match = re.search(r"\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", str(name or ""))
    return match.group(0) if match else ""


def firewall_rule_record(name, direction="", action="", profile="", enabled=True, provider="firewall"):
    text = str(name or "").strip()
    managed = firewall_rule_managed_by_thorondor(text)
    return {
        "name": text[:220],
        "direction": direction,
        "action": action,
        "profile": profile,
        "enabled": enabled,
        "provider": provider,
        "managedByThorondor": managed,
        "scope": "thorondor" if managed else "system",
        "ip": firewall_rule_ip(text),
        "canManage": managed
    }


def firewall_summary_from_rules(rules):
    own = [rule for rule in as_list(rules) if isinstance(rule, dict) and rule.get("managedByThorondor")]
    system = [rule for rule in as_list(rules) if isinstance(rule, dict) and not rule.get("managedByThorondor")]
    providers = {}
    for rule in as_list(rules):
        if isinstance(rule, dict):
            provider = str(rule.get("provider") or "firewall")
            providers[provider] = providers.get(provider, 0) + 1
    return {
        "total": len(as_list(rules)),
        "thorondor": len(own),
        "system": len(system),
        "blockedIps": sorted({rule.get("ip") for rule in own if rule.get("ip")}),
        "providers": counter_rows(providers, 10)
    }


def collect_firewall_rules():
    if IS_WINDOWS:
        ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
Get-NetFirewallRule -PolicyStore ActiveStore -Enabled True |
  Sort-Object DisplayName |
  Select-Object -First 180 |
  ForEach-Object {
    [pscustomobject]@{
      name = $_.DisplayName
      direction = $_.Direction.ToString()
      action = $_.Action.ToString()
      profile = $_.Profile.ToString()
      enabled = $_.Enabled.ToString()
      provider = 'windows-firewall'
    }
  } | ConvertTo-Json -Depth 3 -Compress
"""
        rules = []
        for item in as_list(powershell_json(ps, timeout=18)):
            if not isinstance(item, dict):
                continue
            rules.append(firewall_rule_record(
                item.get("name", ""),
                item.get("direction", ""),
                item.get("action", ""),
                item.get("profile", ""),
                item.get("enabled", ""),
                item.get("provider", "windows-firewall")
            ))
        return rules

    rules = []
    for binary_name in ["iptables", "ip6tables"]:
        binary = shutil.which(binary_name)
        if not binary:
            continue
        result = run_command_result(with_admin([binary, "-S"]), timeout=12)
        if result.get("ok"):
            for line in result.get("stdout", "").splitlines()[:120]:
                if line.strip():
                    rules.append(firewall_rule_record(
                        line.strip(),
                        "INPUT" if " INPUT" in line else "",
                        "DROP" if " DROP" in line else ("REJECT" if " REJECT" in line else ("ACCEPT" if " ACCEPT" in line else "")),
                        "",
                        True,
                        binary_name
                    ))
    ufw = shutil.which("ufw")
    if ufw:
        result = run_command_result(with_admin([ufw, "status", "numbered"]), timeout=10)
        if result.get("ok"):
            for line in result.get("stdout", "").splitlines()[:80]:
                text = line.strip()
                if text and not text.lower().startswith("status:"):
                    rules.append(firewall_rule_record(text, "", "", "", True, "ufw"))
    firewalld = firewalld_binary()
    if firewalld:
        result = run_command_result(with_admin([firewalld, "--list-all"]), timeout=10)
        if result.get("ok"):
            for line in result.get("stdout", "").splitlines()[:80]:
                text = line.strip()
                if text:
                    rules.append(firewall_rule_record(text, "", "", "", True, "firewalld"))
    return rules[:220]


def load_inventory_baseline():
    if not os.path.exists(INVENTORY_BASELINE_PATH):
        return {}
    try:
        with open(INVENTORY_BASELINE_PATH, "r", encoding="utf-8") as handler:
            data = json.load(handler)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_inventory_baseline(data):
    try:
        with open(INVENTORY_BASELINE_PATH, "w", encoding="utf-8") as handler:
            json.dump(data, handler, indent=2, ensure_ascii=False)
    except Exception:
        pass


def change_items(kind, previous, current, label):
    events = []
    previous = previous if isinstance(previous, dict) else {}
    current = current if isinstance(current, dict) else {}
    for key in sorted(set(current.keys()) - set(previous.keys()))[:40]:
        events.append({"kind": kind, "action": "added", "key": key, "label": label, "current": current.get(key), "timestamp": now_iso()})
    for key in sorted(set(previous.keys()) - set(current.keys()))[:40]:
        events.append({"kind": kind, "action": "removed", "key": key, "label": label, "previous": previous.get(key), "timestamp": now_iso()})
    for key in sorted(set(previous.keys()) & set(current.keys()))[:260]:
        if previous.get(key) != current.get(key):
            events.append({"kind": kind, "action": "changed", "key": key, "label": label, "previous": previous.get(key), "current": current.get(key), "timestamp": now_iso()})
            if len(events) >= 80:
                break
    return events


def suspicious_startup_text(value):
    text = json.dumps(value, sort_keys=True).lower() if isinstance(value, (dict, list)) else str(value or "").lower()
    suspicious_markers = [
        "/tmp/",
        "/dev/shm/",
        "appdata\\\\local\\\\temp",
        "powershell -enc",
        "frombase64string",
        "curl ",
        "wget ",
        "certutil",
        "bitsadmin",
        " rundll32 ",
        " regsvr32 "
    ]
    return any(marker in text for marker in suspicious_markers)


def enrich_inventory_events(events):
    enriched = []
    for event in as_list(events):
        if not isinstance(event, dict):
            continue
        current = event.get("current") if isinstance(event.get("current"), dict) else {}
        key = str(event.get("key") or "")
        kind = str(event.get("kind") or "")
        action = str(event.get("action") or "")
        severity = "info"
        important = False
        recommendation = "Revisar el cambio y marcar nuevo baseline si corresponde a operación autorizada."

        if kind == "open_port_change" and action == "added":
            severity = "warning"
            important = True
            recommendation = "Validar el proceso que abrió el puerto y cerrarlo o documentarlo si es esperado."
        elif kind == "service_inventory_change" and action == "added":
            severity = "warning"
            important = True
            recommendation = "Revisar el servicio nuevo y confirmar binario, usuario de ejecución y modo de arranque."
        elif kind == "user_inventory_change" and action in ["added", "changed"] and current.get("privileged"):
            severity = "danger"
            important = True
            event["kind"] = "privileged_user_change"
            recommendation = "Verificar inmediatamente el usuario admin y retirar privilegios si no estaba autorizado."
        elif kind == "group_inventory_change" and current.get("privileged"):
            severity = "danger"
            important = True
            recommendation = "Revisar miembros del grupo privilegiado y retirar accesos no aprobados."
        elif kind == "scheduled_task_change" and (action == "added" or suspicious_startup_text(current) or suspicious_startup_text(key)):
            severity = "danger" if suspicious_startup_text(current) or suspicious_startup_text(key) else "warning"
            important = True
            event["kind"] = "startup_binary_change"
            recommendation = "Revisar la tarea de arranque y el binario ejecutado antes de aceptar el baseline."
        elif kind == "firewall_rule_change" and action in ["added", "removed", "changed"]:
            severity = "warning"
            important = True
            recommendation = "Confirmar que el cambio de firewall es deliberado. Thorondor sólo gestionará sus reglas propias."

        event["severity"] = severity
        event["important"] = important
        event["recommendation"] = recommendation
        enriched.append(event)
    return enriched


def summarize_inventory_for_changes(user_inventory, open_ports, services, scheduled_tasks, firewall_rules):
    users = {}
    groups = {}
    for user in as_list(user_inventory.get("users") if isinstance(user_inventory, dict) else []):
        if isinstance(user, dict) and user.get("name"):
            users[user["name"]] = {
                "enabled": bool(user.get("enabled", True)),
                "privileged": bool(user.get("privileged", False)),
                "groups": sorted(as_list(user.get("groups")))
            }
    for group in as_list(user_inventory.get("groups") if isinstance(user_inventory, dict) else []):
        if isinstance(group, dict) and group.get("name"):
            groups[group["name"]] = {
                "privileged": bool(group.get("privileged", False)),
                "members": sorted(as_list(group.get("members")))
            }
    ports = {}
    for port in as_list(open_ports):
        if isinstance(port, dict):
            key = f"{port.get('proto', '')}:{port.get('ip', '')}:{port.get('port', '')}"
            ports[key] = {"process": port.get("process", ""), "pid": port.get("pid", 0), "user": port.get("user", "")}
    service_map = {}
    for service in as_list(services):
        if isinstance(service, dict) and service.get("name"):
            service_map[service["name"]] = {
                "activeState": service.get("activeState", ""),
                "subState": service.get("subState", ""),
                "startup": service.get("startup", "")
            }
    task_map = {}
    for task in as_list(scheduled_tasks):
        if isinstance(task, dict) and task.get("name"):
            key = f"{task.get('source', '')}:{task.get('path', '')}:{task.get('name', '')}"
            task_map[key] = {"state": task.get("state", ""), "enabled": bool(task.get("enabled", False))}
    firewall_map = {}
    for rule in as_list(firewall_rules):
        if isinstance(rule, dict) and rule.get("name"):
            key = f"{rule.get('provider', '')}:{rule.get('name', '')}"
            firewall_map[key] = {"action": rule.get("action", ""), "direction": rule.get("direction", ""), "enabled": rule.get("enabled", "")}
    return {
        "users": users,
        "groups": groups,
        "ports": ports,
        "services": service_map,
        "scheduledTasks": task_map,
        "firewallRules": firewall_map
    }


def save_current_inventory_baseline(user_inventory, open_ports, services, scheduled_tasks, firewall_rules):
    current = summarize_inventory_for_changes(user_inventory, open_ports, services, scheduled_tasks, firewall_rules)
    current["createdAt"] = now_iso()
    current["updatedAt"] = current["createdAt"]
    save_inventory_baseline(current)
    return current


def collect_inventory_changes(user_inventory, open_ports, services, scheduled_tasks, firewall_rules):
    current = summarize_inventory_for_changes(user_inventory, open_ports, services, scheduled_tasks, firewall_rules)
    baseline = load_inventory_baseline()
    initialized = not bool(baseline)
    events = []
    if not initialized:
        events.extend(change_items("user_inventory_change", baseline.get("users", {}), current.get("users", {}), "Usuarios"))
        events.extend(change_items("group_inventory_change", baseline.get("groups", {}), current.get("groups", {}), "Grupos"))
        events.extend(change_items("open_port_change", baseline.get("ports", {}), current.get("ports", {}), "Puertos abiertos"))
        events.extend(change_items("service_inventory_change", baseline.get("services", {}), current.get("services", {}), "Servicios"))
        events.extend(change_items("scheduled_task_change", baseline.get("scheduledTasks", {}), current.get("scheduledTasks", {}), "Tareas programadas"))
        events.extend(change_items("firewall_rule_change", baseline.get("firewallRules", {}), current.get("firewallRules", {}), "Firewall"))
    else:
        current["createdAt"] = now_iso()
        current["updatedAt"] = current["createdAt"]
        save_inventory_baseline(current)
    events = enrich_inventory_events(events)
    current["updatedAt"] = now_iso()
    important = [event for event in events if event.get("important")]
    return {
        "initialized": initialized,
        "events": events[:160],
        "importantEvents": important[:80],
        "counts": {key: len(value) for key, value in current.items() if isinstance(value, dict)},
        "baselinePath": INVENTORY_BASELINE_PATH,
        "baselineCreatedAt": baseline.get("createdAt", current.get("createdAt", "")),
        "baselineUpdatedAt": baseline.get("updatedAt", current.get("updatedAt", "")),
        "currentCounts": {key: len(value) for key, value in current.items() if isinstance(value, dict)}
    }


def create_host_baseline_payload():
    user_inventory = collect_user_inventory()
    open_ports = collect_open_ports()
    services = collect_service_inventory()
    scheduled_tasks = collect_scheduled_tasks()
    firewall_rules = collect_firewall_rules()
    baseline = save_current_inventory_baseline(user_inventory, open_ports, services, scheduled_tasks, firewall_rules)
    return {
        "ok": True,
        "message": "Baseline del host actualizado",
        "baselinePath": INVENTORY_BASELINE_PATH,
        "baseline": {
            "createdAt": baseline.get("createdAt", ""),
            "updatedAt": baseline.get("updatedAt", ""),
            "counts": {key: len(value) for key, value in baseline.items() if isinstance(value, dict)}
        }
    }


def collect_agent_operational_status(collection_errors):
    endpoint = f"http://{find_local_ip()}:{LISTEN_PORT}"
    commands = [
        "collect-telemetry",
        "collect-logs",
        "refresh-user-inventory",
        "refresh-service-inventory",
        "start-service",
        "stop-service",
        "restart-service",
        "set-host-baseline",
        "check-host-health",
        "list-connected-users",
        "terminate-user-session",
        "block-ip",
        "unblock-ip"
    ]
    permission_hints = []
    if not IS_WINDOWS and shutil.which("systemctl") and not (hasattr(os, "geteuid") and os.geteuid() == 0) and not shutil.which("sudo"):
        permission_hints.append("systemctl puede requerir sudo para operar servicios.")
    return {
        "version": AGENT_VERSION,
        "hostLabel": HOST_LABEL,
        "systemName": SYSTEM_NAME,
        "targetOs": "windows" if IS_WINDOWS else "linux",
        "listenHost": LISTEN_HOST,
        "listenPort": LISTEN_PORT,
        "endpoint": endpoint,
        "centralApiConfigured": bool(central_api_root()),
        "persistenceMode": PERSISTENCE_MODE,
        "keyAgentsPresent": bool(KEY_AGENTS),
        "keyAgentsFingerprint": sha256(KEY_AGENTS.encode("utf-8")).hexdigest()[:12] if KEY_AGENTS else "",
        "commandsAccepted": commands,
        "serviceManagementAvailable": service_action_supported(),
        "scheduledTasksAvailable": True,
        "updateMonitorAvailable": update_monitoring_available(),
        "collectionErrors": len(collection_errors or []),
        "permissionHints": permission_hints
    }


def bytes_from_capacity_text(value):
    text = str(value or "").strip()
    if not text or "no module" in text.lower():
        return 0
    match = re.search(r"([0-9]+(?:[.,][0-9]+)?)\\s*([KMGTPE]?B)", text, re.IGNORECASE)
    if not match:
        return to_int(text, 0)
    amount = to_number(match.group(1), 0)
    unit = match.group(2).upper()
    factor = {
        "KB": 1024,
        "MB": 1024 ** 2,
        "GB": 1024 ** 3,
        "TB": 1024 ** 4,
        "PB": 1024 ** 5,
        "EB": 1024 ** 6
    }.get(unit, 1)
    return int(amount * factor)


def read_sys_dmi_file(name):
    path = os.path.join("/sys/class/dmi/id", name)
    try:
        if os.path.exists(path):
            return read_tail(path, 1)[0].strip()
    except Exception:
        pass
    return ""


def parse_dmidecode_blocks(output, block_header):
    blocks = []
    current = None
    for line in str(output or "").splitlines():
        if line and not line.startswith("\\t") and not line.startswith(" "):
            if current:
                blocks.append(current)
            current = {"_header": line.strip()} if line.strip().startswith(block_header) else None
            continue
        if current is None:
            continue
        match = re.match(r"\\s*([^:]+):\\s*(.*)$", line)
        if match:
            current[match.group(1).strip()] = match.group(2).strip()
    if current:
        blocks.append(current)
    return blocks


def collect_linux_memory_modules():
    dmidecode_binary = shutil.which("dmidecode")
    if not dmidecode_binary:
        return []
    result = run_command_result(with_admin([dmidecode_binary, "-t", "memory"]), timeout=15)
    if not result.get("ok"):
        return []
    modules = []
    for block in parse_dmidecode_blocks(result.get("stdout", ""), "Memory Device"):
        size_text = block.get("Size", "")
        capacity = bytes_from_capacity_text(size_text)
        if capacity <= 0:
            continue
        modules.append({
            "locator": block.get("Locator", "") or block.get("Bank Locator", ""),
            "capacityBytes": capacity,
            "capacityLabel": size_text,
            "speedMhz": to_int(block.get("Configured Memory Speed") or block.get("Speed"), 0),
            "manufacturer": block.get("Manufacturer", ""),
            "partNumber": block.get("Part Number", ""),
            "serialNumber": block.get("Serial Number", ""),
            "type": block.get("Type", "")
        })
    return modules


def collect_linux_physical_disks():
    lsblk_binary = shutil.which("lsblk")
    if not lsblk_binary:
        return []
    result = run_command_result([lsblk_binary, "-J", "-b", "-o", "NAME,MODEL,SERIAL,SIZE,TYPE,TRAN,ROTA,VENDOR,STATE"], timeout=10)
    if not result.get("ok"):
        return []
    raw = parse_json_output(result.get("stdout"), {})
    disks = []
    for item in raw.get("blockdevices", []) if isinstance(raw, dict) else []:
        if item.get("type") != "disk":
            continue
        disks.append({
            "name": item.get("name", ""),
            "device": f"/dev/{item.get('name', '')}" if item.get("name") else "",
            "model": str(item.get("model") or "").strip(),
            "serialNumber": str(item.get("serial") or "").strip(),
            "sizeBytes": to_int(item.get("size"), 0),
            "mediaType": "HDD" if str(item.get("rota")) == "1" else "SSD/NVMe",
            "interfaceType": str(item.get("tran") or "").strip(),
            "vendor": str(item.get("vendor") or "").strip(),
            "healthStatus": str(item.get("state") or "").strip()
        })
    return disks


def collect_windows_hardware_info():
    ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name,Manufacturer,SocketDesignation,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,CurrentClockSpeed
$system = Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model,SystemType,TotalPhysicalMemory
$os = Get-CimInstance Win32_OperatingSystem | Select-Object OSArchitecture,Caption,Version
$board = Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,SerialNumber,Version
$bios = Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion,ReleaseDate,SerialNumber
$memory = @(Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
  [pscustomobject]@{
    locator = $_.DeviceLocator
    bank = $_.BankLabel
    capacityBytes = [int64]$_.Capacity
    capacityLabel = if ($_.Capacity) { ('{0:N1} GB' -f ($_.Capacity / 1GB)) } else { '' }
    speedMhz = [int]($_.ConfiguredClockSpeed -as [int])
    manufacturer = $_.Manufacturer
    partNumber = ($_.PartNumber -as [string]).Trim()
    serialNumber = ($_.SerialNumber -as [string]).Trim()
    type = $_.SMBIOSMemoryType
  }
})
$disks = @(Get-CimInstance Win32_DiskDrive | ForEach-Object {
  [pscustomobject]@{
    name = $_.DeviceID
    device = $_.DeviceID
    model = $_.Model
    serialNumber = ($_.SerialNumber -as [string]).Trim()
    sizeBytes = [int64]$_.Size
    mediaType = $_.MediaType
    interfaceType = $_.InterfaceType
    firmware = $_.FirmwareRevision
    healthStatus = $_.Status
  }
})
[pscustomobject]@{
  cpu = $cpu
  system = $system
  os = $os
  board = $board
  bios = $bios
  memoryModules = $memory
  physicalDisks = $disks
} | ConvertTo-Json -Depth 5 -Compress
"""
    raw = powershell_json(ps, timeout=18)
    if not isinstance(raw, dict):
        return {}
    cpu = raw.get("cpu") or {}
    system = raw.get("system") or {}
    os_info = raw.get("os") or {}
    board = raw.get("board") or {}
    bios = raw.get("bios") or {}
    return {
        "cpuModel": str(cpu.get("Name") or "").strip(),
        "cpuVendor": str(cpu.get("Manufacturer") or "").strip(),
        "cpuSocket": str(cpu.get("SocketDesignation") or "").strip(),
        "cpuCoresPhysical": to_int(cpu.get("NumberOfCores"), psutil.cpu_count(logical=False) or 0),
        "cpuCoresLogical": to_int(cpu.get("NumberOfLogicalProcessors"), psutil.cpu_count(logical=True) or 0),
        "cpuFreqMhz": to_int(cpu.get("CurrentClockSpeed"), 0),
        "cpuMaxFreqMhz": to_int(cpu.get("MaxClockSpeed"), 0),
        "totalRamGb": round(to_number(system.get("TotalPhysicalMemory"), psutil.virtual_memory().total) / 1024 ** 3, 2),
        "systemManufacturer": str(system.get("Manufacturer") or "").strip(),
        "systemModel": str(system.get("Model") or "").strip(),
        "systemType": str(system.get("SystemType") or "").strip(),
        "osCaption": str(os_info.get("Caption") or "").strip(),
        "osVersion": str(os_info.get("Version") or "").strip(),
        "osArchitecture": str(os_info.get("OSArchitecture") or platform.machine()).strip(),
        "baseboard": {
            "manufacturer": str(board.get("Manufacturer") or "").strip(),
            "product": str(board.get("Product") or "").strip(),
            "serialNumber": str(board.get("SerialNumber") or "").strip(),
            "version": str(board.get("Version") or "").strip()
        },
        "bios": {
            "manufacturer": str(bios.get("Manufacturer") or "").strip(),
            "version": str(bios.get("SMBIOSBIOSVersion") or "").strip(),
            "releaseDate": str(bios.get("ReleaseDate") or "").strip(),
            "serialNumber": str(bios.get("SerialNumber") or "").strip()
        },
        "memoryModules": as_list(raw.get("memoryModules")),
        "physicalDisks": as_list(raw.get("physicalDisks"))
    }


def collect_linux_hardware_info():
    vm = psutil.virtual_memory()
    freq = None
    try:
        freq = psutil.cpu_freq()
    except Exception:
        pass

    cpu_model = ""
    cpu_vendor = ""
    try:
        for line in read_tail("/proc/cpuinfo", 500):
            if not cpu_model and line.lower().startswith("model name"):
                cpu_model = line.split(":", 1)[1].strip()
            if not cpu_vendor and line.lower().startswith("vendor_id"):
                cpu_vendor = line.split(":", 1)[1].strip()
            if cpu_model and cpu_vendor:
                break
    except Exception:
        pass

    if not cpu_model and shutil.which("lscpu"):
        out = run_command(["lscpu"])
        for line in out.splitlines():
            if line.lower().startswith("model name"):
                cpu_model = line.split(":", 1)[1].strip()
            elif line.lower().startswith("vendor id"):
                cpu_vendor = line.split(":", 1)[1].strip()

    return {
        "cpuModel": cpu_model,
        "cpuVendor": cpu_vendor,
        "cpuSocket": "",
        "cpuCoresPhysical": psutil.cpu_count(logical=False),
        "cpuCoresLogical": psutil.cpu_count(logical=True),
        "cpuFreqMhz": round(freq.current, 0) if freq else 0,
        "cpuMaxFreqMhz": round(freq.max, 0) if freq and freq.max else 0,
        "totalRamGb": round(vm.total / 1024 ** 3, 2),
        "systemManufacturer": read_sys_dmi_file("sys_vendor"),
        "systemModel": read_sys_dmi_file("product_name"),
        "systemType": platform.machine(),
        "osCaption": DISTRO,
        "osVersion": OS_VERSION or platform.release(),
        "osArchitecture": platform.machine(),
        "baseboard": {
            "manufacturer": read_sys_dmi_file("board_vendor"),
            "product": read_sys_dmi_file("board_name"),
            "serialNumber": read_sys_dmi_file("board_serial"),
            "version": read_sys_dmi_file("board_version")
        },
        "bios": {
            "manufacturer": read_sys_dmi_file("bios_vendor"),
            "version": read_sys_dmi_file("bios_version"),
            "releaseDate": read_sys_dmi_file("bios_date"),
            "serialNumber": read_sys_dmi_file("product_serial")
        },
        "memoryModules": collect_linux_memory_modules(),
        "physicalDisks": collect_linux_physical_disks()
    }


def collect_hardware_info():
    info = collect_windows_hardware_info() if IS_WINDOWS else collect_linux_hardware_info()
    if not info:
        vm = psutil.virtual_memory()
        info = {
            "cpuModel": platform.processor(),
            "cpuVendor": "",
            "cpuCoresPhysical": psutil.cpu_count(logical=False),
            "cpuCoresLogical": psutil.cpu_count(logical=True),
            "cpuFreqMhz": 0,
            "cpuMaxFreqMhz": 0,
            "totalRamGb": round(vm.total / 1024 ** 3, 2),
            "memoryModules": [],
            "physicalDisks": []
        }
    info["collectedAt"] = now_iso()
    return info


def collect_docker_containers():
    if not shutil.which("docker"):
        return []
    try:
        out = run_command(["docker", "ps", "-a", "--format", "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"])
        containers = []
        for line in out.splitlines():
            parts = line.split("|")
            if len(parts) >= 4:
                containers.append({
                    "id": parts[0][:12],
                    "name": parts[1],
                    "image": parts[2],
                    "status": parts[3],
                    "ports": parts[4] if len(parts) > 4 else ""
                })
        return containers
    except Exception:
        return []


def collect_gpu_info():
    if shutil.which("nvidia-smi"):
        try:
            out = run_command([
                "nvidia-smi",
                "--query-gpu=name,uuid,driver_version,memory.total,memory.used,temperature.gpu,utilization.gpu,power.draw",
                "--format=csv,noheader,nounits"
            ])
            gpus = []
            for line in out.splitlines():
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 7:
                    vram_total = to_int(parts[3], 0)
                    vram_used = to_int(parts[4], 0)
                    gpus.append({
                        "name": parts[0],
                        "uuid": parts[1],
                        "driver": parts[2],
                        "vramMb": vram_total,
                        "vramUsedMb": vram_used,
                        "vramPercent": round((vram_used / vram_total) * 100, 1) if vram_total else 0,
                        "tempC": to_int(parts[5], 0),
                        "utilPercent": to_int(parts[6], 0),
                        "powerDrawW": to_number(parts[7], 0) if len(parts) >= 8 else 0,
                        "provider": "nvidia-smi"
                    })
            if gpus:
                return gpus
        except Exception:
            pass

    if IS_WINDOWS:
        try:
            ps = r"""
$ErrorActionPreference = 'SilentlyContinue'
$gpuUtil = $null
try {
  $samples = (Get-Counter '\GPU Engine(*)\Utilization Percentage' -ErrorAction Stop).CounterSamples |
    Where-Object { $_.InstanceName -match 'engtype_3D|engtype_Copy|engtype_VideoDecode|engtype_VideoEncode' }
  $sum = ($samples | Measure-Object CookedValue -Sum).Sum
  if ($null -ne $sum) { $gpuUtil = [math]::Round([math]::Min($sum, 100), 1) }
} catch { }
Get-CimInstance Win32_VideoController | ForEach-Object {
  [pscustomobject]@{
    name = $_.Name
    vramBytes = [int64]$_.AdapterRAM
    driver = $_.DriverVersion
    adapterCompatibility = $_.AdapterCompatibility
    videoProcessor = $_.VideoProcessor
    currentMode = (($_.CurrentHorizontalResolution), ($_.CurrentVerticalResolution) -join 'x')
    status = $_.Status
    utilPercent = $gpuUtil
    provider = 'Win32_VideoController'
  }
} | ConvertTo-Json -Depth 3 -Compress
"""
            gpus = []
            for item in as_list(powershell_json(ps, timeout=15)):
                vram_bytes = to_int(item.get("vramBytes"), 0)
                gpus.append({
                    "name": item.get("name", ""),
                    "vramBytes": vram_bytes,
                    "vramMb": round(vram_bytes / 1024 ** 2) if vram_bytes else 0,
                    "driver": item.get("driver", ""),
                    "adapterCompatibility": item.get("adapterCompatibility", ""),
                    "videoProcessor": item.get("videoProcessor", ""),
                    "currentMode": item.get("currentMode", ""),
                    "status": item.get("status", ""),
                    "utilPercent": item.get("utilPercent"),
                    "provider": item.get("provider", "windows")
                })
            return gpus
        except Exception:
            pass
        return []

    if shutil.which("rocm-smi"):
        try:
            out = run_command(["rocm-smi", "--showproductname", "--showuse", "--showmemuse", "--showtemp", "--json"])
            raw = parse_json_output(out, {})
            gpus = []
            if isinstance(raw, dict):
                for key, item in raw.items():
                    if not isinstance(item, dict):
                        continue
                    name = item.get("Card series") or item.get("GPU ID") or key
                    temp = next((value for label, value in item.items() if "Temperature" in str(label)), 0)
                    util = item.get("GPU use (%)") or item.get("GPU use")
                    mem = item.get("GPU Memory Allocated (VRAM%)") or item.get("VRAM Total Memory (B)")
                    gpus.append({
                        "name": str(name),
                        "tempC": to_number(temp, 0),
                        "utilPercent": to_number(util, 0),
                        "vramPercent": to_number(mem, 0),
                        "provider": "rocm-smi"
                    })
            if gpus:
                return gpus
        except Exception:
            pass

    if shutil.which("lspci"):
        try:
            out = run_command(["sh", "-c", "lspci -mm | grep -Ei 'VGA|3D|Display' || true"])
            gpus = []
            for line in out.splitlines():
                parts = [part.strip('"') for part in shlex.split(line)]
                if len(parts) >= 4:
                    gpus.append({
                        "name": " ".join(parts[2:]).strip(),
                        "provider": "lspci",
                        "utilPercent": None,
                        "tempC": None,
                        "vramMb": 0
                    })
            return gpus
        except Exception:
            pass
    return []


def collect_dns_check():
    targets = ["google.com", "cloudflare.com", "1.1.1.1"]
    result = []
    for target in targets:
        try:
            addr = socket.getaddrinfo(target, None, socket.AF_INET, proto=socket.IPPROTO_TCP)[0][4][0]
            result.append({"target": target, "resolved": addr, "ok": True})
        except Exception as exc:
            result.append({"target": target, "resolved": "", "ok": False, "error": str(exc)})
    return result


def safe_collect(name, fallback, callback, errors):
    try:
        return callback()
    except Exception as exc:
        errors.append({"name": name, "error": str(exc), "timestamp": now_iso()})
        return fallback


VIRTUAL_FSTYPES = {
    "tmpfs", "squashfs", "devtmpfs", "proc", "sysfs", "cgroup", "cgroup2",
    "pstore", "debugfs", "tracefs", "securityfs", "binfmt_misc", "overlay",
    "aufs", "ramfs", "hugetlbfs", "fusectl", "bpf", "nsfs", "configfs",
    "rpc_pipefs", "mqueue", "efivarfs"
}


def collect_payload():
    collection_errors = []
    vm = psutil.virtual_memory()
    swap = psutil.swap_memory()
    partitions = []
    for partition in psutil.disk_partitions():
        if not partition.fstype or partition.fstype in VIRTUAL_FSTYPES:
            continue
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            partitions.append({
                "device": partition.device,
                "mountpoint": partition.mountpoint,
                "fstype": partition.fstype,
                "percent": usage.percent,
                "usedPercent": usage.percent,
                "freePercent": round(100 - usage.percent, 1),
                "used": usage.used,
                "free": usage.free,
                "total": usage.total
            })
        except Exception:
            continue

    cpu_per_core = psutil.cpu_percent(interval=0.25, percpu=True)
    cpu_total = psutil.cpu_percent(interval=0.15)
    boot_seconds = time.time() - psutil.boot_time()
    loadavg = os.getloadavg() if hasattr(os, "getloadavg") else (0, 0, 0)

    security = safe_collect("security", {"events": [], "authTail": [], "authLogPath": ""}, collect_security, collection_errors) if MODULES["securityLogs"] or MODULES["sudoCommands"] or MODULES["fileIntegrity"] else {"events": [], "authTail": [], "authLogPath": ""}
    logs = safe_collect("logs", {
        "syslogPath": "",
        "syslogTail": [],
        "journalTail": [],
        "kernelErrors": [],
        "customLogs": []
    }, collect_logs, collection_errors) if MODULES["applicationLogs"] else {
        "syslogPath": "",
        "syslogTail": [],
        "journalTail": [],
        "kernelErrors": [],
        "customLogs": []
    }
    processes = safe_collect("processes", [], collect_processes, collection_errors)
    interfaces = safe_collect("interfaces", [], collect_network_interfaces, collection_errors)
    temperatures = safe_collect("temperatures", [], collect_temperatures, collection_errors)
    open_ports = safe_collect("openPorts", [], collect_open_ports, collection_errors)
    network_rates = safe_collect("networkRates", [], collect_network_rates, collection_errors) if MODULES.get("networkRates") else []
    established_connections = safe_collect("establishedConnections", [], collect_established_connections, collection_errors) if MODULES.get("establishedConnections") else []
    failed_services = safe_collect("failedServices", [], collect_failed_services, collection_errors)
    service_inventory = safe_collect("serviceInventory", [], collect_service_inventory, collection_errors)
    scheduled_tasks = safe_collect("scheduledTasks", [], collect_scheduled_tasks, collection_errors)
    fans = safe_collect("fans", [], collect_fans, collection_errors) if MODULES.get("hardwareMonitor") else []
    battery = safe_collect("battery", None, collect_battery, collection_errors) if MODULES.get("hardwareMonitor") else None
    gpu = safe_collect("gpu", [], collect_gpu_info, collection_errors) if MODULES.get("hardwareMonitor") else []
    hardware = safe_collect("hardware", {}, collect_hardware_info, collection_errors)
    user_inventory = safe_collect("userInventory", {"collectedAt": now_iso(), "os": "windows" if IS_WINDOWS else "linux", "users": [], "groups": [], "privilegedGroups": []}, collect_user_inventory, collection_errors)
    docker = safe_collect("docker", [], collect_docker_containers, collection_errors) if MODULES.get("dockerMonitor") else []
    dns = safe_collect("dns", [], collect_dns_check, collection_errors)
    firewall_rules = safe_collect("firewallRules", [], collect_firewall_rules, collection_errors)
    firewall_summary = firewall_summary_from_rules(firewall_rules)
    smart_data = safe_collect("smartData", [], collect_smart_data, collection_errors) if MODULES.get("smartMonitor") else []
    login_history = safe_collect("loginHistory", [], collect_login_history, collection_errors) if MODULES.get("loginHistory") else []
    pending_updates = safe_collect("pendingUpdates", {"count": 0, "updates": []}, collect_pending_updates, collection_errors) if MODULES.get("updateMonitor") else {"count": 0, "updates": []}
    inventory_changes = safe_collect(
        "inventoryChanges",
        {"initialized": True, "events": [], "counts": {}},
        lambda: collect_inventory_changes(user_inventory, open_ports, service_inventory, scheduled_tasks, firewall_rules),
        collection_errors
    )
    security_access = build_security_access_summary(security, list_blocked_ips())
    agent_status = collect_agent_operational_status(collection_errors)

    payload = {
        "agent": {
            "id": AGENT_ID,
            "version": AGENT_VERSION,
            "hostLabel": HOST_LABEL,
            "systemName": SYSTEM_NAME,
            "distro": DISTRO,
            "osVersion": OS_VERSION,
            "targetOs": "windows" if IS_WINDOWS else "linux",
            "installUser": INSTALL_USER,
            "listenPort": LISTEN_PORT,
            "networkScope": NETWORK_SCOPE,
            "modules": MODULES,
            "persistenceMode": PERSISTENCE_MODE,
            "centralSyncEnabled": bool(CENTRAL_API_BASE_URL),
            "pollIntervalSeconds": POLL_INTERVAL_SECONDS,
            "intervalSeconds": POLL_INTERVAL_SECONDS,
            "generatedAt": now_iso()
        },
        "heartbeat": now_iso(),
        "system": {
            "hostname": socket.gethostname(),
            "localIp": find_local_ip(),
            "os": platform.system(),
            "kernel": platform.release(),
            "architecture": platform.machine(),
            "uptimeSeconds": int(boot_seconds),
            "connectedUsers": collect_users(),
            "loadAverage": list(loadavg)
        },
        "metrics": {
            "cpuTotal": cpu_total,
            "cpuPerCore": cpu_per_core,
            "memoryPercent": vm.percent,
            "memoryUsed": vm.used,
            "memoryAvailable": vm.available,
            "memoryFree": vm.free,
            "memoryTotal": vm.total,
            "swapPercent": swap.percent,
            "swapUsed": swap.used,
            "swapTotal": swap.total,
            "disks": partitions,
            "processes": processes,
            "processCount": len(psutil.pids()),
            "processSampleLimit": len(processes),
            "interfaces": interfaces,
            "temperatures": temperatures,
            "openPorts": open_ports,
            "networkRates": network_rates,
            "establishedConnections": established_connections,
            "failedServices": failed_services,
            "serviceInventory": service_inventory,
            "scheduledTasks": scheduled_tasks,
            "fans": fans,
            "battery": battery,
            "gpu": gpu,
            "hardware": hardware,
            "userInventory": user_inventory,
            "docker": docker,
            "dns": dns,
            "firewallRules": firewall_rules,
            "firewallSummary": firewall_summary,
            "smartData": smart_data,
            "loginHistory": login_history,
            "pendingUpdates": pending_updates,
            "inventoryChanges": inventory_changes,
            "hostBaseline": inventory_changes,
            "securityAccess": security_access,
            "agentStatus": agent_status,
            "collectionStatus": {
                "os": "windows" if IS_WINDOWS else "linux",
                "modules": MODULES,
                "errors": collection_errors,
                "counts": {
                    "processes": len(processes),
                    "openPorts": len(open_ports),
                    "establishedConnections": len(established_connections),
                    "services": len(service_inventory),
                    "scheduledTasks": len(scheduled_tasks),
                    "inventoryChanges": len(inventory_changes.get("events", [])) if isinstance(inventory_changes, dict) else 0,
                    "interfaces": len(interfaces),
                    "temperatures": len(temperatures),
                    "fans": len(fans),
                    "gpu": len(gpu),
                    "smartData": len(smart_data),
                    "loginHistory": len(login_history),
                    "firewallRules": len(firewall_rules),
                    "failedServices": len(failed_services)
                }
            }
        },
        "security": security,
        "logs": logs,
        "commands": (
            {
                "who": run_command(["powershell", "-NoProfile", "-NonInteractive", "-Command", "query user 2>$null"]),
                "w": run_command(["powershell", "-NoProfile", "-NonInteractive", "-Command", "Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 | ConvertTo-Json -Depth 1 -Compress"]),
                "systemctl": run_command(["powershell", "-NoProfile", "-NonInteractive", "-Command", "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object Name,DisplayName | ConvertTo-Json -Compress"]),
                "cron": run_command(["powershell", "-NoProfile", "-NonInteractive", "-Command", "Get-ScheduledTask | Where-Object {$_.State -eq 'Ready' -or $_.State -eq 'Running'} | Select-Object TaskName,State | ConvertTo-Json -Compress"])
            }
            if IS_WINDOWS
            else {
                "who": run_command(["who"]),
                "w": run_command(["w"]),
                "systemctl": run_command(["systemctl", "--type=service", "--state=running", "--no-pager", "--no-legend"]),
                "cron": run_command(["sh", "-c", "crontab -l 2>/dev/null || true"])
            }
        )
    }
    return payload


def build_warming_payload(message="telemetry_cache_warming"):
    return {
        "agent": {
            "id": AGENT_ID,
            "version": AGENT_VERSION,
            "hostLabel": HOST_LABEL,
            "systemName": SYSTEM_NAME,
            "distro": DISTRO,
            "osVersion": OS_VERSION,
            "targetOs": "windows" if IS_WINDOWS else "linux",
            "installUser": INSTALL_USER,
            "listenPort": LISTEN_PORT,
            "networkScope": NETWORK_SCOPE,
            "modules": MODULES,
            "persistenceMode": PERSISTENCE_MODE,
            "centralSyncEnabled": bool(CENTRAL_API_BASE_URL),
            "pollIntervalSeconds": POLL_INTERVAL_SECONDS,
            "intervalSeconds": POLL_INTERVAL_SECONDS,
            "generatedAt": now_iso()
        },
        "heartbeat": now_iso(),
        "system": {
            "hostname": socket.gethostname(),
            "localIp": find_local_ip(),
            "os": platform.system(),
            "kernel": platform.release(),
            "architecture": platform.machine(),
            "uptimeSeconds": int(time.time() - psutil.boot_time()),
            "connectedUsers": [],
            "loadAverage": list(os.getloadavg()) if hasattr(os, "getloadavg") else [0, 0, 0]
        },
        "metrics": {
            "cpuTotal": psutil.cpu_percent(interval=0),
            "cpuPerCore": [],
            "memoryPercent": psutil.virtual_memory().percent,
            "disks": [],
            "processes": [],
            "openPorts": [],
            "interfaces": [],
            "agentStatus": collect_agent_operational_status([{
                "name": "telemetryCache",
                "error": message,
                "timestamp": now_iso()
            }]),
            "collectionStatus": {
                "os": "windows" if IS_WINDOWS else "linux",
                "modules": MODULES,
                "errors": [{
                    "name": "telemetryCache",
                    "error": message,
                    "timestamp": now_iso()
                }],
                "counts": {}
            }
        },
        "security": {"events": [], "authTail": [], "authLogPath": ""},
        "logs": {"syslogPath": "", "syslogTail": [], "journalTail": [], "kernelErrors": [], "customLogs": []},
        "commands": {}
    }


def collect_browser_payload():
    collection_errors = []
    vm = psutil.virtual_memory()
    swap = psutil.swap_memory()
    partitions = []
    for partition in psutil.disk_partitions():
        if not partition.fstype or partition.fstype in VIRTUAL_FSTYPES:
            continue
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            partitions.append({
                "device": partition.device,
                "mountpoint": partition.mountpoint,
                "fstype": partition.fstype,
                "percent": usage.percent,
                "usedPercent": usage.percent,
                "freePercent": round(100 - usage.percent, 1),
                "used": usage.used,
                "free": usage.free,
                "total": usage.total
            })
        except Exception:
            continue

    def collect_fast_processes(limit=100):
        rows = []
        for process in psutil.process_iter(["pid", "name", "username", "memory_percent", "status", "create_time"]):
            try:
                info = process.info
                rows.append({
                    "pid": info.get("pid"),
                    "ppid": process.ppid(),
                    "name": info.get("name") or "",
                    "username": info.get("username") or "",
                    "memoryPercent": round(info.get("memory_percent") or 0, 2),
                    "memoryRss": process.memory_info().rss,
                    "cpuPercent": 0,
                    "status": info.get("status") or "",
                    "createTime": info.get("create_time") or 0,
                    "cmdline": "",
                    "exe": "",
                    "numThreads": info.get("num_threads") or 0
                })
            except Exception:
                continue
        rows.sort(key=lambda item: (item["memoryRss"], item["memoryPercent"]), reverse=True)
        return rows[:limit]

    def collect_fast_open_ports(limit=160):
        ports = []
        for connection in psutil.net_connections(kind="inet"):
            try:
                if connection.status != psutil.CONN_LISTEN or not connection.laddr:
                    continue
                ports.append({
                    "proto": "tcp" if connection.type == socket.SOCK_STREAM else "udp",
                    "ip": connection.laddr.ip,
                    "port": connection.laddr.port,
                    "pid": connection.pid or 0,
                    "process": "",
                    "user": "",
                    "cmdline": ""
                })
            except Exception:
                continue
        ports.sort(key=lambda item: (item["port"], item["ip"]))
        return ports[:limit]

    processes = safe_collect("processes", [], collect_fast_processes, collection_errors)
    interfaces = safe_collect("interfaces", [], collect_network_interfaces, collection_errors)
    open_ports = safe_collect("openPorts", [], collect_fast_open_ports, collection_errors)
    established_connections = []
    temperatures = safe_collect("temperatures", [], collect_temperatures, collection_errors) if MODULES.get("hardwareMonitor") else []
    user_inventory = safe_collect("userInventory", {"collectedAt": now_iso(), "os": "windows" if IS_WINDOWS else "linux", "users": [], "groups": [], "privilegedGroups": []}, collect_user_inventory, collection_errors)
    hardware = {
        "cpuModel": platform.processor() or platform.machine(),
        "cpuPhysicalCores": psutil.cpu_count(logical=False) or 0,
        "cpuLogicalCores": psutil.cpu_count(logical=True) or 0,
        "memoryTotal": vm.total,
        "disks": [],
        "gpu": []
    }
    loadavg = os.getloadavg() if hasattr(os, "getloadavg") else (0, 0, 0)

    return {
        "agent": {
            "id": AGENT_ID,
            "version": AGENT_VERSION,
            "hostLabel": HOST_LABEL,
            "systemName": SYSTEM_NAME,
            "distro": DISTRO,
            "osVersion": OS_VERSION,
            "targetOs": "windows" if IS_WINDOWS else "linux",
            "installUser": INSTALL_USER,
            "listenPort": LISTEN_PORT,
            "networkScope": NETWORK_SCOPE,
            "modules": MODULES,
            "persistenceMode": PERSISTENCE_MODE,
            "centralSyncEnabled": bool(CENTRAL_API_BASE_URL),
            "pollIntervalSeconds": POLL_INTERVAL_SECONDS,
            "intervalSeconds": POLL_INTERVAL_SECONDS,
            "generatedAt": now_iso()
        },
        "heartbeat": now_iso(),
        "system": {
            "hostname": socket.gethostname(),
            "localIp": find_local_ip(),
            "os": platform.system(),
            "kernel": platform.release(),
            "architecture": platform.machine(),
            "uptimeSeconds": int(time.time() - psutil.boot_time()),
            "connectedUsers": collect_users(),
            "loadAverage": list(loadavg)
        },
        "metrics": {
            "cpuTotal": psutil.cpu_percent(interval=0.1),
            "cpuPerCore": psutil.cpu_percent(interval=0, percpu=True),
            "memoryPercent": vm.percent,
            "memoryUsed": vm.used,
            "memoryAvailable": vm.available,
            "memoryFree": vm.free,
            "memoryTotal": vm.total,
            "swapPercent": swap.percent,
            "swapUsed": swap.used,
            "swapTotal": swap.total,
            "disks": partitions,
            "processes": processes,
            "processCount": len(psutil.pids()),
            "processSampleLimit": len(processes),
            "interfaces": interfaces,
            "temperatures": temperatures,
            "openPorts": open_ports,
            "networkRates": [],
            "establishedConnections": established_connections,
            "failedServices": [],
            "serviceInventory": [],
            "scheduledTasks": [],
            "fans": [],
            "battery": None,
            "gpu": [],
            "hardware": hardware,
            "userInventory": user_inventory,
            "docker": [],
            "dns": [],
            "firewallRules": [],
            "firewallSummary": {"total": 0, "thorondor": 0, "system": 0},
            "smartData": [],
            "loginHistory": [],
            "pendingUpdates": {"count": 0, "updates": []},
            "inventoryChanges": {"initialized": True, "events": [], "counts": {}},
            "hostBaseline": {"initialized": True, "events": [], "counts": {}},
            "securityAccess": build_security_access_summary({"events": []}, []),
            "agentStatus": {
                "keyAgentsPresent": bool(KEY_AGENTS),
                "keyAgentsFingerprint": sha256(KEY_AGENTS.encode("utf-8")).hexdigest()[:12] if KEY_AGENTS else "",
                "commandsAccepted": ["collect-telemetry", "collect-logs", "check-host-health"],
                "collectionErrors": collection_errors
            },
            "collectionStatus": {
                "os": "windows" if IS_WINDOWS else "linux",
                "modules": MODULES,
                "errors": collection_errors,
                "counts": {
                    "processes": len(processes),
                    "openPorts": len(open_ports),
                    "establishedConnections": len(established_connections),
                    "interfaces": len(interfaces),
                    "temperatures": len(temperatures),
                    "users": len(user_inventory.get("users", [])) if isinstance(user_inventory, dict) else 0
                }
            }
        },
        "security": {"events": [], "authTail": [], "authLogPath": ""},
        "logs": {"syslogPath": "", "syslogTail": [], "journalTail": [], "kernelErrors": [], "customLogs": []},
        "commands": {}
    }


def telemetry_cache_is_fresh():
    with _TELEMETRY_CACHE_LOCK:
        return bool(_TELEMETRY_CACHE) and (time.time() - _TELEMETRY_CACHE_AT) <= telemetry_cache_ttl_seconds()


def mark_telemetry_refresh_finished(payload=None, error=""):
    global _TELEMETRY_CACHE, _TELEMETRY_CACHE_AT, _TELEMETRY_CACHE_REFRESHING, _TELEMETRY_CACHE_ERROR
    with _TELEMETRY_CACHE_LOCK:
        if payload is not None:
            _TELEMETRY_CACHE = payload
            _TELEMETRY_CACHE_AT = time.time()
        _TELEMETRY_CACHE_ERROR = str(error or "")
        _TELEMETRY_CACHE_REFRESHING = False


def refresh_telemetry_cache_worker():
    try:
        mark_telemetry_refresh_finished(collect_browser_payload(), "")
    except Exception as exc:
        mark_telemetry_refresh_finished(None, str(exc))


def schedule_telemetry_refresh(force=False):
    global _TELEMETRY_CACHE_REFRESHING
    with _TELEMETRY_CACHE_LOCK:
        if _TELEMETRY_CACHE_REFRESHING:
            return
        if not force and _TELEMETRY_CACHE and (time.time() - _TELEMETRY_CACHE_AT) <= telemetry_cache_ttl_seconds():
            return
        _TELEMETRY_CACHE_REFRESHING = True
    threading.Thread(target=refresh_telemetry_cache_worker, daemon=True).start()


def cached_payload_copy(payload, cache_status):
    try:
        copy = json.loads(json.dumps(payload))
    except Exception:
        copy = payload
    if isinstance(copy, dict):
        copy["cache"] = cache_status
    return copy


def get_cached_payload(wait_seconds=TELEMETRY_INITIAL_WAIT_SECONDS):
    with _TELEMETRY_CACHE_LOCK:
        has_cache = bool(_TELEMETRY_CACHE)
    if not has_cache:
        schedule_telemetry_refresh()
    deadline = time.time() + max(0, wait_seconds)
    while time.time() < deadline:
        with _TELEMETRY_CACHE_LOCK:
            if _TELEMETRY_CACHE:
                age = max(0, int(time.time() - _TELEMETRY_CACHE_AT))
                ttl_seconds = telemetry_cache_ttl_seconds()
                return cached_payload_copy(_TELEMETRY_CACHE, {
                    "status": "ready",
                    "ageSeconds": age,
                    "refreshing": _TELEMETRY_CACHE_REFRESHING,
                    "ttlSeconds": ttl_seconds,
                    "error": _TELEMETRY_CACHE_ERROR
                })
        time.sleep(0.15)

    with _TELEMETRY_CACHE_LOCK:
        if _TELEMETRY_CACHE:
            age = max(0, int(time.time() - _TELEMETRY_CACHE_AT))
            ttl_seconds = telemetry_cache_ttl_seconds()
            return cached_payload_copy(_TELEMETRY_CACHE, {
                "status": "stale" if age > ttl_seconds else "ready",
                "ageSeconds": age,
                "refreshing": _TELEMETRY_CACHE_REFRESHING,
                "ttlSeconds": ttl_seconds,
                "error": _TELEMETRY_CACHE_ERROR
            })
        error = _TELEMETRY_CACHE_ERROR
    return build_warming_payload(error or "telemetry_cache_warming")


def execute_central_command(command):
    command_type = str(command.get("type", ""))
    payload = command.get("payload") or {}

    if command_type == "block-ip":
        return block_ip(payload.get("ip"), payload.get("reason") or command.get("reason") or "central", "")

    if command_type == "unblock-ip":
        return unblock_ip(payload.get("ip"))

    if command_type == "collect-telemetry":
        schedule_telemetry_refresh(force=True)
        return {"ok": True, "telemetry": get_cached_payload(wait_seconds=10), "message": "Telemetría recogida"}

    if command_type == "collect-logs":
        if not MODULES["applicationLogs"]:
            return {"ok": False, "error": "El módulo de logs de aplicación está desactivado en este agente"}
        return {"ok": True, "logs": collect_logs(), "message": "Logs recogidos"}

    if command_type == "check-host-health":
        return {"ok": True, "health": collect_host_health_summary(), "message": "Salud del host comprobada"}

    if command_type == "set-host-baseline":
        return create_host_baseline_payload()

    if command_type in ["list-connected-users", "terminate-user-session"]:
        return execute_session_management_command(command_type, payload)

    if command_type in [
        "refresh-user-inventory",
        "disable-user",
        "enable-user",
        "lock-user",
        "unlock-user",
        "add-user-to-group",
        "remove-user-from-group",
    ]:
        return execute_user_management_command(command_type, payload)

    if command_type in [
        "refresh-service-inventory",
        "start-service",
        "stop-service",
        "restart-service",
    ]:
        return execute_service_management_command(command_type, payload)

    return {"ok": False, "error": f"Comando no soportado por el agente: {command_type}"}


def process_central_commands():
    commands = central_request("GET", f"/agents/{AGENT_ID}/commands/pending") or []
    if not isinstance(commands, list):
        return

    for command in commands:
        command_id = command.get("id")
        if not command_id:
            continue
        try:
            result = execute_central_command(command)
        except Exception as exc:
            result = {"ok": False, "error": str(exc)}
        central_request("POST", f"/agents/{AGENT_ID}/commands/{command_id}/result", result)


def central_agent_loop():
    if not central_api_root():
        return

    while True:
        try:
            registration = register_with_central()
            apply_poll_interval_from_response(registration)
            if central_response_paused(registration):
                time.sleep(max(10, POLL_INTERVAL_SECONDS))
                continue
            telemetry_response = central_request("POST", f"/agents/{AGENT_ID}/telemetry", get_cached_payload(wait_seconds=10))
            apply_poll_interval_from_response(telemetry_response)
            process_central_commands()
        except Exception as exc:
            log_central_warning(exc)
        time.sleep(max(10, POLL_INTERVAL_SECONDS))


class ThorondorHandler(BaseHTTPRequestHandler):
    def _write_json(self, status_code, payload):
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status_code)
        for key, value in HEADERS.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        if length > 8192:
            raise ValueError("payload demasiado grande")
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw.strip() else {}

    def _request_token(self):
        token = str(self.headers.get("X-Thorondor-Key-Agents", "") or "").strip()
        if token:
            return token
        token = str(self.headers.get("X-Thorondor-Agent-Token", "") or "").strip()
        if token:
            return token
        authorization = str(self.headers.get("Authorization", "") or "").strip()
        if authorization.lower().startswith("bearer "):
            return authorization[7:].strip()
        return ""

    def _is_local_authorized(self):
        return bool(AGENT_TOKEN) and hmac.compare_digest(self._request_token(), AGENT_TOKEN)

    def _write_unauthorized(self):
        self._write_json(401, {"ok": False, "error": "key_agents_required"})

    def do_OPTIONS(self):
        self.send_response(204)
        for key, value in HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            self._write_json(200, {
                "status": "ok",
                "service": SYSTEM_NAME,
                "heartbeat": now_iso(),
                "version": AGENT_VERSION,
                "port": LISTEN_PORT,
                "networkScope": NETWORK_SCOPE,
                "commandsAccepted": collect_agent_operational_status([]).get("commandsAccepted", [])
            })
            return

        if parsed.path in ["/telemetry", "/logs"]:
            if not self._is_local_authorized():
                self._write_unauthorized()
                return
            payload = get_cached_payload()
            if parsed.path == "/logs":
                self._write_json(200, payload["logs"])
            else:
                self._write_json(200, payload)
            return

        if parsed.path == "/response/blocks":
            if not self._is_local_authorized():
                self._write_unauthorized()
                return
            self._write_json(200, {
                "blocked": list_blocked_ips(),
                "timestamp": now_iso()
            })
            return

        self._write_json(404, {"error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)

        try:
            if parsed.path in ["/response/block-ip", "/response/unblock-ip", "/response/user-management", "/response/service-management", "/response/safe-action"] and not self._is_local_authorized():
                self._write_unauthorized()
                return
            body = self._read_json_body()
            if parsed.path == "/response/block-ip":
                self._write_json(200, block_ip(body.get("ip"), body.get("reason", "manual"), self.client_address[0]))
                return
            if parsed.path == "/response/unblock-ip":
                self._write_json(200, unblock_ip(body.get("ip")))
                return
            if parsed.path == "/response/user-management":
                self._write_json(200, execute_user_management_command(body.get("type"), body))
                return
            if parsed.path == "/response/service-management":
                self._write_json(200, execute_service_management_command(body.get("type"), body))
                return
            if parsed.path == "/response/safe-action":
                self._write_json(200, execute_central_command({"type": body.get("type"), "payload": body, "reason": body.get("reason", "manual")}))
                return
        except ValueError as exc:
            self._write_json(400, {"ok": False, "error": str(exc)})
            return
        except Exception as exc:
            self._write_json(500, {"ok": False, "error": str(exc)})
            return

        self._write_json(404, {"error": "not found"})

    def log_message(self, format_string, *args):
        return


class ThorondorHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    if hasattr(socket, "SO_REUSEPORT"):
        allow_reuse_port = True


def main():
    if "--detect-logs" in sys.argv:
        run_log_detection_cli()
        return

    if "--detect-modules" in sys.argv:
        run_module_detection_cli()
        return

    refresh_active_modules()
    print(f"[thorondor] iniciando agente {SYSTEM_NAME} en {LISTEN_HOST}:{LISTEN_PORT}")
    schedule_telemetry_refresh(force=True)
    if central_api_root():
        print(f"[thorondor] modo central activo: {central_api_root()}")
        threading.Thread(target=central_agent_loop, daemon=True).start()
    server = ThorondorHTTPServer((LISTEN_HOST, LISTEN_PORT), ThorondorHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
`;
}

export function buildThorondorSystemdUnit(config) {
  const serviceName = normalizeServiceName(config);

  return `[Unit]
Description=Thorondor SIEM Agent (${config.systemName})
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${config.installUser || "thorondor"}
WorkingDirectory=/opt/thorondor-agent
ExecStart=/opt/thorondor-agent/venv/bin/python /opt/thorondor-agent/thorondor-agent.py
Restart=always
RestartSec=10
TimeoutStopSec=10
KillMode=mixed
Environment=PYTHONUNBUFFERED=1
SyslogIdentifier=${serviceName}

[Install]
WantedBy=multi-user.target
`;
}

function buildThorondorLinuxUninstallScript(config) {
  const serviceFileName = buildServiceFileName(config);
  const installUser = config.installUser || "thorondor";

  return `#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/thorondor-agent"
SERVICE_FILE="${serviceFileName}"
INSTALL_USER="${installUser}"
SUDO=""

if [ "$(id -u)" -ne 0 ]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "ERROR: ejecuta este desinstalador como root o instala sudo." >&2
    exit 1
  fi
  SUDO="sudo"
fi

echo "=== Thorondor Agent Uninstaller para Linux ==="

if command -v systemctl >/dev/null 2>&1; then
  for unit in "$SERVICE_FILE" "thorondor-siem-agent.service" "thorondor-agent.service"; do
    $SUDO systemctl stop "$unit" 2>/dev/null || true
    $SUDO systemctl disable "$unit" 2>/dev/null || true
    $SUDO rm -f "/etc/systemd/system/$unit"
  done
  $SUDO systemctl daemon-reload || true
  $SUDO systemctl reset-failed || true
fi

$SUDO pkill -f "$INSTALL_DIR/thorondor-agent.py" 2>/dev/null || true
$SUDO pkill -f "thorondor-agent.py" 2>/dev/null || true
$SUDO rm -f "/etc/sudoers.d/thorondor-agent-firewall"

if [ -f "$INSTALL_DIR/.created-install-user" ]; then
  CREATED_USER="$(head -n 1 "$INSTALL_DIR/.created-install-user" | tr -cd 'a-zA-Z0-9_-')"
  if [ -n "$CREATED_USER" ] && [ "$CREATED_USER" = "$INSTALL_USER" ] && id "$CREATED_USER" >/dev/null 2>&1; then
    $SUDO userdel "$CREATED_USER" 2>/dev/null || true
  fi
fi

$SUDO rm -rf "$INSTALL_DIR"

echo "Desinstalación completada."
`;
}

export function buildThorondorInstallScript(config) {
  const pythonAgent = buildThorondorPythonAgent(config);
  const serviceFileName = buildServiceFileName(config);
  const uninstallScript = buildThorondorLinuxUninstallScript(config);
  const systemdBlock = `
cat > "/tmp/$SERVICE_FILE" <<'UNIT'
${buildThorondorSystemdUnit(config)}
UNIT

$SUDO cp "/tmp/$SERVICE_FILE" "/etc/systemd/system/$SERVICE_FILE"
$SUDO systemctl daemon-reload
$SUDO systemctl enable "$SERVICE_FILE"
$SUDO systemctl restart "$SERVICE_FILE"
`;
  const completionMessage = `echo "Instalación completada. Comprueba el servicio con:"
echo "sudo systemctl status $SERVICE_FILE"`;

  return `#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/thorondor-agent"
INSTALL_USER="${config.installUser || "thorondor"}"
SERVICE_FILE="${serviceFileName}"
UNINSTALL_FILE="thorondor-uninstaller.sh"
PORT="${Number(config.port) || THORONDOR_AGENT_FIXED_PORT}"
TMP_AGENT="$(mktemp)"
TMP_UNINSTALL="$(mktemp)"
SUDO=""
USER_CREATED="0"

if [ "$(id -u)" -ne 0 ]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "ERROR: ejecuta este instalador como root o instala sudo." >&2
    exit 1
  fi
  SUDO="sudo"
fi

echo "=== Thorondor Agent Installer para Linux ==="
echo "[1/6] Preparando dependencias del sistema..."

if command -v apt >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  $SUDO apt-get update
  $SUDO apt-get install -y python3 python3-venv python3-pip lm-sensors smartmontools dmidecode pciutils
elif command -v dnf >/dev/null 2>&1; then
  $SUDO dnf install -y python3 python3-pip python3-virtualenv lm_sensors smartmontools dmidecode pciutils
elif command -v pacman >/dev/null 2>&1; then
  $SUDO pacman -Sy --noconfirm python python-pip python-virtualenv lm_sensors smartmontools dmidecode pciutils
else
  echo "Aviso: no se ha detectado apt, dnf ni pacman. Se intentará usar el Python disponible."
fi

cat > "$TMP_AGENT" <<'PY'
${pythonAgent}
PY

echo "[2/6] Creando usuario y rutas..."
if ! id "$INSTALL_USER" >/dev/null 2>&1; then
  NOLOGIN_SHELL="$(command -v nologin || true)"
  [ -n "$NOLOGIN_SHELL" ] || NOLOGIN_SHELL="/usr/sbin/nologin"
  $SUDO useradd --system --create-home --shell "$NOLOGIN_SHELL" "$INSTALL_USER"
  USER_CREATED="1"
fi

$SUDO mkdir -p "$INSTALL_DIR"
$SUDO cp "$TMP_AGENT" "$INSTALL_DIR/thorondor-agent.py"
rm -f "$TMP_AGENT"
cat > "$TMP_UNINSTALL" <<'UNINSTALL'
${uninstallScript}
UNINSTALL
$SUDO cp "$TMP_UNINSTALL" "$INSTALL_DIR/$UNINSTALL_FILE"
rm -f "$TMP_UNINSTALL"
$SUDO chmod 750 "$INSTALL_DIR/$UNINSTALL_FILE"
if [ "$USER_CREATED" = "1" ]; then
  echo "$INSTALL_USER" | $SUDO tee "$INSTALL_DIR/.created-install-user" >/dev/null
fi

echo "[3/6] Creando entorno Python aislado..."
$SUDO python3 -m venv "$INSTALL_DIR/venv"
$SUDO env PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 "$INSTALL_DIR/venv/bin/python" -m pip install --upgrade pip
$SUDO env PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 "$INSTALL_DIR/venv/bin/python" -m pip install psutil

echo "[4/6] Ajustando permisos de lectura y firewall operativo..."
$SUDO chown -R "$INSTALL_USER:$INSTALL_USER" "$INSTALL_DIR"
$SUDO chmod 750 "$INSTALL_DIR/thorondor-agent.py"

$SUDO usermod -aG adm "$INSTALL_USER" || true
$SUDO usermod -aG systemd-journal "$INSTALL_USER" || true
getent group docker >/dev/null 2>&1 && $SUDO usermod -aG docker "$INSTALL_USER" || true
$SUDO tee "/etc/sudoers.d/thorondor-agent-firewall" >/dev/null <<SUDOERS
Cmnd_Alias THORONDOR_FIREWALL = /usr/sbin/iptables, /sbin/iptables, /usr/sbin/ip6tables, /sbin/ip6tables, /usr/sbin/ufw, /usr/bin/ufw, /usr/bin/firewall-cmd, /bin/firewall-cmd
Cmnd_Alias THORONDOR_DIAGNOSTICS = /usr/sbin/smartctl, /usr/bin/smartctl, /bin/dmesg, /usr/bin/dmesg, /usr/sbin/dmidecode, /usr/bin/dmidecode
Cmnd_Alias THORONDOR_SERVICES = /usr/bin/systemctl, /bin/systemctl
Cmnd_Alias THORONDOR_SESSIONS = /usr/bin/loginctl, /bin/loginctl
$INSTALL_USER ALL=(root) NOPASSWD: THORONDOR_FIREWALL, THORONDOR_DIAGNOSTICS, THORONDOR_SERVICES, THORONDOR_SESSIONS
SUDOERS
$SUDO chmod 440 "/etc/sudoers.d/thorondor-agent-firewall"
$SUDO visudo -cf "/etc/sudoers.d/thorondor-agent-firewall" >/dev/null

echo "    Detectando fuentes de logs disponibles..."
$SUDO "$INSTALL_DIR/venv/bin/python" "$INSTALL_DIR/thorondor-agent.py" --detect-logs || true
$SUDO chown "$INSTALL_USER:$INSTALL_USER" "$INSTALL_DIR/.thorondor-log-sources.json" 2>/dev/null || true
echo "    Detectando módulos disponibles en este host..."
$SUDO "$INSTALL_DIR/venv/bin/python" "$INSTALL_DIR/thorondor-agent.py" --detect-modules || true
$SUDO chown "$INSTALL_USER:$INSTALL_USER" "$INSTALL_DIR/.thorondor-modules.json" 2>/dev/null || true

${systemdBlock}

echo "[5/6] Red y registro."
echo "El agente escucha en el puerto $PORT. Regístralo en Thorondor con la IP o DNS por la que lo consultarás."
echo "Si el host usa firewall, permite ese puerto de forma controlada o usa un túnel local hacia 127.0.0.1:$PORT."

echo "[6/6] Validación local:"
echo "curl http://127.0.0.1:$PORT/health"
echo "Desinstalador: sudo $INSTALL_DIR/$UNINSTALL_FILE"
${completionMessage}
`;
}

export function buildThorondorWixSource(config) {
  const packageName = normalizeWindowsPackageName(config);
  const installFileName = "thorondor-agent-install.ps1";
  const upgradeCode = deterministicGuid(`thorondor-upgrade-${packageName}`);
  const componentGuid = deterministicGuid(`thorondor-component-${packageName}`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Package
    Name="Thorondor Agent - ${escapeXmlAttribute(packageName)}"
    Manufacturer="Thorondor"
    Version="1.0.0.0"
    UpgradeCode="${upgradeCode}"
    Scope="perMachine">

    <MajorUpgrade DowngradeErrorMessage="Ya existe una versión más reciente de Thorondor Agent." />
    <MediaTemplate EmbedCab="yes" />

    <StandardDirectory Id="ProgramFiles64Folder">
      <Directory Id="INSTALLFOLDER" Name="Thorondor Agent">
        <Component Id="ThorondorInstallScriptComponent" Guid="${componentGuid}">
          <File Id="ThorondorInstallScript" Source="${escapeXmlAttribute(installFileName)}" KeyPath="yes" />
        </Component>
      </Directory>
    </StandardDirectory>

    <Feature Id="MainFeature" Title="Thorondor Agent" Level="1">
      <ComponentRef Id="ThorondorInstallScriptComponent" />
    </Feature>

    <CustomAction
      Id="RunThorondorInstallScript"
      Directory="INSTALLFOLDER"
      Execute="deferred"
      Impersonate="no"
      ExeCommand="powershell.exe -NoProfile -ExecutionPolicy Bypass -File &quot;[INSTALLFOLDER]${escapeXmlAttribute(installFileName)}&quot;"
      Return="check" />

    <InstallExecuteSequence>
      <Custom Action="RunThorondorInstallScript" After="InstallFiles">NOT Installed AND NOT REMOVE</Custom>
    </InstallExecuteSequence>
  </Package>
</Wix>
`;
}

export function buildThorondorMsiBuildScript(config) {
  const packageName = normalizeWindowsPackageName(config);
  const msiFileName = "thorondor-agent.msi";

  return `Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$requiredFiles = @(
  "thorondor-agent.wxs",
  "thorondor-agent-install.ps1"
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Falta $file. Descarga el instalador PowerShell y el manifiesto WiX en la misma carpeta."
  }
}

if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw "No se encontró wix ni dotnet. Instala .NET SDK y después ejecuta: dotnet tool install --global wix"
  }

  Write-Host "Instalando WiX Toolset como herramienta dotnet..." -ForegroundColor Yellow
  dotnet tool install --global wix
  $env:PATH = "$env:PATH;$env:USERPROFILE\\.dotnet\\tools"
}

Write-Host "Compilando MSI de Thorondor Agent (${packageName})..." -ForegroundColor Cyan
wix build ".\\thorondor-agent.wxs" -o ".\\${msiFileName}"

Write-Host ""
Write-Host "MSI generado: $root\\${msiFileName}" -ForegroundColor Green
Write-Host "Ejecútalo como administrador en el host Windows que quieras monitorizar."
`;
}

export function buildThorondorWindowsMsiBootstrapperScript(config) {
  const packageName = normalizeWindowsPackageName(config);
  const msiFileName = "thorondor-agent.msi";
  const installScriptB64 = base64Utf8(buildThorondorWindowsInstallScript(config));
  const wixSourceB64 = base64Utf8(buildThorondorWixSource(config));

  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Crea e instala un MSI real de Thorondor Agent para Windows.
.DESCRIPTION
    Es el instalador de usuario final para Windows. Genera los artefactos internos,
    compila ${msiFileName} con WiX Toolset y lo instala con msiexec. Al terminar deja
    una copia del MSI en el Escritorio para poder reutilizarlo.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PACKAGE_NAME = "${packageName.replace(/"/g, "`\"")}"
$MSI_FILE = "${msiFileName}"
$BUILD_ROOT = Join-Path $env:ProgramData "Thorondor-Agent\\msi-build"
$INSTALL_SCRIPT = Join-Path $BUILD_ROOT "thorondor-agent-install.ps1"
$WIX_SOURCE = Join-Path $BUILD_ROOT "thorondor-agent.wxs"
$MSI_PATH = Join-Path $BUILD_ROOT $MSI_FILE

function Write-Utf8FileFromBase64 {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Base64
    )
    [System.IO.File]::WriteAllBytes($Path, [System.Convert]::FromBase64String($Base64))
}

function Add-DotnetToolsToPath {
    $toolsPath = Join-Path $env:USERPROFILE ".dotnet\\tools"
    if ((Test-Path $toolsPath) -and ($env:PATH -notlike "*$toolsPath*")) {
        $env:PATH = "$env:PATH;$toolsPath"
    }
}

function Ensure-Dotnet {
    if (Get-Command dotnet -ErrorAction SilentlyContinue) {
        return
    }

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "No se encontró dotnet ni winget. Instala .NET SDK 8 o WiX Toolset y vuelve a ejecutar este instalador."
    }

    Write-Host "[2/6] Instalando .NET SDK con winget..." -ForegroundColor Yellow
    winget install --id Microsoft.DotNet.SDK.8 --scope machine --silent --accept-source-agreements --accept-package-agreements
    $env:PATH = "$env:PATH;C:\\Program Files\\dotnet"
}

function Ensure-Wix {
    Add-DotnetToolsToPath
    if (Get-Command wix -ErrorAction SilentlyContinue) {
        return
    }

    Ensure-Dotnet
    Add-DotnetToolsToPath

    Write-Host "[3/6] Preparando WiX Toolset..." -ForegroundColor Yellow
    dotnet tool update --global wix
    if ($LASTEXITCODE -ne 0) {
        dotnet tool install --global wix
    }
    Add-DotnetToolsToPath

    if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
        throw "WiX Toolset no quedó disponible en PATH. Cierra y abre PowerShell como administrador y vuelve a ejecutar este archivo."
    }
}

function Ensure-Python {
    foreach ($cmd in @("python", "python3", "py")) {
        try {
            $ver = & $cmd --version 2>&1
            if ($ver -match "Python 3\\.(\\d+)") {
                Write-Host "Python encontrado: $ver" -ForegroundColor Green
                return
            }
        } catch { }
    }

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "No se encontró Python 3 ni winget. Instala Python 3.11 desde python.org y vuelve a ejecutar este instalador."
    }

    Write-Host "[4/6] Instalando Python 3.11 con winget..." -ForegroundColor Yellow
    winget install --id Python.Python.3.11 --scope machine --silent --accept-source-agreements --accept-package-agreements
    $env:PATH = "$env:PATH;C:\\Program Files\\Python311;C:\\Program Files\\Python311\\Scripts"
}

Write-Host "=== Thorondor Agent MSI ===" -ForegroundColor Cyan
Write-Host "Paquete: $PACKAGE_NAME" -ForegroundColor Gray

Write-Host "[1/6] Preparando paquete local..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $BUILD_ROOT | Out-Null
Write-Utf8FileFromBase64 -Path $INSTALL_SCRIPT -Base64 @'
${installScriptB64}
'@
Write-Utf8FileFromBase64 -Path $WIX_SOURCE -Base64 @'
${wixSourceB64}
'@

Ensure-Wix
Ensure-Python

Write-Host "[5/6] Compilando $MSI_FILE..." -ForegroundColor Yellow
Set-Location $BUILD_ROOT
wix build $WIX_SOURCE -o $MSI_PATH
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $MSI_PATH)) {
    throw "No se pudo generar $MSI_FILE. Revisa la salida de WiX."
}

$desktop = [Environment]::GetFolderPath("Desktop")
if ($desktop) {
    Copy-Item -Force $MSI_PATH (Join-Path $desktop $MSI_FILE)
}

Write-Host "[6/6] Instalando MSI..." -ForegroundColor Yellow
Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", $MSI_PATH, "/passive") -Wait

Write-Host ""
Write-Host "Instalación completada." -ForegroundColor Green
Write-Host "MSI generado: $MSI_PATH" -ForegroundColor Green
if ($desktop) {
    Write-Host "Copia reutilizable: $(Join-Path $desktop $MSI_FILE)" -ForegroundColor Green
}
Write-Host "Valida el agente con: Invoke-RestMethod http://127.0.0.1:${Number(config.port) || THORONDOR_AGENT_FIXED_PORT}/health"
`;
}

export function buildThorondorInstallInstructions(config) {
  const isWindows = config.targetOs === "windows";
  const port = Number(config.port) || THORONDOR_AGENT_FIXED_PORT;
  const keyAgents = String(config.keyAgents || config.agentToken || "");
  const installerName = isWindows ? "thorondor-installer.ps1" : "thorondor-installer.sh";
  const targetLabel = isWindows ? "Windows" : "Linux";
  const installFence = isWindows ? "powershell" : "bash";
  const permissionNote = isWindows
    ? "Ejecuta el instalador desde PowerShell. Si no está elevado, solicita permisos de administrador y continúa en una consola elevada."
    : "Ejecuta el instalador como root o con sudo. Si no hay sudo y no eres root, el script se detiene.";
  const dependencyNote = isWindows
    ? "Requiere PowerShell 5.1+. Si falta Python 3 y existe winget, el instalador intenta instalarlo. Las dependencias Python se aíslan en un venv propio."
    : "Con apt, dnf o pacman instala Python, venv/pip, lm-sensors, smartmontools, dmidecode y pciutils. Si no detecta gestor, intenta usar el Python disponible.";
  const serviceNote = isWindows
    ? "Instala los ficheros en ProgramData y registra la tarea programada ThorondorAgent como SYSTEM, RunLevel Highest, al inicio del sistema."
    : `Crea /opt/thorondor-agent, usuario de sistema, entorno venv, ${buildServiceFileName(config)} en systemd, lo habilita y reinicia el servicio.`;
  const networkNote = "El agente queda escuchando en el puerto configurado. Si necesitas acceso remoto, registra una IP/DNS alcanzable y permite el puerto con túnel, proxy, NAT o firewall controlado.";
  const uninstallPermissionNote = isWindows
    ? "Ejecuta el desinstalador; si no está elevado, pedirá permisos de administrador."
    : "Ejecuta el desinstalador con sudo o como root.";
  const installFolder = isWindows ? "C:\\Thorondor-Agent-Installer" : "~/thorondor-agent-installer";
  const generatedUninstaller = isWindows
    ? "C:\\ProgramData\\Thorondor-Agent\\thorondor-uninstaller.ps1"
    : "/opt/thorondor-agent/thorondor-uninstaller.sh";
  const runCommand = isWindows
    ? `# Puedes ejecutarlo en una consola normal; el instalador pedirá administrador si hace falta.
New-Item -ItemType Directory -Force "${installFolder}" | Out-Null
# Deja ${installerName} en esa carpeta.
cd "${installFolder}"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\\${installerName}"`
    : `# Ejecuta con un usuario que tenga sudo.
mkdir -p ${installFolder}
# Deja ${installerName} en esa carpeta.
cd ${installFolder}
chmod +x ./${installerName}
sudo ./${installerName}`;
  const validationCommand = isWindows
    ? `$thorondorHeaders = @{ 'X-Thorondor-Key-Agents' = '${keyAgents}' }
Invoke-RestMethod http://127.0.0.1:${port}/health
Invoke-RestMethod -Headers $thorondorHeaders http://127.0.0.1:${port}/telemetry | ConvertTo-Json -Depth 4`
    : `curl -s http://127.0.0.1:${port}/health
curl -s -H 'X-Thorondor-Key-Agents: ${keyAgents}' http://127.0.0.1:${port}/telemetry | python3 -m json.tool | head -60`;
  const statusCommand = isWindows
    ? `Get-ScheduledTask -TaskName ThorondorAgent -ErrorAction SilentlyContinue
Get-ScheduledTaskInfo -TaskName ThorondorAgent -ErrorAction SilentlyContinue
Get-ChildItem "C:\\ProgramData\\Thorondor-Agent"`
    : `sudo systemctl status ${buildServiceFileName(config)} --no-pager
sudo ls -la /opt/thorondor-agent`;
  const uninstallCommand = isWindows
    ? `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${generatedUninstaller}"`
    : `sudo ${generatedUninstaller}`;

  return `## Instalación del agente ${targetLabel}

### Lo que se genera
- Instalador único: \`${installerName}\`.
- Carpeta recomendada para ejecutarlo: \`${installFolder}\`.
- Carpeta real de instalación: \`${isWindows ? "C:\\ProgramData\\Thorondor-Agent" : "/opt/thorondor-agent"}\`.
- Desinstalador generado automáticamente: \`${generatedUninstaller}\`.
- Puerto del agente: \`${port}\`.
- Key agents incluida en el instalador para validar las peticiones al agente.

### Requisitos reales
- Permisos: ${permissionNote}
- Dependencias: ${dependencyNote}
- Servicio: ${serviceNote}
- Red: ${networkNote}

### 1. Copia el fichero a una carpeta y ejecútalo
\`\`\`${installFence}
${runCommand}
\`\`\`

### 2. Comprueba que quedó instalado
\`\`\`${installFence}
${statusCommand}
\`\`\`

### 3. Valida el agente
\`\`\`${installFence}
${validationCommand}
\`\`\`

### 4. Registrar en Thorondor
Abre **Registro** y crea el agente con un nombre visible, la IP o DNS por la que Thorondor lo consultará y el puerto \`${port}\`.
Para validar en el propio host puedes usar \`http://127.0.0.1:${port}\`; para operación real registra la dirección alcanzable desde la consola.

### Desinstalar
El instalador deja preparado un fichero de desinstalación. ${uninstallPermissionNote} Para retirar el agente completo:

\`\`\`${installFence}
${uninstallCommand}
\`\`\`
`;
}

function buildThorondorWindowsUninstallScript(config) {
  const installDir = "C:\\ProgramData\\Thorondor-Agent";
  const port = Number(config.port) || THORONDOR_AGENT_FIXED_PORT;

  return `Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
    $scriptPath = $PSCommandPath
    if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }
    if (-not $scriptPath) { throw "Guarda este desinstalador como .ps1 y ejecútalo de nuevo." }

    Write-Host "Solicitando permisos de administrador para desinstalar Thorondor Agent..." -ForegroundColor Yellow
    $quotedScript = '"' + $scriptPath + '"'
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File $quotedScript" -Verb RunAs -PassThru -Wait
    if ($null -ne $process.ExitCode) { exit $process.ExitCode }
    exit 0
}

$InstallDir = "${installDir}"
$TaskName = "ThorondorAgent"
$Port = ${port}

Write-Host "=== Thorondor Agent Uninstaller para Windows ===" -ForegroundColor Cyan

Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like "*thorondor-agent.py*" -and $_.CommandLine -like "*Thorondor-Agent*" } |
    ForEach-Object {
        try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch { }
    }

Get-NetFirewallRule -DisplayName "Thorondor Agent HTTP" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Get-NetFirewallRule -DisplayName "Thorondor Agent HTTP $Port" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Get-NetFirewallRule -DisplayName "Thorondor Agent" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Get-NetFirewallRule -DisplayName "Thorondor Block *" -ErrorAction SilentlyContinue | Remove-NetFirewallRule

Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue

Write-Host "Desinstalación completada." -ForegroundColor Green
`;
}

export function buildThorondorWindowsInstallScript(config) {
  const port = Number(config.port) || THORONDOR_AGENT_FIXED_PORT;
  const installDir = "C:\\ProgramData\\Thorondor-Agent";
  const pythonAgent = buildThorondorPythonAgent(config);
  const uninstallScriptB64 = base64Utf8(buildThorondorWindowsUninstallScript(config));
  const verifyCommand = `Invoke-RestMethod http://127.0.0.1:$PORT/health | ConvertTo-Json -Depth 3`;
  const firewallBlock = `# 4. Red
Write-Host "[4/6] Red sin configuración manual desde el instalador." -ForegroundColor Yellow
Write-Host "    El agente queda listo; la operación real se realiza con token y API central cuando esté configurada." -ForegroundColor Gray`;
  const taskBlock = `
# 5. Crear tarea programada
Write-Host "[5/6] Registrando tarea programada '$TASK_NAME'..." -ForegroundColor Yellow
$runnerPath = Join-Path $INSTALL_DIR $RUNNER_FILE
$action   = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File \`"$runnerPath\`""
$trigger  = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Seconds 0)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "    Tarea registrada correctamente." -ForegroundColor Green

# 6. Iniciar el agente inmediatamente
Write-Host "[6/6] Iniciando el agente..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TASK_NAME
Start-Sleep -Seconds 3
$state = (Get-ScheduledTask -TaskName $TASK_NAME).State
Write-Host "    Estado de la tarea: $state" -ForegroundColor $(if ($state -eq "Running") { "Green" } else { "Yellow" })
`;

  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala el agente Thorondor en Windows como tarea programada.
.DESCRIPTION
    Crea el directorio de instalación, instala dependencias Python
    y registra el agente como tarea programada de inicio de sistema.
    Requiere PowerShell 5.1+ y permisos de Administrador.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$INSTALL_DIR  = "${installDir}"
$AGENT_FILE   = "thorondor-agent.py"
$RUNNER_FILE  = "run-thorondor-agent.ps1"
$UNINSTALL_FILE = "thorondor-uninstaller.ps1"
$TASK_NAME    = "ThorondorAgent"
$PORT         = ${port}

function ConvertTo-SingleQuotedPowerShellString {
    param([Parameter(Mandatory = $true)][string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

Write-Host "=== Thorondor Agent Installer ===" -ForegroundColor Cyan

# 1. Crear directorio de instalación
Write-Host "[1/6] Creando directorio $INSTALL_DIR..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
$agentSource = @'
${pythonAgent}
'@
Set-Content -Path "$INSTALL_DIR\\$AGENT_FILE" -Value $agentSource -Encoding UTF8
[System.IO.File]::WriteAllBytes((Join-Path $INSTALL_DIR $UNINSTALL_FILE), [System.Convert]::FromBase64String(@'
${uninstallScriptB64}
'@))

# 2. Verificar Python
Write-Host "[2/6] Verificando Python..." -ForegroundColor Yellow
$python = $null
$pythonArgs = @()
foreach ($cmd in @("python", "python3")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\\.(\\d+)") {
            $python = (Get-Command $cmd -ErrorAction Stop).Source
            Write-Host "    Python encontrado: $ver" -ForegroundColor Green
            break
        }
    } catch { }
}
if (-not $python) {
    try {
        $ver = & py -3 --version 2>&1
        if ($ver -match "Python 3\\.(\\d+)") {
            $python = (Get-Command py -ErrorAction Stop).Source
            $pythonArgs = @("-3")
            Write-Host "    Python encontrado mediante py launcher: $ver" -ForegroundColor Green
        }
    } catch { }
}
if (-not $python) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "No se encontró Python 3 ni winget. Instala Python 3.11 desde python.org y vuelve a ejecutar el instalador."
    }
    Write-Host "    Python no encontrado. Instalando via winget..." -ForegroundColor Yellow
    winget install --id Python.Python.3.11 --scope machine --silent --accept-source-agreements --accept-package-agreements
    $env:PATH = "$env:PATH;C:\\Program Files\\Python311;C:\\Program Files\\Python311\\Scripts"
    foreach ($cmd in @("python", "python3")) {
        try {
            $ver = & $cmd --version 2>&1
            if ($ver -match "Python 3\\.(\\d+)") {
                $python = (Get-Command $cmd -ErrorAction Stop).Source
                Write-Host "    Python disponible tras instalar: $ver" -ForegroundColor Green
                break
            }
        } catch { }
    }
    if (-not $python) {
        try {
            $ver = & py -3 --version 2>&1
            if ($ver -match "Python 3\\.(\\d+)") {
                $python = (Get-Command py -ErrorAction Stop).Source
                $pythonArgs = @("-3")
                Write-Host "    Python disponible mediante py launcher tras instalar: $ver" -ForegroundColor Green
            }
        } catch { }
    }
    if (-not $python) {
        throw "Python se ha instalado, pero todavía no está disponible en PATH. Cierra PowerShell, abre otra consola como administrador y ejecuta de nuevo el instalador."
    }
}

# 3. Instalar psutil
Write-Host "[3/6] Instalando dependencias Python..." -ForegroundColor Yellow
& $python @pythonArgs -m pip install --upgrade pip --quiet
& $python @pythonArgs -m pip install psutil --quiet
Write-Host "    psutil instalado correctamente." -ForegroundColor Green

Write-Host "    Detectando fuentes de logs disponibles..." -ForegroundColor Yellow
$detectLogArgs = @()
$detectLogArgs += $pythonArgs
$detectLogArgs += (Join-Path $INSTALL_DIR $AGENT_FILE)
$detectLogArgs += "--detect-logs"
& $python @detectLogArgs 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    La deteccion inicial de logs no se completo. El agente volvera a comprobarlo al arrancar." -ForegroundColor DarkYellow
}
Write-Host "    Detectando módulos disponibles en este host..." -ForegroundColor Yellow
$detectModuleArgs = @()
$detectModuleArgs += $pythonArgs
$detectModuleArgs += (Join-Path $INSTALL_DIR $AGENT_FILE)
$detectModuleArgs += "--detect-modules"
& $python @detectModuleArgs 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    La deteccion inicial de modulos no se completo. El agente volvera a comprobarlo al arrancar." -ForegroundColor DarkYellow
}

$runnerArguments = @()
$runnerArguments += $pythonArgs
$runnerArguments += (Join-Path $INSTALL_DIR $AGENT_FILE)
$runnerSource = @(
    'Set-StrictMode -Version Latest',
    '$ErrorActionPreference = "Stop"',
    '$python = ' + (ConvertTo-SingleQuotedPowerShellString $python),
    '$arguments = @(' + (($runnerArguments | ForEach-Object { ConvertTo-SingleQuotedPowerShellString $_ }) -join ', ') + ')',
    '& $python @arguments'
) -join [Environment]::NewLine
Set-Content -Path (Join-Path $INSTALL_DIR $RUNNER_FILE) -Value $runnerSource -Encoding UTF8

${firewallBlock}

${taskBlock}

Write-Host ""
Write-Host "=== Instalación completada ===" -ForegroundColor Green
Write-Host "Verifica el agente con:"
Write-Host "  ${verifyCommand}"
Write-Host "Desinstalador:"
Write-Host ('  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $INSTALL_DIR $UNINSTALL_FILE) + '"')
Write-Host ""
Write-Host "Diagnóstico de arranque:"
Write-Host "  Get-ScheduledTaskInfo -TaskName ThorondorAgent"
Write-Host "  Get-WinEvent -LogName Microsoft-Windows-TaskScheduler/Operational -MaxEvents 20"
`;
}

function buildThorondorWindowsStandaloneInstallScript(config) {
  const port = Number(config.port) || THORONDOR_AGENT_FIXED_PORT;
  const installDir = "C:\\ProgramData\\Thorondor-Agent";
  const pythonAgent = buildThorondorPythonAgent(config);
  const uninstallScriptB64 = base64Utf8(buildThorondorWindowsUninstallScript(config));
  const displayName = powerShellSingleQuotedString(config.displayName || config.systemName || THORONDOR_AGENT_FIXED_SERVICE_NAME);
  const hostAddress = powerShellSingleQuotedString(config.hostIp || "127.0.0.1");
  const receiverUrl = powerShellSingleQuotedString(normalizeReceiverBaseUrl(config));
  const keyAgents = powerShellSingleQuotedString(config.keyAgents || config.agentToken || "");
  const persistenceMode = powerShellSingleQuotedString(config.persistenceMode === "cloud" ? "cloud" : "local");
  const verifyCommand = `Invoke-RestMethod http://127.0.0.1:${port}/health | ConvertTo-Json -Depth 3`;

  return `<#
.SYNOPSIS
    Instala Thorondor Agent en Windows.
.DESCRIPTION
    Instalador unico para Windows. Si no se ejecuta como administrador,
    solicita elevacion, prepara Python/venv, crea la tarea programada,
    abre el puerto del agente en el firewall y deja un desinstalador.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$INSTALL_DIR  = "${installDir}"
$AGENT_FILE   = "thorondor-agent.py"
$RUNNER_FILE  = "run-thorondor-agent.ps1"
$UNINSTALL_FILE = "thorondor-uninstaller.ps1"
$TASK_NAME    = "ThorondorAgent"
$PORT         = ${port}
$DISPLAY_NAME = ${displayName}
$HOST_ADDRESS = ${hostAddress}
$RECEIVER_URL = ${receiverUrl}
$KEY_AGENTS = ${keyAgents}
$PERSISTENCE_MODE = ${persistenceMode}
$VENV_DIR = Join-Path $INSTALL_DIR ".venv"
$VENV_PYTHON = Join-Path $VENV_DIR "Scripts\\python.exe"
$LOG_DIR = Join-Path $INSTALL_DIR "logs"
$CONFIG_FILE = Join-Path $INSTALL_DIR "agent-config.json"

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
    $scriptPath = $PSCommandPath
    if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }
    if (-not $scriptPath) { throw "Guarda este instalador como .ps1 y ejecutalo de nuevo." }

    Write-Host "Solicitando permisos de administrador para instalar Thorondor Agent..." -ForegroundColor Yellow
    $quotedScript = '"' + $scriptPath + '"'
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File $quotedScript" -Verb RunAs -PassThru -Wait
    if ($null -ne $process.ExitCode) { exit $process.ExitCode }
    exit 0
}

function ConvertTo-SingleQuotedPowerShellString {
    param([Parameter(Mandatory = $true)][string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

function Write-Step {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Resolve-PythonCommand {
    $candidates = @(
        [pscustomobject]@{ Command = "python"; Args = @() },
        [pscustomobject]@{ Command = "python3"; Args = @() },
        [pscustomobject]@{ Command = "py"; Args = @("-3") }
    )

    foreach ($candidate in $candidates) {
        try {
            $args = @()
            $args += $candidate.Args
            $args += "--version"
            $version = & $candidate.Command @args 2>&1
            if ($version -match "Python 3\\.(\\d+)") {
                if ([int]$Matches[1] -lt 8) { continue }
                return [pscustomobject]@{
                    Path = (Get-Command $candidate.Command -ErrorAction Stop).Source
                    Args = $candidate.Args
                    Version = [string]$version
                }
            }
        } catch { }
    }

    return $null
}

function Ensure-Python {
    $pythonInfo = Resolve-PythonCommand
    if ($null -ne $pythonInfo) {
        Write-Host "    Python encontrado: $($pythonInfo.Version)" -ForegroundColor Green
        return $pythonInfo
    }

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "No se encontro Python 3.8+ ni winget. Instala Python 3.11 o superior y vuelve a ejecutar el instalador."
    }

    Write-Host "    Python no encontrado. Instalando Python 3.11 con winget..." -ForegroundColor Yellow
    winget install --id Python.Python.3.11 --scope machine --silent --accept-source-agreements --accept-package-agreements
    $env:PATH = "$env:PATH;C:\\Program Files\\Python311;C:\\Program Files\\Python311\\Scripts;$env:LOCALAPPDATA\\Programs\\Python\\Python311;$env:LOCALAPPDATA\\Programs\\Python\\Python311\\Scripts"

    $pythonInfo = Resolve-PythonCommand
    if ($null -eq $pythonInfo) {
        throw "Python se instalo, pero todavia no esta disponible. Cierra PowerShell, abre otra consola y ejecuta de nuevo el instalador."
    }

    Write-Host "    Python disponible: $($pythonInfo.Version)" -ForegroundColor Green
    return $pythonInfo
}

function Stop-ExistingThorondorAgent {
    Stop-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue

    Get-CimInstance Win32_Process |
        Where-Object { $_.CommandLine -like "*thorondor-agent.py*" -and $_.CommandLine -like "*Thorondor-Agent*" } |
        ForEach-Object {
            try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch { }
        }
}

function Ensure-AgentFirewallRule {
    param([Parameter(Mandatory = $true)][int]$LocalPort)

    $ruleName = "Thorondor Agent HTTP $LocalPort"
    try {
        Get-NetFirewallRule -DisplayName "Thorondor Agent HTTP" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        Get-NetFirewallRule -DisplayName "Thorondor Agent HTTP *" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $LocalPort -Profile Any | Out-Null
        Write-Host "    Firewall: permitido TCP/$LocalPort." -ForegroundColor Green
    } catch {
        Write-Host "    No se pudo configurar el firewall automaticamente: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}

Write-Host "=== Thorondor Agent Installer para Windows ===" -ForegroundColor Cyan
Write-Host "Host: $DISPLAY_NAME"
Write-Host "Puerto: $PORT"

Write-Step "[1/7] Preparando carpeta de instalacion..."
Stop-ExistingThorondorAgent
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $LOG_DIR | Out-Null
$agentSource = @'
${pythonAgent}
'@
Set-Content -Path "$INSTALL_DIR\\$AGENT_FILE" -Value $agentSource -Encoding UTF8
[System.IO.File]::WriteAllBytes((Join-Path $INSTALL_DIR $UNINSTALL_FILE), [System.Convert]::FromBase64String(@'
${uninstallScriptB64}
'@))

$configSummary = [ordered]@{
    displayName = $DISPLAY_NAME
    hostAddress = $HOST_ADDRESS
    receiverUrl = $RECEIVER_URL
    port = $PORT
    keyAgents = $KEY_AGENTS
    persistenceMode = $PERSISTENCE_MODE
    installDir = $INSTALL_DIR
    taskName = $TASK_NAME
    runAs = "SYSTEM"
    installedAt = (Get-Date).ToString("o")
} | ConvertTo-Json -Depth 5
Set-Content -Path $CONFIG_FILE -Value $configSummary -Encoding UTF8
Write-Host "    Ficheros preparados en $INSTALL_DIR." -ForegroundColor Green

Write-Step "[2/7] Preparando Python y entorno aislado..."
$pythonInfo = Ensure-Python
if (-not (Test-Path $VENV_PYTHON)) {
    $venvArgs = @()
    $venvArgs += $pythonInfo.Args
    $venvArgs += @("-m", "venv", $VENV_DIR)
    & $pythonInfo.Path @venvArgs
}
if (-not (Test-Path $VENV_PYTHON)) {
    throw "No se pudo crear el entorno Python en $VENV_DIR."
}

Write-Step "[3/7] Instalando dependencias del agente..."
& $VENV_PYTHON -m pip install --upgrade pip --quiet
& $VENV_PYTHON -m pip install psutil --quiet
Write-Host "    Dependencias instaladas en el venv del agente." -ForegroundColor Green

Write-Step "[4/7] Detectando capacidades del host..."
& $VENV_PYTHON (Join-Path $INSTALL_DIR $AGENT_FILE) "--detect-logs" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    La deteccion inicial de logs no se completo; el agente lo reintentara al arrancar." -ForegroundColor DarkYellow
}
& $VENV_PYTHON (Join-Path $INSTALL_DIR $AGENT_FILE) "--detect-modules" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    La deteccion inicial de modulos no se completo; el agente lo reintentara al arrancar." -ForegroundColor DarkYellow
}

Write-Step "[5/7] Creando runner y logs..."
$runnerLog = Join-Path $LOG_DIR "agent.log"
$runnerArguments = @()
$runnerArguments += (Join-Path $INSTALL_DIR $AGENT_FILE)
$runnerSource = @(
    'Set-StrictMode -Version Latest',
    '$ErrorActionPreference = "Continue"',
    '$python = ' + (ConvertTo-SingleQuotedPowerShellString $VENV_PYTHON),
    '$arguments = @(' + (($runnerArguments | ForEach-Object { ConvertTo-SingleQuotedPowerShellString $_ }) -join ', ') + ')',
    '$logFile = ' + (ConvertTo-SingleQuotedPowerShellString $runnerLog),
    'New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logFile) | Out-Null',
    'while ($true) {',
    '    $stamp = (Get-Date).ToString("s")',
    '    Add-Content -Path $logFile -Value "[$stamp] Thorondor Agent arrancando."',
    '    & $python @arguments *>> $logFile',
    '    $exitCode = $LASTEXITCODE',
    '    $end = (Get-Date).ToString("s")',
    '    Add-Content -Path $logFile -Value "[$end] Thorondor Agent se detuvo con codigo $exitCode. Reinicio en 5 segundos."',
    '    Start-Sleep -Seconds 5',
    '}'
) -join [Environment]::NewLine
Set-Content -Path (Join-Path $INSTALL_DIR $RUNNER_FILE) -Value $runnerSource -Encoding UTF8
Write-Host "    Log principal: $runnerLog" -ForegroundColor Green

Write-Step "[6/7] Configurando firewall y tarea programada..."
Ensure-AgentFirewallRule -LocalPort $PORT
$runnerPath = Join-Path $INSTALL_DIR $RUNNER_FILE
$taskArgument = '-NoProfile -ExecutionPolicy Bypass -File "' + $runnerPath + '"'
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $taskArgument
$trigger = New-ScheduledTaskTrigger -AtStartup
try {
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
} catch {
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Seconds 0)
}
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName $TASK_NAME

Write-Step "[7/7] Validando agente..."
$healthOk = $false
for ($attempt = 1; $attempt -le 12; $attempt += 1) {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:$PORT/health" -TimeoutSec 2 | Out-Null
        $healthOk = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

$state = (Get-ScheduledTask -TaskName $TASK_NAME).State
Write-Host "    Estado de la tarea: $state" -ForegroundColor $(if ($state -eq "Running") { "Green" } else { "Yellow" })
if ($healthOk) {
    Write-Host "    Health check correcto en http://127.0.0.1:$PORT/health" -ForegroundColor Green
} else {
    Write-Host "    La tarea quedo registrada, pero el health check aun no responde. Revisa $runnerLog." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "=== Instalacion completada ===" -ForegroundColor Green
Write-Host "Verifica el agente con:"
Write-Host "  ${verifyCommand}"
Write-Host "Registra el agente en Thorondor con la IP o DNS por la que lo consultarás y el puerto $PORT."
Write-Host "Desinstalador:"
Write-Host ('  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $INSTALL_DIR $UNINSTALL_FILE) + '"')
Write-Host ""
Write-Host "Diagnostico de arranque:"
Write-Host "  Get-ScheduledTaskInfo -TaskName ThorondorAgent"
Write-Host "  Get-Content -Tail 80 '$runnerLog'"
`;
}
