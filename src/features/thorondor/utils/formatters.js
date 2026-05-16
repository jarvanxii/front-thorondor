export function formatDateTime(value) {
  if (!value) return "Sin datos";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function formatRelativeTime(value) {
  if (!value) return "Sin datos";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Sin datos";

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Hace menos de 1 min";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/D";
  return `${Math.round(value)}%`;
}

export function formatBytes(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/D";
  if (!value) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / (1024 ** power);
  return `${amount.toFixed(amount >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
}

export function formatDurationSeconds(seconds) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return "N/D";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatList(value, fallback = "Sin datos") {
  if (!Array.isArray(value) || !value.length) return fallback;
  return value.join(", ");
}

export function toCsv(rows) {
  if (!Array.isArray(rows) || !rows.length) return "";

  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));

  const escape = (value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row?.[header])).join(","))
  ].join("\n");
}
