import { emotionOptions } from "../stimuli/stimuliManifest";

function StimulusDisplay({ stimulus }) {
    if (stimulus.imageSrc) {
        return (
            <img
                id="active-stimulus-image-aoi"
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

function TrialScreen({ stimulus, trialNumber, totalTrials, onAnswer, gazeTrackingActive = false }) {
    const progressPct = (trialNumber / totalTrials) * 100

    return (
        <div className="card">
            {/* Progress */}
            <div className="progress-header">
                {gazeTrackingActive ? (
                    <div className="progress-gaze-chip" aria-label="Webcam gaze tracking active">
                        <span className="progress-gaze-dot" />
                        Webcam on
                    </div>
                ) : (
                    <span />
                )}

                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="progress-label">Trial {trialNumber} of {totalTrials}</span>
            </div>

            {/* Stimulus */}
            <div className="stimulus-card" id="active-stimulus-card-aoi">
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
