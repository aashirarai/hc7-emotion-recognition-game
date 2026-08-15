# Gaze Module Self-Test Evaluation

This document records informal self-test data used to evaluate whether the optional webcam gaze module can support coarse AOI metrics during active emotion-recognition trials.

## Current gaze metric

The current primary gaze metric is `onStimulusDwellProp`, defined as:

> the proportion of valid WebGazer samples during a trial whose x/y coordinate falls inside the active stimulus card.

The complementary metric is `offStimulusDwellProp`.

At this stage, these metrics should be interpreted as **card-level AOI measures**, not precise face-image or fixation measures.

## Important AOI limitation

The current AOI is based on the `.stimulus-card` rectangle rather than the actual rendered face image. During testing, it became clear that the face images from the dataset are narrower than the stimulus card container.

This means that a gaze sample can be counted as "on stimulus" even if it falls inside the card but outside the actual image. Therefore, the current metric is more accurately described as:

> `onStimulusCardDwellProp`

rather than:

> `onFaceDwellProp`

or:

> `onStimulusImageDwellProp`

This does not invalidate the current self-test results, but it means the first AOI is deliberately broad and generous. It is useful for testing whether WebGazer can distinguish broad attention toward the stimulus area, but it should not be used to claim precise attention to the face image itself.

## Current gaze fields

The current exported gaze fields are:

- `gazeDataAvailable`
- `gazeSampleCount`
- `gazeDurationMs`
- `gazeSamplingRateHz`
- `gazeSamplesTotal`
- `onStimulusCount`
- `offStimulusCount`
- `onStimulusDwellProp`
- `offStimulusDwellProp`

## Self-test 1: Initial uncontrolled comparison

### Conditions

- Looking normally at the stimulus
- Deliberately looking away

### Summary

Initial results showed that the normal-looking condition had a higher mean on-stimulus dwell proportion than the look-away condition, but the separation was modest. Reaction times differed substantially between conditions, so a more controlled test was needed.

### Interpretation

The pipeline was technically functional, but the first comparison was confounded by trial duration. This motivated a second self-test with more controlled timing.

## Self-test 2: Controlled timing comparison

### Conditions

- 3 runs looking at the stimulus
- 3 runs looking away from the stimulus
- 10 trials per run
- Approximate 3-second viewing delay before answer selection

### Summary table

| Condition | Trials | Mean on-stimulus-card dwell | Mean off-stimulus-card dwell | Mean RT | Mean sampling rate |
|---|---:|---:|---:|---:|---:|
| Looking at stimulus | 30 | 75.5% | 24.5% | 4745 ms | 31.2 Hz |
| Looking away | 30 | 26.0% | 74.0% | 5340 ms | 30.4 Hz |

### Interpretation

The controlled self-test showed a clear separation between conditions. Mean on-stimulus-card dwell was approximately 49.5 percentage points higher when looking at the stimulus than when looking away. Sampling rates were similar across conditions, suggesting that the difference was not simply due to data availability.

This supports keeping the broad on/off-stimulus-card metric as the primary exploratory gaze metric for now.

However, because the AOI currently uses the full stimulus card rather than the actual rendered image, this result should be interpreted as evidence that WebGazer can distinguish broad attention toward the stimulus display area, not evidence that it can precisely identify gaze on the face image.

## Observed limitation: cursor dependence

During testing, WebGazer's red-dot prediction appeared more accurate when the cursor was moved near or around the region being viewed. This suggests that the baseline may be influenced by mouse/click calibration behaviour and should not be treated as precise passive eye tracking.

### Follow-up test needed

Run a no-cursor-movement condition:

- Enable webcam.
- Keep cursor still and away from the stimulus.
- Look at the stimulus.
- Wait approximately 3 seconds.
- Select an answer without moving the cursor around the stimulus area.

Compare this against the existing looking-at-stimulus condition.

## Observed limitation: card AOI versus image AOI

The current AOI uses the full `.stimulus-card` rectangle. This is wider than the actual rendered dataset image, so the current metric may overestimate how often gaze falls on the image itself.

### Follow-up implementation needed

Add a second, stricter AOI based on the actual rendered image bounds.

Suggested future fields:

- `onStimulusCardCount`
- `offStimulusCardCount`
- `onStimulusCardDwellProp`
- `offStimulusCardDwellProp`
- `onStimulusImageCount`
- `offStimulusImageCount`
- `onStimulusImageDwellProp`
- `offStimulusImageDwellProp`

The current broad card-level fields can be retained for comparison, but future interpretation should distinguish between:

- broad stimulus-area attention
- actual image-level attention

## Next validation question

The next evaluation question is:

> Does the looking-at versus looking-away separation remain strong when the AOI is tightened from the full stimulus card to the actual rendered image?

Possible outcomes:

| Result | Interpretation |
|---|---|
| Card AOI works and image AOI also works | Stronger evidence that WebGazer can support coarse stimulus/image-level attention metrics |
| Card AOI works but image AOI is weaker | WebGazer supports broad attention-to-task-area metrics, but not reliable image-level attention |
| Neither AOI works reliably | Technical integration works, but AOI validity is limited under current conditions |

## Current decision

The broad on/off-stimulus-card AOI metric is promising enough to retain as the primary exploratory gaze metric, but it should be described as a coarse, calibration-dependent attention proxy.

The next implementation step should be image-level AOI extraction, not upper/lower-face AOIs yet.

## Next steps

- Rename or clarify the current metric in documentation as card-level AOI dwell.
- Add an ID or ref to the actual rendered stimulus image.
- Use the rendered image's `getBoundingClientRect()` to compute image-level AOI bounds.
- Export both card-level and image-level dwell metrics.
- Re-run the controlled looking-at versus looking-away self-test.
- Run a no-cursor-movement condition to test cursor/calibration dependence.
- Only attempt upper/lower-stimulus AOIs if image-level AOI separation remains stable.