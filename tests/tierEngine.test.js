import { describe, expect, test } from 'vitest'
import {
    TIER_THRESHOLDS,
    PROMOTE_SCORE_THRESHOLD,
    DEMOTE_SCORE_THRESHOLD,
    STREAK_TO_CHANGE_TIER,
    MAX_ADAPTIVE_HISTORY,
    createDefaultAdaptiveState,
    getPoolForTier,
    applyAdaptiveUpdate,
} from '../src/adaptive/tierEngine'

function makeAdaptiveState({
    tierIndex = 0,
    consecutiveAbove = 0,
    consecutiveBelow = 0,
    history = [],
} = {}) {
    return {
        version: 1,
        tierIndex,
        consecutiveAbove,
        consecutiveBelow,
        history,
    }
}

describe('createDefaultAdaptiveState', () => {
    test('creates a participant at the easiest tier with no streaks or history', () => {
        const state = createDefaultAdaptiveState()

        expect(state.version).toBe(1)
        expect(state.tierIndex).toBe(0)
        expect(state.consecutiveAbove).toBe(0)
        expect(state.consecutiveBelow).toBe(0)
        expect(state.history).toEqual([])
    })
})

describe('getPoolForTier', () => {
    test('excludes stimuli with null difficulty', () => {
        const stimuli = [
            { stimulusId: 'happy_1', emotion: 'happy', difficulty: 0.1 },
            { stimulusId: 'sad_1', emotion: 'sad', difficulty: 0.1 },
            { stimulusId: 'happy_null', emotion: 'happy', difficulty: null },
        ]

        const pool = getPoolForTier(stimuli, 0)

        expect(pool.find((stimulus) => stimulus.stimulusId === 'happy_null')).toBeUndefined()
    })

    test('only includes stimuli at or below the tier difficulty ceiling', () => {
        const stimuli = [
            { stimulusId: 'happy_easy', emotion: 'happy', difficulty: 0.1 },
            { stimulusId: 'sad_easy', emotion: 'sad', difficulty: 0.1 },
            { stimulusId: 'happy_hard', emotion: 'happy', difficulty: 0.9 },
            { stimulusId: 'sad_hard', emotion: 'sad', difficulty: 0.9 },
        ]

        const pool = getPoolForTier(stimuli, 0)

        expect(pool.every((stimulus) => stimulus.difficulty <= TIER_THRESHOLDS[0])).toBe(true)
    })

    test('balances the pool so each emotion contributes the same number of stimuli', () => {
        const stimuli = [
            { stimulusId: 'happy_1', emotion: 'happy', difficulty: 0.1 },
            { stimulusId: 'happy_2', emotion: 'happy', difficulty: 0.1 },
            { stimulusId: 'happy_3', emotion: 'happy', difficulty: 0.1 },
            { stimulusId: 'sad_1', emotion: 'sad', difficulty: 0.1 },
        ]

        const pool = getPoolForTier(stimuli, 0)

        const happyCount = pool.filter((stimulus) => stimulus.emotion === 'happy').length
        const sadCount = pool.filter((stimulus) => stimulus.emotion === 'sad').length

        expect(happyCount).toBe(sadCount)
    })

    test('returns an empty pool if no stimuli are eligible', () => {
        const stimuli = [
            { stimulusId: 'happy_null', emotion: 'happy', difficulty: null },
            { stimulusId: 'sad_hard', emotion: 'sad', difficulty: 0.9 },
        ]

        const pool = getPoolForTier(stimuli, 0)

        expect(pool).toEqual([])
    })
})

describe('applyAdaptiveUpdate', () => {
    test('increments the high-performance streak after one high score', () => {
        const state = makeAdaptiveState()

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_high_1',
            compositeScore: PROMOTE_SCORE_THRESHOLD,
        })

        expect(updated.tierIndex).toBe(0)
        expect(updated.consecutiveAbove).toBe(1)
        expect(updated.consecutiveBelow).toBe(0)
        expect(updated.history.at(-1).direction).toBe('none')
    })

    test('promotes after two consecutive high scores', () => {
        const state = makeAdaptiveState({
            tierIndex: 0,
            consecutiveAbove: STREAK_TO_CHANGE_TIER - 1,
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_high_2',
            compositeScore: PROMOTE_SCORE_THRESHOLD,
        })

        expect(updated.tierIndex).toBe(1)
        expect(updated.consecutiveAbove).toBe(0)
        expect(updated.consecutiveBelow).toBe(0)
        expect(updated.history.at(-1).direction).toBe('promote')
    })

    test('does not promote above the highest tier', () => {
        const highestTierIndex = TIER_THRESHOLDS.length - 1

        const state = makeAdaptiveState({
            tierIndex: highestTierIndex,
            consecutiveAbove: STREAK_TO_CHANGE_TIER - 1,
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_high_at_max',
            compositeScore: PROMOTE_SCORE_THRESHOLD,
        })

        expect(updated.tierIndex).toBe(highestTierIndex)
        expect(updated.history.at(-1).direction).toBe('promote')
    })

    test('increments the low-performance streak after one low score', () => {
        const state = makeAdaptiveState({
            tierIndex: 2,
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_low_1',
            compositeScore: DEMOTE_SCORE_THRESHOLD,
        })

        expect(updated.tierIndex).toBe(2)
        expect(updated.consecutiveAbove).toBe(0)
        expect(updated.consecutiveBelow).toBe(1)
        expect(updated.history.at(-1).direction).toBe('none')
    })

    test('demotes after two consecutive low scores', () => {
        const state = makeAdaptiveState({
            tierIndex: 2,
            consecutiveBelow: STREAK_TO_CHANGE_TIER - 1,
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_low_2',
            compositeScore: DEMOTE_SCORE_THRESHOLD,
        })

        expect(updated.tierIndex).toBe(1)
        expect(updated.consecutiveAbove).toBe(0)
        expect(updated.consecutiveBelow).toBe(0)
        expect(updated.history.at(-1).direction).toBe('demote')
    })

    test('does not demote below the lowest tier', () => {
        const state = makeAdaptiveState({
            tierIndex: 0,
            consecutiveBelow: STREAK_TO_CHANGE_TIER - 1,
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_low_at_min',
            compositeScore: DEMOTE_SCORE_THRESHOLD,
        })

        expect(updated.tierIndex).toBe(0)
        expect(updated.history.at(-1).direction).toBe('demote')
    })

    test('resets both streaks when score is in the middle band', () => {
        const state = makeAdaptiveState({
            tierIndex: 1,
            consecutiveAbove: 1,
            consecutiveBelow: 1,
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_middle',
            compositeScore: 65,
        })

        expect(updated.tierIndex).toBe(1)
        expect(updated.consecutiveAbove).toBe(0)
        expect(updated.consecutiveBelow).toBe(0)
        expect(updated.history.at(-1).direction).toBe('none')
    })

    test('records session information in history', () => {
        const state = makeAdaptiveState()

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_001',
            compositeScore: 75,
        })

        const latestHistory = updated.history.at(-1)

        expect(latestHistory.sessionId).toBe('session_001')
        expect(latestHistory.compositeScore).toBe(75)
        expect(latestHistory.tierIndex).toBe(updated.tierIndex)
        expect(latestHistory.timestamp).toEqual(expect.any(String))
    })

    test('caps adaptive history at the maximum length', () => {
        const existingHistory = Array.from({ length: MAX_ADAPTIVE_HISTORY }, (_, index) => ({
            timestamp: `old_${index}`,
            sessionId: `old_session_${index}`,
            compositeScore: 60,
            tierIndex: 0,
            direction: 'none',
        }))

        const state = makeAdaptiveState({
            history: existingHistory,
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'new_session',
            compositeScore: 65,
        })

        expect(updated.history).toHaveLength(MAX_ADAPTIVE_HISTORY)
        expect(updated.history.at(-1).sessionId).toBe('new_session')
        expect(updated.history[0].sessionId).toBe('old_session_1')
    })

    test('returns a new state object rather than mutating the original state', () => {
        const state = makeAdaptiveState({
            tierIndex: 1,
            consecutiveAbove: 1,
            history: [],
        })

        const updated = applyAdaptiveUpdate(state, {
            sessionId: 'session_001',
            compositeScore: PROMOTE_SCORE_THRESHOLD,
        })

        expect(updated).not.toBe(state)
        expect(state.tierIndex).toBe(1)
        expect(state.consecutiveAbove).toBe(1)
        expect(state.history).toEqual([])
    })
})