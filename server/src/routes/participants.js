import { Router } from 'express'
import { db, withTransaction } from '../db.js'
import { hashPin, verifyPin, issueToken, requireParticipantAuth } from '../auth.js'

const PARTICIPANT_ID_PATTERN = /^[A-Z0-9_-]{2,20}$/
const PIN_PATTERN = /^\d{4}$/
const MAX_SESSION_HISTORY = 20

const selectParticipant = db.prepare('SELECT * FROM participants WHERE participant_id = ?')
const insertParticipant = db.prepare(
    'INSERT INTO participants (participant_id, pin_hash, pin_salt, created_at) VALUES (?, ?, ?, ?)'
)
const insertAdaptiveState = db.prepare(`
    INSERT INTO adaptive_state (participant_id, version, tier_index, consecutive_above, consecutive_below, history_json)
    VALUES (?, 1, 0, 0, 0, '[]')
`)
const selectAdaptiveState = db.prepare('SELECT * FROM adaptive_state WHERE participant_id = ?')
const updateAdaptiveStateStmt = db.prepare(`
    UPDATE adaptive_state
    SET version = ?, tier_index = ?, consecutive_above = ?, consecutive_below = ?, history_json = ?
    WHERE participant_id = ?
`)
const selectSessions = db.prepare(
    'SELECT * FROM sessions WHERE participant_id = ? ORDER BY timestamp DESC LIMIT ?'
)

function rowToAdaptiveState(row) {
    return {
        version: row.version,
        tierIndex: row.tier_index,
        consecutiveAbove: row.consecutive_above,
        consecutiveBelow: row.consecutive_below,
        history: JSON.parse(row.history_json),
    }
}

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

function normalizeParticipantId(rawId) {
    return String(rawId ?? '').trim().toUpperCase()
}

function loadPublicParticipant(participantId, createdAt) {
    const sessionRows = selectSessions.all(participantId, MAX_SESSION_HISTORY)
    // selectSessions is ordered newest-first for the LIMIT; reverse to oldest-first
    // to match the historical localStorage ordering.
    const sessions = sessionRows.map(rowToSessionSummary).reverse()
    const adaptiveStateRow = selectAdaptiveState.get(participantId)

    return {
        participantId,
        createdAt,
        sessions,
        adaptiveState: adaptiveStateRow
            ? rowToAdaptiveState(adaptiveStateRow)
            : { version: 1, tierIndex: 0, consecutiveAbove: 0, consecutiveBelow: 0, history: [] },
    }
}

const router = Router()

// Registers a new participant, or logs in an existing one.
router.post('/login', (req, res) => {
    const participantId = normalizeParticipantId(req.body?.participantId)
    const pin = String(req.body?.pin ?? '')

    if (!PARTICIPANT_ID_PATTERN.test(participantId)) {
        return res.status(400).json({ ok: false, error: 'invalid_id' })
    }
    if (!PIN_PATTERN.test(pin)) {
        return res.status(400).json({ ok: false, error: 'invalid_pin' })
    }

    const existing = selectParticipant.get(participantId)

    if (existing) {
        if (!verifyPin(pin, existing.pin_salt, existing.pin_hash)) {
            return res.status(401).json({ ok: false, error: 'wrong_pin' })
        }

        const token = issueToken(participantId)
        return res.json({
            ok: true,
            isNew: false,
            token,
            participant: loadPublicParticipant(participantId, existing.created_at),
        })
    }

    const { hash, salt } = hashPin(pin)
    const createdAt = new Date().toISOString()

    withTransaction(() => {
        insertParticipant.run(participantId, hash, salt, createdAt)
        insertAdaptiveState.run(participantId)
    })

    const token = issueToken(participantId)
    return res.json({
        ok: true,
        isNew: true,
        token,
        participant: loadPublicParticipant(participantId, createdAt),
    })
})

router.get('/:id/adaptive-state', requireParticipantAuth, (req, res) => {
    const row = selectAdaptiveState.get(req.params.id)
    if (!row) {
        return res.status(404).json({ error: 'not_found' })
    }
    res.json(rowToAdaptiveState(row))
})

router.put('/:id/adaptive-state', requireParticipantAuth, (req, res) => {
    const { version, tierIndex, consecutiveAbove, consecutiveBelow, history } = req.body ?? {}
    updateAdaptiveStateStmt.run(
        version,
        tierIndex,
        consecutiveAbove,
        consecutiveBelow,
        JSON.stringify(history ?? []),
        req.params.id
    )
    res.json(rowToAdaptiveState(selectAdaptiveState.get(req.params.id)))
})

export default router
