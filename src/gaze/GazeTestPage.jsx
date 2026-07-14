import WebcamPreview from "./WebcamPreview";

function GazeTestPage({ webcamStream, sessionMetadata }) {
    return (
        <div className="card gaze-test-card">
            <h2>Gaze Test Sandbox</h2>

            <p style={{ color: 'var(--text-muted)' }}>
                This page is for testing webcam functionality separately from the main emotion-recognition task.
            </p>

            <WebcamPreview stream={webcamStream} large />

            <details>
                <summary>View webcam/session status</summary>
                <pre>{JSON.stringify(sessionMetadata, null, 2)}</pre>
            </details>

            <div className="gaze-debug-panel">
                <h3>Gaze Tracking Output</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                    This is where the WebGazer coordinates will appear.
                </p>
            </div>
        </div>
    )
}

export default GazeTestPage