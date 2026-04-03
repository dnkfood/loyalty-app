# ADR 001: Monorepo Structure with Turborepo

**Date:** 2026-04-03  
**Status:** Accepted

---

## Context

The loyalty app consists of three distinct applications:
1. **Mobile** — React Native (Expo) app for end users
2. **BFF** — NestJS Backend for Frontend
3. **Admin** — React (Vite) admin panel for staff

These apps share TypeScript types (API contracts, entity interfaces) and utility functions (phone masking, HMAC verification). Without a monorepo, shared code would require either duplication or a separate published npm package with a manual release cycle.

---

## Decision

Use a **pnpm workspace monorepo** managed by **Turborepo**.

```
loyalty-app/
├── apps/
│   ├── mobile/      (Expo SDK 51)
│   ├── bff/         (NestJS)
│   └── admin/       (React + Vite)
├── packages/
│   ├── shared-types/    (@loyalty/shared-types)
│   ├── shared-utils/    (@loyalty/shared-utils)
│   └── eslint-config/   (@loyalty/eslint-config)
└── infrastructure/
```

### Package manager: pnpm

pnpm is chosen over npm/yarn because:
- Strict dependency hoisting avoids phantom dependencies
- Workspace protocol (`workspace:*`) makes cross-package references explicit
- Significantly faster installation via content-addressable storage

### Build orchestrator: Turborepo

Turborepo provides:
- Incremental builds with local and remote caching
- Parallel execution of independent tasks
- Pipeline definition (`turbo.json`) enforcing correct build order
- Simple `turbo run build/test/lint` commands at root

---

## Alternatives Considered

### 1. Separate repositories

**Rejected because:**
- Shared types must be versioned and published to a registry — added overhead
- PRs that span multiple repos (e.g., add a new API field) become multi-repo PRs, harder to review atomically
- No unified CI pipeline

### 2. Nx

**Considered but not chosen:**
- More powerful (affected commands, distributed task execution) but significantly more complex configuration
- Turborepo is sufficient for this project size and easier to onboard new developers

### 3. npm workspaces with Lerna

**Rejected because:**
- Lerna adds complexity without significant benefit over Turborepo + pnpm
- pnpm's built-in workspace support covers the package management needs

---

## Consequences

### Positive
- Single `pnpm install` at root installs all dependencies
- Type changes in `shared-types` are immediately reflected in all apps (no publish step)
- `pnpm dev` starts all services in parallel via Turborepo
- Single ESLint/Prettier/TypeScript config managed in shared packages
- Unified CI pipeline: one workflow handles testing all packages

### Negative
- All developers must have pnpm installed (not npm or yarn)
- Turborepo remote cache requires configuration for CI (can use Vercel Remote Cache or self-hosted)
- Monorepo PRs can touch many packages — reviewers must be aware of cross-package impacts

---

## Implementation Notes

- `turbo.json` defines the pipeline: `build` depends on `^build` (upstream packages first)
- `packages/shared-types` has no dependencies — pure TypeScript types
- `packages/shared-utils` depends only on Node built-ins (`crypto`)
- Each app has its own `.env.example` but shares the root `.gitignore`
