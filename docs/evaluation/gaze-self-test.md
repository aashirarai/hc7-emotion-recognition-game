# Gaze Module Self-Test Evaluation

This document records informal self-test data used to evaluate whether the optional webcam gaze module can support coarse AOI metrics during active emotion-recognition trials.

## Current gaze metrics

The gaze module currently exports trial-level webcam gaze summaries based on WebGazer x/y predictions collected during the active stimulus-response window.

The main AOI metrics are:

- `onStimulusCardDwellProp`
- `offStimulusCardDwellProp`
- `onStimulusImageDwellProp`
- `offStimulusImageDwellProp`
- `upperImageDwellProp`
- `lowerImageDwellProp`

At this stage, these metrics should be interpreted as **coarse AOI measures**, not precise fixation measurements.

## Current AOI definitions

### Card-level AOI

The card-level AOI is based on the full `.stimulus-card` rectangle.

This is currently represented by:

- `onStimulusCardDwellProp`
- `offStimulusCardDwellProp`

### Image-level AOI

The image-level AOI is based on the actual rendered stimulus image bounds, using the image element's browser bounding box.

This is represented by:

- `onStimulusImageDwellProp`
- `offStimulusImageDwellProp`

This is stricter than the card-level AOI and is closer to measuring whether gaze falls on the displayed stimulus image.

### Upper/lower image AOI

The rendered image rectangle is also split horizontally into:

- upper-image AOI
- lower-image AOI

This is represented by:

- `upperImageDwellProp`
- `lowerImageDwellProp`
- `upperLowerImageRatio`

This should be interpreted as an **upper/lower image-region distinction**, not an upper/lower face distinction. The current implementation does not detect the face within each image.

## Important AOI limitation: image AOI versus face AOI

The image-level AOI is not the same as a true face-level AOI.

The current implementation uses the rendered image rectangle, but the face itself may not occupy the same proportion or position within every image. Because the project uses KDEF dataset images, faces are likely to be relatively standardised, but the implementation does not currently verify face size, face position, or facial landmark alignment for each stimulus.

This means:

> `onStimulusImageDwellProp` measures gaze falling within the rendered image, not necessarily gaze falling within the face itself.

Similarly:

> `upperImageDwellProp` and `lowerImageDwellProp` measure gaze falling within the upper or lower half of the rendered image, not necessarily the upper or lower half of the face.

A true upper/lower-face AOI would require one of the following:

- face detection for each stimulus image
- facial landmark detection
- manually defined face bounding boxes
- pre-computed face AOI metadata for each stimulus

For the current project, upper/lower image AOIs are treated as an exploratory spatial-resolution check.

## Current exported gaze fields

The current exported gaze fields are:

- `gazeDataAvailable`
- `gazeSampleCount`
- `gazeDurationMs`
- `gazeSamplingRateHz`
- `gazeQualityFlag`
- `trialDurationFlag`
- `gazeSamplesTotal`
- `viewportWidth`
- `viewportHeight`
- `screenAreaPx`
- `stimulusCardAreaPx`
- `stimulusImageAreaPx`
- `stimulusCardAreaRatio`
- `stimulusImageAreaRatio`
- `onStimulusCardCount`
- `offStimulusCardCount`
- `onStimulusCardDwellProp`
- `offStimulusCardDwellProp`
- `onStimulusImageCount`
- `offStimulusImageCount`
- `onStimulusImageDwellProp`
- `offStimulusImageDwellProp`
- `upperImageCount`
- `lowerImageCount`
- `upperImageDwellProp`
- `lowerImageDwellProp`
- `upperLowerImageRatio`

## Gaze quality and trial timing flags

### Gaze quality flag

The `gazeQualityFlag` is a heuristic trial-level flag used to indicate whether enough gaze samples were collected for the trial to be interpreted.

Current categories:

- `no_gaze_data`
- `low_sample_count`
- `low_sampling_rate`
- `usable`

This flag does not prove that the gaze estimate is spatially accurate. It only indicates whether the trial has enough basic gaze data to analyse.

### Trial duration flag

The `trialDurationFlag` is used to identify trials whose response time does not match the intended self-test timing protocol.

Current categories:

- `too_short`
- `expected`
- `too_long`

For the controlled self-tests, participants were aiming to respond after approximately 3 seconds. A trial is currently flagged as `too_long` if it exceeds 7000 ms. This is a pragmatic quality-control heuristic, not a scientific threshold. It helps identify trials where the gaze summary may include non-task behaviour such as distraction, cursor checking, posture adjustment, or unusually delayed responding.

A trial can therefore be:

> `gazeQualityFlag = usable`

but also:

> `trialDurationFlag = too_long`

This means that enough gaze samples were collected, but the timing was less comparable to the intended controlled self-test protocol.

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

However, this result should still be interpreted as evidence that WebGazer can distinguish broad attention toward the stimulus display area, not evidence that it can precisely identify fixation on facial features.

## Self-test 3: AOI geometry smoke test

### Conditions

- 2 smoke-test runs
- 10 trials per run
- Webcam enabled
- Card-level, image-level, upper/lower image, AOI area, gaze quality, and trial duration fields exported

### Summary table

| Metric | Result |
|---|---:|
| Trials | 20 |
| Usable gaze trials | 20 / 20 |
| Expected-duration trials | 17 / 20 |
| Too-long trials | 3 / 20 |
| Mean reaction time | 5271 ms |
| Mean gaze sample count | 138.4 |
| Mean sampling rate | 26.5 Hz |
| Mean card-level dwell | 74.3% |
| Mean image-level dwell | 74.2% |
| Mean card-image dwell difference | 0.1 percentage points |
| Mean upper-image dwell | 26.8% |
| Mean lower-image dwell | 47.4% |
| Mean stimulus card area ratio | 15.6% of viewport |
| Mean stimulus image area ratio | 15.5% of viewport |
| Mean card AOI enrichment | 4.8x |
| Mean image AOI enrichment | 4.8x |

### Interpretation

The AOI geometry smoke test confirmed that the new fields export correctly.

The card-level and image-level dwell proportions were almost identical. The measured area ratios also showed that the stimulus card and rendered image occupied almost the same proportion of the viewport in the current layout. This suggests that, under the current CSS/layout, the image effectively fills the stimulus card, so card-level and image-level AOIs may not differ meaningfully.

This finding updates the earlier concern that the dataset images were much narrower than the stimulus card. While the images may appear visually narrower in some contexts, the measured browser bounding boxes in this smoke test were nearly identical. Future analysis should rely on measured AOI geometry rather than visual assumptions.

The AOI area ratios are useful because they allow dwell proportions to be interpreted relative to the size of the AOI. In this smoke test, the image AOI occupied approximately 15.5% of the viewport but accounted for approximately 74.2% of gaze samples, giving an image AOI enrichment of approximately 4.8x relative to viewport area.

This suggests that AOI dwell should not be interpreted only as a raw proportion. It should also be considered relative to how much of the screen the AOI occupies.

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

## Observed limitation: image AOI versus true face AOI

The current image-level AOI is based on the whole rendered stimulus image. This does not necessarily isolate the face itself.

This matters especially for upper/lower AOI analysis. Splitting the rendered image into upper and lower halves does not guarantee that the split corresponds to upper and lower face regions. If faces vary in size, vertical position, hair coverage, neck visibility, or framing across KDEF images, then upper/lower image regions may include different proportions of forehead, hair, eyes, nose, mouth, neck, clothing, or background.

### Follow-up implementation options

Possible future improvements:

| Option | Description | Feasibility |
|---|---|---|
| Keep upper/lower image AOIs | Treat upper/lower split as exploratory image-region analysis only | High |
| Add face detection | Detect face bounding box per image, then split detected face vertically | Medium |
| Add facial landmarks | Use landmarks to define eye/mouth or upper/lower face AOIs | Lower |
| Manual face boxes | Manually define approximate face boxes for a subset of stimuli | Medium |
| Future work only | Discuss true face AOIs as beyond current scope | High |

For the current project timeline, the safest interpretation is to keep upper/lower image AOIs as exploratory and describe true face-level AOIs as future work unless face detection is added and validated.

## Next validation questions

The next evaluation questions are:

> Does the looking-at versus looking-away separation remain strong for both card-level and image-level AOIs?

> Does upper/lower image dwell show any stable or interpretable pattern across conditions?

> Does cursor movement influence WebGazer predictions enough to affect AOI dwell metrics?

> Does calibration/check mode improve gaze quality or AOI separation?

## Current decision

The broad on/off-stimulus-card and on/off-stimulus-image AOI metrics are promising enough to retain as primary exploratory gaze metrics.

Upper/lower image AOIs should be retained for now as an exploratory spatial-resolution check, but they should not be described as upper/lower face AOIs unless a face-specific AOI method is added.

AOI area ratios and AOI enrichment should be used in future analysis to address the ratio of stimulus/non-stimulus screen area.

## Next steps

- Run controlled validation conditions using the expanded AOI fields.
- Compare card-level dwell, image-level dwell, and upper/lower image dwell across conditions.
- Add or compute AOI enrichment metrics during analysis.
- Run a no-cursor-movement condition to test cursor/calibration dependence.
- Run a cursor-supported condition to compare against no-cursor movement.
- Add a simple calibration/check mode if time allows.
- Treat true upper/lower face AOIs as future work unless face detection or face-box metadata is added.