import assert from "node:assert/strict";
import test from "node:test";

import { maskAttachmentLinks, withoutAttachmentLinks } from "../src/lib/attachment-link-display.mjs";
import { runReplayPlaygroundHref } from "../src/lib/run-replay.mjs";

const token = "a".repeat(64);
const upload = `https://core.example.com/api/v1/attachments/${token}`;
const second = `http://127.0.0.1:8080/api/v1/attachments/${"b".repeat(64)}`;
const pasted = "https://example.com/photo.jpg";

test("uploaded links are replaced by a numbered label and pasted links stay", () => {
  assert.equal(maskAttachmentLinks(upload, "已上传文件"), "已上传文件 1");
  assert.equal(maskAttachmentLinks(`${upload}\n${pasted}\n${second}`, "Uploaded file"), `Uploaded file 1\n${pasted}\nUploaded file 2`);
  assert.equal(maskAttachmentLinks(pasted, "已上传文件"), pasted);
  assert.equal(maskAttachmentLinks(`https://example.com/x/${token}`, "已上传文件"), `https://example.com/x/${token}`);
});

test("a token is hidden wherever it appears", () => {
  for (const value of [`${upload}?download=1`, `${upload}#top`, `请看 ${upload}。`, `"${upload}"`]) {
    assert.ok(!maskAttachmentLinks(value, "已上传文件").includes(token), value);
  }
});

test("nested values are masked without touching keys, other types or the original", () => {
  const input = { image_url: upload, image_urls: [upload, pasted], meta: { note: `see ${second}`, count: 2, ok: true, none: null } };
  const snapshot = structuredClone(input);
  const masked = maskAttachmentLinks(input, "已上传文件");
  assert.deepEqual(input, snapshot);
  assert.deepEqual(Object.keys(masked), Object.keys(input));
  assert.equal(masked.meta.count, 2);
  assert.equal(masked.meta.ok, true);
  assert.equal(masked.meta.none, null);
  assert.ok(!JSON.stringify(masked).match(/[0-9a-f]{64}/));
  assert.equal(masked.image_urls[1], pasted);
});

test("replay input drops uploaded links and keeps everything else", () => {
  const input = { image_url: upload, file_urls: `${upload}\n${pasted}`, image_urls: [second, pasted], context: "日出", count: 3 };
  const snapshot = structuredClone(input);
  assert.deepEqual(withoutAttachmentLinks(input), { file_urls: pasted, image_urls: [pasted], context: "日出", count: 3 });
  assert.deepEqual(input, snapshot);
  assert.deepEqual(withoutAttachmentLinks({ image_url: upload, image_urls: [upload] }), {});
});

test("the rerun link never carries an uploaded link", () => {
  const href = runReplayPlaygroundHref({ agentSlug: "seller/image", input: { image_url: upload, context: "日出" }, fallbackHref: "/market" });
  assert.ok(!href.includes(token));
  assert.deepEqual(JSON.parse(new URL(href, "https://openlinker.local").searchParams.get("prefill")), { context: "日出" });
  assert.equal(runReplayPlaygroundHref({ agentSlug: "seller/image", input: { image_url: upload }, fallbackHref: "/market" }), "/playground/seller%2Fimage");
});

test("replay keeps the rest of a text value byte for byte", () => {
  const prompt = `Review ${upload}\n\n    if enabled:\n        run()\n`;
  assert.equal(withoutAttachmentLinks({ prompt }).prompt, "Review \n\n    if enabled:\n        run()\n");
  assert.equal(withoutAttachmentLinks({ files: `${upload}\n  ${pasted}\n${second}\n` }).files, `  ${pasted}\n`);
});
