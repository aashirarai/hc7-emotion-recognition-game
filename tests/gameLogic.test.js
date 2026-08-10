import { describe, expect, test } from "vitest";
import {
    createTrialLog,
    buildTrialSequence,
    convertLogsToCSV,
} from "../src/game/gameLogic"

const mockStimulus = {
    stimulusId: "happy_001",
    emotion: "happy",
    difficulty: "easy",
}

describe("createTrialLog", () => {
    test("creates a trial log for a correct answer", () => {
        const log = createTrialLog({
            participantId: "P001",
            sessionId: "P001_12345",
            trialIndex: 0,
            stimulus: mockStimulus,
            selectedEmotion: "happy",
            reactionTimeMs: 1200,
        })

        expect(log.participantId).toBe("P001")
        expect(log.sessionId).toBe("P001_12345")
        expect(log.trialId).toBe(1)
        expect(log.stimulusId).toBe("happy_001")
        expect(log.correctEmotion).toBe("happy")
        expect(log.selectedEmotion).toBe("happy")
        expect(log.isCorrect).toBe(true)
        expect(log.reactionTimeMs).toBe(1200)
    })

    test("marks an incorrect answer as incorrect", () => {
        const log = createTrialLog({
            participantId: "P001",
            sessionId: "P001_12345",
            trialIndex: 1,
            stimulus: mockStimulus,
            selectedEmotion: "sad",
            reactionTimeMs: 1500,
        })

        expect(log.trialId).toBe(2)
        expect(log.isCorrect).toBe(false)
        expect(log.correctEmotion).toBe("happy")
        expect(log.selectedEmotion).toBe("sad")
    })

})

describe("buildTrialSequence", () => {
    test("returns the requested number of stimuli", () => {
        const mockStimuli = [
            {stimulusId: "s1", emotion: "happy"},
            {stimulusId: "s2", emotion: "sad"},
            {stimulusId: "s3", emotion: "angry"},
        ]

        const sequence = buildTrialSequence(mockStimuli, 2)

        expect(sequence).toHaveLength(2)
    })

    test("does not modify the original stimuli array", () => {
        const mockStimuli = [
            {stimulusId: "s1", emotion: "happy"},
            {stimulusId: "s2", emotion: "sad"},
            {stimulusId: "s3", emotion: "angry"},
        ]

        buildTrialSequence(mockStimuli, 2)

        expect(mockStimuli).toHaveLength(3)
    })
})

describe("convertLogsToCSV", () => {
    test("returns an empty string for no logs", () => {
        expect(convertLogsToCSV([])).toBe("")
    })

    test("converts trial logs into CSV text", () => {
        const logs = [
            {
                participantId: "P001",
                sessionId: "P001_12345",
                trialId: 1,
                stimulusId: "happy_001",
                correctEmotion: "happy",
                selectedEmotion: "happy",
                isCorrect: true,
                reactionTimeMs: 1200,
            },
        ]

        const csv = convertLogsToCSV(logs)

        expect(csv).toContain("participantId")
        expect(csv).toContain("sessionId")
        expect(csv).toContain("happy_001")
        expect(csv).toContain("1200")
    })
})

