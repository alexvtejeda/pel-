# RC Approval Notification via WebSocket

**Source:** Prompt9.m4a
**Date:** 2026-03-27
**Type:** feature-idea
**Domain:** frontend + backend

## Category

feature-idea

## Goal

Provide real-time feedback to rescue centers when an admin approves their application, using WebSocket to push a notification that offers to redirect them to the dashboard.

## Context

Currently, when an admin approves a rescue center, the RC user has no feedback — they don't know when they've been approved or rejected. They have to manually check. The WebSocket infrastructure already exists in the app.

## Requirements

### Backend
- New WebSocket event type (e.g. `rc_approved`) sent to the RC user when admin approves their application
- Triggered from the admin approval endpoint

### Frontend
- Listen for the `rc_approved` WebSocket event
- Show a toast notification: "You have been approved!"
- On toast click (or via a follow-up alert/dialog): "You're going to be redirected to the dashboard. Do you want to go there?" with Yes/No
- If Yes → redirect to `/dashboard/rescue-center`

## Raw Excerpt

> "When a rescue center gets approved, it should automatically get redirected to the dashboard. [...] A cool idea would be to connect this with the web sockets we have. So for example, I approve it, a toast pops up. You have been approved. And if they clicked that toast, then maybe an alert should ask, you are going to get redirected to the dashboard. Do you want to go there? Yes or no?"
