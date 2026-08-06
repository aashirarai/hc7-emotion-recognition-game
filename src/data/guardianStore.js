// Client-side guardian data access, backed by the API server in `server/`.
//
// Mirrors src/data/participantStore.js: the server issues a bearer token per
// login/signup (see server/src/auth.js), cached here in memory only — never
// localStorage — so a reload always requires signing in again.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

let currentGuardianToken = null

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

// Verifies the child's current PIN (read-only) and creates a separate
// guardian account. Returns:
//   { ok: true, guardian: { guardianId, participantId } }
//   { ok: false, error: 'invalid_participant_id' | 'invalid_pin' | 'invalid_guardian_id'
//       | 'weak_password' | 'participant_not_found' | 'wrong_pin' | 'guardian_id_taken'
//       | 'network_error' }
export async function signupGuardian(participantId, participantPin, guardianId, guardianPassword) {
    let response
    try {
        response = await apiFetch('/api/guardians/signup', {
            method: 'POST',
            body: JSON.stringify({ participantId, participantPin, guardianId, guardianPassword }),
        })
    } catch {
        return { ok: false, error: 'network_error' }
    }

    if (!response.ok || !response.data?.ok) {
        return { ok: false, error: response.data?.error ?? 'network_error' }
    }

    currentGuardianToken = response.data.token
    return {
        ok: true,
        guardian: { guardianId: response.data.guardianId, participantId: response.data.participantId },
    }
}

// Returns:
//   { ok: true, guardian: { guardianId, participantId } }
//   { ok: false, error: 'invalid_credentials' | 'network_error' }
export async function loginGuardian(guardianId, guardianPassword) {
    let response
    try {
        response = await apiFetch('/api/guardians/login', {
            method: 'POST',
            body: JSON.stringify({ guardianId, guardianPassword }),
        })
    } catch {
        return { ok: false, error: 'network_error' }
    }

    if (!response.ok || !response.data?.ok) {
        return { ok: false, error: response.data?.error ?? 'network_error' }
    }

    currentGuardianToken = response.data.token
    return {
        ok: true,
        guardian: { guardianId: response.data.guardianId, participantId: response.data.participantId },
    }
}

// Fetches the linked participant's session history and confusion matrix.
// Returns null if there's no cached token or the request fails.
export async function getGuardianDashboard() {
    if (!currentGuardianToken) return null

    try {
        const { ok, data } = await apiFetch('/api/guardians/me/dashboard', { token: currentGuardianToken })
        return ok ? data : null
    } catch {
        return null
    }
}

export function clearGuardianSession() {
    currentGuardianToken = null
}
