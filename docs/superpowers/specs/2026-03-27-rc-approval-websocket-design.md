# RC Approval/Rejection Notification via WebSocket — Design Spec

**Date:** 2026-03-27
**Brief:** docs/superpowers/transcriptions/2026-03-27-rc-approval-websocket-notification.md

## Goal

Provide real-time feedback to rescue center users when an admin approves or rejects their application, using the existing WebSocket infrastructure.

## Changes

### 1. Frontend — WebSocket Listener

Add a new listener component or hook that subscribes to two WebSocket event types:

**`rc_approved` event:**
- Show Sonner toast: "Tu centro de rescate ha sido aprobado!" (success variant)
- Toast includes action button: "Ir al dashboard"
- Clicking action → `router.push('/dashboard/rescue-center')`

**`rc_rejected` event:**
- Show Sonner toast: "Tu solicitud ha sido rechazada." (error variant)
- If the backend sends a `reason` field, display it as the toast description
- No action button needed

**Where to subscribe:**
- Create a small `RCApprovalListener` component that uses `useWebSocket().subscribe()` and `useAuth()`
- Only renders when `user?.role === 'rescue_center'`
- Mount it inside the root layout (alongside existing providers) or inside `AuthProvider`
- Uses `useRouter()` for the redirect

### 2. Backend (for backend session)

**On RC approval** (`PATCH /api/v1/admin/rescue-centers/{id}/approve`):
- After updating status, send WebSocket message to the RC's owner user:
  ```json
  { "type": "rc_approved", "rescue_center_id": "..." }
  ```

**On RC rejection** (`PATCH /api/v1/admin/rescue-centers/{id}/reject`):
- After updating status, send WebSocket message to the RC's owner user:
  ```json
  { "type": "rc_rejected", "rescue_center_id": "...", "reason": "..." }
  ```

Both follow the same dispatch pattern as existing WebSocket events (`new_message`, etc.).

## i18n

New keys in `common.json` (both `es` and `en`):
- `rc_notification.approved` — "Tu centro de rescate ha sido aprobado!"
- `rc_notification.approved_action` — "Ir al dashboard"
- `rc_notification.rejected` — "Tu solicitud ha sido rechazada."

## What Stays the Same

- WebSocket context (`websocket-context.tsx`) unchanged — just new event types being subscribed to
- Admin dashboard UI unchanged
- No new API calls from the frontend
