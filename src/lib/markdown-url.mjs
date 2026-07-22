export function safeMarkdownURL(url) {
  const value = String(url ?? "").trim();
  if (/^(?:https?:|mailto:)/i.test(value)) return value;
  if (/^(?:\/(?!\/)|\.\/|\.\.\/|#|\?)/.test(value)) return value;
  return "";
}

const JSON_STRING_VALUE_PREFIX = /[,{]\s*"(?:\\.|[^"\\])*"\s*:\s*"$/;
const JSON_STRING_VALUE_END = /"(?=\s*(?:[}\]]|,\s*"(?:\\.|[^"\\])*"\s*:))/;

export function splitJSONAutolink(url, precedingText) {
  if (typeof url !== "string" || typeof precedingText !== "string") return null;
  if (!JSON_STRING_VALUE_PREFIX.test(precedingText)) return null;

  const boundary = url.search(JSON_STRING_VALUE_END);
  if (boundary <= 0) return null;

  const cleanURL = url.slice(0, boundary);
  if (safeMarkdownURL(cleanURL) !== cleanURL) return null;

  return {
    url: cleanURL,
    suffix: url.slice(boundary),
  };
}

export function remarkJSONAutolinkBoundaries() {
  return (tree) => repairJSONAutolinks(tree);
}

function repairJSONAutolinks(parent) {
  if (!parent || !Array.isArray(parent.children)) return;

  const repaired = [];
  for (const node of parent.children) {
    repairJSONAutolinks(node);

    const preceding = repaired.at(-1);
    const child = node?.type === "link" && node.children?.length === 1
      ? node.children[0]
      : null;
    const split = child?.type === "text" && child.value === node.url
      ? splitJSONAutolink(node.url, preceding?.type === "text" ? preceding.value : "")
      : null;
    if (!split) {
      repaired.push(node);
      continue;
    }

    repaired.push(
      {
        ...node,
        url: split.url,
        children: [{ ...child, value: split.url }],
      },
      { type: "text", value: split.suffix },
    );
  }
  parent.children = repaired;
}
