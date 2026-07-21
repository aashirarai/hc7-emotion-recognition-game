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

### Session-level adaptive state (persisted in `localStorage`)
Key: `hc7_adaptive_state_v1`

| Field | Type | Description |
|---|---|---|
| version | number | Schema version, currently `1` |
| difficultyThreshold | number (0–1) | Upper bound on the game's `difficulty` field (0 = easiest, 1 = hardest, see "Difficulty score (Hᵤ)" above) for the current stimulus pool; stimuli with `difficulty ≤ threshold` are selected. Higher threshold = harder pool. Starting value TBD after pilot testing. |
| consecutiveAbove | number | Sessions in a row scoring ≥ 80 (threshold raised on next session) |
| consecutiveBelow | number | Sessions in a row scoring ≤ 50 (threshold lowered on next session) |
| history | array | Most recent 20 session records `{ timestamp, sessionId, compositeScore, difficultyThreshold, direction }` |

### Session-level composite score
Computed after each session in `src/adaptive/scoring.js` (not yet implemented).

| Field | Type | Description |
|---|---|---|
| accuracyScore | number (0–1) | `correctCount / totalTrials` |
| speedScore | number (0–1) | Normalised mean RT on correct trials only (300–6000 ms window) |
| compositeScore | number (0–100) | `round(100 × (0.70 × accuracyScore + 0.30 × speedScore))` |
| meanReactionTimeMs | number | Mean reaction time across all trials in the session |

## Participant login fields

Participants "log in" with a self-chosen participant ID and 4-digit PIN so
the game can find their previous results on the same browser/device. **This
is an identification convenience, not authentication** — there is no server,
so the PIN cannot stop someone with access to the browser's storage from
reading another participant's data. It only guards against accidentally
loading the wrong child's profile on a shared device.

### Participant store (persisted in `localStorage`)
Key: `hc7_participants_v1`

One entry per participant, keyed by `participantId`:

| Field | Type | Description |
|---|---|---|
| pinHash | string | SHA-256 hex digest of the 4-digit PIN (not stored in plain text) |
| createdAt | string | ISO timestamp of first login/registration |
| sessions | array | Up to the most recent 20 session summaries, see below |

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

Note: this session-summary history is what the adaptive difficulty module's
`history` field (see below) is expected to read from once per-participant
adaptive state is implemented — currently `hc7_adaptive_state_v1` is a single
global key and is not yet participant-scoped.

## Gaze estimation fields
| Field | Type | Description |
|---|---|---|
