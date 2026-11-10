# Proposal

## Why

The current prototype already supports three templates, four phases, and stage-type rules, but it still treats the whole journey as one structure authored and frozen at project creation. Real PM work is staged: the prospek journey is composed first, the next phases only become concrete after the client commits, and detailed event work (strategy, KV, vendor, survey, budget, selection) is briefing work rather than ten separate stages. At the same time, allocation, accountability, and commercial visibility are incomplete: there is no Media role, no mandatory working link when work starts, no Media Order, and no per-business-unit revenue/margin view for BOD.

## What Changes

- **Phased journey authoring (BREAKING)**: replace "author the whole journey once, then freeze everything" with "author and lock per phase". At creation only Prospek stages are copied/materialized. When the winning gate is approved (Close Won), the PM composes the Planning and Running stages (Closing finance stages are added by rule). A phase locks once it starts; completed phases are read-only history. Losing the gate (Close Loss) ends the journey with a required reason.
- **Event Brief Receive restructure (BREAKING)**: collapse Event Program steps 2–7 (Create Strategy & Concept through Vendor Selection) into entries under a single Brief Received stage. Client Approval remains the winning gate stage.
- **Template defaults (BREAKING)**: update the three seed templates (Umum, KOL Campaign, Event Program) to declare which stages belong to which phase and which are authored on phase transition. Umum keeps legacy six-stage behaviour and exact progress numbers.
- **Media role (BREAKING)**: add a `media` role that works in SIMPRO (board, My Tasks, Forms), owns event steps 4–12, KOL Listing/Rate Inquiry, and BAST document handling, but has no general CRM browsing.
- **BOD role (BREAKING)**: add a `bod` role that can only open the Business Dashboard and sees read-only revenue/margin for all business units. Admin keeps access.
- **Backlog-first allocation**: PM creates the project and task cards in `backlog`; Manager/Admin allocates to an assignee, and a Manager may assign to themselves. PM still cannot assign.
- **Mandatory working link**: moving a card from `todo` (or `need_revision`) to `in_progress` requires an active http(s) working link (Google Docs/Slides/Drive or equivalent). The link is stored on the task, versioned in the audit trail, and visible to PM/Manager.
- **RAB and Media Order (MO)**: keep the interactive RAB table and add an interactive MO table. Every MO and RAB item is mapped to an owning business unit (Makerspace, Makerspace Video, Spektrum). MO is project-level and rolls up to the project's group (umbrella campaign). Items carry client revenue and vendor cost so margin can be derived.
- **Business Dashboard**: new BOD-only dashboard that aggregates revenue, cost, margin, and margin % per business unit and per umbrella from MO/RAB data.

## Capabilities

### New Capabilities

- `project-journey`: template defaults, per-phase journey authoring and locking, phasing gates, Brief Receive entry model, stage-level progress and history.
- `work-assignment`: role model (Media, BOD), backlog-to-assignee allocation including self-assignment, mandatory working link on start, and role-scoped visibility.
- `revenue-tracking`: interactive RAB/MO tables, business-unit mapping per item, umbrella roll-up, and the BOD Business Dashboard.

### Modified Capabilities

None. `openspec/specs/` is empty; these are the first capabilities recorded for this project.

## Impact

- `src/lib/prototype/types.ts`: roles, per-phase journey fields, task working link, MO payload, business units, dashboard summaries.
- `src/lib/prototype/templates.ts` / `seed.ts`: registered templates, phase planning metadata, Event Brief Receive entries, Media/BOD demo users, sample MO data.
- `src/lib/prototype/domain.ts`: phase authoring/locking rules, gate transitions, allocation permission, working-link validation, MO validation, dashboard aggregation and visibility.
- `src/lib/prototype/store.ts`: project creation materializes only Prospek stages; phase-transition action; working-link action; MO persistence; persist migration for existing localStorage data.
- `src/lib/prototype/events.ts`: events for phase authored/locked, working link set, MO created/updated, allocation.
- `src/components/prototype/`: project detail stepper and phase panels, create-project flow, board card dialog, RAB/MO tables, Business Dashboard, role switcher and navigation guards.
- `src/app/(main)/`: new `/crm/business` (or equivalent) BOD dashboard route and MO entry pages; existing `/crm/templates`, `/crm/projects/[id]`, SIMPRO board/My Tasks routes adjusted.
- `tests/`: phase authoring/locking, gate transitions, Media/BOD permissions, working-link enforcement, MO/business-unit validation, dashboard aggregation, Umum regression, migration idempotency.
- `AGENTS.md` and `Docs/`: update product rules and add the change's decision record.
