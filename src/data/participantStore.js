// Client-side participant data access, backed by the API server in `server/`.
//
// The server verifies the PIN and issues a bearer token per login (see
// server/src/auth.js). This module caches that token in memory, keyed by
// participantId, so callers can keep passing just a participantId (matching
// the old localStorage-backed signatures) without threading the token through
// every call site. Like the participant object held in App.jsx's React
// state, this cache lives only in the page's JS memory — never localStorage
// — and is lost on reload, so a reload always requires logging in again.
import { createDefaultAdaptiveState } from '../adaptive/tierEngine'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

const PARTICIPANT_ID_PATTERN = /^[A-Z0-9_-]{2,20}$/
const PIN_PATTERN = /^\d{4}$/

const tokensByParticipantId = new Map()

export function normalizeParticipantId(rawId) {
    return rawId.trim().toUpperCase()
}

export function isValidParticipantId(participantId) {
    return PARTICIPANT_ID_PATTERN.test(participantId)
}

export function isValidPin(pin) {
    return PIN_PATTERN.test(pin)
}

async function apiFetch(path, { token, ...options } = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {}),
        },
    })

    let data = null
    try {
        data = await response.json()
    } catch {
        // No JSON body (e.g. an empty response) — leave data as null.
    }

    return { ok: response.ok, status: response.status, data }
}

// Attempts to log in an existing participant, or registers a new one if the
// ID hasn't been used before. Returns:
//   { ok: true, participant, isNew }
//   { ok: false, error: 'invalid_id' | 'invalid_pin' | 'wrong_pin' | 'network_error' }
export async function loginOrRegister(rawParticipantId, pin) {
    const participantId = normalizeParticipantId(rawParticipantId ?? '')

    if (!isValidParticipantId(participantId)) {
        return { ok: false, error: 'invalid_id' }
    }
    if (!isValidPin(pin)) {
        return { ok: false, error: 'invalid_pin' }
    }

    let response
    try {
        response = await apiFetch('/api/participants/login', {
            method: 'POST',
            body: JSON.stringify({ participantId, pin }),
        })
    } catch {
        return { ok: false, error: 'network_error' }
    }

    if (!response.ok || !response.data?.ok) {
        return { ok: false, error: response.data?.error ?? 'network_error' }
    }

    tokensByParticipantId.set(participantId, response.data.token)

    return { ok: true, isNew: response.data.isNew, participant: response.data.participant }
}

// Appends a completed session summary to the participant's history and
// returns the updated (capped) sessions array. Returns [] on failure (no
// token cached, or a network/server error) so callers can treat it the same
// as "nothing to show" rather than crashing.
export async function addSessionResult(participantId, summary) {
    const token = tokensByParticipantId.get(participantId)
    if (!token) return []

    try {
        const { ok, data } = await apiFetch(`/api/participants/${participantId}/sessions`, {
            method: 'POST',
            token,
            body: JSON.stringify(summary),
        })
        return ok ? data : []
    } catch {
        return []
    }
}

export async function getParticipantSessions(participantId) {
    const token = tokensByParticipantId.get(participantId)
    if (!token) return []

    try {
        const { ok, data } = await apiFetch(`/api/participants/${participantId}/sessions`, { token })
        return ok ? data : []
    } catch {
        return []
    }
}

export async function getAdaptiveState(participantId) {
    const token = tokensByParticipantId.get(participantId)
    if (!token) return createDefaultAdaptiveState()

    try {
        const { ok, data } = await apiFetch(`/api/participants/${participantId}/adaptive-state`, { token })
        return ok ? data : createDefaultAdaptiveState()
    } catch {
        return createDefaultAdaptiveState()
    }
}

// Persists the next adaptive state for a participant and returns it.
// Returns null on failure (mirrors the old "participant doesn't exist" case).
export async function updateAdaptiveState(participantId, nextAdaptiveState) {
    const token = tokensByParticipantId.get(participantId)
    if (!token) return null

    try {
        const { ok, data } = await apiFetch(`/api/participants/${participantId}/adaptive-state`, {
            method: 'PUT',
            token,
            body: JSON.stringify(nextAdaptiveState),
        })
        return ok ? data : null
    } catch {
        return null
    }
}

// Batch-saves one session's trial-level logs. Returns { ok: false } on
// failure rather than throwing — trial logs are a secondary record of a
// session that has already been summarised via addSessionResult, so a
// failure here shouldn't block the player from seeing their results.
export async function saveTrialLogs(participantId, sessionId, logs) {
    const token = tokensByParticipantId.get(participantId)
    if (!token) return { ok: false }

    try {
        const { ok, data } = await apiFetch(`/api/participants/${participantId}/trials`, {
            method: 'POST',
            token,
            body: JSON.stringify({ sessionId, logs }),
        })
        return ok ? data : { ok: false }
    } catch {
        return { ok: false }
    }
}
