import { Router } from 'express'
import { db } from '../db.js'
import { hashPin, verifyPin, issueGuardianToken, requireGuardianAuth } from '../auth.js'

const PARTICIPANT_ID_PATTERN = /^[A-Z0-9_-]{2,20}$/
const PIN_PATTERN = /^\d{4}$/
const GUARDIAN_ID_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

// Emotion label order, duplicated from src/stimuli/stimuliManifest.js's
// emotionOptions. That file relies on import.meta.glob (Vite-only), so it
// can't be imported from this standalone Node server — keep these two lists
// in sync manually if the 7 emotions ever change.
const EMOTIONS = ['happy', 'neutral', 'surprise', 'sad', 'disgust', 'fear', 'angry']

const selectParticipant = db.prepare('SELECT * FROM participants WHERE participant_id = ?')
const selectGuardianById = db.prepare('SELECT * FROM guardians WHERE guardian_id = ?')
const insertGuardian = db.prepare(
    'INSERT INTO guardians (guardian_id, participant_id, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)'
)
const selectSessionsForParticipant = db.prepare(
    'SELECT * FROM sessions WHERE participant_id = ? ORDER BY timestamp ASC'
)
const selectAdaptiveState = db.prepare('SELECT * FROM adaptive_state WHERE participant_id = ?')
const selectConfusionCounts = db.prepare(`
    SELECT correct_emotion, selected_emotion, COUNT(*) AS count
    FROM trial_logs
    WHERE participant_id = ? AND selected_emotion IS NOT NULL
    GROUP BY correct_emotion, selected_emotion
`)

function normalizeParticipantId(rawId) {
    return String(rawId ?? '').trim().toUpperCase()
}

function normalizeGuardianId(rawId) {
    return String(rawId ?? '').trim().toLowerCase()
}

// SQLite has no pivot, so the sparse GROUP BY result is reshaped here into a
// dense zero-filled grid. Row = correct emotion, column = selected emotion,
// diagonal = correct answers.
function buildConfusionMatrix(participantId) {
    const indexByEmotion = new Map(EMOTIONS.map((emotion, index) => [emotion, index]))
    const matrix = EMOTIONS.map(() => EMOTIONS.map(() => 0))
    let totalTrials = 0

    for (const row of selectConfusionCounts.all(participantId)) {
        totalTrials += row.count
        const rowIndex = indexByEmotion.get(row.correct_emotion)
        const colIndex = indexByEmotion.get(row.selected_emotion)
        if (rowIndex === undefined || colIndex === undefined) continue
        matrix[rowIndex][colIndex] = row.count
    }

    return { emotions: EMOTIONS, matrix, totalTrials }
}

// adaptive_state.history_json only keeps the most recent 20 entries, so
// sessions older than that resolve to tierIndex: null here — a pre-existing
// cap on the history array, not something fixed by this lookup.
function buildTierIndexBySessionId(participantId) {
    const row = selectAdaptiveState.get(participantId)
    const map = new Map()
    if (!row) return map

    for (const entry of JSON.parse(row.history_json)) {
        map.set(entry.sessionId, entry.tierIndex)
    }
    return map
}

const router = Router()

router.post('/signup', (req, res) => {
    const participantId = normalizeParticipantId(req.body?.participantId)
    const participantPin = String(req.body?.participantPin ?? '')
    const guardianId = normalizeGuardianId(req.body?.guardianId)
    const guardianPassword = String(req.body?.guardianPassword ?? '')

    if (!PARTICIPANT_ID_PATTERN.test(participantId)) {
        return res.status(400).json({ ok: false, error: 'invalid_participant_id' })
    }
    if (!PIN_PATTERN.test(participantPin)) {
        return res.status(400).json({ ok: false, error: 'invalid_pin' })
    }
    if (!GUARDIAN_ID_PATTERN.test(guardianId)) {
        return res.status(400).json({ ok: false, error: 'invalid_guardian_id' })
    }
    if (guardianPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ ok: false, error: 'weak_password' })
    }

    const participant = selectParticipant.get(participantId)
    if (!participant) {
        return res.status(404).json({ ok: false, error: 'participant_not_found' })
    }
    // Read-only PIN check — proves the guardian knows the child's current
    // PIN without ever touching participants.pin_hash/pin_salt, so the
    // child's game login is unaffected by guardian signup.
    if (!verifyPin(participantPin, participant.pin_salt, participant.pin_hash)) {
        return res.status(401).json({ ok: false, error: 'wrong_pin' })
    }
    if (selectGuardianById.get(guardianId)) {
        return res.status(409).json({ ok: false, error: 'guardian_id_taken' })
    }

    const { hash, salt } = hashPin(guardianPassword)
    insertGuardian.run(guardianId, participantId, hash, salt, new Date().toISOString())

    const token = issueGuardianToken(guardianId)
    return res.json({ ok: true, token, guardianId, participantId })
})

router.post('/login', (req, res) => {
    const guardianId = normalizeGuardianId(req.body?.guardianId)
    const guardianPassword = String(req.body?.guardianPassword ?? '')

    const guardian = selectGuardianById.get(guardianId)
    // Single generic error for "no such guardian" and "wrong password" —
    // avoids revealing which guardianIds exist.
    if (!guardian || !verifyPin(guardianPassword, guardian.password_salt, guardian.password_hash)) {
        return res.status(401).json({ ok: false, error: 'invalid_credentials' })
    }

    const token = issueGuardianToken(guardianId)
    return res.json({ ok: true, token, guardianId, participantId: guardian.participant_id })
})

router.get('/me', requireGuardianAuth, (req, res) => {
    res.json({ guardianId: req.guardianId, participantId: req.guardianParticipantId })
})

router.get('/me/dashboard', requireGuardianAuth, (req, res) => {
    const participantId = req.guardianParticipantId
    const participant = selectParticipant.get(participantId)
    if (!participant) {
        return res.status(404).json({ error: 'participant_not_found' })
    }

    const tierIndexBySessionId = buildTierIndexBySessionId(participantId)
    const sessions = selectSessionsForParticipant.all(participantId).map((row) => ({
        sessionId: row.session_id,
        timestamp: row.timestamp,
        accuracyScore: row.accuracy_score,
        correctCount: row.correct_count,
        totalTrials: row.total_trials,
        meanReactionTimeMs: row.mean_reaction_time_ms,
        compositeScore: row.composite_score,
        tierIndex: tierIndexBySessionId.get(row.session_id) ?? null,
    }))

    res.json({
        participantId,
        participantCreatedAt: participant.created_at,
        sessions,
        confusionMatrix: buildConfusionMatrix(participantId),
    })
})

export default router
