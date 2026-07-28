import { Router } from 'express'
import { db, withTransaction } from '../db.js'
import { requireParticipantAuth } from '../auth.js'

const insertTrial = db.prepare(`
    INSERT INTO trial_logs
        (participant_id, session_id, trial_id, stimulus_id, correct_emotion, selected_emotion, is_correct, reaction_time_ms, difficulty, mode, timestamp)
    VALUES (@participantId, @sessionId, @trialId, @stimulusId, @correctEmotion, @selectedEmotion, @isCorrect, @reactionTimeMs, @difficulty, @mode, @timestamp)
`)

const router = Router({ mergeParams: true })

// Batch-inserts one session's trial logs, sent as a single request at session end.
router.post('/:id/trials', requireParticipantAuth, (req, res) => {
    const { sessionId, logs } = req.body ?? {}

    if (!sessionId || !Array.isArray(logs)) {
        return res.status(400).json({ error: 'missing_logs' })
    }

    withTransaction(() => {
        for (const log of logs) {
            insertTrial.run({
                participantId: req.params.id,
                sessionId,
                trialId: String(log.trialId ?? ''),
                stimulusId: log.stimulusId ?? null,
                correctEmotion: log.correctEmotion ?? null,
                selectedEmotion: log.selectedEmotion ?? null,
                isCorrect: log.isCorrect === null || log.isCorrect === undefined ? null : log.isCorrect ? 1 : 0,
                reactionTimeMs: log.reactionTimeMs ?? null,
                difficulty: log.difficulty === null || log.difficulty === undefined ? null : String(log.difficulty),
                mode: log.mode ?? null,
                timestamp: log.timestamp ?? new Date().toISOString(),
            })
        }
    })

    res.status(201).json({ ok: true, inserted: logs.length })
})

export default router
