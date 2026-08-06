import { Router } from 'express'
import { db } from '../db.js'
import { requireParticipantAuth } from '../auth.js'

const MAX_SESSION_HISTORY = 20

const insertSession = db.prepare(`
    INSERT INTO sessions
        (session_id, participant_id, composite_score, accuracy_score, correct_count, total_trials, mean_reaction_time_ms, timestamp)
    VALUES (@sessionId, @participantId, @compositeScore, @accuracyScore, @correctCount, @totalTrials, @meanReactionTimeMs, @timestamp)
`)
const selectSessions = db.prepare(
    'SELECT * FROM sessions WHERE participant_id = ? ORDER BY timestamp DESC LIMIT ?'
)

function rowToSessionSummary(row) {
    return {
        sessionId: row.session_id,
        compositeScore: row.composite_score,
        accuracyScore: row.accuracy_score,
        correctCount: row.correct_count,
        totalTrials: row.total_trials,
        meanReactionTimeMs: row.mean_reaction_time_ms,
        timestamp: row.timestamp,
    }
}

const router = Router({ mergeParams: true })

router.get('/:id/sessions', requireParticipantAuth, (req, res) => {
    const rows = selectSessions.all(req.params.id, MAX_SESSION_HISTORY)
    res.json(rows.map(rowToSessionSummary).reverse())
})

router.post('/:id/sessions', requireParticipantAuth, (req, res) => {
    const { sessionId, compositeScore, accuracyScore, correctCount, totalTrials, meanReactionTimeMs } =
        req.body ?? {}

    if (!sessionId) {
        return res.status(400).json({ error: 'missing_session_id' })
    }

    insertSession.run({
        sessionId,
        participantId: req.params.id,
        compositeScore,
        accuracyScore,
        correctCount,
        totalTrials,
        meanReactionTimeMs,
        timestamp: new Date().toISOString(),
    })

    const rows = selectSessions.all(req.params.id, MAX_SESSION_HISTORY)
    res.status(201).json(rows.map(rowToSessionSummary).reverse())
})

export default router
