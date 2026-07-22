import { TIER_LABELS, TIER_THRESHOLDS } from '../adaptive/tierEngine'

function StartScreen({ onStart, participant, previousSessions, adaptiveState, onLogout }) {
    const lastSession = previousSessions?.length ? previousSessions[previousSessions.length - 1] : null

    return (
        <div className="card">
            <div className="start-header">
                <div>
                    <h1>Emotion Recognition</h1>
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                        Look at each face and identify the emotion you see.
                        Answer as quickly and accurately as you can.
                    </p>
                </div>
                <button className="btn-link" onClick={onLogout}>
                    Not {participant.participantId}?
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
        </div>
    )
}

export default StartScreen
