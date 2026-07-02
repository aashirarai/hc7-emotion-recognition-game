# Data Schema

This document defines the main fields used for trial logging, dashboard summaries, adaptive difficulty, and optional gaze metrics.

The schema may change during development, but any changes to logged fields should be updated here.

## Trial-level fields
| Field | Type | Description |
|---|---|---|
| sessionId | string | Pseudonymous session identifier |
| trialId | number/string | Unique trial ID |
| stimulusId | string | ID of displayed stimulus |
| correctEmotion | string | Correct emotion label |
| selectedEmotion | string/null | Emotion selected by user |
| isCorrect | boolean/null | Whether the response was correct |
| reactionTimeMs | number/null | Time from stimulus onset to response |
| difficulty | string | Difficulty label for the stimulus, or `"unassigned"` if not specified |
| mode | string | Current game mode; currently set to `"normal"` as a placeholder |
| timestamp | string | ISO timestamp recording when the trial log was created |

## Stimulus fields
| Field | Type | Description |
|---|---|---|
| stimulusId | string | Unique identifier for the stimulus (KDEF filename stem, e.g. `AF01ANFL`) |
| emotion | string | Correct emotion label associated with the stimulus |
| difficulty | number (1–5) / null | Difficulty tier from `kdefMetadata.json`; `null` for stimuli without KDEF metadata |
| angle | string / null | KDEF viewing angle (`FL`, `HL`, `S`, `HR`, `FR`); `null` for non-KDEF stimuli |
| imageSrc | string/null | Path or imported source for the displayed image stimulus |
| emoji | string/null | Fallback placeholder display if no image is available |

## Export fields
| Field | Type | Description |
|---|---|---|
| filename | string | Generated CSV filename, currently based on the session ID |
| exportFormat | string | Current export format is CSV |

## Adaptive difficulty fields

### Stimulus metadata (`src/stimuli/kdefMetadata.json`)
One entry per KDEF image, keyed by uppercase filename stem.

| Field | Type | Description |
|---|---|---|
| emotion | string | Lowercase emotion label matching the `images/` subfolder name |
| kdefCode | string | Original two-letter KDEF expression code (`AF`, `AN`, `DI`, `HA`, `NE`, `SA`, `SU`) |
| session | string | KDEF session (`A` = series one, `B` = series two) |
| gender | string | `F` (female) or `M` (male) |
| identity | string | Full identity prefix, e.g. `AF01` |
| angle | string | Viewing angle (`FL` full-left, `HL` half-left, `S` straight, `HR` half-right, `FR` full-right) |
| difficultyTier | number (1–5) | Difficulty tier assigned from literature (see table below) |

### Difficulty tier scheme
Grounded in Wang et al. (2024) recognition-difficulty ordering for children.

| Tier | Label | Emotions | Rationale |
|---|---|---|---|
| 1 | Easiest | happy (HA), neutral (NE) | Near-ceiling child accuracy; unambiguous visual cues |
| 2 | Easy | surprise (SU) | Distinctive wide-eyes/open-mouth signature |
| 3 | Moderate | disgust (DI), sad (SA) | Frequently confused with each other and with neutral in child samples |
| 4 | Hard | fear (AF) | Often confused with surprise |
| 5 | Hardest | angry (AN) | Lowest child recognition accuracy in the literature |

### Session-level adaptive state (persisted in `localStorage`)
Key: `hc7_adaptive_state_v1`

| Field | Type | Description |
|---|---|---|
| version | number | Schema version, currently `1` |
| currentTier | number (1–5) | Child's current adaptive difficulty tier |
| consecutiveAbove | number | Sessions in a row scoring ≥ 80 (level-up streak) |
| consecutiveBelow | number | Sessions in a row scoring ≤ 50 (level-down streak) |
| history | array | Most recent 20 session records `{ timestamp, sessionId, compositeScore, tier, direction }` |

### Session-level composite score
Computed after each session in `src/adaptive/scoring.js` (not yet implemented).

| Field | Type | Description |
|---|---|---|
| accuracyScore | number (0–1) | `correctCount / totalTrials` |
| speedScore | number (0–1) | Normalised mean RT on correct trials only (300–6000 ms window) |
| compositeScore | number (0–100) | `round(100 × (0.70 × accuracyScore + 0.30 × speedScore))` |
| meanReactionTimeMs | number | Mean reaction time across all trials in the session |

## Gaze estimation fields
| Field | Type | Description |
|---|---|---|
