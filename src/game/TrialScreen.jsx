// Import the list of emotion choices
import { emotionOptions } from "../stimuli/stimuliManifest";

// TrialScreen displays the current stimulus and answer buttons
// It sends the selected emotion back up to GameSession
function TrialScreen({ stimulus, trialNumber, totalTrials, onAnswer}) {
    return (
        <section>
            {/* Shows progress through the session */}
            <p>
                Trial {trialNumber} of {totalTrials}
            </p>

            {/* Placeholder stimulus area */}
            <div className="stimulus-card">
                <p>{stimulus.displayText}</p>
            </div>
            
            <h2>Which emotion is this?</h2>

            {/* Create one button per emotion */}
            <div className="button-grid">
                {/* When clicked, the selected emotion is passed to GameSession */}
                {emotionOptions.map((emotion) => (
                    <button key={emotion} onClick={() => onAnswer(emotion)} >
                        {emotion}
                    </button>
                ))}
            </div>
        </section>
    )
}

export default TrialScreen