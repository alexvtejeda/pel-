# Profile Avatar in Header — Design Spec

**Date:** 2026-03-27
**Brief:** docs/superpowers/transcriptions/2026-03-27-profile-avatar-header.md

## Goal

Replace the FontAwesome `faCircleUser` icon in the public header with the shadcn Avatar component, support profile photos via `avatar_url`, and make the dashboard link more prominent for rescue center users.

## Changes

### 1. AuthUser Type (`lib/types/user.ts`)

Add `avatar_url: string | null` to the `AuthUser` interface. The backend will return this field from `/api/v1/auth/me`. No new API calls needed on the frontend — the field comes with the existing auth flow.

### 2. Header Trigger Button (`components/pets/pets-header.tsx`, line ~137-143)

Replace `FontAwesomeIcon(faCircleUser)` with shadcn `Avatar` (`components/ui/avatar.tsx`):
- Size: `h-8 w-8`
- If `user.avatar_url` → show `AvatarImage` with the URL
- Fallback → `AvatarFallback` showing first letter of `display_name` (or first letter of email), `bg-muted text-muted-foreground text-sm font-medium`

### 3. Sheet Profile Section (`components/pets/pets-header.tsx`, line ~156-171)

Replace the large `faCircleUser` icon with a bigger Avatar:
- Size: `h-16 w-16`
- Same image/fallback logic as the trigger
- Fallback text size: `text-xl`

### 4. Dashboard Link Prominence (RC only)

For `rescue_center` role, style the dashboard link row differently:
- Background: `bg-pop-550/10` (always visible, not just on hover)
- Icon color: `text-pop-550` instead of `text-muted-foreground`
- Icon size: `text-xl` instead of `text-lg`
- This only applies to the rescue_center role; business dashboard link stays as-is

### What stays the same

- All other sheet action items keep FontAwesome icons
- Sheet layout structure unchanged
- No new routes, pages, or components
- `faCircleUser` import can be removed if no longer used elsewhere

## i18n

No new translation keys needed — this is purely visual.
