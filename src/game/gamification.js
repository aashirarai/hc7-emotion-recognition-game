// Purely cosmetic helpers, derived from data that already exists elsewhere
// (trial logs, composite score). Nothing here feeds back into the adaptive
// difficulty engine or persisted records — see adaptive/tierEngine.js and
// adaptive/scoring.js for the scientific scoring logic.

// Counts consecutive correct answers, most recent first.
export function computeCurrentStreak(trialLogs) {
    let streak = 0
    for (let i = trialLogs.length - 1; i >= 0; i -= 1) {
        if (!trialLogs[i].isCorrect) break
        streak += 1
    }
    return streak
}

// Cosmetic 1-3 star mapping shown on the session summary screen.
export function getStarRating(compositeScore) {
    if (compositeScore >= 85) return 3
    if (compositeScore >= 60) return 2
    return 1
}

export const STAR_RATING_LABELS = {
    1: 'Good try!',
    2: 'Great job!',
    3: 'Amazing!',
}
