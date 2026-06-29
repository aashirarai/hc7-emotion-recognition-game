// Import the list of emotion choices
import { emotionOptions } from "../stimuli/stimuliManifest";

function StimulusDisplay({ stimulus }) {
    if (stimulus.imagePath) {
        return (
            <img
                src={stimulus.imagePath}
                alt={`${stimulus.emotion} face`}
                onError={(e) => {
                    // Fall back to emoji if the image file is missing
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextSibling.style.display = 'block';
                }}
            />
        );
    }
    return null;
}

// TrialScreen displays the current stimulus and answer buttons
// It sends the selected emotion back up to GameSession
function TrialScreen({ stimulus, trialNumber, totalTrials, onAnswer}) {
    return (
        <section>
            {/* Shows progress through the session */}
            <p>
                Trial {trialNumber} of {totalTrials}
            </p>

            <div className="stimulus-card">
                <StimulusDisplay stimulus={stimulus} />
                {/* Shown only when the image fails to load or no imagePath is set */}
                <span
                    style={{
                        fontSize: '6rem',
                        display: stimulus.imagePath ? 'none' : 'block',
                    }}
                    role="img"
                    aria-label={stimulus.emotion}
                >
                    {stimulus.emoji}
                </span>
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