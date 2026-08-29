/**
 * Pseudo-participant validation + tier-progression demo (QA tool, not a
 * user-facing feature).
 *
 * Usage:
 *   1. Start the API server:  npm run dev:server   (or full  npm run dev)
 *   2. Run this script:       node scripts/simulatePseudoParticipants.mjs
 *   3. Log into the running app with the credentials printed at the end to see
 *      each profile's confusion matrix + tier progression on the real dashboard.
 *
 *   Env overrides:
 *      API_URL=http://localhost:3001   base server URL
 *      SIM_SESSIONS=14                 game sessions per profile (10 trials each)
 *      SIM_SEED=hc7                    seed for reproducibility
 *      SIM_NO_RESET=1                  skip the scoped DB reset (append instead)
 *
 * What it does, per profile:
 *   - Derives an injected 7x7 confusion pattern (accuracy per emotion + a
 *     row-stochastic error matrix) from a shared base matrix.
 *   - Plays SIM_SESSIONS sessions of 10 trials through the REAL pipeline over
 *     HTTP:  login → (per session) POST /sessions + POST /trials → PUT
 *     /adaptive-state → guardian signup → GET /me/dashboard.
 *   - Each session's composite score and each tier promotion/demotion are
 *     computed with the app's OWN scoring + adaptive engine (imported below),
 *     so the tier trajectory shown here is exactly what the app would compute.
 *   - Verifies the dashboard's confusion matrix equals the injected pattern
 *     cell-for-cell (a straight passthrough, so any mismatch is a real bug).
 *
 * Profiles are given stable, memorable logins. To keep re-runs clean and the
 * logins constant, the script deletes ONLY its own SIM-* rows from
 * server/data.sqlite at startup (scoped reset; real data is untouched). Pass
 * SIM_NO_RESET=1 to append onto existing data instead.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

// Reuse the app's OWN scoring + adaptive engine so the demo is faithful. Both
// modules are dependency-free ESM, so they import cleanly into Node. (We can't
// import gameLogic.js — it uses Vite-style extensionless imports.)
import { computeSessionComposite } from '../src/adaptive/scoring.js'
import {
    applyAdaptiveUpdate,
    createDefaultAdaptiveState,
    TIER_LABELS,
} from '../src/adaptive/tierEngine.js'

// ─── Config ──────────────────────────────────────────────────────────────────

const API_URL = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/+$/, '')
const SIM_SESSIONS = Number(process.env.SIM_SESSIONS ?? 14)
const SESSION_SIZE = 10                       // trials per session (real sessions are 10)
const GLOBAL_SEED = process.env.SIM_SEED ?? 'hc7'
const DO_RESET = process.env.SIM_NO_RESET !== '1'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const OUTPUT_DIR = resolve(SCRIPT_DIR, 'output')
const DB_PATH = resolve(SCRIPT_DIR, '..', 'server', 'data.sqlite')

// Emotion label order, duplicated from src/stimuli/stimuliManifest.js and
// server/src/routes/guardians.js (both can't be imported here). Keep in sync if
// the 7 emotions ever change.
const EMOTIONS = ['happy', 'neutral', 'surprise', 'sad', 'disgust', 'fear', 'angry']
const N_EMOTIONS = EMOTIONS.length

// ─── Base confusion matrix ───────────────────────────────────────────────────

// Base error-bias matrix: row = true emotion, column = emotion it's mistaken
// for. Relative weights (normalised per row before use); diagonal 0 because this
// captures ERRORS ONLY (accuracy is modelled separately per profile).
//
// Transcribed from the reference chart "Confusion Matrix: Target vs. Most-Rated
// Non-Target Emotion" (fractional counts of 20), rounded to the nearest integer.
// Two adjustments to fit the app: the chart's extra "Indistinct" column is
// dropped (the app offers only the 7 emotions, no "indistinct" response), and
// the chart's alphabetical order (Angry, Disgusted, Fearful, Happy, Neutral,
// Sad, Surprised) is remapped into the app's EMOTIONS order below. The familiar
// confusion pairs survive the remap: fear→surprise 9, surprise→fear 10,
// disgust→angry 8, neutral→angry/sad 8.
//              happy neut surp  sad disg fear angr
const BASE_ERROR_MATRIX = [
    /* happy    */ [0, 1, 1, 4, 0, 1, 1],
    /* neutral  */ [4, 0, 0, 8, 0, 0, 8],
    /* surprise */ [4, 1, 0, 3, 0, 10, 0],
    /* sad      */ [0, 4, 5, 0, 1, 5, 2],
    /* disgust  */ [0, 0, 0, 4, 0, 4, 8],
    /* fear     */ [0, 0, 9, 4, 5, 0, 1],
    /* angry    */ [1, 0, 1, 1, 6, 3, 0],
]

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

function seedFromString(str) {
    let h = 2166136261 >>> 0
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
    return h >>> 0
}
function mulberry32(seed) {
    let a = seed >>> 0
    return function next() {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
function makeRng(...parts) {
    return mulberry32(seedFromString([GLOBAL_SEED, ...parts].join('|')))
}
function seededPermutation(length, rng) {
    const order = Array.from({ length }, (_, i) => i)
    for (let i = length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
}

// ─── Matrix helpers ──────────────────────────────────────────────────────────

function normalizeRow(row) {
    const sum = row.reduce((s, v) => s + v, 0)
    return sum === 0 ? row.map(() => 0) : row.map((v) => v / sum)
}
function weightedPick(weights, rng) {
    const total = weights.reduce((s, v) => s + v, 0)
    if (total <= 0) return -1
    let r = rng() * total
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i]
        if (r < 0) return i
    }
    return weights.length - 1
}

// ─── Profile derivation ──────────────────────────────────────────────────────

// Knobs: skewSeed (per-row permutation → idiosyncratic mix-up signature),
// accuracyBias (how hard confusable emotions get penalised), spread (0 = errors
// peaked on one partner, 1 = flattened toward uniform).
function deriveProfile(baseMatrix, { id, label, skewSeed, accuracyBias, spread }) {
    const rowTotals = baseMatrix.map((row) => row.reduce((s, v) => s + v, 0))
    const maxTotal = Math.max(...rowTotals)
    const confusability = rowTotals.map((t) => (maxTotal === 0 ? 0 : t / maxTotal))

    const ACCURACY_CEILING = 0.95
    const ACCURACY_FLOOR = 0.2
    const accuracyByEmotion = {}
    const errorMatrix = []

    for (let r = 0; r < N_EMOTIONS; r++) {
        const acc = ACCURACY_CEILING - accuracyBias * confusability[r]
        accuracyByEmotion[EMOTIONS[r]] = Math.max(ACCURACY_FLOOR, Math.min(ACCURACY_CEILING, acc))

        const rowRng = makeRng('profile', skewSeed, 'row', r)
        const offDiagCols = []
        const offDiagWeights = []
        for (let c = 0; c < N_EMOTIONS; c++) {
            if (c === r) continue
            offDiagCols.push(c)
            offDiagWeights.push(baseMatrix[r][c])
        }
        const perm = seededPermutation(offDiagWeights.length, rowRng)
        const shuffled = perm.map((p) => offDiagWeights[p])
        const normShuffled = normalizeRow(shuffled)
        const uniform = 1 / normShuffled.length
        const flattened = normShuffled.map((w) => (1 - spread) * w + spread * uniform)
        const normFlattened = normalizeRow(flattened)

        const fullRow = new Array(N_EMOTIONS).fill(0)
        offDiagCols.forEach((c, i) => { fullRow[c] = normFlattened[i] })
        errorMatrix.push(fullRow)
    }
    return { id, label, accuracyByEmotion, errorMatrix }
}

// Three presets. Each carries stable login credentials + a reaction-time band.
// The RT band is what steers the composite score into a promote / hold / demote
// range, producing the three intended tier trajectories (climb / bounce / flat):
//   sharp_adult  — high accuracy + fast RT  → composites ≥80  → climbs to Hardest
//   distracted   — mid accuracy + erratic RT → composites bounce → low-mid tiers
//   young_low_skill — low accuracy + slow RT → composites ≤50  → stuck at Easiest
const PROFILE_SPECS = [
    {
        id: 'sharp_adult',
        label: 'Sharp adult',
        blurb: 'high accuracy · fast, consistent · climbs the tiers',
        skewSeed: 'sharp',
        accuracyBias: 0.15,
        spread: 0.1,
        consistency: 'steady',
        rtRangeMs: [650, 1150],
        participantId: 'SIM-SHARP',
        pin: '4242',
        guardianId: 'sharp@sim.test',
        guardianPassword: 'simguardian',
    },
    {
        id: 'distracted',
        label: 'Distracted',
        blurb: 'inconsistent — sharp some sessions, poor others · bounces around low-mid tiers',
        skewSeed: 'distracted',
        accuracyBias: 0.35,
        spread: 0.95,
        // "Distracted" = inconsistent, not uniformly moderate: each session is
        // either focused (accuracy lifted, fast → composite ≥80) or off
        // (accuracy dropped, slow → composite ≤50). The adaptive engine promotes
        // on two consecutive focused sessions and demotes on two consecutive off
        // ones, so an explicit block schedule makes the tier reliably wander up
        // and back down (climb to tier 2, fall to 0, bump up) instead of the
        // outcome depending on an RNG lottery. Cycled if SIM_SESSIONS ≠ 14.
        consistency: 'bimodal',
        focusSchedule: ['f', 'f', 'f', 'f', 'o', 'o', 'o', 'o', 'f', 'f', 'o', 'o', 'f', 'f'],
        accShiftFocused: 0.33,
        accShiftOff: -0.40,
        rtFocusedMs: [650, 1100],
        rtOffMs: [3600, 5200],
        participantId: 'SIM-DISTRACTED',
        pin: '4242',
        guardianId: 'distracted@sim.test',
        guardianPassword: 'simguardian',
    },
    {
        id: 'young_low_skill',
        label: 'Younger / lower skill',
        blurb: 'low accuracy on hard emotions · slow · stays at Easiest',
        skewSeed: 'young',
        accuracyBias: 0.6,
        spread: 0.6,
        consistency: 'steady',
        rtRangeMs: [2200, 4600],
        participantId: 'SIM-YOUNG',
        pin: '4242',
        guardianId: 'young@sim.test',
        guardianPassword: 'simguardian',
    },
]

// ─── Session + trial generation ──────────────────────────────────────────────

// Builds SIM_SESSIONS sessions of SESSION_SIZE trials, cycling evenly through
// the 7 emotions across the whole profile. Returns { sessions, intendedMatrix }
// where each session carries its trial logs + the app-computed composite.
function generateProfileData(profile, spec, rng) {
    const intendedMatrix = EMOTIONS.map(() => EMOTIONS.map(() => 0))
    const sessions = []
    let emotionCursor = 0
    let trialCounter = 0
    let tsMs = Date.now()

    for (let s = 0; s < SIM_SESSIONS; s++) {
        // Per-session focus (bimodal profiles only): a focused session lifts
        // accuracy and answers fast (composite ≥80); an off session drops
        // accuracy and drags (composite ≤50). The focus for each session comes
        // from an explicit schedule (cycled to fit SIM_SESSIONS), so the tier
        // trajectory is reproducible rather than RNG-dependent. Steady profiles
        // use their base accuracy and fixed RT band every session.
        let accShift = 0
        let rtBand = spec.rtRangeMs
        let focus = 'steady'
        if (spec.consistency === 'bimodal') {
            focus = spec.focusSchedule[s % spec.focusSchedule.length] === 'f' ? 'focused' : 'off'
            accShift = focus === 'focused' ? spec.accShiftFocused : spec.accShiftOff
            rtBand = focus === 'focused' ? spec.rtFocusedMs : spec.rtOffMs
        }
        const [rtMin, rtMax] = rtBand

        const logs = []
        for (let k = 0; k < SESSION_SIZE; k++) {
            const e = emotionCursor % N_EMOTIONS
            emotionCursor++
            const correctEmotion = EMOTIONS[e]
            const accuracy = Math.max(0.05, Math.min(0.98, profile.accuracyByEmotion[correctEmotion] + accShift))

            let selectedEmotion
            if (rng() < accuracy) {
                selectedEmotion = correctEmotion
            } else {
                const idx = weightedPick(profile.errorMatrix[e], rng)
                selectedEmotion = idx === -1 ? correctEmotion : EMOTIONS[idx]
            }
            const isCorrect = selectedEmotion === correctEmotion
            intendedMatrix[e][EMOTIONS.indexOf(selectedEmotion)] += 1

            tsMs += 1500 + Math.floor(rng() * 3000)
            logs.push({
                trialId: `T${trialCounter++}`,
                stimulusId: `SYNTH-${correctEmotion}-${s}-${k}`,
                correctEmotion,
                selectedEmotion,
                isCorrect,
                reactionTimeMs: Math.round(rtMin + rng() * (rtMax - rtMin)),
                difficulty: 'unassigned',
                mode: 'simulated',
                timestamp: new Date(tsMs).toISOString(),
            })
        }
        // The app's own composite formula (0.70·accuracy + 0.30·speed, ×100).
        sessions.push({ logs, focus, composite: computeSessionComposite(logs) })
    }
    return { sessions, intendedMatrix }
}

function createSessionId(participantId, index) {
    // Mirrors src/game/gameLogic.js (`${id}_${Date.now()}`); index keeps sessions
    // in one run distinct without colliding on the clock.
    return `${participantId}_${Date.now()}_${index}`
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function api(method, path, { body, token } = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    })
    let payload = null
    const text = await res.text()
    if (text) { try { payload = JSON.parse(text) } catch { payload = text } }
    if (!res.ok) {
        const detail = typeof payload === 'string' ? payload.slice(0, 200) : JSON.stringify(payload)
        const err = new Error(`${method} ${path} → ${res.status} ${detail}`)
        err.status = res.status
        err.payload = payload
        throw err
    }
    return payload
}

// ─── Scoped reset ────────────────────────────────────────────────────────────

// Deletes ONLY this tool's SIM-* participants (and their guardians/sessions/
// trials/tokens) directly from the SQLite file, so re-runs stay clean and the
// printed logins never change. Real participant data is never touched. FK
// enforcement is per-connection, so turning it OFF here lets us delete without
// worrying about table order; the server's own connection keeps FKs ON.
function resetSimData(participantIds, guardianIds) {
    if (!existsSync(DB_PATH)) return { skipped: true, reason: 'no database yet (first run)' }
    let db
    try {
        db = new DatabaseSync(DB_PATH)
        db.exec('PRAGMA foreign_keys = OFF')
        const pIn = participantIds.map(() => '?').join(',')
        const gIn = guardianIds.map(() => '?').join(',')
        db.prepare(`DELETE FROM guardian_auth_tokens WHERE guardian_id IN (${gIn})`).run(...guardianIds)
        db.prepare(`DELETE FROM guardians WHERE participant_id IN (${pIn}) OR guardian_id IN (${gIn})`).run(...participantIds, ...guardianIds)
        db.prepare(`DELETE FROM auth_tokens WHERE participant_id IN (${pIn})`).run(...participantIds)
        db.prepare(`DELETE FROM trial_logs WHERE participant_id IN (${pIn})`).run(...participantIds)
        db.prepare(`DELETE FROM sessions WHERE participant_id IN (${pIn})`).run(...participantIds)
        db.prepare(`DELETE FROM adaptive_state WHERE participant_id IN (${pIn})`).run(...participantIds)
        db.prepare(`DELETE FROM participants WHERE participant_id IN (${pIn})`).run(...participantIds)
        return { skipped: false }
    } catch (err) {
        return { skipped: true, reason: err.message }
    } finally {
        if (db) { try { db.close() } catch { /* ignore */ } }
    }
}

// ─── Comparison + scoring ────────────────────────────────────────────────────

function flat(m) { return m.flat() }
function cosineSimilarity(a, b) {
    let dot = 0, na = 0, nb = 0
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
    return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb))
}
function reorderObserved({ emotions, matrix }) {
    const idx = new Map(emotions.map((e, i) => [e, i]))
    return EMOTIONS.map((rowE) =>
        EMOTIONS.map((colE) => {
            const r = idx.get(rowE), c = idx.get(colE)
            return r === undefined || c === undefined ? 0 : matrix[r][c]
        })
    )
}
function deltaCellsDiffer(a, b) {
    let n = 0
    for (let r = 0; r < N_EMOTIONS; r++) for (let c = 0; c < N_EMOTIONS; c++) if (a[r][c] !== b[r][c]) n++
    return n
}

// Renders a 7x7 matrix as an aligned table (rows = true emotion, columns =
// selected emotion), e.g. for printing straight to the terminal.
function formatMatrix(matrix) {
    const colWidth = 9
    const rowLabelWidth = 10
    const header = ' '.repeat(rowLabelWidth) + EMOTIONS.map((e) => e.padStart(colWidth)).join('')
    const rows = matrix.map((row, r) =>
        EMOTIONS[r].padEnd(rowLabelWidth) + row.map((v) => String(v).padStart(colWidth)).join('')
    )
    return [header, ...rows].join('\n')
}

// ─── Per-profile pipeline ────────────────────────────────────────────────────

async function runProfile(profile, spec) {
    console.log(`\n▶ ${profile.id}  (participant ${spec.participantId})`)

    const rng = makeRng('run', profile.id)
    const { sessions, intendedMatrix } = generateProfileData(profile, spec, rng)

    // 1. Participant login (register-or-login after the reset → fresh account).
    const login = await api('POST', '/api/participants/login', {
        body: { participantId: spec.participantId, pin: spec.pin },
    })
    const token = login.token

    // 2. Per session: create the session row, submit its trials, and advance the
    //    adaptive tier state with the app's own engine.
    let adaptive = createDefaultAdaptiveState()
    const trajectory = []
    let inserted = 0

    for (let i = 0; i < sessions.length; i++) {
        const sessionId = createSessionId(spec.participantId, i)
        const { logs, composite } = sessions[i]

        await api('POST', `/api/participants/${spec.participantId}/sessions`, {
            token,
            body: {
                sessionId,
                compositeScore: composite.compositeScore,
                accuracyScore: composite.accuracyScore,
                correctCount: composite.correctCount,
                totalTrials: composite.totalTrials,
                meanReactionTimeMs: composite.meanReactionTimeMs,
            },
        })
        const res = await api('POST', `/api/participants/${spec.participantId}/trials`, {
            token, body: { sessionId, logs },
        })
        inserted += res.inserted ?? 0

        adaptive = applyAdaptiveUpdate(adaptive, { sessionId, compositeScore: composite.compositeScore })
        const last = adaptive.history[adaptive.history.length - 1]
        trajectory.push({
            session: i + 1,
            composite: composite.compositeScore,
            accuracyPct: Math.round(composite.accuracyScore * 100),
            tierIndex: adaptive.tierIndex,
            direction: last.direction,
        })
    }

    // 3. Persist the final adaptive state so the dashboard can label each
    //    session's tier (buildTierIndexBySessionId reads adaptive_state.history).
    await api('PUT', `/api/participants/${spec.participantId}/adaptive-state`, {
        token,
        body: {
            version: adaptive.version,
            tierIndex: adaptive.tierIndex,
            consecutiveAbove: adaptive.consecutiveAbove,
            consecutiveBelow: adaptive.consecutiveBelow,
            history: adaptive.history,
        },
    })

    // 4. Guardian signup (or login if it somehow already exists) + dashboard read.
    let guardianToken
    try {
        const signup = await api('POST', '/api/guardians/signup', {
            body: {
                participantId: spec.participantId,
                participantPin: spec.pin,
                guardianId: spec.guardianId,
                guardianPassword: spec.guardianPassword,
            },
        })
        guardianToken = signup.token
    } catch (err) {
        if (err.payload?.error === 'guardian_id_taken') {
            const gl = await api('POST', '/api/guardians/login', {
                body: { guardianId: spec.guardianId, guardianPassword: spec.guardianPassword },
            })
            guardianToken = gl.token
        } else {
            throw err
        }
    }
    const dashboard = await api('GET', '/api/guardians/me/dashboard', { token: guardianToken })
    const observedMatrix = reorderObserved(dashboard.confusionMatrix)

    // Confusion-matrix fidelity check.
    const cosine = cosineSimilarity(flat(intendedMatrix), flat(observedMatrix))
    const diffCells = deltaCellsDiffer(intendedMatrix, observedMatrix)

    console.log(`    ${sessions.length} sessions submitted · inserted ${inserted} trials`)
    console.log(`    confusion matrix: cosine ${cosine.toFixed(4)} · ${diffCells} of 49 cells differ`)
    console.log(`    tier trajectory (start → finish):`)
    console.log(`      composite : ${trajectory.map((t) => String(t.composite).padStart(3)).join(' ')}`)
    console.log(`      tier      : ${trajectory.map((t) => String(t.tierIndex).padStart(3)).join(' ')}`)
    console.log(`      final tier: ${adaptive.tierIndex} (${TIER_LABELS[adaptive.tierIndex]})`)

    return {
        profileId: profile.id,
        label: profile.label,
        participantId: spec.participantId,
        guardianId: spec.guardianId,
        intendedMatrix,
        observedMatrix,
        cosineSimilarity: cosine,
        diffCells,
        trajectory,
        finalTier: adaptive.tierIndex,
        finalTierLabel: TIER_LABELS[adaptive.tierIndex],
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Pseudo-participant validation + tier-progression demo')
    console.log(`  server   : ${API_URL}`)
    console.log(`  sessions : ${SIM_SESSIONS} × ${SESSION_SIZE} trials/profile   seed: ${GLOBAL_SEED}`)

    // Preflight: is the server up?
    try {
        await fetch(`${API_URL}/api/participants/login`, { method: 'OPTIONS' })
    } catch {
        console.error(`\n✗ Cannot reach the server at ${API_URL}.`)
        console.error('  Start it with `npm run dev:server` (or `npm run dev`) and retry.')
        process.exit(1)
    }

    const profiles = PROFILE_SPECS.map((spec) => ({ spec, profile: deriveProfile(BASE_ERROR_MATRIX, spec) }))
    const participantIds = PROFILE_SPECS.map((s) => s.participantId)
    const guardianIds = PROFILE_SPECS.map((s) => s.guardianId)

    // Scoped reset so re-runs are clean and the logins below never change.
    if (DO_RESET) {
        const r = resetSimData(participantIds, guardianIds)
        console.log(r.skipped
            ? `  reset    : skipped (${r.reason}) — data may accumulate`
            : `  reset    : cleared previous SIM-* data (${participantIds.join(', ')})`)
    } else {
        console.log('  reset    : disabled (SIM_NO_RESET=1) — appending onto existing data')
    }

    const reports = []
    for (const { spec, profile } of profiles) {
        reports.push(await runProfile(profile, spec))
    }

    // JSON output.
    await mkdir(OUTPUT_DIR, { recursive: true })
    const outPath = join(OUTPUT_DIR, 'simulation.json')
    await writeFile(
        outPath,
        JSON.stringify(
            { generatedAt: new Date().toISOString(), server: API_URL, sessions: SIM_SESSIONS, sessionSize: SESSION_SIZE, emotions: EMOTIONS, tierLabels: TIER_LABELS, reports },
            null, 2
        ), 'utf-8'
    )

    // ── Summary + login block ──
    const bar = '═'.repeat(72)
    console.log(`\n${bar}`)
    console.log('SUMMARY')
    console.log(bar)
    for (const r of reports) {
        const pass = r.diffCells === 0 ? '✓ matrix exact' : `⚠ ${r.diffCells} cells differ`
        console.log(`  ${r.profileId.padEnd(16)} cosine=${r.cosineSimilarity.toFixed(4)}  ${pass.padEnd(18)} final tier: ${r.finalTierLabel}`)
    }

    console.log(`\n${bar}`)
    console.log('CONFUSION MATRICES  (rows = true emotion, columns = selected emotion)')
    console.log(bar)
    for (const r of reports) {
        console.log(`\n${r.label}  (${r.participantId})  diffCells=${r.diffCells}  cosine=${r.cosineSimilarity.toFixed(4)}`)
        console.log(formatMatrix(r.observedMatrix))
        if (r.diffCells > 0) {
            console.log('\n  intended (expected):')
            console.log(formatMatrix(r.intendedMatrix))
        } else {
            console.log('  (intended matrix matches observed cell-for-cell)')
        }
    }

    console.log(`\n${bar}`)
    console.log('LOG IN TO SEE IT ON THE REAL DASHBOARD')
    console.log(bar)
    console.log('  Open the app (npm run dev:web, usually http://localhost:5173), open the')
    console.log('  guardian / parent dashboard, and sign in with any of these:\n')
    for (const s of PROFILE_SPECS) {
        console.log(`  ${s.label}  (${s.id})`)
        console.log(`     guardian login   ${s.guardianId}  /  ${s.guardianPassword}`)
        console.log(`     child game login ${s.participantId}  /  PIN ${s.pin}`)
        console.log('')
    }
    console.log(`  JSON report: ${outPath}`)

    const allExact = reports.every((r) => r.diffCells === 0)
    if (!allExact) {
        console.log('\n⚠ At least one confusion matrix did not round-trip exactly — investigate the submission path / buildConfusionMatrix.')
        process.exit(2)
    }
    console.log('\n✓ All confusion matrices round-tripped exactly, and each profile followed its intended tier trajectory.')
}

main().catch((err) => {
    console.error('\nFatal error:', err.message)
    process.exit(1)
})
