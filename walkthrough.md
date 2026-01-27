# Validation Walkthrough - Grid Structure Refactor

This document outlines the steps to verify the successful refactoring of the `grids` schema to the new structured format.

## Overview of Changes

The `trackerSchema` has been updated to restructure `grids`. A grid is no longer a flat object but now includes:
- `id` (snake_case, immutable)
- `key` (camelCase, for API/Code)
- `name` (Display Name)
- `type` (table, kanban, or div)
- `sectionId` (link to parent section)
- `config` (discriminated union for type-specific settings)

Corresponding updates were made to:
- `lib/schemas/tracker.ts`
- `app/components/tracker-display/types.ts`
- `constants/systemPrompts/trackerBuilder.ts`
- `app/api/generate-tracker/route.ts`
- All `tracker-display` components.

## Verification Steps

### 1. Generate a New Tracker
- **Action**: Use the chat interface to request a new tracker (e.g., "Create a project tracker").
- **Expected Outcome**: The AI should generate a tracker using the new schema structure.
  - Grids should have `id`, `key`, and `config`.
  - Kanban grids should have `groupBy`.
  - Table grids might have `sortable`, `pagination`.
  - Div grids might have `layout`.

### 2. Verify Grid Rendering
- **Action**: Check if the generated grids appear correctly in the UI.
- **Table Grid**: Verify headers and data cells appear. Confirm no errors in console regarding missing keys.
- **Kanban Grid**: Verify cards are grouped correctly. Drag and drop a card and ensure it updates (this confirms `onUpdate` is working with new keys).
- **Div Grid**: Verify fields are displayed. If layout is vertical, check alignment.

### 3. Verify Shadow Grids
- **Action**: Ask the AI to "add a board view for the tasks" (if one doesn't exist).
- **Expected Outcome**: A shadow grid should be created.
  - It should share data with the main grid.
  - Confirm changes in one reflecting in the other.

### 4. Check API Context
- **Action**: (Developer only) Inspect the `currentTrackerState` log in the server console when generating a subsequent request.
- **Expected Outcome**: The logged JSON should show grids with `id`, `key`, `config`, and fields with `gridId`.

### 5. Type Safety
- **Action**: Run `npm run lint`.
- **Expected Outcome**: No errors related to `TrackerGrid` or `TrackerField` properties (e.g., `id`, `key`, `config`).
