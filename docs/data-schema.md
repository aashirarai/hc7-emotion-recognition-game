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

## Adaptive difficulty fields
| Field | Type | Description |
|---|---|---|


## Gaze estimation fields
| Field | Type | Description |
|---|---|---|
