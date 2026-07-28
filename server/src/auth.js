// PIN hashing, bearer token issuance/verification, and auth middleware.
import crypto from 'node:crypto'
import { db } from './db.js'

const SCRYPT_KEYLEN = 64
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(pin, salt, SCRYPT_KEYLEN).toString('hex')
    return { hash, salt }
}

export function verifyPin(pin, salt, expectedHash) {
    const candidate = crypto.scryptSync(pin, salt, SCRYPT_KEYLEN)
    const expected = Buffer.from(expectedHash, 'hex')
    if (candidate.length !== expected.length) return false
    return crypto.timingSafeEqual(candidate, expected)
}

const insertToken = db.prepare(
    'INSERT INTO auth_tokens (token, participant_id, expires_at) VALUES (?, ?, ?)'
)
const selectToken = db.prepare('SELECT * FROM auth_tokens WHERE token = ?')
const deleteExpiredTokens = db.prepare('DELETE FROM auth_tokens WHERE expires_at <= ?')

export function issueToken(participantId) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
    insertToken.run(token, participantId, expiresAt)
    return token
}

// Returns the participantId the token belongs to, or null if missing/expired.
export function verifyToken(token) {
    if (!token) return null
    deleteExpiredTokens.run(new Date().toISOString())
    const row = selectToken.get(token)
    if (!row) return null
    if (new Date(row.expires_at).getTime() <= Date.now()) return null
    return row.participant_id
}

// Requires a bearer token belonging to the participant named in req.params.id.
export function requireParticipantAuth(req, res, next) {
    const authHeader = req.get('authorization') ?? ''
    const [scheme, token] = authHeader.split(' ')
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'missing_token' })
    }

    const tokenParticipantId = verifyToken(token)
    if (!tokenParticipantId) {
        return res.status(401).json({ error: 'invalid_token' })
    }
    if (tokenParticipantId !== req.params.id) {
        return res.status(403).json({ error: 'forbidden' })
    }

    req.participantId = tokenParticipantId
    next()
}

export function requireAdmin(req, res, next) {
    const providedKey = req.get('x-admin-key') ?? ''
    const expectedKey = process.env.ADMIN_API_KEY ?? ''

    const provided = Buffer.from(providedKey)
    const expected = Buffer.from(expectedKey)
    const matches =
        expectedKey.length > 0 &&
        provided.length === expected.length &&
        crypto.timingSafeEqual(provided, expected)

    if (!matches) {
        return res.status(401).json({ error: 'unauthorized' })
    }
    next()
}
