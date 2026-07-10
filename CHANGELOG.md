# Changelog

All notable changes to OpenLinker Core Web will be documented in this file.

This project is currently pre-1.0. Breaking changes may happen before the Core
API and UI route contracts are declared stable.

## Unreleased

### Added

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
