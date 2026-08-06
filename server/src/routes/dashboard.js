import { Router } from 'express'
import { db } from '../db.js'
import { requireAdmin } from '../auth.js'

const selectParticipants = db.prepare('SELECT * FROM participants ORDER BY created_at DESC')
const selectLatestSession = db.prepare(
    'SELECT * FROM sessions WHERE participant_id = ? ORDER BY timestamp DESC LIMIT 1'
)
const selectAdaptiveState = db.prepare('SELECT * FROM adaptive_state WHERE participant_id = ?')
const selectParticipant = db.prepare('SELECT * FROM participants WHERE participant_id = ?')
const selectSessionsForParticipant = db.prepare(
    'SELECT * FROM sessions WHERE participant_id = ? ORDER BY timestamp DESC'
)
const selectTrialLogsForParticipant = db.prepare(
    'SELECT * FROM trial_logs WHERE participant_id = ? ORDER BY timestamp DESC'
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

function rowToTrialLog(row) {
    return {
        participantId: row.participant_id,
        sessionId: row.session_id,
        trialId: row.trial_id,
        stimulusId: row.stimulus_id,
        correctEmotion: row.correct_emotion,
        selectedEmotion: row.selected_emotion,
        isCorrect: row.is_correct === null ? null : Boolean(row.is_correct),
        reactionTimeMs: row.reaction_time_ms,
        difficulty: row.difficulty,
        mode: row.mode,
        timestamp: row.timestamp,
    }
}

function rowToAdaptiveState(row) {
    if (!row) return null
    return {
        version: row.version,
        tierIndex: row.tier_index,
        consecutiveAbove: row.consecutive_above,
        consecutiveBelow: row.consecutive_below,
        history: JSON.parse(row.history_json),
    }
}

const router = Router()

router.get('/participants', requireAdmin, (req, res) => {
    const participants = selectParticipants.all().map((participant) => {
        const latestSession = selectLatestSession.get(participant.participant_id)
        const adaptiveState = rowToAdaptiveState(selectAdaptiveState.get(participant.participant_id))
        return {
            participantId: participant.participant_id,
            createdAt: participant.created_at,
            latestSession: latestSession ? rowToSessionSummary(latestSession) : null,
            adaptiveState,
        }
    })
    res.json(participants)
})

router.get('/participants/:id', requireAdmin, (req, res) => {
    const participant = selectParticipant.get(req.params.id)
    if (!participant) {
        return res.status(404).json({ error: 'not_found' })
    }

    res.json({
        participantId: participant.participant_id,
        createdAt: participant.created_at,
        adaptiveState: rowToAdaptiveState(selectAdaptiveState.get(participant.participant_id)),
        sessions: selectSessionsForParticipant.all(participant.participant_id).map(rowToSessionSummary),
        trialLogs: selectTrialLogsForParticipant.all(participant.participant_id).map(rowToTrialLog),
    })
})

export default router
