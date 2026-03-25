# Adoption Flow Completion — Transport Integration

**Date:** 2026-03-24
**Status:** approved
**Brief:** `docs/superpowers/transcriptions/2026-03-24-adoption-flow-transport-integration.md`
**Depends on:** `2026-03-24-business-dashboard-design.md` (ProviderPicker, Requests tab)

## Goal

Connect the existing adoption, chat, and transport subsystems into one end-to-end flow — from adoption approval to pet delivery. No new subsystems; this is glue work.

## End-to-End Flow

```
1.  Member discovers pet on /pets
2.  Member fills adoption form at /adopt/[pet-id] → submits
3.  RC reviews in Interesados tab → approves
4.  Backend: EnsureConversation() creates chat + inserts welcome system message
5.  Backend: sends submission_reviewed WebSocket event (with conversation_id) + in-app notification
6.  Frontend: member sees real-time toast + persistent bell notification
7.  Member opens chat with RC
8.  Member OR RC clicks "Solicitar transporte"
9.  ProviderPicker modal → selects transport business (spec #2)
10. Redirected to /transporte?pet_id=...&conversation_id=...&provider_id=...
11. Transport creation form → trip created → system message in chat
12. Business sees request in Requests tab → accepts
13. Business gets Waze/Google Maps deep link for navigation
14. Member + RC see real-time tracking on /transporte
15. Business updates status via Requests tab detail view
16. Trip completes → system message in chat → toast to member + RC
```

Steps 1-3 already work. Steps 9-11 covered by spec #2. Steps 14 already work (transport UI). **This spec covers: 4-8, 12-13, 15-16.**

---

## 1. Approval → Chat Welcome Message

When the backend creates a conversation on approval (`EnsureConversation()`), insert a system message:

> "¡Solicitud aprobada! Coordinen la entrega aquí. Si necesitan transporte, pueden solicitarlo desde el menú."

This guides both parties: if they have a car, they coordinate directly. If not, they use the transport button.

**Backend change:** Insert system message in `EnsureConversation()` or in the submissions handler after conversation creation.

---

## 2. Approval Notification (Member-Side)

### WebSocket toast (real-time)

On receiving `submission_reviewed` event:

**Approved:**
- Toast: "Tu solicitud para adoptar a {pet_name} fue aprobada"
- Action button: "Ir al chat" → navigates to `/chat` with `conversation_id`
- Auto-dismiss after 10 seconds

**Rejected:**
- Toast: "Tu solicitud para adoptar a {pet_name} fue rechazada"
- If `rejection_note` exists, show it in the toast body
- No action button

### Bell notification (persistent)

- Approved → links to `/chat` (with `conversation_id` in notification metadata)
- Rejected → links to pet page (`/pets`)

### Backend change needed

The `submission_reviewed` WebSocket event must include `conversation_id` when status is `approved`. Also include `rejection_note` when status is `rejected` (field already exists on submissions).

---

## 3. Transport Request from Chat

Both member and RC can click "Solicitar transporte" in the chat dropdown menu.

**Current behavior** (in `chat-message-thread.tsx`):
```
Click → router.push(/transporte?pet_id=...&conversation_id=...)
```

**Changed to** (requires ProviderPicker from spec #2):
```
Click → open ProviderPicker modal → select provider → router.push(/transporte?pet_id=...&conversation_id=...&provider_id=...)
```

No role restriction on the button — both parties can initiate.

---

## 4. Business Trip Acceptance

Covered by spec #2 (Requests tab), but this spec defines what happens **after** acceptance.

### On accept

1. Backend: sets `driver_id`, status → `accepted`, broadcasts `trip_status_changed`
2. **Business frontend** (Requests tab detail view): show confirmation with navigation deep links:
   - "Abrir en Waze" → `https://waze.com/ul?ll={pickup_lat},{pickup_lng}&navigate=yes`
   - "Abrir en Google Maps" → `https://www.google.com/maps/dir/?api=1&destination={pickup_lat},{pickup_lng}`
3. System message in chat: "Transporte aceptado por {business_name}"
4. **Member + RC**: toast "{{business_name}} aceptó el transporte" with "Ver seguimiento" button → `/transporte?trip_id={id}`

### On reject

1. Business clicks "Rechazar" → `PATCH /transport/{id}/cancel`
2. System message in chat: "Transporte cancelado por el proveedor"
3. Member + RC: toast "El proveedor rechazó la solicitud de transporte"
4. Member can request again with a different provider from chat

### Business status updates during trip

Business updates status from Requests tab detail view (no map/tracking page needed):
- "En camino a recoger" → `PATCH /transport/{id}/status` with `picking_up`
- "En tránsito" → `PATCH /transport/{id}/status` with `in_transit`
- "Parada completada" → `PATCH /transport/{id}/stops/{stopId}/complete`
- "Completado" → `PATCH /transport/{id}/status` with `completed`

Simple action buttons — business uses Waze/Google Maps for actual navigation.

### Tracking visibility

- **Member + RC**: see real-time tracking on `/transporte` (map, drawer, stepper)
- **Business**: does NOT use `/transporte` — updates status from dashboard

---

## 5. Chat System Messages

Extend system messages to cover the full trip lifecycle. Only inserted when `conversation_id` is set on the trip.

| Event | System message |
|-------|---------------|
| Trip requested | "Transporte solicitado para {pet_name}" *(already exists)* |
| Trip accepted | "Transporte aceptado por {business_name}" |
| Trip cancelled (by business) | "Transporte cancelado por el proveedor" |
| Trip cancelled (by requester) | "Solicitud de transporte cancelada" |
| Picking up | "El conductor está en camino a recoger a {pet_name}" |
| In transit | "{pet_name} está en camino" |
| Trip completed | "Transporte completado — {pet_name} ha sido entregado/a" |

---

## 6. Simple Pickup (No Transport)

If the member has a car, they simply coordinate a date with the RC via chat. No special handling needed — the welcome system message (Section 1) guides them, and "Solicitar transporte" is optional.

---

## Frontend Changes Summary

| Change | File(s) | Priority |
|--------|---------|----------|
| Toast on `submission_reviewed` event (approve/reject) | New: notification toast component or extend existing | required |
| Bell notification links to `/chat` (approved) or `/pets` (rejected) | `notification-bell.tsx` / notifications handling | required |
| ProviderPicker modal in chat before transport redirect | `chat-message-thread.tsx` | required |
| Waze/Google Maps deep links on trip acceptance | `components/dashboard/business/requests-tab.tsx` | required |
| Status update buttons in business Requests tab detail view | `components/dashboard/business/requests-tab.tsx` | required |
| Toast on `trip_status_changed` events | Transport event handling | required |
| Navigate to `/transporte?trip_id={id}` from toast | Transport event handling | required |

## i18n Keys Needed

Add to `transport` and `common` namespaces (both `es` and `en`):

- Toasts: approval, rejection, trip accepted, trip rejected, trip completed
- System messages: all 7 from the table above
- Business actions: "Abrir en Waze", "Abrir en Google Maps", "En camino a recoger", "En tránsito", "Parada completada", "Completado"
- Welcome message: "¡Solicitud aprobada! Coordinen la entrega aquí..."

---

## What This Spec Does NOT Cover

- Route calculation / ETA optimization (Haversine in backend is sufficient for MVP)
- Payment or fee display during transport
- Automatic provider matching based on pet conditions
- Trip history / completed trips archive
- Rating system for businesses after trip completion
