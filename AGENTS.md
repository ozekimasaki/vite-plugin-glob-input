# AGENTS.md

Guidance for coding agents working in the **vite-plugin-glob-input** repository.

## Overview

This repository is a small, single-purpose Vite plugin that adds files matched by [fast-glob](https://github.com/mrmlnc/fast-glob) patterns to `build.rollupOptions.input`. It is written in TypeScript, ships as ESM only, and is published to npm as `vite-plugin-glob-input`.

## Project Structure

- `src/index.ts` — the entire plugin. Contains the public `VitePluginGlobInputOptions` interface, the default export `vitePluginGlobInput` (the Vite plugin factory), the `DEFAULT_OPTIONS` constant, and the `convertFilesToInput` alias-generation helper. This is the only source file and the sole entry point (`main`/`types` point at the compiled `dist/index.js` / `dist/index.d.ts`).
- `__tests__/build.test.ts` — integration tests that run real `vite` builds with the plugin and assert on the generated output files.
- `__tests__/src/` — sample HTML fixtures (root/index/non-index/subdir/ignore files) used by the tests.
- `dist/` — compiled output produced by the build. Generated; gitignored; never edit by hand.
- `package.json` — package metadata, dependencies, and npm scripts.
- `tsconfig.json` — TypeScript compiler configuration (ES2022, `strict`, `verbatimModuleSyntax`, emits declarations + source maps to `dist/`).
- `vitest.config.ts` — Vitest configuration using a `projects` array (single `unit` project) and V8 coverage.
- `pnpm-lock.yaml` — pnpm lockfile. This project uses **pnpm**.
- `.cursor/rules/` — supplementary editor guidance (may be partially out of date; prefer this file, `package.json`, and the source as the source of truth).

## Setup

Use pnpm (a `pnpm-lock.yaml` is committed):

```bash
pnpm install
```

Node.js 20+ is required (see the changelog / compatibility section in `README.md`).

> Note: the plugin's build/test path depends on native Rolldown bindings (via Vite 8). If a run fails with "Cannot find native binding" (`@rolldown/binding-*`), reinstall dependencies (e.g. `pnpm install --force`) so the platform-specific optional dependency is fetched.

## Commands

All scripts are defined in `package.json` and can be run with `pnpm run <script>` (or the `npm run` equivalents shown in `README.md`):

- **Build**: `pnpm run build` — runs `clean` then `tsc -p .`, emitting `dist/`. (`pnpm run clean` and `pnpm run tsc` are the individual steps.)
- **Type check**: `pnpm run type-check` — `tsc --noEmit -p .`.
- **Test**: `pnpm test` — `vitest run` (single, non-watch run).
- **Test (coverage)**: `pnpm run coverage` — `vitest run --coverage` (V8 provider).
- **Test (watch)**: `npx vitest` — Vitest watches by default when a TTY is attached (there is no dedicated `test:watch` script).

There is **no lint script or linter configured** in this repository — do not invent a `lint` command. Use `pnpm run type-check` as the static-analysis gate. Before finishing a change, run `pnpm run type-check` and `pnpm test`.

## Coding Conventions

- **Language**: TypeScript with `strict` mode. `noUnusedLocals` and `noUnusedParameters` are on, so remove unused bindings.
- **Modules**: ESM only (`"type": "module"`). `verbatimModuleSyntax` is enabled — use `import type` / `export type` for type-only imports/exports, and use explicit `.js` extensions in relative imports where the existing code does (e.g. tests import from `../src/index.js`).
- **Comments/docstrings**: existing source comments and JSDoc are written in **Japanese**; match the surrounding style when editing `src/`.
- **Tests**: test descriptions are written in **Japanese**. Follow the existing pattern in `__tests__/build.test.ts` — build with `vite`'s `build()` against fixtures in `__tests__/src/` and assert on emitted files. Add HTML fixtures under `__tests__/src/` when a new case needs them.
- **Public API**: the default export and `VitePluginGlobInputOptions` are the public surface. Keep the deprecated `UserSettings` type alias exported for backwards compatibility. If you change options or defaults (`DEFAULT_OPTIONS`), update `README.md` (options table and naming-convention table) to match.
- **Plugin behavior**: the plugin uses `enforce: 'pre'` and `apply: 'build'`, and does its work in Rollup's `options` hook (matched files are merged into `rollupOptions.input`). Preserve this behavior unless a change explicitly requires otherwise.

## Notes for Agents

- Keep changes minimal and focused; this is a tiny codebase with a single source file.
- Do not edit generated files in `dist/` — change `src/` and rebuild.
- There are no pre-commit hooks or CI lint gates configured; the effective quality gates are `pnpm run type-check` and `pnpm test`.
- Keep `README.md` in sync with any user-facing option, default, or command changes.
