# Hosting Strategy for Friday Demo

**Source:** Prompt7.m4a
**Date:** 2026-03-24
**Type:** idea-dump

## Goal

Make the Pelu app accessible via a public URL for the Friday rescue center demo, using a professional-looking setup.

## Context

The user has a meeting with a rescue center on Friday 2026-03-28 at 8 PM to demo the app and validate the UX. The audience is non-technical, so the setup must look professional — no ngrok warning pages, no random subdomains. The user already owns a domain name (used with Resend for email) and has a machine that can host the server.

## Requirements

- **Cloudflare Tunnel** (preferred): free, uses existing domain, no warnings, no token-heavy URLs
  - Expose localhost (Next.js on :3000, API on :8080) through the tunnel
  - Map to the owned domain name
- **Alternatives considered and rejected**:
  - ngrok: shows warnings/friction for non-technical users (paid option removes warnings but unnecessary cost)
  - Vercel: used before with Firebase but current Go backend makes it less straightforward
- Setup should be temporary (1-2 hours for the demo) but reusable for future demos
- Will be reused for a potential business partner demo later

## Dependencies

- Cloudflare account with domain configured
- Local machine running both Next.js dev server and Go backend
- SSL certificate handled by Cloudflare

## Raw Excerpt

> "Cloudflare tunnel is precisely what I want, it's free and I think we already have the domain name... the idea would be to make this localhost public through Cloudflare tunnel so we can share it as an MVP. Since I'm going to share it with someone that is not technical, the idea would be to avoid the warnings that ngrok displays."
