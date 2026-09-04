import { EMOTION_EMOJIS, emotionOptions } from "../stimuli/stimuliManifest";

const MILESTONES = [0.25, 0.5, 0.75];

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

function TrialScreen({ stimulus, trialNumber, totalTrials, onAnswer, streak = 0, gazeTrackingActive = false }) {
    const progressPct = (trialNumber / totalTrials) * 100

    return (
        <div className="card">
            {/* Progress */}
            <div className="progress-header">
                {gazeTrackingActive ? (
                    <div 
                        className="progress-gaze-chip"
                        aria-label="Webcam gaze tracking active"
                    >
                        <span className="progress-gaze-dot" />
                        Webcam on
                    </div>
                ) : (
                    <span />
                )}

                {streak >= 2 && (
                    <span className="streak-badge">🔥 {streak} in a row!</span>
                )}

            <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={trialNumber}
                aria-valuemin={0}
                aria-valuemax={totalTrials}
                aria-valuetext={`Trial ${trialNumber} of ${totalTrials}`}
            >
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                    {MILESTONES.map((milestone) => (
                        <span
                            key={milestone}
                            className={`progress-milestone${progressPct >= milestone * 100 ? ' progress-milestone-reached' : ''}`}
                            style={{ left: `${milestone * 100}%` }}
                        />
                    ))}
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
                            <span className="btn-emotion-icon" aria-hidden="true">
                                {EMOTION_EMOJIS[emotion]}
                            </span>
                            {emotion}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default TrialScreen
