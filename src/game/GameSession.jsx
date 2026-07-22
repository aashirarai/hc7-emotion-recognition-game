import { useEffect, useRef, useState } from 'react'

import { stimuli } from '../stimuli/stimuliManifest'
import { requestWebcamPermission } from '../gaze/requestWebcamPermission'
import { startWebGazer, stopWebGazer } from '../gaze/webgazerService'
// import WebcamPreview from '../gaze/WebcamPreview'

import { buildTrialSequence, createSessionId, createTrialLog, downloadCSV } from './gameLogic'
import { computeSessionComposite } from '../adaptive/scoring'

import StartScreen from './StartScreen'
import TrialScreen from './TrialScreen'
import FeedbackScreen from './FeedbackScreen'

// import GazeTestPage from '../gaze/GazeTestPage'

function GameSession() {
    // Tracks whether the user has started the session
    const [sessionStarted, setSessionStarted] = useState(false)

    // Tracks whether all trials have been completed
    const [sessionComplete, setSessionComplete] = useState(false)

    // Stores the pseudonymous sesion ID
    const [sessionId, setSessionId] = useState(null)

    // Stores metadata about the current session
    const [sessionMetadata, setSessionMetadata] = useState(null)

    // Stores the webcam stream if permission is granted
    // This will later be used by the gaze module
    const [webcamStream, setWebcamStream] = useState(null)

    // Tracks whether the game has entered gaze test mode
    // const [showGazeTest, setShowGazeTest] = useState(false)

    // Shuffled list of stimuli for the current session, generated on Start
    const [trialSequence, setTrialSequence] = useState([])

    // Stores which trial the user is currently on
    const [currentTrialIndex, setCurrentTrialIndex] = useState(0)

    // Stores the time when the current trial started, used to calculate reaction time.
    // A ref rather than state — changing it shouldn't trigger a re-render.
    const trialStartTime = useRef(null)

    // Stores raw gaze predictions for the current trial
    // useRef is used instead because WebGazer may produce many samples per second
    // Adding a sample to a ref does not cause the entire GameSession component to re-render
    const currentTrialGazeSamplesRef = useRef([])

    // Controls whether incoming WebGazer predictions should currently be saved
    const collectingGazeRef = useRef(false)

    // Stores all trial logs from the current session
    const [trialLogs, setTrialLogs] = useState([])

    // Stores the most recent trial log so the feedback screen can display it
    const [lastTrialLog, setLastTrialLog] = useState(null)

    // Controls whether the feedback screen is shown
    const [showFeedback, setShowFeedback] = useState(false)

    // Get the current stimulus from the shuffled sequence
    const currentStimulus = trialSequence[currentTrialIndex]

    // Total number of trials
    const totalTrials = trialSequence.length

    // Receives one gaze prediction from WebGazer
    function handleGazeData(point) {
        // Ignore predictions outside an active trial
        if (!collectingGazeRef.current) return

        // Ignore predictions that do not contain usable coordinates
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return
        }

        // Add the valid prediction to the current trial's gaze buffer
        currentTrialGazeSamplesRef.current.push(point)
    }

    // Start timing each trial when:
    // - the session has started
    // - the user is not on the feedback screen
    // - the session is not complete
    useEffect(() => {
        const trialIsActive = sessionStarted && !showFeedback && !sessionComplete
        if (trialIsActive) {
            // Start the behavioural reaction time measurement
            // performance.now() gives a high-resolution timestamp
            setTrialStartTime(performance.now())

            // Remove samples from the previous trial before the new trial begins
            currentTrialGazeSamplesRef.current = []

            // Only collect gaze when WebGazer started successfully
            collectingGazeRef.current = sessionMetadata?.webgazerStarted === true
        } else {
            // Do not collect gaze during feedback or after session completion
            collectingGazeRef.current = false
        }
    }, [sessionStarted, currentTrialIndex, showFeedback, sessionComplete, sessionMetadata])

    // Clean up WebGazer if GameSession is removed from the page.
    useEffect(() => {
        return () => {
            stopWebGazer()
        }
    }, [])
    
    // Called when the user chooses how to start the session
    async function handleStart({ webcamRequested }) {
        // Create a new pseudonymous sesion ID
        const newSessionId = createSessionId()

        // Default webcam values
        // These are used if the user starts without webcam
        let webcamEnabled = false
        let webcamPermissionStatus = "not_requested"
        let stream = null
        let webgazerStarted = false

        // Only request browser webcam access if the user chose the webcam option
        if (webcamRequested) {
            const webcamResult = await requestWebcamPermission()

            webcamEnabled = webcamResult.webcamEnabled
            webcamPermissionStatus = webcamResult.webcamPermissionStatus
            stream = webcamResult.stream
        }

        // Start WebGazer only if webcam permission was successfully granted
        if (webcamEnabled) {

            if (stream) {
                stream.getTracks().forEach((track) => track.stop())
                stream = null
            }

            const webgazerResult = await startWebGazer(handleGazeData)

            // Convert the returned WebGazer object into a Boolean
            webgazerStarted = Boolean(webgazerResult)
        }

        setSessionId(newSessionId)

        // Store the webcam stream for later use
        setWebcamStream(stream)

        // Store session metadata
        // This only records whether the user chose the webcam option
        setSessionMetadata({
            sessionId: newSessionId,
            startedAt: new Date().toISOString(),
            webcamRequested,
            webcamEnabled,
            webcamPermissionStatus,
            webgazerStarted
        })

        // Build a fresh shuffled trial sequence for this session
        setTrialSequence(buildTrialSequence(stimuli, 10))

        // Reset all game state
        setSessionStarted(true)
        setSessionComplete(false)
        setCurrentTrialIndex(0)
        setTrialLogs([])
        setLastTrialLog(null)
        setShowFeedback(false)
    }

    // Called when the user selects an answer
    function handleAnswer(selectedEmotion) {
        // Safety check
        if (trialStartTime.current === null || !currentStimulus) return

        // Stop saving gaze prediction at the exact point the answer is selected
        collectingGazeRef.current = false

        // Record how many valid gaze predictions were collected during this trial
        const gazeSampleCount = currentTrialGazeSamplesRef.current.length

        // Calculate reaction time from trial start to button click
        const reactionTimeMs = Math.round(performance.now() - trialStartTime.current)

        // Create a structured trial log
        const log = createTrialLog({
            sessionId,
            trialIndex: currentTrialIndex,
            stimulus: currentStimulus,
            selectedEmotion,
            reactionTimeMs,
            gazeSampleCount
        })

        // Create the updated full session log immediately
        const updatedLogs = [...trialLogs, log]

        // Add the new trial log to the session log array
        setTrialLogs(updatedLogs)

        // Store the most recent trial log for the feedback screen
        setLastTrialLog(log)

        // Show feedback
        setShowFeedback(true)

        // Debugging output
        console.log('Trial log: ', log)   
        console.log('Updated session logs: ', updatedLogs)
    }

    // Called when the user clicks "Next" or "Finish"
    function handleNext() {
        // Check whether the current trial is the final one
        const isFinalTrial = (currentTrialIndex === totalTrials - 1)

        if (isFinalTrial) {
            // End the session
            setSessionComplete(true)
            setShowFeedback(false)

            console.log('Session logs:', trialLogs)

            return
        }

        // Move to the next trial
        setCurrentTrialIndex((previousIndex) => previousIndex + 1)

        // Hide feedback and clear the previous trial log
        setShowFeedback(false)
        setLastTrialLog(null)
    }

    // Resets everything and returns to the start screen
    async function handleRestart() {
        // Stop saving gaze data immediately
        collectingGazeRef.current = false

        // Clear any samples left in the current trial buffer
        currentTrialGazeSamplesRef.current = []

        // Stop WebGazer
        await stopWebGazer()

        // Stop the webcam stream requested by GameSession
        if (webcamStream) {
            webcamStream.getTracks().forEach((track) => track.stop())
        }

        setSessionStarted(false)
        setSessionComplete(false)
        setSessionId(null)
        setSessionMetadata(null)
        setWebcamStream(null)
        // setShowGazeTest(false)
        setCurrentTrialIndex(0)
        setTrialLogs([])
        setLastTrialLog(null)
        setShowFeedback(false)
    }



    // If the session has not started, show the start screen
    if (!sessionStarted) {
        return <StartScreen onStart={handleStart} />
    }

    // If all trials are complete, show the session summary
    if (sessionComplete) {
        const { correctCount, totalTrials: total, compositeScore, meanReactionTimeMs } =
            computeSessionComposite(trialLogs)

        return (
            <div className="card">

                <details>
                    <summary>View session metadata</summary>
                    <pre>{JSON.stringify(sessionMetadata, null, 2)}</pre>
                </details>

                <div>
                    <div className="score-value">{compositeScore}</div>
                    <p className="score-label">composite score (accuracy 70% + speed 30%)</p>
                </div>
                <div>
                    <div className="score-value">{meanReactionTimeMs} ms</div>
                    <p className="score-label">average response time</p>
                </div>
                <details>
                    <summary>View trial logs</summary>
                    <pre>{JSON.stringify(trialLogs, null, 2)}</pre>
                </details>

                <button onClick={() => downloadCSV(trialLogs, `${sessionId}_logs.csv`)}>Download CSV</button>
                <button className="btn-primary" onClick={handleRestart}>New session</button>

            </div>
        )
    }

    // If the user has answered the current trial, show feedback
    if (showFeedback && lastTrialLog) {
        return (
            <FeedbackScreen
            lastTrialLog={lastTrialLog}
            onNext={handleNext}
            isFinalTrial={currentTrialIndex === totalTrials - 1}
            />
        )
    }

    // Otherwise, show the active trial
    return (
    <>
        {/**<WebcamPreview stream={webcamStream} />**/}

        <TrialScreen
            stimulus={currentStimulus}
            trialNumber={currentTrialIndex + 1}
            totalTrials={totalTrials}
            onAnswer={handleAnswer}
        />
    </>
    )
}

export default GameSession