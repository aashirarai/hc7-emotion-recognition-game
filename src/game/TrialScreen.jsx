import { emotionOptions } from "../stimuli/stimuliManifest";

function StimulusDisplay({ stimulus }) {
    if (stimulus.imageSrc) {
        return (
            <img
                src={stimulus.imageSrc}
                alt={`${stimulus.emotion} face`}
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextSibling.style.display = 'block';
                }}
            />
        );
    }
    return null;
}

function TrialScreen({ stimulus, trialNumber, totalTrials, onAnswer }) {
    const progressPct = (trialNumber / totalTrials) * 100

    return (
        <div className="card">
            {/* Progress */}
            <div className="progress-header">
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="progress-label">Trial {trialNumber} of {totalTrials}</span>
            </div>

            {/* Stimulus */}
            <div className="stimulus-card">
                <StimulusDisplay stimulus={stimulus} />
                <span
                    style={{
                        fontSize: '6rem',
                        display: stimulus.imageSrc ? 'none' : 'block',
                    }}
                    role="img"
                    aria-label={stimulus.emotion}
                >
                    {stimulus.emoji}
                </span>
            </div>

            {/* Response buttons */}
            <div>
                <h2>Which emotion is this?</h2>
                <div className="button-grid">
                    {emotionOptions.map((emotion) => (
                        <button
                            key={emotion}
                            className="btn-emotion"
                            onClick={() => onAnswer(emotion)}
                        >
                            {emotion}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default TrialScreen
