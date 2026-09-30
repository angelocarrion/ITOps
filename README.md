# ITOps — Phase 1

An internal IT ticket management portfolio project built with React, TypeScript,
Vite, Node.js, Express, and SQLite. Includes a dashboard, searchable active queue,
resolved archive, creation form, ticket detail editing, and internal technician
notes. All seed people and requests are fictional. Assets is a navigation
placeholder; authentication, SLA tracking,
activity history, charts, and other future features are not implemented.

## Local development

Use Node.js 24.x and pnpm 11.19.0. If needed, install pnpm with
`npm install -g pnpm@11.19.0`. From the ITOps directory:

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173. The API runs on http://127.0.0.1:3001.
Ctrl+C stops both development servers.

```sh
pnpm check  # TypeScript checks for both packages
pnpm build  # Builds frontend/dist and backend/dist
pnpm test   # Builds backend; runs isolated API tests and frontend queue tests
```

Run packages independently in separate terminals if desired:

```sh
pnpm --filter @itops/backend dev
pnpm --filter @itops/frontend dev
```

After building, `pnpm --filter @itops/backend start` runs the compiled API.
`pnpm --filter @itops/frontend preview` previews the frontend bundle only. The API
proxy is a development-server configuration; production hosting and /api routing
are deferred. Use `pnpm dev` for the integrated local experience.

## Project layout and changed files

```text
ITOps/
  backend/
    src/
      app.ts                 Express middleware, routers, health, and JSON errors
      server.ts              HTTP listener and shutdown handling
      database.ts            SQLite connection, versioned migrations, one-time seeding
      errors.ts              Typed HTTP errors
      tickets/
        types.ts             Ticket types and permitted enum values
        validation.ts        Create/patch body validation and ID validation
        repository.ts        Prepared SQL queries and timestamp transitions
        routes.ts            REST handlers
        seed.ts              Nine fictional starting tickets
      notes/
        types.ts             Internal note input/record contracts
        validation.ts        Author/content validation
        repository.ts        Append-only SQL operations and chronological retrieval
        routes.ts            Nested ticket note endpoints
    tests/tickets.test.mjs    Existing ticket API regression tests
    tests/notes.test.mjs      Notes, version 1 upgrade, and API restart persistence
    data/.gitkeep            Local database directory (contents ignored by Git)
    package.json             Backend dev, check, build, start, test commands
    tsconfig.json
  frontend/
    src/
      App.tsx                Persistent shell, page selection, create modal, notices
      main.tsx               React entry point
      api.ts                 Typed fetch functions and API error handling
      types.ts               Frontend ticket contract
      ticketQueues.ts        Active/resolved status partition
      style.css              Responsive dashboard, tables, forms, and feedback styles
      hooks/
        useNavigation.ts     Hash routes and browser Back/Forward support
        useTickets.ts        Collection loading, retry, refresh after mutations
      components/
        Sidebar.tsx          Dashboard/active/resolved/Assets navigation
        Dashboard.tsx        KPIs and five newest tickets
        TicketsPage.tsx      Search, combined filters, result count, empty states
        TicketTable.tsx      Shared queue/recent table with detail links
        TicketForm.tsx       Controlled create form and validation feedback
        TicketDetail.tsx     Full ticket data and persistent triage editing
        InternalNotes.tsx    Chronological notes and append-only technician composer
        Modal.tsx            Native dialog with modal focus/escape behavior
        Badge.tsx            Text-based priority/status indicators
        Feedback.tsx         Loading/error/empty components
        Icon.tsx             Small local SVG icon set
    index.html
    vite.config.ts           React plugin, port 5173, development /api proxy
    package.json
    tsconfig.json
    tests/ticketQueues.test.mjs  Active/resolved transition tests
  package.json               Root dev/check/build/test commands
  pnpm-workspace.yaml        Packages and esbuild setup-script permission
  pnpm-lock.yaml             Locked dependency versions
  .gitignore
  .node-version
```

Phase 1 substantially changes `backend/src/database.ts`, `backend/src/app.ts`,
`frontend/src/App.tsx`, and `frontend/src/style.css`. It adds the tickets backend,
API tests, React components/hooks/contracts, and test scripts in the package files.
The existing server entry point, Vite proxy, and TypeScript configurations remain
appropriate. No additional dependencies were needed.

## Database schema

The default database is `backend/data/itops.sqlite`, resolved relative to the
backend module so both source and compiled runs use the same path. `DB_PATH` can
specify a different file; relative overrides are resolved from the backend process
working directory. The automated tests set it to a temporary database.

The `tickets` table contains:

| Column | Storage and meaning |
| --- | --- |
| id | INTEGER PRIMARY KEY AUTOINCREMENT; stable internal identifier |
| ticket_number | Generated, stored, unique TEXT: `INC-` plus `1000 + id` |
| title | Required TEXT, up to 160 characters |
| description | Required TEXT, up to 5000 characters |
| requester_name | Required TEXT, up to 100 characters |
| requester_email | Required TEXT, up to 254 characters; API checks email format |
| department | Required TEXT, up to 100 characters |
| category | Required TEXT constrained to the seven categories |
| priority | Required TEXT constrained to Low/Medium/High/Critical |
| status | Required TEXT constrained to Open/In Progress/Pending/Resolved |
| assigned_to | TEXT up to 100 characters; empty string means unassigned |
| created_at | UTC ISO 8601 TEXT, set by the backend on creation |
| updated_at | UTC ISO 8601 TEXT, set by the backend on creation and every patch |
| resolved_at | Nullable UTC ISO 8601 TEXT; only populated for Resolved tickets |

Allowed categories: Hardware, Software, Network, Printer, Account Access,
Microsoft 365, Other. SQL CHECK constraints enforce enums, string lengths, and
agreement between status and resolved_at. The API also validates these rules to
provide friendly field errors before executing SQL.

Ticket numbers are generated by SQLite rather than a count query. AUTOINCREMENT
prevents deleted IDs/numbers from being reused; gaps are normal. A descending
creation-date/ID index supports newest-first collection ordering.

Schema version 1 uses SQLite's `PRAGMA user_version`. The initial schema and nine
seed rows are applied in a single transaction. Later startups do not reseed, even
if every ticket has been deleted. Seed dates are relative to initial creation.
WAL mode allows readers alongside a writer, and a five-second busy timeout handles
brief write locks. Foreign key enforcement is enabled for future schema work.
SQLite is embedded and needs no separate database service.

## API architecture and contract

The request flow is Express router → validation → repository → SQLite. Routes
handle HTTP; validation handles untrusted input; the repository handles SQL and
timestamp rules. All user-provided SQL values use bound parameters. The application
is separate from its listener so tests can bind an ephemeral local port.

| Method and path | Success response |
| --- | --- |
| GET /api/health | 200: `{ "status": "ok", "service": "itops-api", "database": "ok" }` |
| GET /api/tickets | 200: `{ "tickets": [...] }`, newest created first |
| GET /api/tickets/:id | 200: `{ "ticket": {...} }` |
| POST /api/tickets | 201: `{ "ticket": {...} }` plus Location header |
| PATCH /api/tickets/:id | 200: `{ "ticket": {...} }` |
| DELETE /api/tickets/:id | 204 with no response body |
| GET /api/tickets/:id/notes | 200: `{ "notes": [...] }`, oldest first |
| POST /api/tickets/:id/notes | 201: `{ "note": {...} }` |

POST requires title, description, requester_name, requester_email, department,
and category. Priority defaults to Medium, status defaults to Open, and assigned_to
defaults to an empty string. The UI always creates Open tickets. The API also accepts
an explicit allowed priority/status/assigned_to.

PATCH accepts any subset of the nine editable input fields. The detail UI edits
only status, priority, and assigned_to. An empty PATCH is rejected. ID, number, and
timestamps are read-only; unknown fields are rejected. Null is not accepted for
editable fields; use an empty string to unassign. Strings are trimmed.

Resolving sets resolved_at to the current UTC time. Editing a ticket that remains
Resolved preserves the original resolution timestamp. Reopening clears it, and
resolving again records the new time. Created_at never changes.

Errors use consistent JSON, for example:

```json
{
  "error": {
    "message": "Please correct the ticket fields.",
    "fields": { "requester_email": "Enter a valid email address." }
  }
}
```

Invalid bodies, enums, fields, JSON, or IDs return 400. Missing tickets/endpoints
return 404. JSON bodies over 32 KB return 413. Unexpected failures return a generic
500 response and are logged on the server. Health returns 503 if its SQLite check
fails. The API binds to localhost; PORT defaults to 3001. Update the Vite proxy if
changing PORT. No environment file is needed for the default setup.

Example creation body:

```json
{
  "title": "Docking station display issue",
  "description": "External display is not detected after reconnecting the dock.",
  "requester_name": "Demo User",
  "requester_email": "demo.user@example.com",
  "department": "Operations",
  "category": "Hardware",
  "priority": "Medium"
}
```

## Frontend architecture and behavior

The browser uses `fetch('/api/tickets')`. Vite forwards /api to
http://127.0.0.1:3001, keeping development requests on the browser's origin without
CORS setup. No routing, state-management, component, icon, or validation library
was added.

App owns the collection and persistent layout. useTickets aborts obsolete requests
and refreshes authoritative data after successful creates/updates. Dashboard derives
all KPI values from the collection. Critical Tickets counts every Critical ticket,
including resolved ones; this is labeled "Across all statuses". The five most recent
tickets are ordered by creation time, not update time. Pending is distinct from Open.

TicketsPage partitions the same collection into an active Tickets view (Open,
In Progress, Pending) and a Resolved Tickets view (Resolved only). It applies
case-insensitive text search and AND-combined priority/category filters locally;
the active view also supports an active-status filter. Text search covers number, title, description,
requester name/email, department, category, and assigned technician. Filtering is
intentionally client-side for this small dataset; pagination and server-side search
would be the next step for larger queues. Collection data refreshes on initial load
and successful mutations, not through live polling or subscriptions.

Hash URLs such as `#/tickets/1` support refresh, bookmarking, and browser navigation
without requiring server URL rewrites. TicketTable rows respond to clicks; ticket
number links are keyboard accessible. On small screens, navigation stays visible,
cards/forms stack, and the table scrolls horizontally inside its panel.

TicketForm preserves input on API errors, surfaces field errors, disables controls
while saving, and shows a success notice after creation. Modal uses a native dialog
for focus containment and Escape; dismissing is disabled during a mutation.
TicketDetail fetches a fresh record, displays all fields, edits triage/ownership,
and shows saved/error states. Form controls use visible labels; badges use text as
well as color, loading uses status announcements, and errors use alerts. Dates are
stored in UTC and displayed in the browser's local timezone.

The resolved archive uses `#/resolved-tickets`; resolving/reopening changes view
membership through status alone. Detail links use the same ticket ID in both views.
Dashboard still receives the unfiltered collection. Archive search operates on
ticket fields; open the ticket to read its note history.

DELETE is exposed and tested through the API. A delete button is not part of the
requested UI workflow. Assets is only a future-phase placeholder.

## Dependencies

- React / react-dom: browser components and rendering.
- TypeScript and @types packages: compile-time checking and library declarations.
- Vite / @vitejs/plugin-react: frontend development, React refresh, production build.
- Node.js: backend runtime and built-in node:sqlite database access.
- Express: HTTP routing and JSON middleware.
- tsx: run and watch backend TypeScript in development.
- concurrently: run both development servers from the root.
- pnpm: workspace package management and reproducible lockfile.

Node's built-in SQLite API is synchronous and may emit a version-dependent warning.
This keeps the portfolio foundation small. Synchronous queries block the Node event
loop; a larger production workload would merit revisiting the database access model.
The workspace explicitly allows esbuild's platform binary setup script.

## Tests and interview talking points

`pnpm test` uses Node's built-in test runner and fetch, with no new test dependency.
Tests exercise all major endpoints, defaults, read-only fields, string/enum/email
validation, invalid IDs, missing records, malformed/oversized JSON, SQL punctuation,
resolve/reopen behavior, deletion, and non-reused numbers. They close the connection
and start fresh Node processes to prove created/updated data persists on disk and
that deleted tickets are not reseeded. Tests never use your development database.

Useful topics to explain in an interview:

1. TypeScript is compile-time protection; HTTP JSON still needs runtime validation.
2. Prepared SQL values prevent injection. SQL constraints provide a second layer of
   data integrity, while API validation returns readable errors.
3. A transaction makes migration and seeding atomic; schema versioning prevents
   duplicate seeds. Generated ticket numbers avoid count-based allocation races.
4. PATCH changes supplied fields only. Resolution timestamps follow the status
   transition rather than simply being overwritten on every edit.
5. React controlled forms keep drafts separate from persisted server records.
   Successful mutations refresh the collection, so KPI counts remain data-derived.
6. The development proxy solves local cross-origin routing; it is not production
   hosting. Hash navigation is a deliberate small-project simplification.
7. SQLite, local text technician names, synchronous access, client-side filtering,
   and last-write-wins edits suit this phase. Real multi-user operations would later
   need authentication, concurrency controls, pagination, and a deployment strategy.

Commit source, tests, documentation, and pnpm-lock.yaml. Local databases, SQLite
journal files, dependencies, build output, and secrets are ignored. No GitHub remote,
commit, or deployment has been created by this implementation.

## Internal notes and database version 2

An additive migration upgrades existing version 1 databases automatically at
startup. No tickets are moved, deleted, or reseeded. Fresh databases receive both
migrations. The transaction creates the table/index and sets PRAGMA user_version
to 2; a failure rolls back the migration.

`ticket_notes` is a separate one-to-many relation:

| Column | Meaning |
| --- | --- |
| id | Autoincrementing INTEGER primary key |
| ticket_id | Required INTEGER foreign key to tickets(id) |
| author | Required trimmed TEXT, 1–100 characters |
| content | Required trimmed TEXT, 1–5000 characters |
| created_at | Server-generated UTC ISO 8601 TEXT |

Each row represents a new note; existing notes are never overwritten by a POST.
The `(ticket_id, created_at, id)` index supports chronological retrieval with a
deterministic ID tie-breaker. Foreign keys prevent orphan notes. Status updates,
including resolution and reopening, do not touch notes. Existing ticket DELETE
uses ON DELETE CASCADE to remove that ticket's dependent notes; this does not add
a separate note deletion/editing endpoint or control.

GET /api/tickets/:id/notes returns an empty array for an existing ticket without
notes, and 404 for a missing ticket. POST accepts exactly:

```json
{ "author": "Demo Technician", "content": "Checked the adapter and confirmed the solution." }
```

Ticket ID comes from the URL; note ID and creation time are server controlled.
Unknown/read-only fields, nulls, whitespace-only strings, wrong types, and excessive
lengths return 400 with field errors. Malformed IDs return 400 and missing parent
tickets return 404. Notes may be added to active or resolved tickets. There are no
note edit/delete endpoints, customer-visible comments, or notifications.

InternalNotes loads independently of the ticket metadata. It shows author,
timestamp, and plain-text content oldest first, with loading, empty, retry, and
error states. The composer preserves drafts on failure, disables submission while
saving, clears only the content after success, and refreshes the complete history.
Adding a note does not alter ticket updated_at or resolved_at; each note has its
own timestamp. It remains mounted across status changes, keeping the history and
unsaved note draft intact.

Author names are manually entered and are not verified identities. "Internal only"
describes the intended audience; authentication and access controls are deliberately
not implemented in this phase. Do not explain this label as a security boundary.

Additional interview topics: relational normalization keeps repeating notes out of
the ticket row, the foreign key enforces ownership, append-only endpoints preserve
troubleshooting context, stable chronological ordering handles matching timestamps,
and status-derived views separate workflows without duplicating stored records.
The notes are troubleshooting entries, not an automatic ticket activity/audit log.

Verification now includes frontend queue partition/transition tests plus backend
note validation, append semantics, status changes, foreign-key/cascade behavior,
version 1 migration, and full API restart persistence. Existing ticket regression
tests still run. All automated databases are temporary and isolated from local data.
