const AUTHORITY = String.raw`https?:\/\/(?:[^\s\/@"'<>]*@)?(?:\[[0-9A-Fa-f:.]+\]|[\p{L}\p{N}._-]+)(?::\d+)?`;
const TOKEN_PATH = String.raw`\/api\/v1\/attachments\/[0-9a-f]{64}`;
const PATH_END = String.raw`(?![\p{L}\p{N}_~%\/+=&$@*([-]|[.:!][\p{L}\p{N}_])`;
const SUFFIX = String.raw`(?:[?#][^\s"'<>\x60|()[\]{},;，。；：！？（）「」、]*)?`;
const ATTACHMENT_LINK = new RegExp(String.raw`(?:${AUTHORITY}|(?<=^|[\s"'(<[\x60|（「]))${TOKEN_PATH}${PATH_END}${SUFFIX}`, "gu");
const TRAILING = /[.:!?]+$/;
const ATTACHMENT_PATH = /^\/api\/v1\/attachments\/[0-9a-f]{64}$/;

function isAttachmentLink(value) {
  if (/\s/.test(value) || !/^(?:https?:\/\/|\/api\/v1\/attachments\/)/.test(value)) return false;
  try {
    return ATTACHMENT_PATH.test(new URL(value, "https://openlinker.invalid").pathname);
  } catch {
    return false;
  }
}

function replaceAttachmentLinks(text, replace) {
  return text.replace(ATTACHMENT_LINK, (match) => {
    const trailing = match.match(TRAILING)?.[0] ?? "";
    return replace() + trailing;
  });
}

export function maskAttachmentLinks(value, label) {
  let count = 0;
  const visit = (item) => {
    if (typeof item === "string") return replaceAttachmentLinks(item, () => `${label} ${++count}`);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, visit(entry)]));
    return item;
  };
  return visit(value);
}

export function withoutAttachmentLinks(value) {
  const visit = (item) => {
    if (typeof item === "string") {
      const lines = item.split("\n");
      const kept = lines.filter((line) => !isAttachmentLink(line.trim()));
      if (kept.length === lines.length) return item;
      const text = kept.join("\n");
      return text.trim() ? text : undefined;
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
