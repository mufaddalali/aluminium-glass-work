---
name: authentication
description: JWT auth, session lifecycle, protected routes, and RBAC permission gating. Use when adding login, refresh tokens, route guards, roles, or feature permissions.
---

# Authentication & Permissions Skill

## Purpose
Secure the admin app with JWT access/refresh against the remote API.

## Session model (direct API)
- **API**: `NEXT_PUBLIC_API_BASE_URL` (e.g. staging) — no Next proxy / BFF.
- **accessToken**: Zustand memory only (not persisted). Sent as `Authorization: Bearer`.
- **refreshToken**: returned in JSON; kept in Zustand persist so reload can call `/auth/refresh` with `{ refreshToken }`.
- **status**: `bootstrapping` → `authenticated` | `unauthenticated`.
- **bf_session**: small non-secret cookie for Next middleware routing only.
- On load: wait for persist hydration → single-flight `/auth/refresh` if needed.
- Axios holds non-auth requests while `status === "bootstrapping"` (`waitForAuthReady`) so reload never races ahead of refresh.
- On 401: same single-flight refresh, then retry.
- Authenticated queries use `selectIsAuthenticated` (live access token), not a stale flag.
- Dashboard `AppShell` mounts only after `selectIsAuthReady`.

## Layout
```text
src/features/auth/
  store/auth-store.ts
  lib/apply-session.ts
  lib/refresh-access-token.ts
  lib/token-storage.ts          # bf_session hint only
  lib/session-response.ts
  components/auth-session-bootstrap.tsx
  services/auth.service.ts
```

## Rules
- Components → hooks → services → axios.
- Never persist `accessToken`.
- Gate company queries on `selectIsAuthenticated`.
- After logout: `clearSession()` + `queryClient.clear()`.
- Copy from `messages.auth.*` only.
