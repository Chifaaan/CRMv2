# Design

## Context

See `proposal.md` for motivation and `specs/` for required behaviour.

Current constraints found in the code:

- `Role` is a five-value union in `src/lib/prototype/types.ts`; module access and landing pages are decided by `roleCanAccessCrm`, `roleCanAccessSimpro`, and `landingForRole` in `domain.ts`, then enforced by `components/prototype/shell.tsx`.
- `createProject` in `store.ts` copies every template stage at creation and sets `structureLocked: true`. `setProjectStructure` is the only structural action and only works while that flag is false.
- `decideGate` activates the next pending stage automatically after a win. There is no concept of a phase that exists but is not yet authored.
- Assets are `ProjectStep` copies with `phase`, `order`, `status`, `weight`, `parallelGroup`, `kind`, and optional form/gate metadata.
- `FormEntry` already provides the assign → fill → submit → review lifecycle and is filtered by `templateStageId`; there is no entry-type field.
- `Task` has no link field. `taskTransition` in `domain.ts` performs role checks, but `transitionTask` in `store.ts` writes the new status without re-validating.
- RAB is a `RabPayload` with `items: RabItem[]` rendered as an editable table in `step-form-panel.tsx`; items have description, qty, unit, and unit price only.
- There is no Media Order, no business-unit concept, and no Business Dashboard. Groups already provide an umbrella container through `Project.groupId`.
- Persistence is Zustand `persist` at key `crm-simpro:v1`, version 3, with `migratePersistedState` and an `onRehydrateStorage` that resets when `seedVersion` changes. Seed templates are merged by id during migration.
- Repo rules: no new dependencies, no second design system, browser-only data, and lint is scoped to prototype paths.

## Goals / Non-Goals

**Goals:**

- Represent phase composition and locking explicitly instead of overloading `structureLocked`.
- Keep every existing Umum behaviour and progress number intact.
- Reuse FormEntry, the existing stepper, board, and audit helpers instead of introducing parallel subsystems.
- Make role, link, and revenue rules testable pure functions in `domain.ts`.

**Non-Goals:**

- Backend, auth, or real SIMPRO integration.
- Admin CRUD for business units (the three units are a seeded catalog).
- Approval workflow for MO beyond draft/final state.
- Per-user multi-tenancy or real financial accounting.

## Decisions

### D1: Explicit per-phase state on the project

Add `Project.phaseStates?: Partial<Record<Phase, PhaseState>>` where `PhaseState = { authoredAt?: string; startedAt?: string; lockedAt?: string; sourceTemplateVersion?: number }`.

Rules:

- Creation writes `phaseStates.prospek` and materializes only Prospek stages.
- A phase is editable only when `phaseStates[phase]` exists, `startedAt` is absent, and the project is active.
- `startPhase` records `startedAt`/`lockedAt`, activates the first stage, and writes `phase.started`.
- Completed/lost/cancelled projects reject phase edits.

`structureLocked` stays on the type for backward compatibility and legacy projects, but `canEditPhaseStructure(project, phase)` becomes the authority.

*Alternative considered:* derive locking from `ProjectStep.startedAt`. Rejected because a phase with zero stages is indistinguishable from a locked empty phase, and phase-level audit history would be implicit.

### D2: Winning gate stops auto-activation

Change `decideGate` so an approved client-approval gate:

1. completes the gate stage and records `gate.approved`;
2. sets `lifecycle: won` and `rabBaselineLockedAt`;
3. initializes `phaseStates.planning` and `phaseStates.running` as empty (editable, not started);
4. does **not** activate a next stage.

On rejection it sets `lifecycle: lost`, `status: cancelled`, reason, and leaves the journey closed. `startPhase(planning)` is the only way to leave Prospering after a win.

*Alternative considered:* keep auto-activation and let PM edit the activated phase. Rejected because the requirement is to compose before starting, and starting must be an auditable decision.

### D3: One stage-materialization path for creation and phase composition

Extract `materializeStages(projectId, template, phase, selectedStages)` reused by `createProject` and a new `setPhaseStructure(projectId, phase, stages)`.

- Stage keys are generated per project/phase and remain unique.
- Weights, `parallelGroup`, `kind`, `financeKind`, `gateKind`, form templates, and task copies are preserved from the template.
- `setPhaseStructure` runs `validateTemplateStages` on the proposed phase and rejects edits outside the editable window.
- `startPhase(running)` appends the template's Closing stages idempotently (`closingMaterialized: true` in `phaseStates`), preserving parallel BAST/Invoice and Pembayaran only for non-legacy templates.

*Alternative considered:* let the PM compose Closing manually. Rejected: Closing finance behaviour must stay uniform and Umum parity depends on fixed closing stages.

### D4: Brief Received entry types instead of hidden stages

Add `TemplateStage.entryTypes?: StageEntryType[]` and `FormEntry.entryType?: string`.

`StageEntryType = { id, label, defaultRole: Role, kind: 'form' | 'rab' }`.

For Event Program, Brief Received keeps one Form template and declares six entry types:

| Entry type | Default role | Kind |
| --- | --- | --- |
| `strategy_concept` | PM | form |
| `kv_assets` | Media | form |
| `vendor_contact` | Media | form |
| `site_survey` | Media | form |
| `budget_quotation` | Finance | rab |
| `vendor_selection` | Media | form |

An entry is still a normal `FormEntry`; `entryType` drives its title and default role. The `budget_quotation` entry deep-links to the project's single RAB form so the baseline stays in one place. Client Approval remains a separate gate stage.

*Alternatives considered:* child stages (reintroduces the 14-stage journey and breaks per-phase composition); stage tasks (tasks are reserved for SIMPRO cards).

### D5: Role expansion with one capability matrix

Extend `Role` with `media` and `bod`, extend `ROLE_LABEL`, and centralize access:

- `roleCanAccessCrm`: admin, manager, pm, finance (unchanged).
- `roleCanAccessSimpro`: admin, manager, pm, assignee, media.
- `roleCanAccessBusiness`: admin, bod.
- `landingForRole`: media → `/my-tasks`, bod → `/business`, others unchanged.
- `canEditFormEntry`/`canEditForm` allow Media only when `financeKind === 'bast'` and the entry is assigned to that Media user. RAB, Invoice, and Pembayaran stay Finance-only.
- Board/My Tasks visibility for Media mirrors Assignee filtering.
- `shell.tsx` gains a Business nav item only for admin/bod and route guards for `/business`.

*Alternatives considered:* reuse `assignee` for Media (loses BAST ownership and reporting), reuse admin for BOD (does not satisfy "akses khusus BOD").

### D6: Working link is a first-class task field

Add:

```ts
type TaskWorkingLink = { url: string; setById: string; setAt: string };
Task.workingLink?: TaskWorkingLink;
Task.workingLinkHistory?: TaskWorkingLink[];
```

`validateWorkingLink(input)` in `domain.ts` trims input, parses it as a URL, and accepts only `http:`/`https:`. `taskTransition` requires a valid stored link when moving `todo → in_progress`; for `need_revision → in_progress` it accepts an existing valid link or a replacement supplied in the same action. `store.transitionTask` calls the same guard before writing, so UI bypasses cannot skip the rule.

The card dialog prompts for the link when the target column is In Progress, shows the current link to PM/Manager, and records `task.working_link_set` with before/after in the audit trail. A link replacement while In Progress appends to history.

*Alternatives considered:* treat the link as an attachment (no validation, not clickable in reports); restrict to Google domains (too brittle for Drive clones and client-owned docs).

### D7: Media Order as its own project document

Add to `AppState.mediaOrders: MediaOrder[]`.

```ts
type BusinessUnitId = 'makerspace' | 'makerspace-video' | 'spektrum';
type MediaOrderItem = {
  id: string; description: string; qty: number; unit: string;
  clientUnitPrice: number; vendorUnitCost: number; businessUnitId: BusinessUnitId;
};
type MediaOrder = {
  id: string; projectId: string; number: string; title: string;
  status: 'draft' | 'final' | 'cancelled';
  items: MediaOrderItem[]; notes: string;
  createdById: string; createdAt: string;
  updatedAt?: string; updatedById?: string;
};
```

- One project may have multiple MOs; each MO belongs to exactly one project.
- `RabItem` gains `businessUnitId` (required for new items; migration leaves legacy items unmapped and flags them in the UI).
- `BUSINESS_UNITS` is a constant catalog with Makerspace, Makerspace Video, and Spektrum; no CRUD in this change.
- MOs are stored in `persist.partialize` and reset with seed data.

*Alternative considered:* model MO as another `finance_form` kind. Rejected because MOs are commercial documents with multiple instances, independent lifecycle, and no PM review flow.

### D8: Revenue aggregation is a pure domain function

Add:

- `mediaOrderTotals(mo)` and `lineMargin(item)`.
- `rabCostByBusinessUnit(state, projectId)` from the approved RAB baseline.
- `businessDashboardRows(state, { groupId?, from?, to? })` returning per-unit revenue, cost, margin, margin %, item count, planned RAB cost, and variance.
- Revenue/cost come from non-cancelled MO items; planned cost comes from the RAB snapshotted at baseline lock. Projects without MOs show baseline only, with revenue/margin marked unavailable.

The dashboard reads only aggregate rows; it does not render project detail. Filtering by umbrella uses `Project.groupId`; standalone projects form their own bucket.

*Alternative considered:* compute aggregates in the React component. Rejected: the rules need unit tests and must match `domain.ts` conventions.

### D9: Business Dashboard is a top-level route

Add `/business` under `(main)` with a dedicated nav entry visible to admin/bod. Keeping it outside `/crm` avoids granting BOD general CRM access and avoids special-casing a CRM guard.

The page reuses the prototype shell and UI primitives, shows read-only cards/table/chart per business unit, a period filter (default: all time), an umbrella filter, and an empty state.

### D10: Persistence migration merges instead of resetting

- Bump persist `version` to 4 and extend `migratePersistedState`:
  - derive `phaseStates` from existing stages (any started/completed stage locks its phase; Prospek always exists);
  - add `phaseStates.planning`/`running` as locked for old projects that already have those stages;
  - add Media and BOD demo users if absent;
  - default `mediaOrders` to `[]`;
  - add `entryType` defaults for existing Event Brief Received entries;
  - keep legacy RAB items without a business unit but surface a "Belum dipetakan" badge.
- Keep `seedVersion` at 3 so existing browser data is migrated rather than reset. The migration is keyed by stable ids and idempotent.
- New seed users, the new Event template version, and sample MOs live in `seed.ts`; `migratePersistedState` merges seed templates by id while leaving project stage copies untouched.

*Alternative considered:* bump `seedVersion` to force a reset. Rejected because the spec requires preserving history and progress.

### D11: Audit through existing helpers

Use `recordProjectEvent` for `phase.composed`, `phase.started`, `closing.appended`, `task.working_link_set`, `media_order.created`, `media_order.updated`, `media_order.item_changed`, and `media_order.deleted`. Reuse `projectEvent` for single events and keep backfill unchanged.

## Risks / Trade-offs

- **Per-phase progress is not comparable across projects** → journey % is explicitly scoped to materialized stages; UI labels it "progress fase berjalan"; Umum regression test protects legacy numbers.
- **Gate regression from removing auto-activation** → tests assert that a win leaves Planning unstarted and that `startPhase` is the only path forward.
- **Older projects may have stages in a phase whose `phaseStates` is missing** → migration derives state from stage status, and `canEditPhaseStructure` treats a phase with any started stage as locked.
- **Working-link enforcement can block demo flows** → the card dialog shows the requirement before the drag/drop, and the assignee can set the link in the same action.
- **Media BAST permission widens finance editing** → allow only assigned BAST entries; RAB/Invoice/Pembayaran remain Finance-only and are covered by permission tests.
- **BOD dashboard could leak operational data** → return aggregate rows only; no task, client, or project detail beyond umbrella names.
- **MO duplicates RAB cost data** → RAB remains the planned baseline; MO is actual client revenue and vendor cost. The dashboard labels both explicitly.
- **Seed merge could overwrite customized templates** → merge only known seed template ids, as the current migration already does; user-created templates are untouched.
- **Reset wipes MOs** → MOs are part of seed/reset like other prototype data, documented in the demo script.

## Migration Plan

1. Add new types and optional fields; make every new field optional so old local data parses.
2. Extend `migratePersistedState` and bump persist version to 4; verify with a captured v3 snapshot.
3. Run `npm test` for migration idempotency, then manually reload an existing browser profile to confirm projects, forms, and history survive.
4. Rollback: restore the previous persist version and remove the new fields; prototype data remains readable because additions are optional. No external system is affected.

## Open Questions

None that change the specs or task breakdown. Business-unit administration and MO approval routing are deliberately deferred to a later change.
