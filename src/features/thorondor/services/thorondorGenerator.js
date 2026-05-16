import {
  THORONDOR_MODULE_KEYS,
  normalizeThorondorNetworkScope
} from "@/features/thorondor/data/thorondorDefaults";

function serializeBoolean(value) {
  return value ? "True" : "False";
}

function pythonList(list) {
  return `[${(list || []).map((item) => JSON.stringify(item)).join(", ")}]`;
}

function normalizeReceiverBaseUrl(config) {
  const raw = String(config.receiverUrl || "").trim().replace(/\/+$/, "");
  if (raw) return raw;

  const host = String(config.hostIp || "127.0.0.1").trim();
  const port = Number(config.port) || 8765;
  return `http://${host}:${port}`;
}

function normalizeServiceName(config) {
  const raw = String(config.serviceName || "thorondor-agent")
    .trim()
    .replace(/\.service$/i, "")
    .replace(/[^a-zA-Z0-9_.@-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return raw || "thorondor-agent";
}

function buildServiceFileName(config) {
  return `${normalizeServiceName(config)}.service`;
}

function normalizeWindowsPackageName(config) {
  const raw = String(config.systemName || config.displayName || "thorondor-agent")
    .trim()
    .replace(/[^a-zA-Z0-9_. -]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "");

  return raw || "thorondor-agent";
}

function escapeXmlAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function deterministicGuid(seed) {
  const bytes = [];
  let hash = 0x811c9dc5;
  const source = String(seed || "thorondor-agent");

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

export function buildThorondorAgentFiles(draft) {
  const logPaths = String(draft.additionalLogPaths || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const config = {
    ...draft,
    logPaths
  };

  const isWindows = config.targetOs === "windows";
  const shouldBuildSystemd = !isWindows && config.generateSystemd && config.autoStart !== false;

  return {
    agentFileName: "thorondor-agent.py",
    serviceFileName: shouldBuildSystemd ? buildServiceFileName(config) : null,
    installFileName: isWindows ? "install-thorondor-agent.ps1" : "install-thorondor-agent.sh",
    msiFileName: isWindows ? "ThorondorAgent.msi" : null,
    wixFileName: isWindows ? "thorondor-agent.wxs" : null,
    msiBuildFileName: isWindows ? "build-thorondor-msi.ps1" : null,
    python: buildThorondorPythonAgent(config),
    systemd: shouldBuildSystemd ? buildThorondorSystemdUnit(config) : null,
    installScript: isWindows ? buildThorondorWindowsInstallScript(config) : buildThorondorInstallScript(config),
    wixSource: isWindows ? buildThorondorWixSource(config) : null,
    msiBuildScript: isWindows ? buildThorondorMsiBuildScript(config) : null,
    instructions: buildThorondorInstallInstructions(config)
  };
}

export function buildThorondorPythonAgent(config) {
  const moduleFlags = THORONDOR_MODULE_KEYS.reduce((acc, item) => {
    acc[item.key] = !!config.modules?.[item.key];
    return acc;
  }, {});

  return `#!/usr/bin/env python3
import json
import glob
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
from datetime import datetime
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
DISTRO = ${JSON.stringify(config.distro)}
OS_VERSION = ${JSON.stringify(config.osVersion)}
LISTEN_HOST = ${JSON.stringify(resolveListenHost(config))}
LISTEN_PORT = ${Number(config.port) || 8765}
POLL_INTERVAL_SECONDS = ${Number(config.intervalSeconds) || 30}
INSTALL_USER = ${JSON.stringify(config.installUser || "thorondor")}
NETWORK_SCOPE = ${JSON.stringify(config.networkScope || "lan")}
CORS_ORIGIN = ${JSON.stringify(String(config.corsOrigin || "*").trim() || "*")}
IS_WINDOWS = platform.system() == "Windows"
MODULES = {
    "systemMetrics": ${serializeBoolean(moduleFlags.systemMetrics)},
    "securityLogs": ${serializeBoolean(moduleFlags.securityLogs)},
    "sudoCommands": ${serializeBoolean(moduleFlags.sudoCommands)},
    "fileIntegrity": ${serializeBoolean(moduleFlags.fileIntegrity)},
    "networkConnections": ${serializeBoolean(moduleFlags.networkConnections)},
    "applicationLogs": ${serializeBoolean(moduleFlags.applicationLogs)},
    "networkRates": ${serializeBoolean(moduleFlags.networkRates)},
    "establishedConnections": ${serializeBoolean(moduleFlags.establishedConnections)},
    "hardwareMonitor": ${serializeBoolean(moduleFlags.hardwareMonitor)},
    "dockerMonitor": ${serializeBoolean(moduleFlags.dockerMonitor)},
    "updateMonitor": ${serializeBoolean(moduleFlags.updateMonitor)},
    "loginHistory": ${serializeBoolean(moduleFlags.loginHistory)},
    "smartMonitor": ${serializeBoolean(moduleFlags.smartMonitor)},
}
ADDITIONAL_LOG_PATHS = ${pythonList(config.logPaths)}
CRITICAL_FILES = (
    [
        os.path.join(os.environ.get("SystemRoot", "C:\\\\Windows"), "System32", "drivers", "etc", "hosts"),
        os.path.join(os.environ.get("SystemRoot", "C:\\\\Windows"), "System32", "drivers", "etc", "services"),
    ]
    if IS_WINDOWS
    else ["/etc/passwd", "/etc/shadow", "/etc/sudoers", "/etc/hosts"]
)
BASELINE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".thorondor-baseline.json")
MAX_LOG_LINES = 60
MAX_CUSTOM_LOG_FILES = 8
HEADERS = {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
}


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


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
        return completed.stdout.strip() or completed.stderr.strip()
    except Exception as exc:
        return f"ERROR: {exc}"


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
        raise ValueError("No se permite bloquear la IP que esta gestionando el agente ahora mismo")

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
        hints.append("El agente no tiene permisos para modificar el firewall. Revisa sudoers en Linux o ejecucion elevada en Windows.")
    if "not found" in text or "no se encontro" in text:
        hints.append("No se encontro un proveedor de firewall compatible en el host.")
    if provider == "firewalld-direct":
        hints.append("Se intento usar firewalld direct. Comprueba que firewalld esta activo y que firewall-cmd funciona con permisos.")
    if provider in ["iptables", "ip6tables"]:
        hints.append("Se intento usar iptables/ip6tables. Comprueba que el backend esta disponible y que el usuario del agente tiene NOPASSWD.")
    if provider == "ufw":
        hints.append("Se intento usar ufw. Comprueba que ufw esta instalado y acepta reglas desde el usuario del agente.")
    return hints


def firewall_response_payload(action, ip_address, result, provider, changed=None, blocked=None):
    ok = bool(result.get("ok"))
    message = result.get("stdout") or result.get("stderr") or (
        "Operacion completada" if ok else "No se pudo completar la operacion"
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
                "stderr": "No se encontro iptables, ip6tables ni ufw"
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
    except Exception as exc:
        return [f"ERROR leyendo {path}: {exc}"]


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
    except Exception as exc:
        return [f"ERROR leyendo winlog://{safe_name}: {exc}"]


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
            except Exception as exc:
                entries.append({"path": candidate, "lines": [f"ERROR leyendo directorio {candidate}: {exc}"]})
        else:
            entries.append({"path": candidate, "lines": read_tail(candidate, MAX_LOG_LINES)})

    if not entries:
        entries.append({"path": source_text, "lines": []})

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
            "-FilterXPath '*[System[EventID=4624 or EventID=4625 or EventID=4648 or EventID=4688]]' "
            "2>$null | Select-Object @{N='id';E={$_.Id}},@{N='ts';E={$_.TimeCreated.ToString('o')}},@{N='msg';E={$_.Message}} "
            "| ConvertTo-Json -Depth 2 -Compress"
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
                eid = evt.get("id")
                ts = evt.get("ts", now_iso())
                msg = str(evt.get("msg", ""))
                user_match = re.search(r"Account Name:\\s+([^\\r\\n]+)", msg)
                process_match = re.search(r"New Process Name:\\s+([^\\r\\n]+)", msg)
                command_match = re.search(r"Process Command Line:\\s+([^\\r\\n]+)", msg)
                username = user_match.group(1).strip() if user_match else "unknown"
                if eid == 4625:
                    events.append({"kind": "failed_login", "user": username, "sourceIp": "win", "message": msg[:600], "timestamp": ts})
                elif eid in (4624, 4648):
                    events.append({"kind": "successful_login", "user": username, "sourceIp": "win", "message": msg[:600], "timestamp": ts})
                elif eid == 4688:
                    process_name = process_match.group(1).strip() if process_match else ""
                    command = command_match.group(1).strip() if command_match else process_name
                    events.append({
                        "kind": "command_execution",
                        "user": username,
                        "sourceIp": "win",
                        "process": process_name,
                        "command": command,
                        "message": msg[:600],
                        "timestamp": ts
                    })
    except Exception as exc:
        events.append({"kind": "error", "message": str(exc), "timestamp": now_iso()})
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


def collect_processes():
    processes = []
    for process in psutil.process_iter(["pid", "name", "username", "cpu_percent", "memory_percent", "cmdline"]):
        try:
            info = process.info
            cmdline = info.get("cmdline") or []
            processes.append({
                "pid": info.get("pid"),
                "name": info.get("name"),
                "user": info.get("username"),
                "cpuPercent": round(info.get("cpu_percent") or 0, 2),
                "memoryPercent": round(info.get("memory_percent") or 0, 2),
                "cmdline": " ".join(cmdline[:8]) if cmdline else ""
            })
        except Exception:
            continue

    processes.sort(key=lambda item: (item["cpuPercent"], item["memoryPercent"]), reverse=True)
    return processes[:15]


def collect_open_ports():
    ports = []
    try:
        for connection in psutil.net_connections(kind="inet"):
            if connection.status == psutil.CONN_LISTEN and connection.laddr:
                ports.append({
                    "ip": connection.laddr.ip,
                    "port": connection.laddr.port,
                    "proto": "tcp"
                })
    except Exception:
        pass
    return ports


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
    result = []
    try:
        for user in psutil.users():
            result.append({
                "name": user.name,
                "terminal": user.terminal,
                "host": user.host,
                "started": user.started
            })
    except Exception:
        pass
    return result


def collect_temperatures():
    try:
        temps = psutil.sensors_temperatures()
        output = []
        for key, readings in temps.items():
            for reading in readings:
                output.append({
                    "source": key,
                    "label": reading.label or key,
                    "current": reading.current
                })
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

        if "failed password" in lower or "authentication failure" in lower:
            events.append({
                "kind": "failed_login",
                "user": username,
                "sourceIp": ip_address,
                "message": line,
                "timestamp": timestamp
            })
        elif "accepted password" in lower or "session opened" in lower:
            events.append({
                "kind": "successful_login",
                "user": username,
                "sourceIp": ip_address,
                "message": line,
                "timestamp": timestamp
            })
        elif "sudo" in lower:
            events.append(parse_sudo_event(line, timestamp, ip_address))
        elif "useradd" in lower or "new user" in lower or "groupadd" in lower:
            events.append({
                "kind": "new_user",
                "subject": username,
                "message": line,
                "timestamp": timestamp
            })
    return events[-80:]


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
    for path in ADDITIONAL_LOG_PATHS:
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
    kernel_errors = run_command(["sh", "-c", "dmesg | grep -i error | tail -n 25"])
    return {
        "syslogPath": syslog_path,
        "syslogTail": read_tail(syslog_path, MAX_LOG_LINES),
        "journalTail": journal_output.splitlines()[-MAX_LOG_LINES:],
        "kernelErrors": kernel_errors.splitlines() if kernel_errors else [],
        "customLogs": custom_logs
    }


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
                proc_name = ""
                try:
                    if conn.pid:
                        proc_name = psutil.Process(conn.pid).name()
                except Exception:
                    pass
                result.append({
                    "pid": conn.pid,
                    "process": proc_name,
                    "localAddr": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "",
                    "remoteAddr": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "",
                    "status": conn.status
                })
    except Exception:
        pass
    return result[:50]


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


def collect_fans():
    if IS_WINDOWS:
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
        return []
    if not shutil.which("smartctl"):
        return []
    try:
        lsblk = run_command(["lsblk", "-dno", "NAME,TYPE"])
        disks = []
        for line in lsblk.splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "disk":
                dev = f"/dev/{parts[0]}"
                out = run_command(["smartctl", "-A", "-j", dev])
                try:
                    data = json.loads(out)
                    attrs = data.get("ata_smart_attributes", {}).get("table", [])
                    useful = {}
                    for attr in attrs:
                        name = attr.get("name", "")
                        if name in ("Reallocated_Sector_Ct", "Pending_Sector_Count",
                                    "Uncorrectable_Sector_Count", "Temperature_Celsius", "Power_On_Hours"):
                            useful[name] = attr.get("raw", {}).get("value", 0)
                    disks.append({"device": dev, "attributes": useful})
                except Exception:
                    disks.append({"device": dev, "attributes": {}})
        return disks
    except Exception:
        return []


def collect_login_history():
    if IS_WINDOWS:
        return []
    try:
        out = run_command(["last", "-n", "30", "-F"])
        lines = [line for line in out.splitlines()
                 if line.strip() and not line.startswith("wtmp") and "reboot" not in line.lower()]
        return lines[:30]
    except Exception:
        return []


def collect_pending_updates():
    if IS_WINDOWS:
        try:
            ps = "(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search('IsInstalled=0').Updates | ForEach-Object {$_.Title} | ConvertTo-Json -Compress"
            result = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps], capture_output=True, text=True, timeout=30)
            if result.returncode == 0 and result.stdout.strip():
                raw = json.loads(result.stdout)
                if isinstance(raw, str):
                    raw = [raw]
                return {"count": len(raw), "updates": raw[:10]}
        except Exception:
            pass
        return {"count": 0, "updates": []}
    try:
        if shutil.which("apt"):
            out = run_command(["apt", "list", "--upgradable", "-qq"])
            lines = [line for line in out.splitlines() if line.strip() and line != "Listing..."]
            return {"count": len(lines), "updates": lines[:10]}
        if shutil.which("dnf"):
            out = run_command(["dnf", "check-update", "-q"])
            lines = [line for line in out.splitlines() if line.strip()]
            return {"count": len(lines), "updates": lines[:10]}
        if shutil.which("pacman"):
            out = run_command(["checkupdates"])
            lines = [line for line in out.splitlines() if line.strip()]
            return {"count": len(lines), "updates": lines[:10]}
    except Exception:
        pass
    return {"count": 0, "updates": []}


def collect_hardware_info():
    info = {
        "cpuModel": "",
        "cpuCoresPhysical": psutil.cpu_count(logical=False),
        "cpuCoresLogical": psutil.cpu_count(logical=True),
        "cpuFreqMhz": 0,
        "totalRamGb": round(psutil.virtual_memory().total / 1024 ** 3, 2)
    }
    try:
        freq = psutil.cpu_freq()
        if freq:
            info["cpuFreqMhz"] = round(freq.current, 0)
    except Exception:
        pass
    if IS_WINDOWS:
        out = run_command(["powershell", "-NoProfile", "-NonInteractive", "-Command", "(Get-CimInstance Win32_Processor).Name"])
        info["cpuModel"] = out.strip()
    else:
        out = run_command(["sh", "-c", "grep 'model name' /proc/cpuinfo 2>/dev/null | head -1 | cut -d: -f2"])
        info["cpuModel"] = out.strip()
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
    if IS_WINDOWS:
        try:
            ps = "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion | ConvertTo-Json -Compress"
            result = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps], capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and result.stdout.strip():
                raw = json.loads(result.stdout)
                if isinstance(raw, dict):
                    raw = [raw]
                return [{"name": g.get("Name", ""), "vramBytes": g.get("AdapterRAM", 0), "driver": g.get("DriverVersion", "")} for g in raw]
        except Exception:
            pass
        return []
    if shutil.which("nvidia-smi"):
        try:
            out = run_command(["nvidia-smi", "--query-gpu=name,memory.total,temperature.gpu,utilization.gpu", "--format=csv,noheader,nounits"])
            gpus = []
            for line in out.splitlines():
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 4:
                    gpus.append({
                        "name": parts[0],
                        "vramMb": int(parts[1]) if parts[1].isdigit() else 0,
                        "tempC": int(parts[2]) if parts[2].isdigit() else 0,
                        "utilPercent": int(parts[3]) if parts[3].isdigit() else 0
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


VIRTUAL_FSTYPES = {
    "tmpfs", "squashfs", "devtmpfs", "proc", "sysfs", "cgroup", "cgroup2",
    "pstore", "debugfs", "tracefs", "securityfs", "binfmt_misc", "overlay",
    "aufs", "ramfs", "hugetlbfs", "fusectl", "bpf", "nsfs", "configfs",
    "rpc_pipefs", "mqueue", "efivarfs"
}


def collect_payload():
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
                "used": usage.used,
                "total": usage.total
            })
        except Exception:
            continue

    cpu_per_core = psutil.cpu_percent(interval=0.25, percpu=True)
    cpu_total = psutil.cpu_percent(interval=0.15)
    boot_seconds = time.time() - psutil.boot_time()
    loadavg = os.getloadavg() if hasattr(os, "getloadavg") else (0, 0, 0)

    security = collect_security() if MODULES["securityLogs"] or MODULES["sudoCommands"] or MODULES["fileIntegrity"] else {"events": [], "authTail": [], "authLogPath": ""}
    logs = collect_logs()

    payload = {
        "agent": {
            "hostLabel": HOST_LABEL,
            "systemName": SYSTEM_NAME,
            "distro": DISTRO,
            "osVersion": OS_VERSION,
            "targetOs": "windows" if IS_WINDOWS else "linux",
            "installUser": INSTALL_USER,
            "listenPort": LISTEN_PORT,
            "networkScope": NETWORK_SCOPE,
            "modules": MODULES,
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
            "memoryTotal": vm.total,
            "swapPercent": swap.percent,
            "swapUsed": swap.used,
            "swapTotal": swap.total,
            "disks": partitions,
            "processes": collect_processes(),
            "interfaces": collect_network_interfaces(),
            "temperatures": collect_temperatures(),
            "openPorts": collect_open_ports(),
            "networkRates": collect_network_rates() if MODULES.get("networkRates") else [],
            "establishedConnections": collect_established_connections() if MODULES.get("establishedConnections") else [],
            "failedServices": collect_failed_services(),
            "fans": collect_fans() if MODULES.get("hardwareMonitor") else [],
            "battery": collect_battery() if MODULES.get("hardwareMonitor") else None,
            "gpu": collect_gpu_info() if MODULES.get("hardwareMonitor") else [],
            "hardware": collect_hardware_info(),
            "docker": collect_docker_containers() if MODULES.get("dockerMonitor") else [],
            "dns": collect_dns_check(),
            "smartData": collect_smart_data() if MODULES.get("smartMonitor") else [],
            "loginHistory": collect_login_history() if MODULES.get("loginHistory") else [],
            "pendingUpdates": collect_pending_updates() if MODULES.get("updateMonitor") else {"count": 0, "updates": []}
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
                "port": LISTEN_PORT,
                "networkScope": NETWORK_SCOPE
            })
            return

        if parsed.path in ["/telemetry", "/logs"]:
            payload = collect_payload()
            if parsed.path == "/logs":
                self._write_json(200, payload["logs"])
            else:
                self._write_json(200, payload)
            return

        if parsed.path == "/response/blocks":
            self._write_json(200, {
                "blocked": list_blocked_ips(),
                "timestamp": now_iso()
            })
            return

        self._write_json(404, {"error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)

        try:
            body = self._read_json_body()
            if parsed.path == "/response/block-ip":
                self._write_json(200, block_ip(body.get("ip"), body.get("reason", "manual"), self.client_address[0]))
                return
            if parsed.path == "/response/unblock-ip":
                self._write_json(200, unblock_ip(body.get("ip")))
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
    print(f"[thorondor] iniciando agente {SYSTEM_NAME} en {LISTEN_HOST}:{LISTEN_PORT}")
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
ExecStart=/usr/bin/python3 /opt/thorondor-agent/thorondor-agent.py
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

export function buildThorondorInstallScript(config) {
  const pythonAgent = buildThorondorPythonAgent(config);
  const autoStart = config.autoStart !== false && config.generateSystemd;
  const serviceFileName = buildServiceFileName(config);
  const shouldOpenFirewall = normalizeThorondorNetworkScope(config.networkScope) !== "local";
  const systemdBlock = autoStart
    ? `
cat > "/tmp/$SERVICE_FILE" <<'UNIT'
${buildThorondorSystemdUnit(config)}
UNIT

sudo cp "/tmp/$SERVICE_FILE" "/etc/systemd/system/$SERVICE_FILE"
sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_FILE"
`
    : "";
  const completionMessage = autoStart
    ? `echo "Instalacion completada. Comprueba el servicio con:"
echo "sudo systemctl status $SERVICE_FILE"`
    : `echo "Instalacion completada. Prueba el agente manualmente con:"
echo "python3 $INSTALL_DIR/thorondor-agent.py"`;

  return `#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/thorondor-agent"
INSTALL_USER="${config.installUser || "thorondor"}"
SERVICE_FILE="${serviceFileName}"
PORT="${Number(config.port) || 8765}"
TMP_AGENT="$(mktemp)"

cat > "$TMP_AGENT" <<'PY'
${pythonAgent}
PY

if ! id "$INSTALL_USER" >/dev/null 2>&1; then
  sudo useradd --system --create-home --shell /usr/sbin/nologin "$INSTALL_USER"
fi

sudo mkdir -p "$INSTALL_DIR"
sudo cp "$TMP_AGENT" "$INSTALL_DIR/thorondor-agent.py"
rm -f "$TMP_AGENT"
sudo chown -R "$INSTALL_USER:$INSTALL_USER" "$INSTALL_DIR"
sudo chmod 750 "$INSTALL_DIR/thorondor-agent.py"

sudo usermod -aG adm "$INSTALL_USER" || true
sudo usermod -aG systemd-journal "$INSTALL_USER" || true
sudo tee "/etc/sudoers.d/thorondor-agent-firewall" >/dev/null <<SUDOERS
Cmnd_Alias THORONDOR_FIREWALL = /usr/sbin/iptables, /sbin/iptables, /usr/sbin/ip6tables, /sbin/ip6tables, /usr/sbin/ufw, /usr/bin/ufw, /usr/bin/firewall-cmd, /bin/firewall-cmd
$INSTALL_USER ALL=(root) NOPASSWD: THORONDOR_FIREWALL
SUDOERS
sudo chmod 440 "/etc/sudoers.d/thorondor-agent-firewall"

if command -v apt >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y python3 python3-pip lm-sensors
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y python3 python3-pip lm_sensors
elif command -v pacman >/dev/null 2>&1; then
  sudo pacman -Sy --noconfirm python python-pip lm_sensors
fi

sudo python3 -m pip install --upgrade pip
sudo python3 -m pip install psutil

${systemdBlock}

if ${shouldOpenFirewall ? "true" : "false"} && command -v ufw >/dev/null 2>&1; then
  sudo ufw allow "$PORT/tcp" || true
fi

${completionMessage}
`;
}

export function buildThorondorWixSource(config) {
  const packageName = normalizeWindowsPackageName(config);
  const installFileName = "install-thorondor-agent.ps1";
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

    <MajorUpgrade DowngradeErrorMessage="Ya existe una version mas reciente de Thorondor Agent." />
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
  const msiFileName = "ThorondorAgent.msi";

  return `Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$requiredFiles = @(
  "thorondor-agent.wxs",
  "install-thorondor-agent.ps1"
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Falta $file. Descarga el instalador PowerShell y el manifiesto WiX en la misma carpeta."
  }
}

if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw "No se encontro wix ni dotnet. Instala .NET SDK y despues ejecuta: dotnet tool install --global wix"
  }

  Write-Host "Instalando WiX Toolset como herramienta dotnet..." -ForegroundColor Yellow
  dotnet tool install --global wix
  $env:PATH = "$env:PATH;$env:USERPROFILE\\.dotnet\\tools"
}

Write-Host "Compilando MSI de Thorondor Agent (${packageName})..." -ForegroundColor Cyan
wix build ".\\thorondor-agent.wxs" -o ".\\${msiFileName}"

Write-Host ""
Write-Host "MSI generado: $root\\${msiFileName}" -ForegroundColor Green
Write-Host "Ejecutalo como administrador en el host Windows que quieras monitorizar."
`;
}

export function buildThorondorInstallInstructions(config) {
  const baseUrl = normalizeReceiverBaseUrl(config);
  const installerName = config.targetOs === "windows" ? "install-thorondor-agent.ps1" : "install-thorondor-agent.sh";
  const windowsMsiNote = config.targetOs === "windows"
    ? `
> MSI opcional: para generar un MSI real, descarga tambien \`thorondor-agent.wxs\` y \`build-thorondor-msi.ps1\` en la misma carpeta que \`${installerName}\`. Ejecuta \`build-thorondor-msi.ps1\` en Windows con WiX Toolset disponible. El navegador no renombra el script a MSI: compila un paquete Windows Installer real.
`
    : "";
  const serviceFileName = buildServiceFileName(config);
  const runCommand = config.targetOs === "windows"
    ? `powershell -ExecutionPolicy Bypass -File .\\${installerName}`
    : `chmod +x ./${installerName}\nsudo ./${installerName}`;
  const serviceCheck = config.targetOs === "windows"
    ? `Get-ScheduledTask -TaskName ThorondorAgent`
    : `sudo systemctl status ${serviceFileName}`;

  return `## Instalacion guiada para ${config.systemName}

1. Descarga unicamente \`${installerName}\` en el sistema monitorizado.
${windowsMsiNote}

2. Ejecuta el instalador con permisos de administrador:
\`\`\`bash
${runCommand}
\`\`\`

3. El instalador crea \`thorondor-agent.py\`, instala dependencias y configura el arranque automatico solo si lo has activado en el formulario.

4. Si activaste el arranque automatico, revisa el servicio:
\`\`\`bash
${serviceCheck}
\`\`\`

5. Valida respuesta HTTP:
\`\`\`bash
curl ${baseUrl}/health
curl ${baseUrl}/telemetry
\`\`\`

6. Registra este host en el dashboard con la misma URL base: \`${baseUrl}\`.
`;
}

export function buildThorondorWindowsInstallScript(config) {
  const port = Number(config.port) || 8765;
  const installDir = "C:\\ProgramData\\Thorondor-Agent";
  const pythonAgent = buildThorondorPythonAgent(config);
  const autoStart = config.autoStart !== false;
  const shouldOpenFirewall = normalizeThorondorNetworkScope(config.networkScope) !== "local";
  const verifyCommand = `Invoke-RestMethod http://127.0.0.1:$PORT/health | ConvertTo-Json -Depth 3`;
  const firewallBlock = shouldOpenFirewall
    ? `# 4. Regla de firewall
Write-Host "[4/6] Abriendo puerto $PORT en Windows Firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Thorondor Agent HTTP" -Direction Inbound -Protocol TCP -LocalPort $PORT -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
Write-Host "    Regla de firewall creada." -ForegroundColor Green`
    : `# 4. Firewall local
Write-Host "[4/6] Monitorizacion local: no se abre firewall." -ForegroundColor Yellow`;
  const taskBlock = autoStart
    ? `
# 5. Crear tarea programada
Write-Host "[5/6] Registrando tarea programada '$TASK_NAME'..." -ForegroundColor Yellow
$action   = New-ScheduledTaskAction -Execute $python -Argument "$INSTALL_DIR\\$AGENT_FILE"
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
`
    : `
# 5. Arranque manual
Write-Host "[5/6] Autoarranque desactivado por configuracion." -ForegroundColor Yellow
Write-Host "    Para iniciar manualmente: & $python '$INSTALL_DIR\\$AGENT_FILE'" -ForegroundColor Yellow

# 6. No se inicia el agente automaticamente
Write-Host "[6/6] Instalacion preparada sin iniciar tarea programada." -ForegroundColor Yellow
`;

  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala el agente Thorondor en Windows como tarea programada.
.DESCRIPTION
    Crea el directorio de instalacion, instala dependencias Python
    y registra el agente como tarea programada de inicio de sistema.
    Requiere PowerShell 5.1+ y permisos de Administrador.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$INSTALL_DIR  = "${installDir}"
$AGENT_FILE   = "thorondor-agent.py"
$TASK_NAME    = "ThorondorAgent"
$PORT         = ${port}

Write-Host "=== Thorondor Agent Installer ===" -ForegroundColor Cyan

# 1. Crear directorio de instalacion
Write-Host "[1/6] Creando directorio $INSTALL_DIR..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
$agentSource = @'
${pythonAgent}
'@
Set-Content -Path "$INSTALL_DIR\\$AGENT_FILE" -Value $agentSource -Encoding UTF8

# 2. Verificar Python
Write-Host "[2/6] Verificando Python..." -ForegroundColor Yellow
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\\.(\\d+)") {
            $python = $cmd
            Write-Host "    Python encontrado: $ver" -ForegroundColor Green
            break
        }
    } catch { }
}
if (-not $python) {
    Write-Host "    Python no encontrado. Instalando via winget..." -ForegroundColor Yellow
    winget install --id Python.Python.3.11 --silent --accept-source-agreements --accept-package-agreements
    $python = "python"
}

# 3. Instalar psutil
Write-Host "[3/6] Instalando dependencias Python..." -ForegroundColor Yellow
& $python -m pip install --upgrade pip --quiet
& $python -m pip install psutil --quiet
Write-Host "    psutil instalado correctamente." -ForegroundColor Green

${firewallBlock}

${taskBlock}

Write-Host ""
Write-Host "=== Instalacion completada ===" -ForegroundColor Green
Write-Host "Verifica el agente con:"
Write-Host "  ${verifyCommand}"
Write-Host ""
Write-Host "Logs del proceso:"
Write-Host "  Get-EventLog -LogName Application -Source 'ThorondorAgent' -Newest 20"
`;
}
