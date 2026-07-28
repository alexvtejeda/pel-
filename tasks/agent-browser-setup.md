# Agent Browser Environment for pelurd.com

Goal: let Claude (and subagents like Fable) drive the **production** site at
`https://pelurd.com` — including logged-in areas — without a human babysitting
every step.

---

## Why it failed before (root causes, verified)

**1. The browser has no memory. Every session starts logged out.**
The Playwright MCP server is launched as bare `npx @playwright/mcp@latest`
(`~/.claude/plugins/cache/claude-plugins-official/playwright/*/.mcp.json`).
Per `--user-data-dir` docs: *"If not specified, a temporary directory will be
created."* So cookies die with the session. There is no mechanism by which a
login could ever persist — the agent must re-authenticate from scratch, every
single time.

**2. MFA is mandatory for exactly the roles worth auditing.**
`api/internal/auth/handler.go:105-107`:
```go
roleRequiresMFA := u.Role != nil &&
    (*u.Role == "rescue_center" || *u.Role == "business") &&
    u.AuthProvider != "google"
isAdmin := IsAdminUserID(h.cfg, u.ID)
```
- Not enrolled → token carries `mfa_setup_required`, and
  `mfa_middleware.go:21` blocks **everything** except `/auth/mfa/*` and
  `/auth/me`.
- Enrolled → login returns an MFA challenge needing a live TOTP code.

So an agent holding only email + password **cannot** reach the RC, business, or
admin dashboards. It gets a token that is refused everywhere. `member` role has
no MFA requirement — that one logs in with just a password.

**3. Stale permission allowlist → a prompt on every click.**
`.claude/settings.local.json` allows `mcp__playwright__browser_*`, but the
enabled plugin actually exposes `mcp__plugin_playwright_playwright__browser_*`.
None of the existing allow-rules match, so every navigate/click/screenshot
stops for approval. An agent stalling on permission prompts looks exactly like
an agent that "couldn't log in."

**Not the problem:** the API. Verified live — `https://api.pelurd.com` returns
`access-control-allow-origin: https://pelurd.com` +
`access-control-allow-credentials: true`, and cookies are `SameSite=Lax` on a
shared parent domain, so `pelurd.com → api.pelurd.com` is same-site and the
browser will send them correctly.

---

## Decisions taken

- **MFA:** member-role only. No TOTP secret stored on disk.
- **Accounts:** new dedicated agent accounts, not personal ones.
- **Prod access:** full — writes permitted.

---

## Plan

### 1. Persistent browser profile  ← the main fix
- [x] Created `frontend/.mcp.json` (Claude Code's real format,
      `{"mcpServers": {...}}`) launching Playwright MCP with
      `--user-data-dir=/home/noob_master/.pelu-agent/browser-profile`,
      `--viewport-size=1440x900`, and screenshots to `.playwright-mcp/`.
- [ ] **USER:** disable the official `playwright` plugin in
      `~/.claude/settings.json` so there aren't two duplicate browser servers.
      (Blocked for me — the auto-mode classifier guards Claude's own settings.)
- [x] Confirmed `frontend/mcp.json` is **dead config** — it uses the VS Code
      shape (`{"mcp": {"servers": ...}}`), which Claude Code never reads.
      Context7 actually resolves from `~/.claude.json`, so this file does
      nothing. Left in place; safe to delete.

### 2. Dedicated agent account
- [x] Registered `claude-agent@pelurd.com` on prod, role set to `member`.
      Verified via `/auth/me`: `role: member`, `mfa_setup_required: false`,
      `is_admin: false`.
- [x] Credentials at `~/.pelu-agent/credentials.json`, mode 600, **outside the
      repo** so they can never be committed.

### 3. Seed the profile for MFA-gated roles (one-time, human)
- [ ] **USER:** after restart, log in once as admin / RC in the persistent
      profile. That single manual login keeps those dashboards reachable for
      every future session — no stored secret needed.

### 4. Fix the permission allowlist
- [ ] **USER:** replace the five stale `mcp__playwright__browser_*` entries in
      `frontend/.claude/settings.local.json` with a server-wide
      `mcp__playwright`, plus a `deny` on `browser_run_code_unsafe`.
      (Also blocked by the classifier.)

### 5. Project skill
- [x] Wrote `.claude/skills/drive-pelurd/SKILL.md` — account per role, the MFA
      constraint with source citation, profile-lock gotcha, Cloudflare 502
      retry, design-audit conventions, prod-is-real warning.

---

## Update: switched to native Windows Chrome (CDP)

Replaced the WSL chromium + `--user-data-dir` approach with an attach-over-CDP
setup against real Windows Chrome.

- [x] `frontend/.mcp.json` now uses `--cdp-endpoint=http://localhost:9222`
      instead of launching its own browser.
- [x] `~/.pelu-agent/start-browser.sh` — idempotent launcher for the dedicated
      Chrome instance. Both branches tested: "already up" short-circuits, and
      cold start reaches CDP in a few seconds.
- [x] Dedicated Windows profile `C:\Users\AlexTejeda-Pentraze\.pelu-agent-chrome`,
      separate from everyday Chrome. Agent can't reach personal sessions; normal
      browsing is never interrupted.
- [x] Skill updated: launcher as step one, CDP troubleshooting, font-fidelity note.
- [ ] **USER:** log into pelurd.com once in that Chrome window (admin too, if you
      want the approvals/service-provider work auditable).

**Why this is the better setup:** WSL chromium rasterizes text via
fontconfig/FreeType; Windows Chrome uses DirectWrite. For *design* auditing
that difference is the whole point — screenshots now match what real users see.

**What made it painless:** `networkingMode=mirrored` was already in
`.wslconfig`, so WSL `localhost` reaches Windows `localhost` directly. Under
default NAT networking this would have needed a socat/netsh forwarding proxy.

**Tradeoff accepted:** Chrome must be running before browser tools work. The
launcher makes this self-healing rather than a manual prerequisite — the skill
instructs running it first, so a fresh boot costs one command, not a failure.

**Note:** `powershell.exe` / `cmd.exe` are not on `PATH` in this WSL setup.
Windows binaries must be invoked by absolute path (e.g.
`/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`).

---

## Review

**What was actually broken.** Three independent things, none of them the API:

1. *No persistent profile.* Playwright MCP ran as bare
   `npx @playwright/mcp@latest`; with no `--user-data-dir` it creates a
   throwaway temp profile. Cookies died with every session, so no login could
   ever persist. This was the big one.
2. *MFA gates the interesting roles.* `handler.go:105` forces MFA on
   `rescue_center`, `business`, and admin. Without a TOTP code an agent gets a
   token that `mfa_middleware.go:21` refuses everywhere except `/auth/mfa/*`.
   Since the recent work (admin approvals, service providers) lives behind
   exactly those roles, this is likely what stopped Fable.
3. *Stale permission rules.* The allowlist named `mcp__playwright__*` while the
   enabled plugin exposed `mcp__plugin_playwright_playwright__*`. Every click
   prompted — indistinguishable, from the outside, from a stuck agent.

**Verified not broken:** the API. `api.pelurd.com` returns
`access-control-allow-origin: https://pelurd.com` with
`access-control-allow-credentials: true`; cookies are `SameSite=Lax` with
`Domain=pelurd.com`, so `pelurd.com → api.pelurd.com` is same-site and cookies
flow normally. The https split was never the obstacle it appeared to be.

**Tension worth naming.** "Member-only" was chosen for MFA, but the features
most in need of a design audit are admin/RC-gated. The persistent profile
resolves this: one manual admin login, reusable indefinitely, no secret at
rest. Both paths are wired.

**Prod writes are enabled.** Full access was chosen, so agent actions hit the
live database for real. The skill states this and asks that writes be reported.
