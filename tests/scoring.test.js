import { describe, expect, test } from 'vitest'
import {
    RT_MIN_MS,
    RT_MAX_MS,
    computeTrialScore,
    computeSessionComposite,
} from '../src/adaptive/scoring'

function makeTrial({ isCorrect, reactionTimeMs }) {
    return {
        participantId: 'P001',
        sessionId: 'P001_12345',
        trialId: 1,
        stimulusId: 'stimulus_001',
        correctEmotion: 'happy',
        selectedEmotion: isCorrect ? 'happy' : 'sad',
        isCorrect,
        reactionTimeMs,
        difficulty: 'easy',
        mode: 'normal',
        timestamp: '2026-08-10T12:00:00.000Z',
    }
}

describe('computeTrialScore', () => {
    test('returns 0 for an incorrect answer regardless of speed', () => {
        const score = computeTrialScore({
            isCorrect: false,
            reactionTimeMs: RT_MIN_MS,
        })

        expect(score).toBe(0)
    })

    test('returns 100 for a correct answer at or below the minimum RT bound', () => {
        const score = computeTrialScore({
            isCorrect: true,
            reactionTimeMs: RT_MIN_MS,
        })

        expect(score).toBe(100)
    })

    test('returns 70 for a correct answer at or above the maximum RT bound', () => {
        const score = computeTrialScore({
            isCorrect: true,
            reactionTimeMs: RT_MAX_MS,
        })

        expect(score).toBe(70)
    })

    test('gives faster correct answers a higher score than slower correct answers', () => {
        const fastScore = computeTrialScore({
            isCorrect: true,
            reactionTimeMs: 800,
        })

        const slowScore = computeTrialScore({
            isCorrect: true,
            reactionTimeMs: 4000,
        })

        expect(fastScore).toBeGreaterThan(slowScore)
    })
})

describe('computeSessionComposite', () => {
    test('handles an empty session without crashing', () => {
        const result = computeSessionComposite([])

        expect(result).toEqual({
            accuracyScore: 0,
            speedScore: 0,
            compositeScore: 0,
            meanReactionTimeMs: null,
            correctCount: 0,
            totalTrials: 0,
        })
    })

    test('counts correct trials and total trials correctly', () => {
        const logs = [
            makeTrial({isCorrect: true, reactionTimeMs: 1000}),
            makeTrial({isCorrect: false, reactionTimeMs: 1200}),
            makeTrial({isCorrect: true, reactionTimeMs: 900}),
        ]

        const result = computeSessionComposite(logs)

        expect(result.correctCount).toBe(2)
        expect(result.totalTrials).toBe(3)
        expect(result.accuracyScore).toBeCloseTo(2 / 3)
    })

    test('calculates mean reaction time across all trials', () => {
        const logs = [
            makeTrial({isCorrect: true, reactionTimeMs: 1000}),
            makeTrial({isCorrect: false, reactionTimeMs: 2000}),
            makeTrial({isCorrect: true, reactionTimeMs: 3000}),
        ]

        const result = computeSessionComposite(logs)

        expect(result.meanReactionTimeMs).toBe(2000)
    })

    test('computes speed from correct trials only', () => {
        const logsWithFastIncorrectTrial = [
            makeTrial({isCorrect: true, reactionTimeMs: 3000}),
            makeTrial({isCorrect: false, reactionTimeMs: 300}),
        ]

        const logsWithoutIncorrectTrial = [
            makeTrial({isCorrect: true, reactionTimeMs: 3000}),
        ]

        const resultWithIncorrect = computeSessionComposite(logsWithFastIncorrectTrial)
        const resultWithoutIncorrect = computeSessionComposite(logsWithoutIncorrectTrial)

        expect(resultWithIncorrect.speedScore).toBe(resultWithoutIncorrect.speedScore)
    })

    test('gives a higher composite score to high accuracy and fast responses', () => {
        const highPerformerLogs = [
            makeTrial({isCorrect: true, reactionTimeMs: 700}),
            makeTrial({isCorrect: true, reactionTimeMs: 800}),
            makeTrial({isCorrect: true, reactionTimeMs: 900}),
            makeTrial({isCorrect: true, reactionTimeMs: 1000}),
        ]

        const lowPerformerLogs = [
            makeTrial({isCorrect: false, reactionTimeMs: 2500}),
            makeTrial({isCorrect: false, reactionTimeMs: 2800}),
            makeTrial({isCorrect: true, reactionTimeMs: 3000}),
            makeTrial({isCorrect: false, reactionTimeMs: 3200}),
        ]

        const highResult = computeSessionComposite(highPerformerLogs)
        const lowResult = computeSessionComposite(lowPerformerLogs)

        expect(highResult.compositeScore).toBeGreaterThan(lowResult.compositeScore)
    })

    test('returns 100 for a fully correct session at the fastest RT bound', () => {
        const logs = [
            makeTrial({isCorrect: true, reactionTimeMs: RT_MIN_MS}),
            makeTrial({isCorrect: true, reactionTimeMs: RT_MIN_MS}),
        ]

        const result = computeSessionComposite(logs)

        expect(result.accuracyScore).toBe(1)
        expect(result.speedScore).toBe(1)
        expect(result.compositeScore).toBe(100)
    })

    test('returns 70 for a fully correct session at the slowest RT bound', () => {
        const logs = [
            makeTrial({isCorrect: true, reactionTimeMs: RT_MAX_MS}),
            makeTrial({isCorrect: true, reactionTimeMs: RT_MAX_MS}),
        ]

        const result = computeSessionComposite(logs)

        expect(result.accuracyScore).toBe(1)
        expect(result.speedScore).toBe(0)
        expect(result.compositeScore).toBe(70)
    })
})