import { getPoolForTier } from '../adaptive/tierEngine'

// Creates one trial log object after the user selects an answer
// Keeps the data format consistent with docs/data-schema.md
export function createTrialLog({
    participantId,
    sessionId,
    trialIndex,
    stimulus,
    selectedEmotion,
    reactionTimeMs,
    trialDurationFlag = 'not_computed',
    gazeSampleCount = 0,
    gazeDurationMs = null,
    gazeSamplingRateHz = 0,
    gazeQualityFlag = 'not_computed',
    gazeSummary = {},
    calibrationSummary = null,
}) {
    // Check whether the selected answer matches the correct emotion
    const isCorrect = (selectedEmotion === stimulus.emotion)

    // Return a structured trial record
    // This object will be used for data export, dashboard summaries,
    // adaptive difficulty, and gaze metrics
    return {
        // Participant/session/trial ID
        participantId,
        sessionId,
        trialId: trialIndex + 1,

        // Stimulus and behavioural response fields
        stimulusId: stimulus.stimulusId,
        correctEmotion: stimulus.emotion,
        selectedEmotion,
        isCorrect,
        reactionTimeMs,
        trialDurationFlag,

        // Game setting fields
        difficulty: stimulus.difficulty ?? "unassigned",
        mode: "normal",
        timestamp: new Date().toISOString(),

        // Basic gaze fields
        gazeDataAvailable: gazeSampleCount > 0,
        gazeSampleCount,
        gazeDurationMs,
        gazeSamplingRateHz,
        gazeQualityFlag,

        gazeSamplesTotal: gazeSummary.gazeSamplesTotal ?? gazeSampleCount,

        // Screen dimensions and stimulus ratios
        viewportWidth: gazeSummary.viewportWidth ?? null,
        viewportHeight: gazeSummary.viewportHeight ?? null,
        screenAreaPx: gazeSummary.screenAreaPx ?? null,

        stimulusCardAreaPx: gazeSummary.stimulusCardAreaPx ?? null,
        stimulusImageAreaPx: gazeSummary.stimulusImageAreaPx ?? null,
        stimulusCardAreaRatio: gazeSummary.stimulusCardAreaRatio ?? null,
        stimulusImageAreaRatio: gazeSummary.stimulusImageAreaRatio ?? null,

        // On-/off-stimulus card AOI
        onStimulusCardCount: gazeSummary.onStimulusCardCount ?? 0,
        offStimulusCardCount: gazeSummary.offStimulusCardCount ?? 0,
        onStimulusCardDwellProp: gazeSummary.onStimulusCardDwellProp ?? null,
        offStimulusCardDwellProp: gazeSummary.offStimulusCardDwellProp ?? null,

        // On-/off-stimulus image AOI
        onStimulusImageCount: gazeSummary.onStimulusImageCount ?? 0,
        offStimulusImageCount: gazeSummary.offStimulusImageCount ?? 0,
        onStimulusImageDwellProp: gazeSummary.onStimulusImageDwellProp ?? null,
        offStimulusImageDwellProp: gazeSummary.offStimulusImageDwellProp ?? null,

        // Upper/lower image AOI
        upperImageCount: gazeSummary.upperImageCount ?? 0,
        lowerImageCount: gazeSummary.lowerImageCount ?? 0,
        upperImageDwellProp: gazeSummary.upperImageDwellProp ?? null,
        lowerImageDwellProp: gazeSummary.lowerImageDwellProp ?? null,
        upperLowerImageRatio: gazeSummary.upperLowerImageRatio ?? null,

        // Calibration check metrics
        calibrationCompleted: calibrationSummary?.calibrationCompleted ?? false,
        calibrationTargetCount: calibrationSummary?.calibrationTargetCount ?? 0,
        meanCalibrationErrorPx: calibrationSummary?.meanCalibrationErrorPx ?? null,
        medianCalibrationErrorPx: calibrationSummary?.medianCalibrationErrorPx ?? null,
        maxCalibrationErrorPx: calibrationSummary?.maxCalibrationErrorPx ?? null,
        meanXErrorPx: calibrationSummary?.meanXErrorPx ?? null,
        meanYErrorPx: calibrationSummary?.meanYErrorPx ?? null,
        medianYErrorPx: calibrationSummary?.medianYErrorPx ?? null,
        calibrationQualityFlag: calibrationSummary?.calibrationQualityFlag ?? 'not_available',
    }
}

// Creates a simple pseudonymous session ID, scoped to the logged-in participant
// Date.now() gives a unique timestamp-based number
export function createSessionId(participantId) {
    return `${participantId}_${Date.now()}`
}

// Returns a shuffled copy of the stimuli array for one session.
// Pass a count to limit the number of trials (e.g. 12 trials from a pool of 60 images).
// Omit count to use every image exactly once.
export function buildTrialSequence(stimuli, count = null) {
    const shuffled = [...stimuli].sort(() => Math.random() - 0.5)
    return count !== null ? shuffled.slice(0, count) : shuffled
}

// Same as buildTrialSequence, but restricted to the stimulus pool unlocked
// for the participant's current adaptive difficulty tier.
export function buildAdaptiveTrialSequence(stimuli, count, tierIndex) {
    const pool = getPoolForTier(stimuli, tierIndex)
    return buildTrialSequence(pool, count)
}

// Converts the trial logs array into CSV text
export function convertLogsToCSV(logs) {
    if (logs.length == 0) return ""
    
    // Get the column names from the first trial log object
    const headers = Object.keys(logs[0])

    // Convert each trial log object into one CSV row
    const rows = logs.map((log) => 
        
        headers
            // For each header, get the matching value from the log object
            .map((header) => JSON.stringify(log[header] ?? ""))
            // Join all values in that trial with commas to make one CSV row
            .join(",")
    )

    // Put the header row at the top, followed by all trial rows
    // Each row is separated by a newline
    return [headers.join(","), ...rows].join("\n")
}


// Downloads the trial logs as a CSV file on the user's device
export function downloadCSV(logs, filename = "session_logs.csv") {
    // Convert the trial logs array into CSV format
    const csv = convertLogsToCSV(logs)

    // Create a Blob, which is a file-like object in the browser
    // This Blob contains the CSV text and is labelled as a CSV file type
    const blob = new Blob([csv],  {
        type: "text/csv;charset=utf-8;"
    })

    // Create a temporary URL that points to the Blob
    // The browser can use this URL as if it were a downloadable file
    const url = URL.createObjectURL(blob)

    // Create a temporary invisible link element
    const link = document.createElement("a")
    // Set the link's destination to the temporary CSV file URL
    link.href = url
    // Set the filename that will appear in the user's Downloads folder
    link.download = filename
    // Click the link to trigger the download
    link.click()

    // Clean up the temporary URL to free memory
    URL.revokeObjectURL(url)
}