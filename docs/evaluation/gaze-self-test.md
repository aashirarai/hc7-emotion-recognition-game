# Gaze Module Self-Test Evaluation

This document records informal self-test data used to evaluate whether the optional webcam gaze module can support coarse AOI metrics during active emotion-recognition trials.

## Current gaze metric

The primary gaze metric is `onStimulusDwellProp`, defined as:

> the proportion of valid WebGazer samples during a trial whose x/y coordinate falls inside the active stimulus card.

The complementary metric is `offStimulusDwellProp`.

These are treated as coarse attention proxies, not precise fixation measurements.

## Self-test 1: Initial uncontrolled comparison

### Conditions

- Looking normally at the stimulus
- Deliberately looking away

### Summary

Initial results showed that the normal-looking condition had a higher mean on-stimulus dwell proportion than the look-away condition, but the separation was modest. Reaction times differed substantially between conditions, so a more controlled test was needed.

### Interpretation

The pipeline was technically functional, but the first comparison was confounded by trial duration.

## Self-test 2: Controlled timing comparison

### Conditions

- 3 runs looking at the stimulus
- 3 runs looking away from the stimulus
- 10 trials per run
- Approximate 3-second viewing delay before answer selection

### Summary table

| Condition | Trials | Mean on-stimulus dwell | Mean off-stimulus dwell | Mean RT | Mean sampling rate |
|---|---:|---:|---:|---:|---:|
| Looking at stimulus | 30 | 75.5% | 24.5% | 4745 ms | 31.2 Hz |
| Looking away | 30 | 26.0% | 74.0% | 5340 ms | 30.4 Hz |

See `docs/evaluation/gaze-self-test/GAZETEST_summary_by_condition.csv`.

See plots:
- `GAZETEST_mean_on_stimulus_by_condition.png`
- `GAZETEST_trial_level_on_stimulus.png`
- `GAZETEST_reaction_time_vs_on_stimulus.png`

### Interpretation

The controlled self-test showed a clear separation between conditions. Mean on-stimulus dwell was approximately 49.5 percentage points higher when looking at the stimulus than when looking away. Sampling rates were similar across conditions, suggesting that the difference was not simply due to data availability.

This supports keeping on/off-stimulus dwell as the primary exploratory gaze metric.

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

## Current decision

The on/off-stimulus AOI metric is promising enough to retain as the primary gaze metric, but it should be described as a coarse, calibration-dependent attention proxy.

## Next steps

- Add `gazeQualityFlag` to trial logs.
- Run no-cursor-movement validation.
- Compare no-cursor movement against normal looking-at-stimulus runs.
- Only attempt upper/lower-stimulus AOIs if on/off-stimulus remains stable.