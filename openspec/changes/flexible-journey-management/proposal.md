# Proposal

## Why

Templates currently behave as a starting constraint rather than a recommendation: a project is created from one template and the Prospek phase is immediately populated and locked. PMs cannot create a project with an empty Prospek phase, cannot author a journey from scratch, and cannot revisit the journey once the project exists. In practice, PMs often do not have a matching template yet still need to add, reorder, and remove steps before work starts.

The same gap exists on the work side. Finance forms are only visible to Finance/PM/Admin, Media cannot open an assigned BAST, and assignment is possible from CRM but not from the form itself. This makes SIMPRO Forms an incomplete inbox for the people who actually have to fill the forms.

## What Changes

- **Template as recommendation (BREAKING)**: a project MAY be created without a template. Choosing a template only pre-fills Prospek steps; it does not constrain the journey. Manual steps are first-class and can use any stage kind.
- **Empty Prospek at creation (BREAKING)**: the create-project page starts with an empty Prospek phase and offers two entry points: fill from a template or add steps manually with `+ Tahap`. The user can reorder and delete steps.
- **Deferred Prospek start (BREAKING)**: new projects create Prospek steps as pending. Prospek remains editable until the PM starts the journey, after which the phase locks. Existing projects keep their current started/locked state.
- **Journey Management section**: project detail gains a section to choose a phase and manage its steps. PMs can add, edit, reorder, and delete steps of every unlocked phase, including future phases that have been opened and phases that have not started yet. Closing stays rule-driven.
- **Winning gate is mandatory but user-authored**: for non-legacy journeys, exactly one client-approval gate must be present and must be the final Prospek step before the journey starts. It still drives Close Won/Lost. Legacy Umum keeps its six-step flow without a winning gate.
- **Closing finance steps always exist**: when Running starts, the system appends Closing stages. BAST and Invoice are always present as parallel finance stages; a template may add extra Closing stages, and templates without Closing stages fall back to system defaults (including Pembayaran).
- **Assignment from CRM or the opened form (BREAKING)**: Manager/Admin can assign form entries and finance forms from CRM and from the opened form page. Assignment is role-appropriate: RAB/Invoice/Pembayaran to Finance; BAST to Finance or Media; Form entries to Assignee or Media.
- **SIMPRO Forms is the assignee inbox (BREAKING)**: every assigned form entry and finance form appears in SIMPRO Forms for its assignee, including a Media-assigned BAST. Owning PM and Admin keep oversight visibility. Assignment creates an in-app notification and the Forms badge includes forms the user must fill.
- **Form access follows assignment**: Finance form pages open from SIMPRO for assigned media/finance users, with role-appropriate editing; assigned users can also submit from the form itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-journey`: template-bound creation becomes optional; Prospek starts empty and can be authored manually; Prospek and future phases stay editable until started; Journey Management controls step add/edit/reorder/delete; winning-gate and Closing rules are restated for manual journeys.
- `work-assignment`: form assignment is available from CRM and the opened form; finance/entry assignment is role-appropriate; assigned forms appear in SIMPRO Forms with notifications and badge counts; Media can open an assigned BAST.

## Impact

- `src/lib/prototype/types.ts`: optional template metadata on creation input, journey-step input, and form-distribution helpers; no persisted schema field is required beyond the optional template id.
- `src/lib/prototype/domain.ts`: journey-phase editability, manual-step validation, winning-gate placement, phase-start requirements, form assignee eligibility, finance-form visibility, and badge helpers.
- `src/lib/prototype/store.ts`: template-optional project creation with pending Prospek steps, template-independent phase composition, `startPhase` for Prospek, closing defaults that always include BAST/Invoice, assignment guards/notifications, and audit events.
- `src/lib/prototype/templates.ts`: system default Closing stages and helper rules used when no template Closing stages exist.
- `src/lib/prototype/simpro-forms.ts`: finance-form visibility includes the assigned Finance/Media user and links to the form.
- `src/components/prototype/crm/project-create.tsx`: empty-Prospek flow, optional template fill, manual step editor.
- `src/components/prototype/crm/project-detail.tsx` and a new Journey Management component: phase selector, step management, and start-journey action; the old template-only phase composer is replaced.
- `src/components/prototype/crm/finance-form-page.tsx` and a SIMPRO finance-form route: assignment controls in the opened form and access for assigned Media BAST.
- `src/components/prototype/simpro/forms-page.tsx` and `src/components/prototype/shell.tsx`: assigned forms, finance-form links, notifications, and badge counts.
- `tests/`: journey creation from empty/manual steps, template-independent composition, Prospek editing lock, gate validation, Closing defaults, form assignment/visibility/notifications, Media BAST access, and legacy Umum regression.
- `AGENTS.md` and `Docs/`: update the journey-authoring and form-distribution rules after implementation.
