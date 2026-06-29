function StartScreen({ onStart }) {
    return (
        <div className="card">
            <div>
                <h1>Emotion Recognition</h1>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    Look at each face and identify the emotion you see.
                    Answer as quickly and accurately as you can.
                </p>
            </div>
            <button className="btn-primary" onClick={onStart}>
                Start session
            </button>
        </div>
    )
}

export default StartScreen
