# Adoption Flow Completion — Transport Integration

**Source:** Prompt7.m4a
**Date:** 2026-03-24
**Type:** idea-dump

## Goal

Finish the adoption flow by connecting adopters who don't have a car with pet transport services, enabling end-to-end adoption from discovery to delivery.

## Context

The adoption flow currently covers: pet discovery → form submission → rescue center review → approve → chat. But after approval, if the adopter has no car, there's no way to connect them with transport. The map UI exists in the frontend but isn't functional. The backend transport system is written (WebSocket events for location tracking, trip status, stop completion). A pet transport ID is needed for route calculation but doesn't exist yet on the frontend.

## Requirements

- Connect the adoption chat flow to transport service request
- Decide on discovery method: do users find transport via the `/services` route, or via an in-chat "request transport" action after form approval?
- Pet transport ID generation/assignment for route calculation
- Make the existing map UI functional (connect to backend transport WebSocket events)
- Handle the simple case: adopter has a car → just coordinate pickup date via chat (no transport needed)
- Handle the transport case: adopter needs transport → match with available transport business → calculate route → track delivery

## Dependencies

- Transport backend (WebSocket events: `location_update`, `trip_status_update`, `stop_completed` — already implemented)
- Services route (brief #1) — if discovery happens there
- Business dashboard (brief #2) — transport businesses need to see and accept requests
- Chat system — transport request initiated from chat

## Raw Excerpt

> "What we need to finish this flow of adoption includes connecting pet owners with transport services... if the user has a car the flow ends right there, we just let the rescue center and the user communicate a date on which they can look for the pet... but if they don't have a car and they want our services as transportation then we let the users see which services are available, but to also calculate the route we need a pet transport ID."
