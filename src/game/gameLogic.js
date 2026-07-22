// Creates one trial log object after the user selects an answer
// Keeps the data format consistent with docs/data-schema.md
export function createTrialLog({
    participantId,
    sessionId,
    trialIndex,
    stimulus,
    selectedEmotion,
    reactionTimeMs,
    gazeSampleCount = 0
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

        // Game setting fields
        difficulty: stimulus.difficulty ?? "unassigned",
        mode: "normal",
        timestamp: new Date().toISOString(),

        // Basic gaze fields
        gazeSampleCount,
        gazeDataAvailable: gazeSampleCount > 0
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