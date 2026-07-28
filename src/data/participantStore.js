// Client-side participant "login" store, backed by localStorage.
//
// This is NOT a security mechanism — there is no server, so a determined
// user can read localStorage directly. The 4-digit PIN exists only to stop
// a participant from accidentally loading a different child's profile on a
// shared device, not to authenticate them. Do not treat this as protecting
// sensitive data.
import { createDefaultAdaptiveState } from '../adaptive/tierEngine'

const STORAGE_KEY = 'hc7_participants_v1'
const MAX_SESSION_HISTORY = 20

const PARTICIPANT_ID_PATTERN = /^[A-Z0-9_-]{2,20}$/
const PIN_PATTERN = /^\d{4}$/

export function normalizeParticipantId(rawId) {
    return rawId.trim().toUpperCase()
}

export function isValidParticipantId(participantId) {
    return PARTICIPANT_ID_PATTERN.test(participantId)
}

export function isValidPin(pin) {
    return PIN_PATTERN.test(pin)
}

// SHA-256 hash of the PIN, hex-encoded. Requires a secure context
// (localhost or https), which Vite dev/preview and any real deployment satisfy.
async function hashPin(pin) {
    const bytes = new TextEncoder().encode(pin)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

function loadStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function toPublicParticipant(participantId, record) {
    return {
        participantId,
        createdAt: record.createdAt,
        sessions: record.sessions,
        adaptiveState: record.adaptiveState ?? createDefaultAdaptiveState(),
    }
}

// Attempts to log in an existing participant, or registers a new one if the
// ID hasn't been used before. Returns:
//   { ok: true, participant, isNew }
//   { ok: false, error: 'invalid_id' | 'invalid_pin' | 'wrong_pin' }
export async function loginOrRegister(rawParticipantId, pin) {
    const participantId = normalizeParticipantId(rawParticipantId ?? '')

    if (!isValidParticipantId(participantId)) {
        return { ok: false, error: 'invalid_id' }
    }
    if (!isValidPin(pin)) {
        return { ok: false, error: 'invalid_pin' }
    }

    const store = loadStore()
    const existing = store[participantId]
    const pinHash = await hashPin(pin)

    if (existing) {
        if (existing.pinHash !== pinHash) {
            return { ok: false, error: 'wrong_pin' }
        }
        return { ok: true, isNew: false, participant: toPublicParticipant(participantId, existing) }
    }

    const record = {
        pinHash,
        createdAt: new Date().toISOString(),
        sessions: [],
        adaptiveState: createDefaultAdaptiveState(),
    }
    store[participantId] = record
    saveStore(store)

    return { ok: true, isNew: true, participant: toPublicParticipant(participantId, record) }
}

// Appends a completed session summary to the participant's history and
// returns the updated (capped) sessions array.
export function addSessionResult(participantId, summary) {
    const store = loadStore()
    const record = store[participantId]
    if (!record) return []

    const entry = { ...summary, timestamp: new Date().toISOString() }
    record.sessions = [...record.sessions, entry].slice(-MAX_SESSION_HISTORY)
    store[participantId] = record
    saveStore(store)

    return record.sessions
}

export function getParticipantSessions(participantId) {
    const store = loadStore()
    return store[participantId]?.sessions ?? []
}

export function getAdaptiveState(participantId) {
    const store = loadStore()
    return store[participantId]?.adaptiveState ?? createDefaultAdaptiveState()
}

// Persists the next adaptive state for a participant and returns it.
// Returns null if the participant doesn't exist (mirrors addSessionResult).
export function updateAdaptiveState(participantId, nextAdaptiveState) {
    const store = loadStore()
    const record = store[participantId]
    if (!record) return null

    record.adaptiveState = nextAdaptiveState
    store[participantId] = record
    saveStore(store)

    return record.adaptiveState
}
