# Cleanup Firebase & Update README

Remove all Firebase/Firestore remnants and update README.md to reflect the current REST API architecture.

## Tasks

- [x] 1. Delete `lib/firebase/config.ts`
- [x] 2. Delete `lib/firebase/auth.ts`
- [x] 3. Delete `lib/firebase/firestore.ts` (and the now-empty `lib/firebase/` dir)
- [x] 4. Delete `firestore.rules`
- [x] 5. Rewrite `README.md` to reflect REST API backend, remove all Firebase references

## Review

- Deleted `lib/firebase/` directory (config.ts, auth.ts, firestore.ts) — no code was importing them
- Deleted `firestore.rules` — no longer applicable
- Rewrote `README.md`: removed all Firebase references, updated stack description to REST API + JWT auth, refreshed project structure and feature list

