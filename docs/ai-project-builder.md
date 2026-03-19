# AI Project Builder

This document describes the multi‑agent project creation flow, API contracts, and prompt responsibilities.

## Flow Overview
1. **Orchestrator** produces a single questionnaire (3–6 questions).
2. **Project Planner** converts the prompt + answers into a structured plan (project, modules, trackers).
3. **Create** endpoint creates the project and modules.
4. **Builder Agents** generate tracker schemas one by one and persist them.

The UI mirrors this with a timeline and per‑tracker progress list.

## API Contracts
### `POST /api/ai-project/questions`
**Input**
```json
{ "prompt": "Build a CRM for a small agency" }
```
**Output**
```json
{
  "summary": "Optional short summary",
  "questions": [
    { "id": "industry", "label": "Which industry?", "type": "text" }
  ]
}
```

### `POST /api/ai-project/plan`
**Input**
```json
{
  "prompt": "Build a CRM for a small agency",
  "answers": { "industry": "Marketing" }
}
```
**Output**
```json
{
  "project": { "name": "Agency CRM", "industry": "Marketing" },
  "modules": [{ "name": "Sales" }],
  "trackers": [
    {
      "name": "Leads",
      "prompt": "Build a lead tracker...",
      "instance": "SINGLE",
      "versionControl": false,
      "autoSave": true
    }
  ]
}
```

### `POST /api/ai-project/create`
**Input**
```json
{ "plan": { "...": "see /plan output" } }
```
**Output**
```json
{ "projectId": "proj_123", "modules": [{ "name": "Sales", "id": "mod_1" }] }
```

### `POST /api/ai-project/build-tracker`
**Input**
```json
{
  "projectId": "proj_123",
  "moduleId": "mod_1",
  "trackerSpec": { "name": "Leads", "prompt": "..." },
  "projectContext": { "project": { "name": "Agency CRM" }, "modules": [] }
}
```
**Output**
```json
{ "trackerId": "trk_1", "name": "Leads", "moduleId": "mod_1" }
```

## Prompt Responsibilities
### Orchestrator
- Ask 3–6 high‑signal questions (industry, entities, workflows, roles, reporting, key fields).
- Return JSON only.

### Project Planner
- Produce a plan with project metadata, modules (if multi‑domain), and tracker specs.
- Decide instance/version control/auto‑save per tracker using the defined rules.
- Return JSON only.

### Builder Agent
- Use the existing tracker builder system prompt to produce a full tracker schema.

