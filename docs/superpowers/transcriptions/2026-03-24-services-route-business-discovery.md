# Services Route & Business Discovery

**Source:** Prompt7.m4a
**Date:** 2026-03-24
**Type:** idea-dump

## Goal

Create a new public route that displays registered businesses and service-offering members so users can discover available pet services (transport, grooming, walking, etc.).

## Context

Pelú currently has two main public routes in the header: `/pets` (pet discovery grid) and `/about` (landing page). Businesses and members offering services have no visibility to users yet. The backend already has business and member roles wired, but the frontend has no route or UI for discovering them.

## Requirements

- New route (e.g., `/services` or `/businesses`) accessible to all users — authenticated or not, any role
- Add link to the site header alongside `/pets` and `/about`
- Display registered businesses (e.g., pet transport services like "PetTaxi RD")
- Display members offering services (e.g., grooming, dog walking)
- Each listing should show what the business/member offers
- Route should be intuitive and descriptive for end users

## Dependencies

- Backend API endpoints for listing businesses and their services (verify if these exist)
- Business onboarding wizard (already specced in `docs/superpowers/specs/2026-03-11-business-wizard.md`)

## Raw Excerpt

> "We would add a third link in the header that says /services or /something that is intuitive, that is descriptive for the users, and then if we click that route then we can immediately see the businesses that are registered with us, we can see the members that are registered with us that are offering grooming services or probably even walking your pet."
