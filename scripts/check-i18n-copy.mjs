#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules/typescript/lib/typescript.js"));

const checks = [];

const failures = [];
const sourceRoots = ["src"];
const visibleStringAttrs = new Set(["aria-label", "title", "placeholder", "alt", "label"]);
const userFeedbackCallees = new Set(["toast.error", "toast.warning", "setError", "window.alert"]);
const visibleCopyPropertyNames = new Set([
  "action",
  "body",
  "cta",
  "current",
  "desc",
  "description",
  "empty",
  "heading",
  "hint",
  "kicker",
  "label",
  "lead",
  "name",
  "placeholder",
  "retry",
  "status",
  "title",
]);
const mappedVisibleLabelNames = new Set(["l", "label", "title", "kicker", "hint"]);
const ignoredVisibleText = [
  /^OpenLinker$/,
  /^Agent$/,
  /^Skill$/,
  /^A2A$/,
  /^MCP$/,
  /^API$/,
  /^SDK$/,
  /^SSE$/,
  /^HTTP$/,
  /^HTTPS$/,
  /^JSON$/,
  /^OAuth$/,
  /^(?:Google|GitHub|Stripe)$/,
  /^URL$/,
  /^ID$/,
  /^POST$/,
  /^USD$/,
  /^cURL$/,
  /^(?:ms|s|bytes|v)$/,
  /^(?:run_id|signin|signup)$/,
  /^(?:slug|listing_id|run_id|source|file|sha256|size):$/,
  /^Node:$/,
  /^(?:my-agent-slug|contract-review-agent|analyze_contract|prod-slack-alert|prod-mcp-access)$/,
  /^· JSON Schema$/,
  /^JSON Schema$/,
  /^· v0\.1\.0$/,
  /^Bearer sk_secret_xxx$/,
  /^you@company\.com$/,
  /^X-OpenLinker-Signature: sha256=$/,
  /^\{hmac_sha256\(secret, body\)\}$/,
  /^my-agent\.example\/run$/,
  /^endpoint: HTTPS POST$/,
  /^auth: pre-shared header$/,
  /^\/api\/v1$/,
  /^runtime · callback · delivery$/,
  /^POST \/runs$/,
  /^POST \/mcp\/run_agent$/,
  /^POST \/runs\/:id\/deliver$/,
  /^\/connect$/,
  /^Run ID$/,
];
const technicalChineseCopy = [
  /^OpenLinker(?: Core(?: Web)?)?$/,
  /^Agent$/,
  /^Skill$/,
  /^A2A$/,
  /^MCP(?: Server| Client)?$/,
  /^API$/,
  /^SDK$/,
  /^SSE$/,
  /^HTTP(?:S)?$/,
  /^JSON(?: Schema)?$/,
  /^JSON-RPC(?: [A-Za-z][A-Za-z0-9:_-]*)?$/,
  /^WebSocket$/,
  /^Webhook$/,
  /^Slack(?: Incoming Webhook)?$/,
  /^(?:cURL|Python|Node\.js)$/,
  /^OAuth$/,
  /^(?:Google|GitHub|Stripe)$/,
  /^URL$/,
  /^ID$/,
  /^Run ID$/,
  /^User Token$/,
  /^Agent Token$/,
  /^Agent Node(?: \/ WebSocket)?$/,
  /^HTTP Endpoint$/,
  /^HTTPS \+ JSON-RPC \+ SSE$/,
  /^A2A\s*\/\s*MCP$/,
  /^HTTP\s*\/\s*MCP\s*\/\s*WS\s*\/\s*Pull$/,
  /^MCP[：:]$/,
  /^Agent Node[：:]runtime_ws\s*\/\s*runtime_pull$/,
  /^zh-CN$/,
  /^en-US$/,
  /^(?:signin|signup)$/,
  /^(?:direct_http|mcp_server|runtime_ws|runtime_pull)(?:\s*[·/]\s*(?:direct_http|mcp_server|runtime_ws|runtime_pull))*$/,
  /^\/[A-Za-z0-9_./:{}?&=*-]+$/,
  /^(?:[a-z][a-z0-9_]*:[a-z0-9_*.-]+)(?:\s*·\s*(?:[a-z][a-z0-9_]*:[a-z0-9_*.-]+))*$/,
  /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/,
  /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/,
  /^[a-z][a-z0-9_-]*\/[a-z0-9_./-]+$/,
];

function walkSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const current = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(current, out);
      continue;
    }
    if (/\.tsx?$/.test(entry.name)) out.push(current);
  }
  return out;
}

function compactText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function hasUserFacingText(value) {
  const text = compactText(value);
  if (!text) return false;
  if (!/[A-Za-z\p{Script=Han}]/u.test(text)) return false;
  return true;
}

function isIgnoredVisibleText(value) {
  return ignoredVisibleText.some((pattern) => pattern.test(value));
}

function isAllowedTechnicalChineseCopy(value) {
  const text = compactText(value);
  return technicalChineseCopy.some((pattern) => pattern.test(text));
}

function isEnglishNaturalLanguage(value) {
  const text = compactText(value);
  if (!text || /[\p{Script=Han}]/u.test(text) || !/[A-Za-z]/.test(text)) return false;
  if (isAllowedTechnicalChineseCopy(text)) return false;
  if (/^(?:https?:\/\/|mailto:)/i.test(text)) return false;
  if (/^[A-Z0-9_./:{}?&=+*'"-]+$/.test(text)) return false;
  return true;
}

function isInsideCodeLikeTag(node, sourceFile) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const tag = (ts.isJsxElement(current)
        ? current.openingElement.tagName
        : current.tagName).getText(sourceFile);
      if (tag === "code" || tag === "pre" || tag === "script" || tag === "style") {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

function localeContext(node, sourceFile) {
  let current = node.parent;
  while (current) {
    if (ts.isConditionalExpression(current)) {
      const condition = current.condition.getText(sourceFile);
      const zhWhenTrue = /locale\s*===\s*["']zh["']|["']zh["']\s*===\s*locale/.test(condition);
      const enWhenTrue = /locale\s*===\s*["']en["']|["']en["']\s*===\s*locale/.test(condition);
      if (zhWhenTrue || enWhenTrue) {
        const start = node.getStart(sourceFile);
        const inTrue = start >= current.whenTrue.getStart(sourceFile) && start < current.whenTrue.end;
        const inFalse = start >= current.whenFalse.getStart(sourceFile) && start < current.whenFalse.end;
        if (inTrue) return zhWhenTrue ? "zh" : "en";
        if (inFalse) return zhWhenTrue ? "en" : "zh";
      }
    }
    if (ts.isIfStatement(current)) {
      const condition = current.expression.getText(sourceFile);
      const zhWhenTrue = /locale\s*===\s*["']zh["']|["']zh["']\s*===\s*locale/.test(condition);
      const enWhenTrue = /locale\s*===\s*["']en["']|["']en["']\s*===\s*locale/.test(condition);
      if (zhWhenTrue || enWhenTrue) {
        const start = node.getStart(sourceFile);
        const inTrue = start >= current.thenStatement.getStart(sourceFile) && start < current.thenStatement.end;
        const inFalse =
          current.elseStatement &&
          start >= current.elseStatement.getStart(sourceFile) &&
          start < current.elseStatement.end;
        if (inTrue) return zhWhenTrue ? "zh" : "en";
        if (inFalse) return zhWhenTrue ? "en" : "zh";
      }
    }
    if (ts.isElementAccessExpression(current) && /\[locale\]/.test(current.getText(sourceFile))) {
      return "localized";
    }
    if (ts.isPropertyAssignment(current)) {
      const name = current.name.getText(sourceFile).replace(/^['"]|['"]$/g, "");
      if (name === "zh" || name === "en") return name;
    }
    current = current.parent;
  }
  return null;
}

function hasLocaleContext(node, sourceFile) {
  return localeContext(node, sourceFile) !== null;
}

function nearestCopyPropertyName(node, sourceFile) {
  let current = node.parent;
  while (current) {
    if (
      ts.isJsxAttribute(current) ||
      ts.isJsxElement(current) ||
      ts.isJsxSelfClosingElement(current) ||
      ts.isJsxExpression(current)
    ) {
      return null;
    }
    if (ts.isPropertyAssignment(current)) {
      const name = current.name.getText(sourceFile).replace(/^['"]|['"]$/g, "");
      if (name !== "zh" && name !== "en") return name;
    }
    if (ts.isSourceFile(current) || ts.isVariableStatement(current)) return null;
    current = current.parent;
  }
  return null;
}

function isVisibleLocalizedString(node, sourceFile) {
  const propertyName = nearestCopyPropertyName(node, sourceFile);
  if (propertyName && visibleCopyPropertyNames.has(propertyName)) return true;

  let current = node.parent;
  while (current) {
    if (ts.isJsxAttribute(current)) {
      return visibleStringAttrs.has(current.name.getText(sourceFile));
    }
    if (ts.isJsxExpression(current)) {
      return !ts.isJsxAttribute(current.parent);
    }
    if (ts.isSourceFile(current)) return false;
    current = current.parent;
  }
  return false;
}

function stringNodeText(node) {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
  }
  return "";
}

function checkEnglishBranches(sourceFilePath, sourceFile, target = failures) {
  function branchContainsChineseOutput(branch) {
    let found = false;
    function inspect(current) {
      if (found) return;
      if (
        (ts.isStringLiteralLike(current) ||
          ts.isNoSubstitutionTemplateLiteral(current) ||
          ts.isTemplateExpression(current)) &&
        /[\p{Script=Han}]/u.test(stringNodeText(current))
      ) {
        const parent = current.parent;
        const isComparisonOperand =
          ts.isBinaryExpression(parent) &&
          [
            ts.SyntaxKind.EqualsEqualsToken,
            ts.SyntaxKind.EqualsEqualsEqualsToken,
            ts.SyntaxKind.ExclamationEqualsToken,
            ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ].includes(parent.operatorToken.kind);
        if (!isComparisonOperand) found = true;
      } else if (ts.isJsxText(current) && /[\p{Script=Han}]/u.test(current.getText(sourceFile))) {
        found = true;
      }
      ts.forEachChild(current, inspect);
    }
    inspect(branch);
    return found;
  }

  function visit(node) {
    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/^['"]|['"]$/g, "");
      if (name === "en") {
        const stack = [node.initializer];
        while (stack.length > 0) {
          const current = stack.pop();
          if (!current) continue;
          if (
            (ts.isStringLiteralLike(current) ||
              ts.isNoSubstitutionTemplateLiteral(current) ||
              ts.isTemplateExpression(current)) &&
            /[\p{Script=Han}]/u.test(stringNodeText(current))
          ) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(current.getStart(sourceFile));
            target.push(`${sourceFilePath}:${line + 1}: English copy branch contains Chinese text`);
          }
          ts.forEachChild(current, (child) => stack.push(child));
        }
      }
    }
    if (ts.isConditionalExpression(node)) {
      const condition = node.condition.getText(sourceFile);
      const enWhenTrue = /locale\s*===\s*["']en["']|["']en["']\s*===\s*locale/.test(condition);
      const zhWhenTrue = /locale\s*===\s*["']zh["']|["']zh["']\s*===\s*locale/.test(condition);
      const englishBranch = enWhenTrue ? node.whenTrue : zhWhenTrue ? node.whenFalse : null;
      if (englishBranch && branchContainsChineseOutput(englishBranch)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(englishBranch.getStart(sourceFile));
        target.push(`${sourceFilePath}:${line + 1}: locale=en branch contains Chinese text`);
      }
    }
    if (ts.isIfStatement(node)) {
      const condition = node.expression.getText(sourceFile);
      const enWhenTrue = /locale\s*===\s*["']en["']|["']en["']\s*===\s*locale/.test(condition);
      const zhWhenTrue = /locale\s*===\s*["']zh["']|["']zh["']\s*===\s*locale/.test(condition);
      const englishBranch = enWhenTrue
        ? node.thenStatement
        : zhWhenTrue
          ? node.elseStatement
          : null;
      if (englishBranch && branchContainsChineseOutput(englishBranch)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(englishBranch.getStart(sourceFile));
        target.push(`${sourceFilePath}:${line + 1}: locale=en branch contains Chinese text`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function checkHardcodedVisibleText(sourceFilePath, sourceFile, target = failures) {
  function report(node, kind, rawText) {
    const text = compactText(rawText);
    if (!hasUserFacingText(text)) return;
    if (isIgnoredVisibleText(text)) return;
    if (isInsideCodeLikeTag(node, sourceFile)) return;
    if (hasLocaleContext(node, sourceFile)) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    target.push(`${sourceFilePath}:${line + 1}: hard-coded visible ${kind} is not locale-gated: "${text}"`);
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      report(node, "JSX text", node.getText(sourceFile));
    }
    if (
      ts.isJsxAttribute(node) &&
      visibleStringAttrs.has(node.name.getText(sourceFile)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      report(node.initializer, `${node.name.getText(sourceFile)} attribute`, node.initializer.text);
    }
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isStringLiteralLike(node.expression) ||
        ts.isNoSubstitutionTemplateLiteral(node.expression) ||
        ts.isTemplateExpression(node.expression))
    ) {
      const parent = node.parent;
      if (
        ts.isJsxAttribute(parent) &&
        !visibleStringAttrs.has(parent.name.getText(sourceFile))
      ) {
        ts.forEachChild(node, visit);
        return;
      }
      const kind = ts.isJsxAttribute(parent)
        ? `${parent.name.getText(sourceFile)} attribute expression`
        : "JSX expression";
      report(node.expression, kind, stringNodeText(node.expression));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function checkChineseBranches(sourceFilePath, sourceFile, target = failures) {
  function visit(node) {
    if (
      (ts.isStringLiteralLike(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateExpression(node)) &&
      localeContext(node, sourceFile) === "zh" &&
      isVisibleLocalizedString(node, sourceFile) &&
      !isInsideCodeLikeTag(node, sourceFile)
    ) {
      const value = stringNodeText(node);
      if (isEnglishNaturalLanguage(value)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        target.push(`${sourceFilePath}:${line + 1}: Chinese copy branch contains English-only visible text: "${compactText(value)}"`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function checkMappedVisibleLabels(sourceFilePath, sourceFile, target = failures) {
  if (/[\\/]lib[\\/]auth\.ts$/.test(sourceFilePath)) return;

  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      mappedVisibleLabelNames.has(node.name.getText(sourceFile).replace(/^['"]|['"]$/g, "")) &&
      (ts.isStringLiteralLike(node.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer) ||
        ts.isTemplateExpression(node.initializer)) &&
      !hasLocaleContext(node.initializer, sourceFile) &&
      isEnglishNaturalLanguage(stringNodeText(node.initializer))
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.initializer.getStart(sourceFile));
      target.push(`${sourceFilePath}:${line + 1}: mapped visible label is not locale-gated: "${compactText(stringNodeText(node.initializer))}"`);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function checkStaticEnglishMetadata(sourceFilePath, sourceFile, target = failures) {
  if (!/[\\/]app[\\/](?:.*[\\/])?(?:page|layout)\.tsx$/.test(sourceFilePath)) return;

  function visit(node) {
    if (!ts.isVariableDeclaration(node) || node.name.getText(sourceFile) !== "metadata" || !node.initializer) {
      ts.forEachChild(node, visit);
      return;
    }

    function inspectMetadata(current) {
      if (ts.isPropertyAssignment(current)) {
        const name = current.name.getText(sourceFile).replace(/^['"]|['"]$/g, "");
        if (
          (name === "title" || name === "description" || name === "default") &&
          ts.isStringLiteralLike(current.initializer) &&
          isEnglishNaturalLanguage(current.initializer.text)
        ) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(current.initializer.getStart(sourceFile));
          target.push(`${sourceFilePath}:${line + 1}: static metadata forces English copy for every locale: "${compactText(current.initializer.text)}"`);
        }
      }
      ts.forEachChild(current, inspectMetadata);
    }

    inspectMetadata(node.initializer);
  }

  visit(sourceFile);
}

function isFeedbackCallExpression(node, sourceFile) {
  if (!ts.isCallExpression(node)) return false;
  return userFeedbackCallees.has(node.expression.getText(sourceFile));
}

function isErrorLikeMessageAccess(node, sourceFile) {
  if (!ts.isPropertyAccessExpression(node)) return false;
  if (node.name.getText(sourceFile) !== "message") return false;
  const owner = node.expression.getText(sourceFile);
  if (/^form\.formState\.errors\b/.test(owner)) return false;
  return /^(err|error|e)$/.test(owner) || owner.endsWith("Error");
}

function containsRawErrorMessage(node, sourceFile) {
  let found = false;

  function visit(current) {
    if (found) return;
    if (
      ts.isCallExpression(current) &&
      current.expression.getText(sourceFile) === "localizedErrorMessage"
    ) {
      return;
    }
    if (isErrorLikeMessageAccess(current, sourceFile)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  }

  visit(node);
  return found;
}

function checkRawErrorFeedback(sourceFilePath, sourceFile, target = failures) {
  function visit(node) {
    if (isFeedbackCallExpression(node, sourceFile)) {
      for (const arg of node.arguments) {
        if (containsRawErrorMessage(arg, sourceFile)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(arg.getStart(sourceFile));
          target.push(`${sourceFilePath}:${line + 1}: user-facing feedback must use localizedErrorMessage instead of raw Error.message`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

export function analyzeSource(sourceFilePath, content) {
  const sourceFailures = [];
  const sourceFile = ts.createSourceFile(
    sourceFilePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    sourceFilePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  checkEnglishBranches(sourceFilePath, sourceFile, sourceFailures);
  checkChineseBranches(sourceFilePath, sourceFile, sourceFailures);
  checkHardcodedVisibleText(sourceFilePath, sourceFile, sourceFailures);
  checkMappedVisibleLabels(sourceFilePath, sourceFile, sourceFailures);
  checkStaticEnglishMetadata(sourceFilePath, sourceFile, sourceFailures);
  checkRawErrorFeedback(sourceFilePath, sourceFile, sourceFailures);
  return sourceFailures;
}

export function runRepositoryChecks() {
  const repositoryFailures = [];

  for (const check of checks) {
    const abs = path.join(root, check.file);
    const content = fs.readFileSync(abs, "utf8");
    const start = content.indexOf(check.start);
    const end = content.indexOf(check.end, start + check.start.length);
    if (start === -1 || end === -1) {
      repositoryFailures.push(`${check.file}: cannot locate zh copy segment`);
      continue;
    }
    const segment = content.slice(start, end);
    for (const term of check.forbidden) {
      if (segment.includes(term)) {
        repositoryFailures.push(`${check.file}: zh copy still contains "${term}"`);
      }
    }
  }

  for (const sourceRoot of sourceRoots) {
    for (const file of walkSourceFiles(path.join(root, sourceRoot))) {
      const relative = path.relative(root, file);
      const content = fs.readFileSync(file, "utf8");
      repositoryFailures.push(...analyzeSource(relative, content));
    }
  }

  return repositoryFailures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  failures.push(...runRepositoryChecks());
  if (failures.length > 0) {
    console.error("frontend i18n copy check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Core Web i18n copy check passed");
}
