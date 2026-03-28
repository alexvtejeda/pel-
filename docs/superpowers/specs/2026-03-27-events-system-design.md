# Events System — Design Spec

**Date:** 2026-03-27
**Brief:** docs/superpowers/transcriptions/2026-03-27-events-system.md

## Goal

Allow rescue centers to create public events from their dashboard's Agenda tab, and display those events on a new public `/eventos` route with an alternating zigzag layout and attendance tracking.

## Overview

Two frontend surfaces + backend API:

1. **RC Dashboard (Agenda tab)** — "Create Event" button + modal, events appear in existing calendar
2. **Public `/eventos` route** — new page with zigzag layout (inspired by shadcnblocks/about28), added to header nav
3. **Backend** — new `events` table, CRUD endpoints, attendance tracking, photo upload

---

## 1. RC Dashboard — Agenda Tab Changes

### Current State

The Agenda tab (`components/dashboard/rescue-center/agenda-tab.tsx`) has a working calendar UI with `AgendaItem` type (`meeting`, `transport`, `followup`). Currently shows empty state because no items exist.

### Changes

**Add "Create Event" button** in the Agenda tab header — same pattern as "Agregar mascota" in Pets tab:
- `Button` with `faPlus` icon + "Crear evento"
- Opens an `AddEventModal`

**New `AgendaItem` type: `event`** — RC-created public events show in the calendar alongside future adoption events. Add `'event'` to the existing type union with a new color badge.

**`AddEventModal` component** (`components/dashboard/rescue-center/add-event-modal.tsx`):
- Same Framer Motion animated modal pattern as `AddPetModal`
- Fields:
  - Title (required, text input)
  - Short description (required, textarea)
  - Date (required, date picker)
  - Time (required, time input)
  - Location (required, text input — free text address)
  - Photo (optional, single image upload — same drag-and-drop pattern as pet photos but max 1 image)
- Preview panel (desktop): shows a card preview of how the event will look on `/eventos`
- Submit calls `POST /api/v1/events` → on success, the event appears in the Agenda calendar

### Existing Agenda Functionality

The current `AgendaItem` types (`meeting`, `transport`, `followup`) and calendar UI stay as-is. RC-created events are added as a new type alongside them.

---

## 2. Public `/eventos` Route

### Page Structure

**Header:** Reuse `PetsHeader` (same as `/pets`, `/aliados`, `/about`).

**Hero section:** Simple title + subtitle centered at top:
- Title: "Eventos"
- Subtitle: "Descubre los próximos eventos de adopción y rescate"

**Events list:** Alternating zigzag layout (inspired by shadcnblocks about28):
- Each event is a two-column row
- Odd events: image left, text right
- Even events: image right, text left
- On mobile: stacks vertically (image on top, text below)
- Max width: `max-w-5xl`, centered

**Per-event block:**
- **Image side:** Event photo in `rounded-2xl`, aspect ratio ~3:2. If no photo, show a placeholder/gradient with the RC's logo or a default illustration
- **Text side:**
  - RC name (small, muted — links to `/aliados` or their profile)
  - Event title (large, bold)
  - Short description (muted foreground, relaxed leading)
  - Date & time (icon + formatted text)
  - Location (icon + text)
  - "Asistiré" (I'm going) button — shows attendee count, toggles on click
    - Not attending: outline button with count
    - Attending: solid `bg-pop-550` button with count
    - Requires authentication — if not logged in, redirect to `/auth/login`

**Empty state:** "No hay eventos próximos. ¡Mantente atento!" with an illustration or icon.

**Footer:** Reuse existing `Footer` component.

### Header Navigation

Add "Eventos" link to `PetsHeader` nav between "Aliados" and "About":
```
Mascotas | Aliados | Eventos | About
```
Same styling pattern: `text-xl`, `font-medium` when active, `font-light` when inactive.

Also add to `PublicMobileNav` bottom navigation.

---

## 3. Frontend API Module

New file: `lib/api/events.ts`

Functions following `{ data, error }` pattern:
- `getEvents()` — public, no auth
- `getEvent(id)` — public
- `createEvent(data)` — authenticated (RC)
- `updateEvent(id, data)` — authenticated (RC)
- `deleteEvent(id)` — authenticated (RC)
- `toggleAttendance(id)` — authenticated
- `uploadEventPhoto(id, file)` — authenticated (RC), raw `fetch` with `credentials: 'include'` (multipart)

---

## i18n

New namespace: use `common.json` (or add keys to existing namespaces).

Keys needed in both `es` and `en`:
- `events.title` — "Eventos"
- `events.subtitle` — "Descubre los próximos eventos de adopción y rescate"
- `events.empty` — "No hay eventos próximos. ¡Mantente atento!"
- `events.attending` — "Asistiré"
- `events.attendees` — "asistentes"
- `events.create` — "Crear evento"
- `events.form.title` — "Título"
- `events.form.description` — "Descripción"
- `events.form.date` — "Fecha"
- `events.form.time` — "Hora"
- `events.form.location` — "Ubicación"
- `events.form.photo` — "Foto (opcional)"
- `events.form.submit` — "Crear evento"
- `events.created` — "Evento creado exitosamente"

Add to header nav keys:
- `header.events` — "Eventos"

---

## File Structure

```
app/eventos/page.tsx                                    # New route
components/events/events-page.tsx                       # Main page component
components/events/event-block.tsx                       # Single zigzag event block
components/dashboard/rescue-center/add-event-modal.tsx  # Create event modal
lib/api/events.ts                                       # API module
```
