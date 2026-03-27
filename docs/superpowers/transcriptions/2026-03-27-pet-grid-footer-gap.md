# Pet Grid / Partners Grid Gap Before Footer

**Source:** Prompt8.m4a
**Date:** 2026-03-27
**Type:** bug
**Domain:** frontend

## Steps to Reproduce

1. Open `/pets` on a mobile phone
2. Scroll to the bottom of the pet grid
3. Observe the space between the grid and the footer
4. Repeat on `/aliados` (partners tab)

## Expected

The pet grid and partners grid connect directly with the footer — no large empty gap.

## Actual

There is a huge gap between the pet grid content and the footer. The grid container has excessive height, leaving visible empty space before the footer.

## Route / URL

`/pets` and `/aliados`

## Context

The `/pets` and `/aliados` pages previously had `h-screen` / `h-full` constraints that were changed to `min-h-screen` + `flex-1` to ensure content fills the viewport. On mobile, when there are few pets, this creates a large gap before the footer. The `/about` page does not have this issue. Note: the user confirmed `/pets` margins and centering look fine when zoomed out — only the footer gap is the problem.

## Raw Excerpt

> "There is a huge gap between the pet grid and the footer... the idea is to make the pet's grid connect with the footer. The same exact pattern in the partner's tab."
