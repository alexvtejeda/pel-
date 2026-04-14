# Direct Member-to-Business Transport Requests

**Source:** Prompt10.m4a
**Date:** 2026-04-03
**Type:** feature-idea
**Domain:** fullstack

## Category

feature-idea

## Goal

Allow members to request pet transportation directly from businesses, bypassing the current rescue-center-mediated flow. This is the core connection between members and pet transport businesses.

## Context

Currently, businesses only receive transport requests through rescue centers (when a pet is adopted and needs transport). There is no way for a regular member to directly request a pet taxi service. The real-world flow (based on Pet Pickup's WhatsApp LLM workflow) asks for: user name, pet name/info, pickup address, dropoff address, trip type, and date/time. Pelú should automate this with structured forms using existing pet data.

## Requirements

- Members select one of their registered pets for the transport request
- Two trip types: **one-way** (start → end) and **round-trip** (start → end → start, or start → end → custom return)
- Members specify: pickup location, dropoff location, date, and time
- Behind the scenes: calculate distance in kilometers between locations (needed for quote generation)
- Transport request is sent directly to the business
- Business receives the request in their dashboard (existing transport request infrastructure may be reusable)
- Backend: new endpoints or extension of existing transport system to support member-initiated requests (currently only RC-initiated)
- The member-to-business connection is the priority — Pelú acts as the digital middleman

## Dependencies

- Member Pet Profiles (brief #1) — members need registered pets to select from
- Business quote generator (brief #3) — once a request is submitted, the business generates a quote

## Raw Excerpt

> "I want a way to directly connect the user to the business, that's the main thing... the user would need to say okay I want it at this location, this is the starting location, this is the end location, and this is the pet they select... if it's a back-and-forth trip or a simple trip and also the time and date which they need that transportation... we are the man in the middle in the whole operation digitally."
