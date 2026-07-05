import { useEffect, useRef } from 'react'

function WebcamPreview({ stream }) {
    const videoRef = useRef(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    if (!stream) return null

    return (
        <div className="webcam-preview">
            <p className="webcam-status">Webcam active</p>

            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="webcam-video"
            />
        </div>
    )
}

export default WebcamPreview