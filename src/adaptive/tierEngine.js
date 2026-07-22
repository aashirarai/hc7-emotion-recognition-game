// Tiered adaptive difficulty engine — pure functions, no localStorage I/O.
// See docs/data-schema.md for the adaptiveState shape these functions read/write.

// Cumulative difficulty ceilings per tier: tier N's pool is every stimulus
// with difficulty <= TIER_THRESHOLDS[N], so easier stimuli stay in rotation
// alongside newly-unlocked harder ones. Computed from the decile spread of
// difficultyScore across the KDEF entries in metadata.json. Starting values —
// retune after pilot testing.
export const TIER_THRESHOLDS = [0.17, 0.33, 0.48, 0.68, 1.00]

// Human-readable label per tier, for on-screen display only.
export const TIER_LABELS = ['Easiest', 'Easy', 'Medium', 'Hard', 'Hardest']

export const PROMOTE_SCORE_THRESHOLD = 80
export const DEMOTE_SCORE_THRESHOLD = 50
export const STREAK_TO_CHANGE_TIER = 2
export const MAX_ADAPTIVE_HISTORY = 20

export function createDefaultAdaptiveState() {
    return {
        version: 1,
        tierIndex: 0,
        consecutiveAbove: 0,
        consecutiveBelow: 0,
        history: [],
    }
}

function clampTier(tierIndex) {
    return Math.min(Math.max(tierIndex, 0), TIER_THRESHOLDS.length - 1)
}

// Returns the stimuli playable at a given tier. Stimuli with no difficulty
// score (null — no metadata match) are excluded rather than assumed easy.
export function getPoolForTier(stimuli, tierIndex) {
    const ceiling = TIER_THRESHOLDS[tierIndex]
    return stimuli.filter(({ difficulty }) => difficulty !== null && difficulty <= ceiling)
}

// Applies one session's composite score to the participant's adaptive state.
// Two consecutive sessions >= 80 promote a tier; two consecutive sessions
// <= 50 demote a tier; anything in the 51-79 dead zone resets both streak
// counters. This hysteresis band is what stops a single borderline session
// from flipping the tier back and forth.
export function applyAdaptiveUpdate(adaptiveState, { sessionId, compositeScore }) {
    let { tierIndex, consecutiveAbove, consecutiveBelow } = adaptiveState
    let direction = 'none'

    if (compositeScore >= PROMOTE_SCORE_THRESHOLD) {
        consecutiveAbove += 1
        consecutiveBelow = 0
        if (consecutiveAbove >= STREAK_TO_CHANGE_TIER) {
            tierIndex = clampTier(tierIndex + 1)
            direction = 'promote'
            consecutiveAbove = 0
        }
    } else if (compositeScore <= DEMOTE_SCORE_THRESHOLD) {
        consecutiveBelow += 1
        consecutiveAbove = 0
        if (consecutiveBelow >= STREAK_TO_CHANGE_TIER) {
            tierIndex = clampTier(tierIndex - 1)
            direction = 'demote'
            consecutiveBelow = 0
        }
    } else {
        consecutiveAbove = 0
        consecutiveBelow = 0
    }

    const historyEntry = {
        timestamp: new Date().toISOString(),
        sessionId,
        compositeScore,
        tierIndex,
        direction,
    }

    return {
        version: adaptiveState.version,
        tierIndex,
        consecutiveAbove,
        consecutiveBelow,
        history: [...adaptiveState.history, historyEntry].slice(-MAX_ADAPTIVE_HISTORY),
    }
}
