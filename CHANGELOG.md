# Changelog

All notable changes to OpenLinker Core Web will be documented in this file.

This project is currently pre-1.0. Breaking changes may happen before the Core
API and UI route contracts are declared stable.

## Unreleased

### Added

- Continue exact-version Skill imports into association, explain compatibility
  limits, and verify accepted load receipts for explicitly started Playground runs.
  Idle bindings remain free of polling; trial observation stops after two minutes.

- Independent Skill version and MCP service detail pages with fixed references,
  package downloads, connection configuration, tool schemas and usage guidance.
- Publisher declarations, Skill publication metadata and revision-protected MCP
  owner editing. Authentication refresh preserves unsaved edits and conflicts.
- Provider/capability/tag discovery filters and sorting backed by Core queries,
  with return-navigation state, invalid-input feedback and responsive bilingual UI.
  These resource features require Core schemas 096/097; coordinate rollout with
  Core. Display declarations are unverified and outside bundle SHA-256.


- Add private skill package import, version browsing and runtime Agent bindings,
  with explicit upgrades, load status and actionable validation errors. Requires
  Core schema 093 and a compatible native Codex/Claude Plugin Host.
- Add public capability detail pages with metadata and verified Agent links.

- Added end-to-end User Token management backed by the Core API, including
  listing, creation, one-time plaintext secret display, permission tightening,
  expiry shortening, replacement, and revocation.
- Added fine-grained Agent and Agent Token permission editing for User Tokens.

### Changed

- Completed English and Simplified Chinese copy for User Token management and
  preserved unknown future grants during edits without widening access.

### Documentation

- Split Chinese documentation into dedicated `*.zh-CN.md` files and kept the
  default GitHub-facing documentation English-only.
- Strengthened the README and package metadata for AI agent registry, agent
  marketplace, A2A/MCP playground, runtime gateway, and self-hosted Agent
  discoverability.
- Expanded the README into an English-first open-source entry point with a
  Chinese overview, scope boundaries, quick start, environment guidance, API
  proxy model, development notes, security, and contribution guidance.
- Expanded contributing, security, support, and release documents for public
  self-hosted Core Web use.
- Documented that wallet, Stripe, withdrawals, finance admin, pricing, and
  commercial dashboards are outside the Core Web repository boundary.

### Repository

- Added open-source governance files, issue templates, pull request template,
  and CI workflow.
- Added public package metadata for repository, issues, homepage, keywords,
  and Node.js engine.
- Added Apache-2.0 license, contributing guide, security policy, code of
  conduct, and support guidance.
