# Member Pet Profiles

**Source:** Prompt10.m4a
**Date:** 2026-04-03
**Type:** feature-idea
**Domain:** fullstack

## Category

feature-idea

## Goal

Let members register and manage their own pets (not for adoption) with a dedicated profile section, so pet data can be reused for transport requests and other platform features.

## Context

Currently, pets in the system are only created through rescue centers for adoption. Members have no way to store their own pets. The business transport flow (e.g., Pet Pickup) requires pet information (name, species, size, conditions) — if members already have their pets registered, this data can be reused instead of re-entering it each time. The member onboarding wizard already optionally asks users to register pets, but there is no place to view or manage them afterward.

## Requirements

- Members can register their own pets with fields: name, species, size, age, photo (optional), special conditions
- Special conditions should reuse or mirror the existing `conditions` system from rescue center pets (mobility, sensory, medical, behavioral, dietary)
- Pet data is stored permanently (until the user removes the pet)
- New "My Pets" or "Profile" section accessible from the member's header sheet sidebar (alongside existing logout, publish pet, and chat buttons)
- Members can view, edit, and delete their own pets
- Members can upload/change pet photos
- Backend: may need a separate table or use the existing `user_pets` table — check if migrations are needed to avoid breaking adoption pet data
- Photos: check if current member photo upload infrastructure exists or needs to be built

## Raw Excerpt

> "I want to give them the option to put their pets in adoption if they want to but in reality what I want this function is to have like a basic profile where they can store their own pets... we would need fields for the pets that we already have... the name of the pet, a small picture of the pet optionally, what age does the pet have, if it currently has any illnesses or special conditions that we already handle in the rescue center side so we could somehow recycle it... I want a place for the user in the front end so they can visualize their pets and this would be a completely different route that is hidden in the header but it's shown on the sheet sidebar."