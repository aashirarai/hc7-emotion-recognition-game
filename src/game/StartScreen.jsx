import { TIER_LABELS, TIER_THRESHOLDS } from '../adaptive/tierEngine'

function StartScreen({ onStart, participant, previousSessions, adaptiveState, onLogout }) {
    const lastSession = previousSessions?.length ? previousSessions[previousSessions.length - 1] : null

    return (
        <div className="card">
<<<<<<< HEAD
            <div>
                <h1>Emotion Recognition</h1>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    Look at each face and identify the emotion you see.
                    Answer as quickly and accurately as you can.
                </p>

                <div style={{ marginTop: '1rem' }}>
                    <h2>Optional webcam-based attention tracking</h2>
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                        You can optionally enable your webcam for this session.
                        This will later be used to estimate coarse attention patterns during the task.
                        The game can still be played without webcam access.
                    </p>
                </div>
            </div>

            <div className="button-stack">
                <button
                    className="btn-primary"
                    onClick={() => onStart({ webcamRequested: false })}
                >
                    Start without webcam
                </button>

                <button
                    onClick={() => onStart({ webcamRequested: true })}
                >
                    Enable webcam and start
                </button>
            </div>
=======
            <div className="start-header">
                <div>
                    <h1>Emotion Recognition</h1>
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                        Look at each face and identify the emotion you see.
                        Answer as quickly and accurately as you can.
                    </p>
                </div>
                <button className="btn-link" onClick={onLogout}>
                    Log out
                </button>
            </div>

            {adaptiveState && (
                <p className="score-label" style={{ marginTop: '-0.5rem' }}>
                    Difficulty tier: {adaptiveState.tierIndex + 1} / {TIER_THRESHOLDS.length}
                    {' '}({TIER_LABELS[adaptiveState.tierIndex]})
                </p>
            )}

            {lastSession && (
                <div className="previous-score">
                    <p className="score-label">
                        Last session ({new Date(lastSession.timestamp).toLocaleDateString()})
                    </p>
                    <div className="score-value">{lastSession.compositeScore}</div>
                    <p className="score-label">composite score</p>
                </div>
            )}

            <button className="btn-primary" onClick={onStart}>
                Start session
            </button>
>>>>>>> origin/dev
        </div>
    )
}

export default StartScreen
