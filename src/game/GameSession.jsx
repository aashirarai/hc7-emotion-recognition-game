import { useEffect, useRef, useState } from 'react'

import { stimuli } from '../stimuli/stimuliManifest'
import { requestWebcamPermission } from '../gaze/requestWebcamPermission'
import { startWebGazer, stopWebGazer, setWebGazerDebugVisuals } from '../gaze/webgazerService'
// import WebcamPreview from '../gaze/WebcamPreview'
import GazeCalibrationCheck from '../gaze/GazeCalibrationCheck'

import { buildAdaptiveTrialSequence, createSessionId, createTrialLog, downloadCSV } from './gameLogic'
import { computeSessionComposite } from '../adaptive/scoring'
import { applyAdaptiveUpdate, TIER_LABELS, TIER_THRESHOLDS } from '../adaptive/tierEngine'
import { addSessionResult, getAdaptiveState, saveTrialLogs, updateAdaptiveState } from '../data/participantStore'

import StartScreen from './StartScreen'
import TrialScreen from './TrialScreen'
import FeedbackScreen from './FeedbackScreen'

function GameSession({ participant, onLogout }) {
    // Tracks whether the user has started the session
    const [sessionStarted, setSessionStarted] = useState(false)

    // This participant's past session results, shown on the start screen
    // and appended to whenever a new session finishes
    const [sessionHistory, setSessionHistory] = useState(participant.sessions ?? [])

    // This participant's adaptive difficulty tier, read at login and updated
    // after each session finishes. Tier changes only take effect at the
    // start of the *next* session — no mid-session jumps.
    const [adaptiveState, setAdaptiveState] = useState(
        () => participant.adaptiveState ?? getAdaptiveState(participant.participantId)
    )

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

    const [showCalibrationCheck, setShowCalibrationCheck] = useState(false)
    const [calibrationSummary, setCalibrationSummary] = useState(null)
    const [calibrationMode, setCalibrationMode] = useState(null)
    const [pendingWebcamSession, setPendingWebcamSession] = useState(null)

    // Shuffled list of stimuli for the current session, generated on Start
    const [trialSequence, setTrialSequence] = useState([])

    // Stores which trial the user is currently on
    const [currentTrialIndex, setCurrentTrialIndex] = useState(0)

    // Stores the time when the current trial started, used to calculate reaction time
    // A ref rather than state — changing it shouldn't trigger a re-render
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
            trialStartTime.current = performance.now()

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
        // Create one ID and reuse it throughout this session.
        const newSessionId = createSessionId(participant.participantId)

        // Restrict the trial pool according to the participant's current tier.
        const newTrialSequence = buildAdaptiveTrialSequence(
            stimuli,
            10,
            adaptiveState.tierIndex,
        )

        // Non-webcam session: start immediately
        if (!webcamRequested) {
            setSessionId(newSessionId)
            setTrialSequence(newTrialSequence)
            setWebcamStream(null)

            setSessionMetadata({
                sessionId: newSessionId,
                startedAt: new Date().toISOString(),
                webcamRequested: false,
                webcamEnabled: false,
                webcamPermissionStatus: 'not_requested',
                webgazerStarted: false,
                mode: 'normal_no_webcam',
            })

            setSessionComplete(false)
            setCurrentTrialIndex(0)
            setTrialLogs([])
            setLastTrialLog(null)
            setShowFeedback(false)

            setSessionStarted(true)
            return
        }

        // Webcam session: run gaze setup before starting trials
        try {
            const webcamResult = await requestWebcamPermission()

            if (!webcamResult.webcamEnabled) {
                alert('Webcam access is needed to start with gaze tracking.')
                return
            }

            if (webcamResult.stream) {
                webcamResult.stream.getTracks().forEach((track) => track.stop())
            }

            const webgazerResult = await startWebGazer(handleGazeData)

            if (!webgazerResult) {
                alert('WebGazer could not be started. You can start without webcam instead.')
                return
            }

            setWebGazerDebugVisuals(true)

            // Stored the prepared session until the gaze setup is complete
            setPendingWebcamSession({
                sessionId: newSessionId,
                trialSequence: newTrialSequence,
                webcamPermissionStatus: webcamResult.webcamPermissionStatus,
            })

            setSessionMetadata({
                sessionId: newSessionId,
                startedAt: new Date().toISOString(),
                webcamRequested: true,
                webcamEnabled: true,
                webcamPermissionStatus: webcamResult.webcamPermissionStatus,
                webgazerStarted: true,
                mode: 'pre_game_gaze_setup',
            })

            setCalibrationMode('pre_game')
            setShowCalibrationCheck(true)
        } catch (error) {
            console.error('Failed to start webcam session:', error)
            alert('Failed to start webcam session.')
        }
    }

    async function handleStartCalibrationCheck() {
        try {
            const webcamResult = await requestWebcamPermission()

            if (!webcamResult.webcamEnabled) {
                alert('Webcam access is needed for the gaze check.')
                return
            }

            if (webcamResult.stream) {
                webcamResult.stream.getTracks().forEach((track) => track.stop())
            }

            setCalibrationMode('standalone')
            setShowCalibrationCheck(true)

            const webgazerResult = await startWebGazer(handleGazeData)

            if (!webgazerResult) {
                alert('WebGazer could not be started.')
                setShowCalibrationCheck(false)
                setCalibrationMode(null)
                return
            }

            setWebGazerDebugVisuals(true)

            setSessionMetadata({
                sessionId: null,
                startedAt: new Date().toISOString(),
                webcamRequested: true,
                webcamEnabled: true,
                webcamPermissionStatus: webcamResult.webcamPermissionStatus,
                webgazerStarted: true,
                mode: 'standalone_gaze_check',
            })

        } catch (error) {
            console.error('Failed to start gaze check:', error)
            alert('Failed to start gaze check.')
            setShowCalibrationCheck(false)
            setCalibrationMode(null)
        }
    }

    async function handleCalibrationComplete(summary, samples) {
        console.log('Calibration summary:', summary)
        console.log('Calibration samples:', samples)

        setCalibrationSummary(summary)
        setShowCalibrationCheck(false)

        // Pre-game gaze setup
        if (calibrationMode === 'pre_game') {
            if (!pendingWebcamSession) {
                console.error('No pending webcam session found after gaze setup.')
                setCalibrationMode(null)
                return
            }

            // Load pending webcam session metadata
            setSessionId(pendingWebcamSession.sessionId)
            setTrialSequence(pendingWebcamSession.trialSequence)
            setWebcamStream(null)

            setSessionMetadata((previousMetadata) => ({
                ...previousMetadata,
                mode: 'webcam_game_after_gaze_setup',
                gazeSetupCompleted: summary.calibrationCompleted,
                gazeSetupQualityFlag: summary.calibrationQualityFlag,
                meanCalibrationErrorPx: summary.meanCalibrationErrorPx,
                meanXErrorPx: summary.meanXErrorPx,
                meanYErrorPx: summary.meanYErrorPx,
            }))

            // Initialise states before starting game
            setSessionComplete(false)
            setCurrentTrialIndex(0)
            setTrialLogs([])
            setLastTrialLog(null)
            setShowFeedback(false)

            setPendingWebcamSession(null)
            setCalibrationMode(null)

            // WebGazer stays running here;
            // debug visuals are hidden
            setWebGazerDebugVisuals(false)

            setSessionStarted(true)
            return
        }

        // Standalone gaze check
        if (calibrationMode === 'standalone') {
            // Stop WebGazer
            await stopWebGazer()
            setCalibrationMode(null)
            return
        }

        setCalibrationMode(null)
    }

    async function handleCalibrationCancel() {
        setShowCalibrationCheck(false)

        if (calibrationMode === 'pre_game') {
            await stopWebGazer()
            setPendingWebcamSession(null)
            setSessionMetadata(null)
        }

        if (calibrationMode === 'standalone') {
            await stopWebGazer()
        }

        setCalibrationMode(null)
    }

    function summariseGazeSamples(samples) {
        const stimulusElement = document.getElementById('active-stimulus-card-aoi')
        const imageElement = document.getElementById('active-stimulus-image-aoi')

        // Get viewport dimensions to calculate screen area in px
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const screenAreaPx = viewportWidth * viewportHeight

        if (!stimulusElement || !imageElement || samples.length === 0) {
            return {
                gazeSamplesTotal: samples.length,

                viewportWidth,
                viewportHeight,
                screenAreaPx,

                stimulusCardAreaPx: null,
                stimulusImageAreaPx: null,
                stimulusCardAreaRatio: null,
                stimulusImageAreaRatio: null,

                onStimulusCardCount: 0,
                offStimulusCardCount: samples.length,
                onStimulusCardDwellProp: null,
                offStimulusCardDwellProp: null,

                onStimulusImageCount: 0,
                offStimulusImageCount: samples.length,
                onStimulusImageDwellProp: null,
                offStimulusImageDwellProp: null,

                upperImageCount: 0,
                lowerImageCount: 0,
                upperImageDwellProp: null,
                lowerImageDwellProp: null,
                upperLowerImageRatio: null,
            }
        }

        const cardRect = stimulusElement.getBoundingClientRect()
        const imageRect = imageElement.getBoundingClientRect()

        const stimulusCardAreaPx = cardRect.width * cardRect.height
        const stimulusImageAreaPx = imageRect.width * imageRect.height

        const stimulusCardAreaRatio = screenAreaPx > 0 ? stimulusCardAreaPx / screenAreaPx : null
        const stimulusImageAreaRatio = screenAreaPx > 0 ? stimulusImageAreaPx / screenAreaPx : null

        // Add half of height to the top y-coordinate;
        // Not to the bottom because the coordinate system run upside down
        const imageMidY = imageRect.top + (imageRect.height / 2)

        let onStimulusCardCount = 0
        let onStimulusImageCount = 0
        let upperImageCount = 0
        let lowerImageCount = 0

        samples.forEach((sample) => {
            const isOnStimulusCard =
                sample.x >= cardRect.left &&
                sample.x <= cardRect.right &&
                sample.y >= cardRect.top &&
                sample.y <= cardRect.bottom

            const isOnStimulusImage =
                sample.x >= imageRect.left &&
                sample.x <= imageRect.right &&
                sample.y >= imageRect.top &&
                sample.y <= imageRect.bottom

            if (isOnStimulusCard) {
                onStimulusCardCount += 1
            }
            
            if (isOnStimulusImage) {
                onStimulusImageCount += 1

                if (sample.y < imageMidY) {
                    upperImageCount += 1
                } else {
                    lowerImageCount += 1
                }
            }
        })

        const offStimulusCardCount = samples.length - onStimulusCardCount
        const offStimulusImageCount = samples.length - onStimulusImageCount

        return {
            gazeSamplesTotal: samples.length,

            viewportWidth,
            viewportHeight,
            screenAreaPx,

            stimulusCardAreaPx,
            stimulusImageAreaPx,
            stimulusCardAreaRatio,
            stimulusImageAreaRatio,

            onStimulusCardCount,
            offStimulusCardCount,
            onStimulusCardDwellProp: samples.length > 0 ? onStimulusCardCount / samples.length : null,
            offStimulusCardDwellProp: samples.length > 0 ? offStimulusCardCount / samples.length : null,
            
            onStimulusImageCount,
            offStimulusImageCount,
            onStimulusImageDwellProp: samples.length > 0 ? onStimulusImageCount / samples.length : null,
            offStimulusImageDwellProp: samples.length > 0 ? offStimulusImageCount / samples.length : null,

            upperImageCount,
            lowerImageCount,
            upperImageDwellProp: samples.length > 0 ? upperImageCount / samples.length : null,
            lowerImageDwellProp: samples.length > 0 ? lowerImageCount / samples.length : null,
            upperLowerImageRatio: lowerImageCount > 0 ? upperImageCount / lowerImageCount : null,
        }
    }

    function getGazeQualityFlag(gazeSampleCount, gazeSamplingRateHz) {
        if (gazeSampleCount === 0) return 'no_gaze_data'
        if (gazeSampleCount < 30) return 'low_sample_count'
        if (gazeSamplingRateHz < 10) return 'low_sampling_rate'
        return 'usable'
    }

    function getTrialDurationFlag(reactionTimeMs) {
        if (reactionTimeMs < 2000) return 'too_short'
        if (reactionTimeMs > 7000) return 'too_long'
        return 'expected'
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

        const trialDurationFlag = getTrialDurationFlag(reactionTimeMs)

        const gazeDurationMs = reactionTimeMs

        const gazeSamplingRateHz = reactionTimeMs > 0 ? Math.round((gazeSampleCount / reactionTimeMs) * 1000) : 0

        const gazeQualityFlag = getGazeQualityFlag(gazeSampleCount, gazeSamplingRateHz)

        const gazeSummary = summariseGazeSamples(currentTrialGazeSamplesRef.current)

        // Create a structured trial log
        const log = createTrialLog({
            participantId: participant.participantId,
            sessionId,
            trialIndex: currentTrialIndex,
            stimulus: currentStimulus,
            selectedEmotion,
            reactionTimeMs,
            trialDurationFlag,
            gazeSampleCount,
            gazeDurationMs,
            gazeSamplingRateHz,
            gazeQualityFlag,
            gazeSummary,
            calibrationSummary,
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
    async function handleNext() {
        // Check whether the current trial is the final one
        const isFinalTrial = (currentTrialIndex === totalTrials - 1)

        if (isFinalTrial) {
            // End the session
            setSessionComplete(true)
            setShowFeedback(false)

            // Save this session's composite result to the participant's history
            const composite = computeSessionComposite(trialLogs)
            const updatedHistory = await addSessionResult(participant.participantId, {
                sessionId,
                compositeScore: composite.compositeScore,
                accuracyScore: composite.accuracyScore,
                correctCount: composite.correctCount,
                totalTrials: composite.totalTrials,
                meanReactionTimeMs: composite.meanReactionTimeMs,
            })
            setSessionHistory(updatedHistory)

            // Persist this session's full trial-level logs
            await saveTrialLogs(participant.participantId, sessionId, trialLogs)

            // Update this participant's adaptive difficulty tier based on
            // how this session went, and persist it for the next session
            const nextAdaptiveState = applyAdaptiveUpdate(adaptiveState, {
                sessionId,
                compositeScore: composite.compositeScore,
            })
            await updateAdaptiveState(participant.participantId, nextAdaptiveState)
            setAdaptiveState(nextAdaptiveState)

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

    // If the user entered gaze calibration check mode, show calibration check
    if (showCalibrationCheck) {
        return (
            <GazeCalibrationCheck
                mode={calibrationMode}
                onComplete={handleCalibrationComplete}
                onCancel={handleCalibrationCancel}
            />
        )
    }

    // If the session has not started, show the start screen
    if (!sessionStarted) {
        return (
            <StartScreen
                onStart={handleStart}
                onStartCalibrationCheck={handleStartCalibrationCheck}
                calibrationSummary={calibrationSummary}
                participant={participant}
                previousSessions={sessionHistory}
                adaptiveState={adaptiveState}
                onLogout={onLogout}
            />
        )
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
                <div>
                    <div className="score-value">
                        {adaptiveState.tierIndex + 1} / {TIER_THRESHOLDS.length}
                    </div>
                    <p className="score-label">
                        difficulty tier ({TIER_LABELS[adaptiveState.tierIndex]})
                        {adaptiveState.history.at(-1)?.direction === 'promote' && ' — promoted!'}
                        {adaptiveState.history.at(-1)?.direction === 'demote' && ' — demoted'}
                    </p>
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
        {sessionMetadata?.webgazerStarted && (
            <div className="gaze-status-chip">
                <span className="gaze-status-dot" />
            </div>
        )}

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