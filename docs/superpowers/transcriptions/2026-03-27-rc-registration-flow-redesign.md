# RC Registration Flow Redesign

**Source:** Prompt9.m4a
**Date:** 2026-03-27
**Type:** feature-idea
**Domain:** frontend

## Category

feature-idea

## Goal

Remove the optional pet upload step from the RC registration wizard and replace it with a post-registration "success + waiting for approval" screen that offers pet upload as a separate, clearly optional flow.

## Context

During the RC demo, the rescue center feedback was that the optional pet upload step in the registration wizard feels mandatory — users fill it out even though they don't need to. The RC said it's fine to add pets directly from the dashboard, but since most RCs will wait for admin approval before accessing the dashboard, a transitional step is needed.

## Requirements

- After completing the normal RC registration form, show a new step: "You have successfully registered as a rescue center. The admin is reviewing your application."
- Below the message, present: "Do you want to add pets while you wait?" with Yes / No buttons
- If Yes → reuse the existing pet upload UI from the current optional registration step
- If No → redirect to the landing page
- Remove the optional pet upload from the main registration wizard flow

## Raw Excerpt

> "We need to remove the optional part and add it as a second flow, because the rescue center says that that is not intuitive, that it feels that is not optional. So people will fill it even though they don't need to. [...] I want to add like a second step to the registration. So for example, when they complete the normal form, I want to lead them to another step saying, okay, you have successfully registered as a rescue center, the admin is approving. Now, do you want to upload the pet while you wait? Yes or no?"
