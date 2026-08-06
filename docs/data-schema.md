# Data Schema

This document defines the main fields used for trial logging, dashboard summaries, adaptive difficulty, and optional gaze metrics.

The schema may change during development, but any changes to logged fields should be updated here.

## Trial-level fields
| Field | Type | Description |
|---|---|---|
| participantId | string | Participant identifier entered at login (normalised to uppercase) |
| sessionId | string | Pseudonymous session identifier (`{participantId}_{timestamp}`) |
| trialId | number/string | Unique trial ID |
| stimulusId | string | ID of displayed stimulus |
| correctEmotion | string | Correct emotion label |
| selectedEmotion | string/null | Emotion selected by user |
| isCorrect | boolean/null | Whether the response was correct |
| reactionTimeMs | number/null | Time from stimulus onset to response |
| difficulty | number (0–1) / null / `"unassigned"` | Difficulty score derived from `metadata.json` (see "Stimulus fields" below); 0 = easiest, 1 = hardest; `null` for stimuli without KDEF metadata; `"unassigned"` if the field is missing entirely |
| mode | string | Current game mode; currently set to `"normal"` as a placeholder |
| timestamp | string | ISO timestamp recording when the trial log was created |

## Stimulus fields
| Field | Type | Description |
|---|---|---|
| stimulusId | string | Unique identifier for the stimulus (KDEF filename stem, e.g. `AF01ANFL`) |
| emotion | string | Correct emotion label associated with the stimulus |
| difficulty | number (0–1) / null | Difficulty score exposed by `stimuliManifest.js`, taken directly from `difficultyScore` in `metadata.json` (see below); 0 = easiest, 1 = hardest; `null` for stimuli without metadata |
| angle | string / null | KDEF viewing angle (`FL`, `HL`, `S`, `HR`, `FR`); `null` for non-KDEF stimuli |
| imageSrc | string/null | Path or imported source for the displayed image stimulus |
| emoji | string/null | Fallback placeholder display if no image is available |

## Export fields
| Field | Type | Description |
|---|---|---|
| filename | string | Generated CSV filename, currently based on the session ID |
| exportFormat | string | Current export format is CSV |

## Adaptive difficulty fields

### Stimulus metadata (`src/stimuli/metadata.json`)
One entry per stimulus image, keyed by uppercase filename stem. Covers both KDEF photos and cartoon stimuli.

| Field | Type | Description |
|---|---|---|
| type | `"kdef"` / `"cartoon"` | Dataset the image comes from |
| emotion | string | Lowercase emotion label matching the subfolder name |
| kdefCode | string | Two-letter expression code (`AF`, `AN`, `DI`, `HA`, `NE`, `SA`, `SU`) |
| session | string / omitted | KDEF session (`A` or `B`); omitted for cartoon stimuli |
| gender | string | `F` (female) or `M` (male) |
| identity | string | Identity prefix, e.g. `AF01` (KDEF) or `CF02` (cartoon) |
| angle | string | Viewing angle; KDEF: `FL`, `HL`, `S`, `HR`, `FR` — cartoons always `S` |
| difficultyScore | number (0–1) | Difficulty score for KDEF images, derived from the Hᵤ hit rate in the norming study (0 = easiest, 1 = hardest — see below); `0` for all cartoon images |
| confounding | string / string[] / omitted | Most commonly mis-selected emotion(s) for this KDEF expressor × emotion pair, from Appendix 1 of the KDEF norming study; string for a single confound, array for multiple, omitted where the norming data was `n/a`/`Indistinct` or the image wasn't in the Appendix 1 top-20 list |

### Difficulty score (Hᵤ)
`difficultyScore` in `metadata.json` is derived from the unbiased hit rate (Hᵤ) per expressor × emotion combination, taken from Appendix 2 of the KDEF norming study. Hᵤ represents the proportion of trials on which participants correctly identified the emotion, corrected for response bias, and ranges from 0 (never correctly identified) to 1 (always correctly identified). `difficultyScore` is stored as the inverse of Hᵤ, so it follows the game's 0-easiest/1-hardest convention directly — no further transformation is applied when it's exposed as `difficulty` by `stimuliManifest.js`.

The same score is shared across all viewing angles for a given expressor × emotion pair, since the norming study used front-facing images only.

Source: Goeleven, E., De Raedt, R., Leyman, L., & Verschuere, B. (2008). The Karolinska Directed Emotional Faces: a validation study. *Cognition & Emotion*, 22(6), 1094–1118.

### Confounding emotion(s)
The most commonly mis-selected non-target emotion(s) for a given expressor × emotion pair, taken from Appendix 1 of the same KDEF norming study (top-20 rated images per emotion). Wording is normalised to match the `emotion` field convention (e.g. `Disgusted` → `disgust`, `Fearful` → `fear`). Where Appendix 1 lists more than one non-target emotion for a pair (slash-separated), all are recorded as a string array. Entries rated `n/a` or `Indistinct` — and images outside the Appendix 1 top-20 — have no `confounding` field.

The same value is shared across all viewing angles and both sessions (A/B) for a given expressor × emotion pair, same as `difficultyScore`.

### Adaptive tier state (per participant, persisted server-side)
Stored in the `adaptive_state` SQLite table (see "Backend / API" below), one
row per participant, keyed by `participant_id`. The tier-transition logic
itself is implemented in `src/adaptive/tierEngine.js` and stays on the
frontend — the server only stores whatever state the client sends via
`PUT /api/participants/:id/adaptive-state`.

The game divides the stimulus pool into 5 cumulative difficulty tiers, each
defined by a ceiling on the `difficulty` field (0 = easiest, 1 = hardest, see
"Difficulty score (Hᵤ)" above): a tier's pool is every stimulus with
`difficulty ≤ TIER_THRESHOLDS[tierIndex]`, so easier stimuli stay in rotation
alongside newly-unlocked harder ones. Thresholds (`TIER_THRESHOLDS` in
`tierEngine.js`): `[0.17, 0.33, 0.48, 0.68, 1.00]` — starting values, computed
from the decile spread of KDEF `difficultyScore`s, retune after pilot testing.

New participants start at tier 0. Tier changes are evaluated once per
completed session and take effect at the start of the *next* session (no
mid-session jumps): two consecutive sessions scoring ≥ 80 promote one tier;
two consecutive sessions scoring ≤ 50 demote one tier; scores in the 51–79
dead zone reset both streak counters without changing the tier. Tier is
clamped to `[0, 4]`.

| Field | Type | Description |
|---|---|---|
| version | number | Schema version, currently `1` |
| tierIndex | number (0–4) | Current difficulty tier; higher = harder cumulative pool |
| consecutiveAbove | number | Sessions in a row scoring ≥ 80 (tier promoted at 2) |
| consecutiveBelow | number | Sessions in a row scoring ≤ 50 (tier demoted at 2) |
| history | array | Most recent 20 session records `{ timestamp, sessionId, compositeScore, tierIndex, direction }`, where `direction` is `"promote"`, `"demote"`, or `"none"` |

### Session-level composite score
Computed after each session in `src/adaptive/scoring.js`.

| Field | Type | Description |
|---|---|---|
| accuracyScore | number (0–1) | `correctCount / totalTrials` |
| speedScore | number (0–1) | Normalised mean RT on correct trials only (300–6000 ms window) |
| compositeScore | number (0–100) | `round(100 × (0.70 × accuracyScore + 0.30 × speedScore))` |
| meanReactionTimeMs | number | Mean reaction time across all trials in the session |

## Participant login fields

Participants "log in" with a self-chosen participant ID and 4-digit PIN so
the game can find their previous results on a different browser/device. The
PIN is verified server-side against a salted hash — see "Backend / API"
below for the access-control scheme. This is still a lightweight scheme
appropriate for a non-diagnostic research prototype, not a general-purpose
auth system: there are no password-reset flows, rate limiting, or per-teacher
accounts.

### Participant store (persisted in SQLite, `server/data.sqlite`)
Table: `participants`, one row per participant, keyed by `participant_id`:

| Field | Type | Description |
|---|---|---|
| participant_id | string | Participant identifier entered at login (normalised to uppercase) |
| pin_hash | string | scrypt hash of the 4-digit PIN, hex-encoded (not stored in plain text) |
| pin_salt | string | Random salt used for `pin_hash`, hex-encoded, unique per participant |
| created_at | string | ISO timestamp of first login/registration |

Session summaries and adaptive tier state are stored in separate tables
(`sessions`, `adaptive_state`) rather than nested under the participant row —
see "Adaptive tier state" above and "Session-level composite score" below for
their field shapes, and "Backend / API" for the table definitions.

### Session summary (per entry in `sessions`)
| Field | Type | Description |
|---|---|---|
| sessionId | string | Matches `sessionId` in the trial-level logs for that session |
| compositeScore | number (0–100) | See "Session-level composite score" below |
| accuracyScore | number (0–1) | `correctCount / totalTrials` |
| correctCount | number | Number of correct trials in the session |
| totalTrials | number | Total trials in the session |
| meanReactionTimeMs | number | Mean reaction time across all trials in the session |
| timestamp | string | ISO timestamp recording when the session finished |

Note: this `sessions` array and the adaptive tier state's own `history` array
(see "Adaptive tier state" above) are separate lists updated at the same
point in the code (end of session, in `GameSession.jsx`) but serve different
purposes — `sessions` is the full session-summary log, while adaptive
`history` additionally records the tier and promote/demote/none direction
that resulted from each session's score.

### Guardian store (persisted in SQLite, `server/data.sqlite`)

Guardians (parents/carers) can sign up for a read-only dashboard of a
participant's progress. Guardian accounts are entirely separate from the
child's game login: signup verifies the child's *current* PIN (a read-only
check, proving the guardian legitimately knows it) but never rewrites
`participants.pin_hash`/`pin_salt` — the child's PIN and game login are
completely unaffected by guardian signup. A guardian account has its own ID
(an email-shaped handle) and password, hashed the same way as participant
PINs (see "Access control" below).

Table: `guardians`, one row per guardian account, keyed by `guardian_id`:

| Field | Type | Description |
|---|---|---|
| guardian_id | string | Self-chosen login handle (email-shaped), lowercased |
| participant_id | string | The linked participant (`participants.participant_id`); not unique — multiple guardians (e.g. both parents) can independently link to the same child |
| password_hash | string | scrypt hash of the guardian's password, hex-encoded |
| password_salt | string | Random salt used for `password_hash`, hex-encoded, unique per guardian |
| created_at | string | ISO timestamp of account creation |

Guardian bearer tokens are stored in a separate `guardian_auth_tokens` table
(`token`, `guardian_id`, `expires_at`) rather than reusing `auth_tokens` with
a type discriminator, so foreign-key targets stay unambiguous — matching this
schema's existing preference for explicit separate tables (`sessions` vs
`adaptive_state`) over polymorphic ones.

### Confusion matrix (guardian dashboard)

Returned by `GET /api/guardians/me/dashboard` as `confusionMatrix`:

| Field | Type | Description |
|---|---|---|
| emotions | string[] | The 7 emotion labels, in a fixed order (row/column order for `matrix`) |
| matrix | number[][] | Dense 7×7 grid; `matrix[i][j]` = count of trials where the correct emotion was `emotions[i]` and the selected emotion was `emotions[j]`. Diagonal = correct answers |
| totalTrials | number | Total answered trials (`selected_emotion IS NOT NULL`) summed across the grid |

Built server-side from a `GROUP BY correct_emotion, selected_emotion` query
over `trial_logs`, reshaped in JS into the dense zero-filled grid (SQLite has
no pivot). The emotion order is a hardcoded `EMOTIONS` array in
`server/src/routes/guardians.js`, duplicated from `emotionOptions` in
`src/stimuli/stimuliManifest.js` — that file relies on `import.meta.glob`
(Vite-only), so it can't be imported from the standalone Node server. Keep
the two lists in sync manually if the 7 emotions ever change.

## Backend / API

Participant, session, adaptive-state, and trial-level data are persisted by
a standalone Express + SQLite server in `server/` (not part of the Vite
frontend — see README "Running locally"). Trial logs, which previously only
existed in React state during a session and as an optional CSV download, are
now written server-side at the end of each session via `POST
/api/participants/:id/trials`.

### Access control
- `POST /api/participants/login` verifies the PIN against the salted scrypt
  hash in `participants.pin_hash`/`pin_salt` and, on success, issues a random
  opaque bearer token (`auth_tokens` table: `token`, `participant_id`,
  `expires_at`; 24h TTL).
- All other participant-scoped endpoints require `Authorization: Bearer
  <token>` for a token belonging to that same `:id` — one participant's
  token cannot read or write another participant's data.
- Dashboard endpoints require an `x-admin-key` header matching the
  `ADMIN_API_KEY` environment variable (`server/.env`) — there are no
  per-teacher accounts at this prototype scale.
- `POST /api/guardians/signup` verifies the child's PIN (read-only, does not
  overwrite it) and, on success, hashes the guardian's own password with the
  same scrypt scheme as participant PINs and issues a guardian bearer token
  (`guardian_auth_tokens` table; same 24h TTL as participant tokens).
  `POST /api/guardians/login` verifies guardian ID + password and issues a
  fresh token the same way.
- All other guardian endpoints require `Authorization: Bearer <token>` for a
  valid guardian token. Unlike participant auth, there's no URL `:id` param
  to check against — the guardian's identity and linked `participantId` are
  derived entirely from the token, so there's no client-supplied ID a caller
  could spoof to read another guardian's participant.

### Endpoints
| Method & path | Purpose | Auth |
|---|---|---|
| `POST /api/participants/login` | Register-or-login by ID+PIN; returns `{ participant, token }` | none (this *is* the auth step) |
| `GET /api/participants/:id/sessions` | Session summary history (last 20) | participant token |
| `GET /api/participants/:id/adaptive-state` | Current adaptive tier state | participant token |
| `PUT /api/participants/:id/adaptive-state` | Update adaptive tier state after a session | participant token |
| `POST /api/participants/:id/sessions` | Append one session summary | participant token |
| `POST /api/participants/:id/trials` | Batch-insert a session's trial logs | participant token |
| `GET /api/dashboard/participants` | All participants + latest score/tier | admin key |
| `GET /api/dashboard/participants/:id` | Full session + trial-log detail for one participant | admin key |
| `POST /api/guardians/signup` | Verify child's PIN (read-only) and create a guardian account; returns `{ guardianId, participantId, token }` | none (this *is* the auth step) |
| `POST /api/guardians/login` | Log in with guardian ID + password; returns `{ guardianId, participantId, token }` | none (this *is* the auth step) |
| `GET /api/guardians/me` | Guardian identity + linked `participantId` | guardian token |
| `GET /api/guardians/me/dashboard` | Full session history + confusion matrix for the linked participant | guardian token |

## Gaze estimation fields
| Field | Type | Description |
|---|---|---|
