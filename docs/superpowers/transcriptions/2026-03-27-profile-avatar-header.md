# Profile Avatar in Header

**Source:** Prompt9.m4a
**Date:** 2026-03-27
**Type:** ui-tweak
**Domain:** frontend

## Category

ui-tweak

## Goal

Replace the FontAwesome profile icon in the public header with the shadcn Avatar component for better user identification, and make the dashboard link more prominent for RC users.

## Context

The current header uses a generic FontAwesome icon for the profile. The shadcn Avatar component has already been imported (`components/ui/avatar.tsx`). For RC users specifically, the profile sheet in the public area has limited functionality since everything lives in their dashboard — so the dashboard link needs to be more prominent/bigger.

## Requirements

- Replace the FontAwesome profile icon in `PetsHeader` with the shadcn `Avatar` component (show user initials or image)
- Make the dashboard navigation link/icon more prominent for RC users
- The avatar should work for all authenticated user roles (member, rescue_center, business)

## Raw Excerpt

> "The idea would be to replace the font awesome icon of the profile and replace it with the avatar component from shadcn itself. [...] Also we could make the dashboard icon bigger and the card of the dashboard bigger, specifically for the rescue centers, because they have no other functionalities there. They have everything on their dashboard."
