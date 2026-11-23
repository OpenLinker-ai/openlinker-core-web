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
  const onlyUploads = new URL(runReplayPlaygroundHref({ agentSlug: "seller/image", input: { image_url: upload }, fallbackHref: "/market" }), "https://openlinker.local");
  assert.equal(onlyUploads.searchParams.get("prefill"), "{}");
  assert.equal(runReplayPlaygroundHref({ agentSlug: "seller/image", input: {}, fallbackHref: "/market" }), "/playground/seller%2Fimage");
});

test("replay keeps the rest of a text value byte for byte", () => {
  const prompt = `Review ${upload}\n\n    if enabled:\n        run()\n`;
  assert.equal(withoutAttachmentLinks({ prompt }).prompt, prompt);
  assert.equal(withoutAttachmentLinks({ prompt: `${upload}\n\n    if enabled:\n` }).prompt, "\n    if enabled:\n");
  assert.equal(withoutAttachmentLinks({ files: `${upload}\n  ${pasted}\n${second}\n` }).files, `  ${pasted}\n`);
});

test("a public file whose name starts with 64 hex characters is not an upload", () => {
  const cdn = `https://cdn.example/api/v1/attachments/${token}.jpg`;
  assert.equal(maskAttachmentLinks(cdn, "已上传文件"), cdn);
  assert.equal(maskAttachmentLinks(`${upload}x`, "已上传文件"), `${upload}x`);
  assert.deepEqual(withoutAttachmentLinks({ image_url: cdn }), { image_url: cdn });
  assert.equal(maskAttachmentLinks(`请看 ${upload}.`, "已上传文件"), "请看 已上传文件 1.");
});

test("only a URL whose whole path is the attachment route counts as an upload", () => {
  for (const value of [
    `https://cdn.example/api/v1/attachments/${token}/original.jpg`,
    `https://cdn.example/images/api/v1/attachments/${token}`,
    `https://cdn.example/api/v1/attachments/${token}.jpg?size=2`,
  ]) {
    assert.equal(maskAttachmentLinks(value, "已上传文件"), value, value);
    assert.deepEqual(withoutAttachmentLinks({ image_url: value }), { image_url: value }, value);
  }
  assert.equal(maskAttachmentLinks(`(${upload})，再看 ${second}。`, "已上传文件"), "(已上传文件 1)，再看 已上传文件 2。");
  assert.equal(maskAttachmentLinks(`/api/v1/attachments/${token}`, "已上传文件"), "已上传文件 1");
});

test("adjacent links are judged one by one", () => {
  assert.equal(maskAttachmentLinks(`[one](${upload}),[two](${second})`, "已上传文件"), "[one](已上传文件 1),[two](已上传文件 2)");
  assert.equal(maskAttachmentLinks(`${upload},${second};${pasted}`, "已上传文件"), `已上传文件 1,已上传文件 2;${pasted}`);
  assert.equal(maskAttachmentLinks(`{${upload}}`, "已上传文件"), "{已上传文件 1}");
  assert.deepEqual(withoutAttachmentLinks({ note: `[one](${upload}),[two](${pasted})` }), { note: `[one](${upload}),[two](${pasted})` });
});

test("uploads are found inside Markdown and on IPv6 hosts", () => {
  const ipv6 = `http://[::1]:8080/api/v1/attachments/${token}`;
  assert.equal(maskAttachmentLinks(`\`${upload}\``, "已上传文件"), "`已上传文件 1`");
  assert.equal(maskAttachmentLinks(`|${upload}|${second}|`, "已上传文件"), "|已上传文件 1|已上传文件 2|");
  assert.equal(maskAttachmentLinks(ipv6, "已上传文件"), "已上传文件 1");
  assert.deepEqual(withoutAttachmentLinks({ image_url: ipv6, note: `see \`${upload}\`` }), { note: `see \`${upload}\`` });
  assert.equal(maskAttachmentLinks(`<${upload}>`, "已上传文件"), "<已上传文件 1>");
  assert.equal(maskAttachmentLinks(`https://user:pw@core.example.com/api/v1/attachments/${token}`, "已上传文件"), "已上传文件 1");
});

test("a public filename that continues after the token is left whole", () => {
  for (const value of [
    `https://cdn.example/api/v1/attachments/${token}+preview.png`,
    `https://cdn.example/api/v1/attachments/${token}预览.png`,
    `https://cdn.example/api/v1/attachments/${token}=1`,
    `https://cdn.example/api/v1/attachments/${token}@2x`,
    `https://cdn.example/api/v1/attachments/${token}(1).jpg`,
    `https://cdn.example/api/v1/attachments/${token}!thumbnail.jpg`,
    `https://cdn.example/api/v1/attachments/${token}[1].jpg`,
  ]) {
    assert.equal(maskAttachmentLinks(value, "已上传文件"), value, value);
    assert.deepEqual(withoutAttachmentLinks({ image_url: value }), { image_url: value }, value);
  }
  assert.equal(maskAttachmentLinks(`${upload}。${upload}，${upload}）`, "已上传文件"), "已上传文件 1。已上传文件 2，已上传文件 3）");
});

test("rerun removes only whole-line uploads and never edits other text", () => {
  const cdn = `https://cdn.example/api/v1/attachments/${token}(1).jpg`;
  assert.deepEqual(withoutAttachmentLinks({ a: cdn, b: ` ${upload}?download=1 `, c: `${pasted}\n${upload}`, d: `x ${upload}` }), { a: cdn, c: pasted, d: `x ${upload}` });
});

test("display masking keeps prose, query values and international hosts intact", () => {
  assert.equal(maskAttachmentLinks(`${upload}?download=1。继续分析第二张图片`, "已上传文件"), "已上传文件 1。继续分析第二张图片");
  const query = `https://cdn.example/download?file=/api/v1/attachments/${token}`;
  const colon = `https://cdn.example/api/v1/attachments/${token}:preview.jpg`;
  assert.equal(maskAttachmentLinks(query, "已上传文件"), query);
  assert.equal(maskAttachmentLinks(colon, "已上传文件"), colon);
  assert.equal(maskAttachmentLinks(`见 ${upload}: 第一张`, "已上传文件"), "见 已上传文件 1: 第一张");
  const idn = `https://例子.测试/api/v1/attachments/${token}`;
  assert.equal(maskAttachmentLinks(idn, "已上传文件"), "已上传文件 1");
  assert.deepEqual(withoutAttachmentLinks({ image_url: idn, context: "x" }), { context: "x" });
});

test("rerun keeps a line with text after the link, and underscore hosts are masked", () => {
  const line = `${upload}?download=1 Compare both charts`;
  assert.deepEqual(withoutAttachmentLinks({ prompt: line }), { prompt: line });
  const internal = `http://core_api:8080/api/v1/attachments/${token}`;
  assert.equal(maskAttachmentLinks(internal, "已上传文件"), "已上传文件 1");
  assert.deepEqual(withoutAttachmentLinks({ image_url: internal }), {});
});

test("reruns of different runs get different links even when only the upload differed", () => {
  const first = runReplayPlaygroundHref({ agentSlug: "seller/image", runId: "run-1", input: { image_url: upload, context: "日出" }, fallbackHref: "/market" });
  const second_ = runReplayPlaygroundHref({ agentSlug: "seller/image", runId: "run-2", input: { image_url: second, context: "日出" }, fallbackHref: "/market" });
  assert.notEqual(first, second_);
  assert.equal(new URL(first, "https://openlinker.local").searchParams.get("replay"), "run-1");
  assert.equal(new URL(runReplayPlaygroundHref({ agentSlug: "seller/image", runId: "run-3", fallbackHref: "/market" }), "https://openlinker.local").searchParams.get("replay"), "run-3");
});

test("sentence punctuation after an upload still ends it", () => {
  assert.equal(maskAttachmentLinks(`看 ${upload}! 好`, "已上传文件"), "看 已上传文件 1! 好");
});

test("Markdown emphasis around an upload still ends it", () => {
  assert.equal(maskAttachmentLinks(`**${upload}**`, "已上传文件"), "**已上传文件 1**");
  assert.equal(maskAttachmentLinks(`_${upload}_ and *${second}*`, "已上传文件"), "_已上传文件 1_ and *已上传文件 2*");
  assert.equal(maskAttachmentLinks(`${upload}/ next`, "已上传文件"), "已上传文件 1/ next");
});
