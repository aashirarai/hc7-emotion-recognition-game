# Development Log

This file records key technical and project decisions during development.

## 05/06/2026

### Decision
Set up the project repository using React + Vite.

### Reason
The project is a browser-based interactive prototype, so React is suitable for building reusable UI components such as the game screen, response buttons, dashboard views, webcam consent screen, and adaptive difficulty controls. Vite provides a lightweight development setup.

### Impact / Next step
Use the React/Vite scaffold as the foundation for the shared game platform. Core game code will be organised under `src/`, with separate areas for the game, data logging, dashboard, adaptive difficulty, and optional gaze functionality.


## 05/06/2026

### Decision

Create an initial trial-level data schema.

### Reason

The core game, dashboard, adaptive difficulty module, and optional gaze module will all depend on consistent trial-level field names. Defining the main fields early should reduce integration issues later.

### Impact / Next step

Use `docs/data-schema.md` as the reference for data logging fields such as `sessionId`, `trialId`, `stimulusId`, `correctEmotion`, `selectedEmotion`, `isCorrect`, and `reactionTimeMs`. These can change during development.

Adaptive difficulty and gaze estimation fields will be added once those modules are developed.


## 14/07/2026

### Decision

Add a participant login screen (participant ID + 4-digit PIN) as a prerequisite for adaptive difficulty. Currently, participants self-register on first use, where they decide their own ID. Data is stored client-side in `localStorage` (`hc7_participants_v1`), with the PIN hashed (SHA-256) rather than stored in plain text.

### Reason

Adaptive difficulty and "show my previous results" both require the game to know which participant is currently playing and to reload their history. There is no backend yet, so `localStorage` is the only available persistence layer — consistent with how `hc7_adaptive_state_v1` was already planned. The PIN is explicitly *not* a security mechanism (no server, no rate limiting); it exists only to reduce accidental cross-loading of another child's profile on a shared device.

### Impact / Next step

- `sessionId` is now derived from `participantId` (`{participantId}_{timestamp}`), and trial logs carry a `participantId` field.
- Session composite scores are saved to the participant's history (`sessions`, capped at 20) on session completion, and the start screen shows the most recent one.
- Next: scope `hc7_adaptive_state_v1` per participant (currently still global) so the adaptive difficulty module can read/write per-child state.
- If the game later needs to run across multiple devices for the same participant, this login flow will need to move to a real backend — the current approach will not carry over automatically.


## 28/07/2026

### Decision

Add a standalone Node/Express + SQLite backend (`server/`) and move all participant data off `localStorage`: participant records, session summaries, and adaptive tier state now live in SQLite tables, and trial-level logs (previously never persisted — only held in React state and an optional manual CSV download) are now written server-side at the end of each session.

Access control: `POST /api/participants/login` verifies the PIN server-side against a salted hash (`crypto.scryptSync`, per-participant salt) and issues an opaque bearer token (24h TTL). All participant-scoped writes require `Authorization: Bearer <token>` matching that participant's ID. A separate admin key (`x-admin-key`, checked against `ADMIN_API_KEY`) gates the new dashboard read endpoints.

The SQLite driver is Node's built-in `node:sqlite` (`DatabaseSync`), not `better-sqlite3` as originally planned — `better-sqlite3`'s native build failed on the dev machine (no Visual Studio Build Tools for node-gyp). `node:sqlite` gives the same synchronous prepared-statement API with no native compilation step, at the cost of requiring Node 22.5+.

### Reason

This closes the gap flagged in the 14/07/2026 entry: `localStorage` never let a participant be recognised on a different device, and blocked the planned teacher dashboard (`src/dashboard/`) since trial-level data was never persisted anywhere. A real server also meant the old unsalted-SHA-256, no-server PIN check was no longer just a UX nicety — once data crosses the network, something has to stop one client writing/reading another participant's data, hence the bearer-token + admin-key scheme above.

### Impact / Next step

- `src/data/participantStore.js` keeps its previous exported function signatures (`loginOrRegister`, `addSessionResult`, `getParticipantSessions`, `getAdaptiveState`, `updateAdaptiveState`) but now calls the API; it caches each participant's bearer token in an in-memory `Map` (set at login) so callers don't need to thread the token through every call. New export: `saveTrialLogs(participantId, sessionId, logs)`.
- `GameSession.jsx`'s `handleNext` is now `async` (fetch calls can't be sync like the old localStorage reads) and calls `saveTrialLogs` alongside the existing `addSessionResult` call at session end.
- Running locally is now two processes — `server/` (`npm run dev`, port 3001) and the existing Vite frontend — documented in `README.md`. `VITE_API_BASE_URL` (repo-root `.env`, defaults to `http://localhost:3001`) points the frontend at the API.
- Verified end-to-end with a Playwright-driven browser session (register → play 10 trials → summary screen) and by querying `GET /api/dashboard/participants/:id` to confirm the session summary and all 10 trial-log rows landed in `server/data.sqlite`.
- Next: no deployment/hosting config yet (local dev only, per current scope). `src/dashboard/` (teacher-facing views) can now be built against the `GET /api/dashboard/*` endpoints, which were added for exactly that purpose but aren't consumed anywhere yet.


## 04/08/2026

### Decision

Build `src/dashboard/` out as a guardian/parent-facing progress dashboard, gated behind a new role-picker landing screen (`RoleSelectScreen`) that forks the app into the existing student flow or a new guardian flow. Guardians get their own identity system, entirely separate from participant PINs: `POST /api/guardians/signup` verifies the child's *current* PIN read-only (proving the guardian legitimately knows it) but never rewrites `participants.pin_hash`/`pin_salt` — it then creates a fully independent guardian account (its own ID + password, `guardians` + `guardian_auth_tokens` tables) for dashboard access. `GET /api/guardians/me/dashboard` returns the full (uncapped) session history plus a server-computed 7×7 emotion confusion matrix. Charts (`AccuracyChart`, `ResponseTimeChart`, `TierProgressionChart`) use Recharts — the first UI dependency in this frontend beyond `react`/`react-dom`.

### Reason

The original ask described guardian sign-up setting "a new PIN" that would replace the child's, but `participants.pin_hash` is the same field the child's game login checks — overwriting it at guardian signup would lock the child out of the game itself, not just the dashboard. Verify-then-create-separate-account gets the "prove you know the child's PIN" gatekeeping without that side effect. This was flagged to the user as a deviation from the literal original spec rather than assumed silently.

Hand-rolled SVG charts (matching this frontend's zero-dependency-beyond-React posture, and the backend's raw-SQL-no-ORM style) were the initial plan, but the user opted for a chart library once the tradeoff was raised — Recharts was faster to build against and is actively maintained (its 2.x line is deprecated, so this went straight to 3.x).

### Impact / Next step

- New tables: `guardians` (`guardian_id` PK, non-unique `participant_id` FK — so two guardians can independently link to one child, e.g. both parents), `guardian_auth_tokens` (kept separate from `auth_tokens` rather than adding a type discriminator, matching this schema's existing preference for explicit tables over polymorphic ones).
- `requireGuardianAuth` derives `guardianId`/`participantId` entirely from the bearer token — unlike `requireParticipantAuth`, there's no client-supplied URL `:id` to cross-check, so there's nothing to spoof.
- Confusion matrix emotion order is a hardcoded `EMOTIONS` array in `server/src/routes/guardians.js`, manually duplicated from `emotionOptions` in `src/stiuli/stimuliManifest.js` (that file uses `import.meta.glob`, Vite-only, so it can't be imported into the standalone Node server) — a manual-sync point if the 7 emotions ever change.
- Guardian dashboard's session list is uncapped, but `adaptive_state.history_json` (where per-session `tierIndex` is looked up from) is still capped at 20 entries, so participants with >20 sessions show `tierIndex: null` for older sessions in the tier chart — a pre-existing limitation of the adaptive-state history, not fixed here.
- Verified via direct API calls (register/login/session/trial posts, then guardian signup/login/dashboard fetches) against the already-running dev server, cross-checked against `server/data.sqlite` directly: wrong-PIN and unknown-participant signup errors, duplicate/second-guardian signup, login success/failure (collapsed to one `invalid_credentials` error), and the returned confusion matrix and per-session `tierIndex` values matched hand-posted trial data exactly. Confirmed `pin_hash`/`pin_salt` byte-for-byte unchanged after guardian signup. `npm run lint` and `npm run build` both pass.
- Not yet verified: an actual browser click-through of the role picker → guardian signup form → rendered dashboard/charts — no browser automation tooling was available in that session. Needs a manual pass before this is considered fully done.
- Next: no rate-limiting anywhere in this codebase (pre-existing gap, now also applies to `/api/guardians/signup`'s PIN check); no password-reset flow for guardians; guardian dashboard is read-only, no way yet for a guardian to unlink or remove their account.