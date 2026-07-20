export function safeMarkdownURL(url) {
  const value = String(url ?? "").trim();
  if (/^(?:https?:|mailto:)/i.test(value)) return value;
  if (/^(?:\/(?!\/)|\.\/|\.\.\/|#|\?)/.test(value)) return value;
  return "";
}
