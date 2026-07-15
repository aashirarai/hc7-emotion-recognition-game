import { useEffect, useState } from "react";

import WebcamPreview from "./WebcamPreview";
import { startWebGazer, stopWebGazer } from "./webgazerService";

function GazeTestPage({ webcamStream, sessionMetadata }) {
    const [gazePoint, setGazePoint] = useState(null)
    const [webgazerRunning, setWebgazerRunning] = useState(false)

    async function handleStartWebGazer() {
        const started = await startWebGazer((point) => {
            setGazePoint(point)
        })

        if (started) {
            setWebgazerRunning(true)
        }
    }

    function handleStopWebGazer() {
        stopWebGazer()
        setWebgazerRunning(false)
        setGazePoint(null)
    }

    useEffect(() => {
        return () => {
            stopWebGazer()
        }
    }, [])

    return (
        <div className="card gaze-test-card">
            <h2>Gaze Test Sandbox</h2>

            <p style={{ color: 'var(--text-muted)' }}>
                This page is for testing webcam functionality separately from the main emotion-recognition task.
            </p>

            <WebcamPreview stream={webcamStream} large />

            <div className="button-stack">
                <button
                    className="btn-primary"
                    onClick={handleStartWebGazer}
                    disabled={!webcamStream || webgazerRunning}
                >
                    Start WebGazer
                </button>

                <button
                    onClick={handleStopWebGazer}
                    disabled={!webgazerRunning}
                >
                    Stop WebGazer
                </button>
            </div>

            <div className="gaze-debug-panel">
                <h3>Gaze Tracking Output</h3>

                {gazePoint ? (
                    <pre>{JSON.stringify(gazePoint, null, 2)}</pre>
                ) : (
                    <p style={{ color: 'var(--text-muted)' }}>
                        No gaze coordinates yet.
                    </p>
                )}
            </div>

            <details>
                <summary>View webcam/session status</summary>
                <pre>{JSON.stringify(sessionMetadata, null, 2)}</pre>
            </details>
        </div>
    )
}

export default GazeTestPage