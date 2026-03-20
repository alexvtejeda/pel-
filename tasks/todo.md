# Task 1: Create shared FormBuilder component

## Plan

- [x] Create `components/forms/form-builder.tsx` with:
  - FormBuilderProps interface (fields, onChange, formName, onNameChange)
  - Constants: FIELD_TYPES, HAS_OPTIONS, typeInfo, makeField
  - All helper functions adapted from admin-form-tab.tsx
  - Google Forms-style stacked card layout
  - Title card (conditional on formName prop)
  - Selected card with full editing UI
  - Collapsed card with read-only preview
  - Section grouping with pill tabs
  - Right-side toolbar (desktop) with field type buttons
  - Mobile FAB with dropdown menu
  - Drag-and-drop reordering
- [x] Commit the new file (`51f4840`)
