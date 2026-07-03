// RT normalization bounds (milliseconds).
// Anything faster than RT_MIN is treated as maximum speed; anything slower
// than RT_MAX scores zero on the speed component.
// These are starting values — adjust after pilot testing (risk register R6).
export const RT_MIN_MS = 300
export const RT_MAX_MS = 6000

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
}

// Maps a reaction time to a 0–1 speed score.
// Faster = higher score, clamped so values outside [RT_MIN, RT_MAX] don't
// produce negative numbers or values above 1.
function normalizeSpeed(reactionTimeMs) {
    return 1 - clamp((reactionTimeMs - RT_MIN_MS) / (RT_MAX_MS - RT_MIN_MS), 0, 1)
}

// Per-trial score (0–100), available for optional feedback display.
// Incorrect answers always score 0 — fast-but-wrong should not earn speed credit.
export function computeTrialScore({ isCorrect, reactionTimeMs }) {
    if (!isCorrect) return 0
    return Math.round(70 + 30 * normalizeSpeed(reactionTimeMs))
}

// Session-level composite score — this is the number that drives the adaptive engine.
//
// Formula:  compositeScore = round(100 × (0.70 × accuracy + 0.30 × speed))
//
// Speed is computed over correct trials only: RT on incorrect trials does not
// reflect genuine recognition speed, and including it would penalise children
// who slow down to think rather than guess quickly.
//
// Returns a plain object so callers can destructure what they need.
export function computeSessionComposite(trialLogs) {
    const totalTrials = trialLogs.length

    if (totalTrials === 0) {
        return {
            accuracyScore:    0,
            speedScore:       0,
            compositeScore:   0,
            meanReactionTimeMs: null,
            correctCount:     0,
            totalTrials:      0,
        }
    }

    const correctTrials = trialLogs.filter(t => t.isCorrect)
    const correctCount  = correctTrials.length
    const accuracyScore = correctCount / totalTrials

    const meanReactionTimeMs = Math.round(
        trialLogs.reduce((sum, t) => sum + t.reactionTimeMs, 0) / totalTrials
    )

    let speedScore = 0
    if (correctTrials.length > 0) {
        const meanCorrectRT = correctTrials.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctTrials.length
        speedScore = normalizeSpeed(meanCorrectRT)
    }

    const compositeScore = Math.round(100 * (0.70 * accuracyScore + 0.30 * speedScore))

    return {
        accuracyScore,
        speedScore,
        compositeScore,
        meanReactionTimeMs,
        correctCount,
        totalTrials,
    }
}
