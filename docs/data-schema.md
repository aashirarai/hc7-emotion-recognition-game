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
| stimulusId | string | Unique identifier for the stimulus |
| emotion | string | Correct emotion label associated with the stimulus |
| difficulty | string | Difficulty label for the stimulus, if assigned |
| imageSrc | string/null | Path or imported source for the displayed image stimulus |
| emoji | string/null | Fallback placeholder display if no image is available |

## Export fields
| Field | Type | Description |
|---|---|---|
| filename | string | Generated CSV filename, currently based on the session ID |
| exportFormat | string | Current export format is CSV |

## Adaptive difficulty fields
| Field | Type | Description |
|---|---|---|

## Gaze estimation fields
| Field | Type | Description |
|---|---|---|
