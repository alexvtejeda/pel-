# Events System (RC Agenda + Public /eventos Route)

**Source:** Prompt9.m4a
**Date:** 2026-03-27
**Type:** feature-idea
**Domain:** frontend + backend

## Category

feature-idea

## Goal

Allow rescue centers to create events from their dashboard's Agenda tab, and display those events on a new public `/eventos` route with attendance tracking.

## Context

The Agenda tab in the RC dashboard is currently non-functional — it was originally intended only for transport scheduling. The rescue center needs a way to create and promote adoption events. A public events page would also help attract potential adopters and new users to the platform.

## Requirements

### Backend
- New `events` table with fields: title, description, date, time, location, photo (optional), rescue_center_id
- CRUD API endpoints for events (only rescue_centers can create/edit/delete)
- Attendance tracking: users can mark "I'm going" (new table or counter)
- Photo upload endpoint for event images

### Frontend — RC Dashboard (Agenda Tab)
- "Add Event" button (similar to "Add Pet" button in Pets tab)
- Modal with fields: title, short description, date, time, location, optional photo upload
- Display created events in the Agenda tab

### Frontend — Public `/eventos` Route
- New page added to the header navigation
- Display upcoming events from all rescue centers
- Each event card shows: photo (large), title, description, date/time, location
- "I'm going" attendance button showing count of attendees
- Empty state: "There are no events yet. Stay tuned for future events."

## Dependencies

- Backend: new tables and API endpoints must be created first
- Photo upload can reuse existing multipart upload patterns

## Raw Excerpt

> "The idea would be in the agenda tab of the rescue centers, we could let them create events. And that's another whole spec because we need to create an event route that is dedicated to show the coming events from the rescue centers. [...] We ask for the date, the time, the location, an optional photo. And of course, a short description of the event, a title for the event. [...] I would like to see a button that displays the amount of people that are going to go. That's something that will help us connect with potential adopters and potential users for the application."
