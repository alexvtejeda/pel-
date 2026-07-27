# Fix static-export serve + workspace root warning

## Context
`next.config.js` uses `output: 'export'` + `distDir: 'out'` (required for the Electron
build). `next start` is unsupported with static export, so `bun run start` has always
failed with "Could not find a production build in the 'out' directory".

## Tasks
- [x] 1. `package.json`: change `"start"` from `next start` to a static file server on :3000
- [x] 2. `next.config.js`: add `outputFileTracingRoot: __dirname` to silence the
       multiple-lockfile workspace-root warning (a stray `/home/noob_master/package-lock.json`
       outranks `frontend/bun.lock`)
- [x] 3. Verify build, serve, routes, and warning removal

## Review

### Summary
`bun run start` now serves the static export instead of calling the unsupported
`next start`. The workspace-root warning is gone.

### Changes
- `package.json` — `"start": "next start"` → `"start": "serve out -l 3000"`
- `package.json` — added `serve@^14.2.6` to devDependencies (+ `bun.lock`)
- `next.config.js` — added `outputFileTracingRoot: __dirname` (3 lines incl. comment)

### Key decision: devDependency instead of `bunx`
First attempt used `bunx serve out -l 3000`. It failed — `bunx` prefers an existing
PATH binary over the npm package, and a **different** `serve` (a Python/conda CLI)
shadows it on this machine:

    Usage: serve [OPTIONS] COMMAND [ARGS]...
    Error: No such command 'out'.

Installing `serve` as a devDependency makes `bun run start` resolve
`node_modules/.bin/serve` first, sidestepping the shadow and removing a
network fetch at demo time.

### Verified
- `bun run build` exits 0; workspace-root warning: **0 occurrences**
  (only a pre-existing unrelated `metadataBase` notice remains)
- `/transporte/negocios` is in the route table and exports to `out/transporte/negocios.html`
- `/auth/onboarding/[role]` (only dynamic route, has `generateStaticParams`)
  exports all 3 roles
- Served `out/` via the local `serve` binary: `/`, `/transporte`, `/transporte/negocios`,
  `/pets`, `/auth/onboarding/business`, `/about` all return 200 with clean-URL rewrites
- Not directly exercised: `bun run start` on port 3000 itself, since the dev server
  holds that port. Tested the identical command on :3999.

### Gotcha discovered: `dev` and `build` share `out/`
`distDir: 'out'` applies to `next dev` too, so `bun run build` and `bun run dev`
write to the same directory. The dev server died mid-session while builds and a
`bun add` ran alongside it. Don't run `build`/`start` and `dev` at the same time —
for a demo, stop `dev` first, then `bun run build && bun run start`.
