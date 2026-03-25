# Marketplace Vision (Post-MVP)

**Source:** Prompt7.m4a
**Date:** 2026-03-24
**Type:** idea-dump

## Goal

Expand Pelu beyond adoption into a pet ecosystem marketplace where members, businesses, and vets interact around pet ownership.

## Context

The MVP is focused purely on adoption. But the user envisions Pelu evolving into a marketplace. These ideas are explicitly post-MVP but inform current architecture decisions (e.g., member pet profiles should be designed with marketplace in mind even if only adoption ships first).

## Requirements

- **Member pet profiles** — members upload their own pets (not for adoption) so they have a presence in the ecosystem
  - Vets and businesses can see/target pet owners
  - Enables grooming, walking, and other service discovery
- **Vaccination reminders** — notify members when pets need vaccines, suggest nearby vets they've visited before
- **Service targeting** — businesses and vets can reach pet owners with relevant services
- **Not MVP** — these features should not block the Friday demo or thesis deadline, but architecture should not prevent them

## Dependencies

- `user_pets` table (already specced in `docs/superpowers/specs/2026-03-11-backend-deltas.md`)
- Member onboarding wizard (specced in `docs/superpowers/specs/2026-03-11-member-wizard.md`)
- Services route (brief #1)

## Raw Excerpt

> "What if we let members build their pets not with the intent of putting them into adoption but to give users the option to upload their pets so vets can see them, or even businesses that offer transportation or grooming services so they can target those people... and what if we send them reminders that you need to vaccinate your pet, please visit your nearest vet."
