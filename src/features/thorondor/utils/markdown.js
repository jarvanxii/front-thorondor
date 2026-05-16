const ALLOWED_TAGS = new Set([
  "A",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "HR",
  "LI",
  "OL",
  "P",
  "PRE",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "UL"
]);

const ALLOWED_ATTRIBUTES = {
  A: new Set(["href", "title", "target", "rel"])
};

export function renderMarkdown(markdownText) {
  const safeSource = String(markdownText || "");
  const html = typeof window !== "undefined" && window.marked?.parse
    ? window.marked.parse(safeSource)
    : renderBasicMarkdown(safeSource);

  return sanitizeHtml(html);
}

function renderBasicMarkdown(source) {
  const escapedSource = escapeHtml(source);

  return escapedSource
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/```bash([\s\S]*?)```/gm, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/```([\s\S]*?)```/gm, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/gm, "<ul>$1</ul>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function sanitizeHtml(html) {
  if (typeof window === "undefined" || !window.DOMParser) {
    return stripUnsafeText(html);
  }

  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  sanitizeNode(template.content);
  return template.innerHTML;
}

function sanitizeNode(node) {
  [...node.childNodes].forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    if (!ALLOWED_TAGS.has(child.tagName)) {
      child.replaceWith(document.createTextNode(child.textContent || ""));
      return;
    }

    sanitizeAttributes(child);
    sanitizeNode(child);
  });
}

function sanitizeAttributes(element) {
  [...element.attributes].forEach((attribute) => {
    const allowed = ALLOWED_ATTRIBUTES[element.tagName]?.has(attribute.name);
    if (!allowed) {
      element.removeAttribute(attribute.name);
      return;
    }

    if (attribute.name === "href" && !isSafeUrl(attribute.value)) {
      element.removeAttribute(attribute.name);
    }
  });

  if (element.tagName === "A" && element.hasAttribute("href")) {
    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "noopener noreferrer");
  }
}

function isSafeUrl(value) {
  const url = String(value || "").trim().toLowerCase();
  return url.startsWith("http://")
    || url.startsWith("https://")
    || url.startsWith("mailto:")
    || url.startsWith("#")
    || url.startsWith("/");
}

function stripUnsafeText(html) {
  return escapeHtml(String(html || ""));
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
