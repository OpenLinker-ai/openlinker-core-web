const ATTACHMENT_LINK = /(?:https?:\/\/[^\s/"'<>]+)?\/api\/v1\/attachments\/[0-9a-f]{64}(?![0-9a-f])/g;

export function maskAttachmentLinks(value, label) {
  let count = 0;
  const visit = (item) => {
    if (typeof item === "string") return item.replace(ATTACHMENT_LINK, () => `${label} ${++count}`);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, visit(entry)]));
    return item;
  };
  return visit(value);
}

export function withoutAttachmentLinks(value) {
  const visit = (item) => {
    if (typeof item === "string") {
      if (!item.match(ATTACHMENT_LINK)) return item;
      const kept = item.replace(ATTACHMENT_LINK, "").split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
      return kept || undefined;
    }
    if (Array.isArray(item)) {
      const kept = item.map(visit).filter((entry) => entry !== undefined);
      return kept.length === 0 && item.length > 0 ? undefined : kept;
    }
    if (item && typeof item === "object") {
      const entries = Object.entries(item).map(([key, entry]) => [key, visit(entry)]).filter(([, entry]) => entry !== undefined);
      return Object.fromEntries(entries);
    }
    return item;
  };
  return visit(value);
}
