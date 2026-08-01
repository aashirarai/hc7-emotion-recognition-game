import { useEffect, useRef, useState } from 'react'

import { stimuli } from '../stimuli/stimuliManifest'

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

    // Shuffled list of stimuli for the current session, generated on Start
    const [trialSequence, setTrialSequence] = useState([])

    // Stores which trial the user is currently on
    const [currentTrialIndex, setCurrentTrialIndex] = useState(0)

    // Stores the time when the current trial started, used to calculate reaction time.
    // A ref rather than state — changing it shouldn't trigger a re-render.
    const trialStartTime = useRef(null)

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

    // Start timing each trial when:
    // - the session has started
    // - the user is not on the feedback screen
    // - the session is not complete
    useEffect(() => {
        if (sessionStarted && !showFeedback && !sessionComplete) {
            // performance.now() gives a high-resolution timestamp
            trialStartTime.current = performance.now()
        }
    }, [sessionStarted, currentTrialIndex, showFeedback, sessionComplete])

    
    // Called when the user clicks "Start"
    function handleStart() {
        // Create a new pseudonymous sesion ID, scoped to this participant
        setSessionId(createSessionId(participant.participantId))

        // Build a fresh shuffled trial sequence, restricted to the stimulus
        // pool unlocked for this participant's current difficulty tier
        setTrialSequence(buildAdaptiveTrialSequence(stimuli, 10, adaptiveState.tierIndex))

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

        // Calculate reaction time from trial start to button click
        const reactionTimeMs = Math.round(performance.now() - trialStartTime.current)

        // Create a structured trial log
        const log = createTrialLog({
            participantId: participant.participantId,
            sessionId,
            trialIndex: currentTrialIndex,
            stimulus: currentStimulus,
            selectedEmotion,
            reactionTimeMs
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
    function handleRestart() {
        setSessionStarted(false)
        setSessionComplete(false)
        setSessionId(null)
        setCurrentTrialIndex(0)
        setTrialLogs([])
        setLastTrialLog(null)
        setShowFeedback(false)
    }



    // If the session has not started, show the start screen
    if (!sessionStarted) {
        return (
            <StartScreen
                onStart={handleStart}
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
                <div>
                    <div className="score-value">{correctCount} / {total}</div>
                    <p className="score-label">correct answers</p>
                </div>
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
        <TrialScreen
        stimulus={currentStimulus}
        trialNumber={currentTrialIndex + 1}
        totalTrials={totalTrials}
        onAnswer={handleAnswer}
        />
    )
}

export default GameSession