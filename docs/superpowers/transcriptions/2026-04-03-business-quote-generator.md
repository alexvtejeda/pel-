# Business Quote Generator & Pricing Config

**Source:** Prompt10.m4a
**Date:** 2026-04-03
**Type:** feature-idea
**Domain:** fullstack

## Category

feature-idea

## Goal

Automate quote generation for pet transport businesses using structured form data instead of LLMs. Businesses configure their pricing, and the system generates professional PDF quotes delivered via chat.

## Context

Pet Pickup (a real pet taxi contacted by the user) currently automates their quoting via a WhatsApp LLM. The LLM asks questions, calculates km, and generates a quote. However, the LLM hallucinates locations and each new client must manually feed it info. Pelú can do this better with structured data: the member's form submission already contains all needed info (pet, locations, trip type, date/time), and the business's pricing config provides the rates. No LLM or chatbot needed — just math.

## Requirements

### Business pricing configuration (dashboard settings)
- Per-kilometer rate (base price)
- Different rates for different city zones (e.g., same city vs. inter-city)
- Time-based surcharges (e.g., after-hours premium — Pet Pickup charges extra for 4 PM trips)
- Trip type pricing (one-way vs. round-trip may have different base rates; Pet Pickup charges 1,500 pesos for round-trip)
- Backend: store pricing config per business (new table or fields on businesses table)

### Quote generation
- Automatically calculate from: distance (km) x per-km rate + surcharges + trip type adjustments
- Include estimated trip duration (need distance/time calculation — ties into maps)
- Generate a professional PDF quote (JavaScript PDF library)
- Quote includes: unitary prices, trip type, estimated time, extra costs, business terms & conditions
- User has an example quote from Pet Pickup that will be provided as a reference

### Quote delivery
- Send the generated PDF quote directly in the chat between member and business
- Alternative: email delivery (lower priority, chat is preferred)

### Business terms & conditions
- Each business can add their own terms & conditions for their services
- Displayed on the quote and possibly in the business profile
- Separate from Pelú's own platform T&C
- New field in business dashboard settings

## Dependencies

- Direct member-to-business transport requests (brief #2) — quote is generated in response to a transport request
- Chat system — quote PDF is delivered via chat

## Raw Excerpt

> "I want to create a small quote generator... basically they charge per kilometer and if it's a different city then they charge differently... the idea would be to let them store those prices so we can grab that data and immediately generate the quote for the user... it might be much more professional sending PDFs to users immediately with their quotes ready... each business has their own policies and I don't want to enforce them my own policies."
