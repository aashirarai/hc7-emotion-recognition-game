function StartScreen({ onStart }) {
    return (
        <div className="card">
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
        </div>
    )
}

export default StartScreen
