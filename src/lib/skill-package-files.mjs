export function encodedSkillFilesBytes(files) {
  // Match Go encoding/json escaping; this is a lower bound excluding manifest metadata.
  const json = JSON.stringify({ files }).replace(
    /[<>&\u2028\u2029]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
  return new TextEncoder().encode(json).byteLength;
}
function invalid(code) {
  return Object.assign(new Error(code), { code: "SKILL_PACKAGE_" + code });
}
export async function readSkillPackageFiles(list) {
  const kept = [],
    skipped = [];
  for (const file of list) {
    const path = file.webkitRelativePath
      ? file.webkitRelativePath.split("/").slice(1).join("/")
      : file.name;
    if (path.startsWith("/") || path.split("/").includes(".."))
      throw invalid("PATH_UNSAFE");
    if (
      path
        .split("/")
        .some(
          (part) =>
            part.startsWith(".") ||
            ["__MACOSX", "Thumbs.db", "desktop.ini"].includes(part),
        )
    ) {
      skipped.push(path);
      continue;
    }
    kept.push({ file, path });
  }
  if (kept.length > 32) throw invalid("FILE_COUNT");
  const files = Object.create(null);
  for (const { file, path } of kept) {
    if (
      !path ||
      !/^[a-zA-Z0-9._/-]+$/.test(path) ||
      path.startsWith("/") ||
      path.split("/").some((p) => !p || p === "." || p === "..") ||
      Object.hasOwn(files, path)
    )
      throw invalid("PATH_UNSAFE");
    if (file.size > 65536) throw invalid("PAYLOAD_TOO_LARGE");
    try {
      files[path] = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
    } catch {
      throw invalid("ENCODING_INVALID");
    }
  }
  if (!files["SKILL.md"]) throw invalid("MANIFEST_MISSING");
  if (encodedSkillFilesBytes(files) > 65536) throw invalid("PAYLOAD_TOO_LARGE");
  return { files, skipped };
}
