# Modal Scroll Conflict on Mobile

**Source:** Prompt8.m4a
**Date:** 2026-03-27
**Type:** bug
**Domain:** frontend

## Steps to Reproduce

1. Open the app on a mobile phone
2. Log in as a member
3. Try to publish a pet — tap the "Publish pet" button
4. When the modal opens, try scrolling inside it by swiping

## Expected

- "Publish pet" button is easily tappable (not blocked by bottom navbar)
- Modal captures all touch/scroll input — background page does not scroll
- Single scroll context inside the modal

## Actual

- Bottom mobile navbar overlaps the "Publish pet" button, making it hard to tap
- Scrolling outside the modal area scrolls the page behind it
- Two competing scroll contexts: modal content and the page behind it
- Must deliberately tap inside the modal to scroll it; swiping near edges scrolls the page

## Route / URL

Member dashboard (pet publishing flow)

## Context

The mobile bottom navbar (`MobileBottomNav`) sits at a fixed position at the bottom of the screen. When modals/dialogs open, they don't fully prevent interaction with elements behind them. The modal open animation is good and should be kept. The core issue is that `body` scroll is not locked when the modal is open on mobile, and the modal's z-index may not fully cover the bottom navbar.

## Raw Excerpt

> "When I try to publish a pet as a member I struggle to click the publish pet button... the navbar on the bottom for mobile devices is overlapping with the button... when I try to scroll, I am scrolling the page itself, not the modal... the idea is that the focus point should be the modal entirely for mobile devices... this is not intuitive because we have like two different scroll bars."
