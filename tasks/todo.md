# Phase 4F — Skeleton loading + Notifications ✅

## Tasks

- [x] 1. Add skeleton loading to `pets-tab.tsx`
- [x] 2. Create `notifications-tab.tsx`
- [x] 3. Add `Bell` nav item to `rescue-center-sidebar.tsx`
- [x] 4. Update `dashboard-shell.tsx` — notification permission, notifications state, simulate notification on mount, wire up NotificationsTab

## Review

- `pets-tab.tsx`: added `'use client'`, 1s simulated loading state, `PetSkeletons` component with 8 skeleton cards matching the real grid layout
- `notifications-tab.tsx`: new component — empty state with Bell icon, or a list of notification cards with title, body, and relative timestamp (`timeAgo`). Exports `AppNotification` type.
- `rescue-center-sidebar.tsx`: added `Bell` import, `notifications` to Tab type, new nav item between Formulario and Ajustes
- `dashboard-shell.tsx`: added `notifications` state + `addNotification` helper (updates state + fires browser `Notification` if permission granted), `useEffect` on mount to request permission and simulate a form submission notification after 3s, renders `<NotificationsTab>` for the new tab
- `mobile-bottom-nav.tsx`: Tab type updated to include `notifications`
