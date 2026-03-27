# Passkeys Support

**Source:** Prompt8.m4a
**Date:** 2026-03-27
**Type:** feature-idea
**Domain:** fullstack

## Category

feature-idea

## Goal

Enable passkey generation and authentication so users can log in with biometrics (Face ID, fingerprint) on supported devices.

## Context

MFA (email codes) works correctly. Google OAuth was fixed during this session. Passkey generation is the remaining auth feature that doesn't work. The user now has access to a phone with biometric capability to test passkeys. Not needed for the 2026-03-28 demo — nice-to-have for later.

## Requirements

- Investigate why passkey generation is failing
- Implement WebAuthn registration flow (create credentials)
- Implement WebAuthn authentication flow (verify credentials)
- Test on mobile Safari with biometrics

## Raw Excerpt

> "The only thing that does not work is the generation of passkeys... we could look into that since now I can access it with my phone that has the capability to build passkeys... it's not a priority right now, it's not something we need for the demo, but it would be nice to have."
