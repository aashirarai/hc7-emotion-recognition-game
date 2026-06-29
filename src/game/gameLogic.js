// Creates one trial log object after the user selects an answer
// Keeps the data format consistent with docs/data-schema.md
export function createTrialLog({
    sessionId,
    trialIndex,
    stimulus,
    selectedEmotion,
    reactionTimeMs,
}) {
    // Check whether the selected answer matches the correct emotion
    const isCorrect = (selectedEmotion === stimulus.emotion)

    // Return a structured trial record
    // This object will be used for data export, dashboard summaries,
    // adaptive difficulty, and gaze metrics
    return {
        // Session/trial ID
        sessionId,
        trialId: trialIndex + 1,

        // Stimulus and behavioural response fields
        stimulusId: stimulus.stimulusId,
        correctEmotion: stimulus.emotion,
        selectedEmotion,
        isCorrect,
        reactionTimeMs,
    }
}

// Creates a simple pseudonymous session ID
// Date.now() gives a unique timestamp-based number
export function createSessionId() {
    return `session_${Date.now()}`
}

// Returns a shuffled copy of the stimuli array for one session.
// Pass a count to limit the number of trials (e.g. 12 trials from a pool of 60 images).
// Omit count to use every image exactly once.
export function buildTrialSequence(stimuli, count = null) {
    const shuffled = [...stimuli].sort(() => Math.random() - 0.5)
    return count !== null ? shuffled.slice(0, count) : shuffled
}