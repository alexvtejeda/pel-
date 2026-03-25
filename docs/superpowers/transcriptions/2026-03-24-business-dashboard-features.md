# Business Dashboard Features

**Source:** Prompt7.m4a
**Date:** 2026-03-24
**Type:** idea-dump

## Goal

Define what features the business dashboard should include, and decide on a fee/commission model for business services.

## Context

Rescue centers already have a full dashboard with tabs (pets, forms, interested applicants, settings). Businesses need their own dashboard but the feature set is unclear because no real business has been consulted yet. The user plans to validate with an actual business partner after Friday's RC meeting.

## Requirements

- **Chat system** — businesses need to communicate with members/rescue centers requesting services
- **Interested/requests tab** — similar to rescue center's "Interesados" tab, showing incoming service requests
- **Service history** — log of past services completed
- **Fee/billing system** — businesses set their service price; Pelu takes a commission. Two models under consideration:
  - **Markup model**: business charges 100 pesos, user pays 120 (Pelu adds 20% on top)
  - **Split model**: business charges 100 pesos, user pays 100, but 80 goes to business and 20 to Pelu
  - Decision needed on which model to use (reference: how Uber/delivery platforms handle this)
- **Key blocker**: no business validation yet — features are speculative until a real business provides input

## Dependencies

- Business role and registration flow (backend exists)
- Business onboarding wizard spec (`docs/superpowers/specs/2026-03-11-business-wizard.md`)
- Chat system (partially built)
- Business validation meeting (not yet scheduled)

## Raw Excerpt

> "I want to give them a dashboard but I don't know what to include there. I know a chat system is necessary, I know an interested tab similar to the one we have at the rescue center dashboard is necessary as well, but I don't know if we need to include a history of services, a billing creator or a billing calculator... I am blindly implementing features but I'm not really sure on what they actually need."
