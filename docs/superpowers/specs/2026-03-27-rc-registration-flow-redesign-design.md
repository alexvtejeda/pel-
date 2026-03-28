# RC Registration Flow Redesign — Design Spec

**Date:** 2026-03-27
**Brief:** docs/superpowers/transcriptions/2026-03-27-rc-registration-flow-redesign.md

## Goal

Remove the inline optional pet upload from the RC registration wizard. Instead, after MFA setup, show a success screen that offers "Add pets while you wait for approval?" as a clearly separate, optional step.

## Current Flow

Register → Role Selection → RC Wizard (center info + optional pet upload inline) → MFA → Success → Home

## New Flow

Register → Role Selection → RC Wizard (center info only) → MFA → Success Screen ("Add pets while you wait?") → Yes: pet upload form / No: landing page

## Changes

### 1. Remove Optional Pet Section from RC Wizard

In `components/auth/onboarding/rescue-center-wizard.tsx`:

- Remove everything below the "Opcional" divider (~lines 338-592): pet name, description, age, gender, species, vaccinated, castrated, size, photo upload, CardCarousel preview
- Remove all pet-related state variables (`petName`, `petDescription`, `petAge`, `petPhotos`, etc.)
- Remove pet creation logic from `handleSubmit` — the submit function only creates the rescue center now
- Keep: center info fields (name, phone, address, RNC, website, Instagram), MFA enrollment, submit logic for center creation

### 2. Redesign the Success Screen

The existing success screen (shown after MFA or after submit if MFA not required) becomes an interactive decision point instead of a static message.

**Layout:**
- Success icon/checkmark
- Title: "Te has registrado exitosamente" (You've registered successfully)
- Subtitle: "Un administrador revisará tu solicitud. Te notificaremos cuando seas aprobado."
- Two buttons:
  - **Primary (pop-550):** "Agregar mascotas mientras esperas" → swaps to pet upload form
  - **Secondary (outline):** "Ir al inicio" → redirects to landing page (`/`)

### 3. Pet Upload Form (on Success Screen)

When user clicks "Yes", the success message is replaced with the pet upload form — same fields that were removed from the wizard:
- Pet name (required to submit)
- Description
- Age + months/years toggle
- Gender (male/female)
- Species (dog/cat)
- Vaccinated, Castrated checkboxes
- Size dropdown
- Photo upload (max 5, same drag-and-drop UI)
- CardCarousel preview (same pattern as before)

After submitting a pet:
- Show confirmation: "Mascota agregada exitosamente"
- Option to add another pet or go home
- Pet creation uses the same API call as before (`createPet` + `uploadPhotos`)

### 4. MFA Stays Before Success

The flow order is: center creation → MFA enrollment → success screen with pet offer. This ensures the admin notification (that an RC registered) only fires after MFA is set up, so all approved RCs are MFA-guaranteed.

## What Stays the Same

- Center info form fields and validation unchanged
- MFA enrollment flow unchanged
- OnboardingNav breadcrumbs unchanged
- All API calls remain the same (just reordered — pet creation moves to post-success)
- CardCarousel and photo upload components reused as-is

## i18n

New keys needed in `auth.json` (both `es` and `en`):
- `rc_wizard.success_title` — "Te has registrado exitosamente"
- `rc_wizard.success_subtitle` — "Un administrador revisará tu solicitud. Te notificaremos cuando seas aprobado."
- `rc_wizard.add_pets_prompt` — "Agregar mascotas mientras esperas"
- `rc_wizard.go_home` — "Ir al inicio"
- `rc_wizard.pet_added` — "Mascota agregada exitosamente"
- `rc_wizard.add_another` — "Agregar otra mascota"

## Backend

No backend changes needed. Same endpoints, same order — just the frontend flow changes.
