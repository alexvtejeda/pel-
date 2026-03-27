# Landing Page Carousel Overflow on Mobile

**Source:** Prompt8.m4a
**Date:** 2026-03-27
**Type:** bug
**Domain:** frontend

## Steps to Reproduce

1. Open the app on a mobile phone (Safari tested)
2. Navigate to `/` (landing page)
3. Observe the `bg-muted` section containing LogoLoop and TestimonialCarousel
4. Scroll horizontally or zoom out

## Expected

- Carousel cards stay within the `bg-muted` container bounds
- LogoLoop animates continuously
- No horizontal scrollbar on the page
- Landing page is centered and visually consistent when zoomed out
- Carousel side-cards only peek at the edges (not fully visible)

## Actual

- Carousel cards overflow outside the `bg-muted` section — `overflow-hidden` not working
- LogoLoop is paused / not animating on mobile
- Horizontal scroll appears across the entire page (bad UX)
- Landing page is not centered — appears cut off with extra margin on the right when zoomed out
- Carousel cards are fully visible as if on desktop, not clipped to peek edges
- The zoom-out centering issue affects all sections for unauthenticated users

## Route / URL

`/` (landing page)

## Context

First time testing on an actual mobile phone (Safari on iPhone). Desktop layouts look fine. The carousel and LogoLoop are ReactBits components that may not be optimized for mobile viewports. The `bg-muted` right-column section uses `p-8` padding and a negative-margin bleed pattern for LogoLoop, which may contribute to overflow issues on narrow screens.

## Raw Excerpt

> "The carousel is not responsive... the cards are outside this section so the overflow hidden thing is not working... there's a lot of horizontal scroll for the mobile and that is not good UX... the landing page is not centered at all, it looks like it's cut off, as if it has some margin on the right... I can see the whole cards as if I am on desktop. That is not what we want. I also believe that ReactBits does not think so much about mobile devices."
