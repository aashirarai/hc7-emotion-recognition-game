// Requests access to the user's webcam using the browser MediaDevices API
// Returns a simple status object that GameSession can store in session metadata
export async function requestWebcamPermission() {
    // Check whether the browser supports webcam access
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
            webcamEnabled: false,
            webcamPermissionStatus: "unsupported",
            stream: null,
        }
    }

     try {
        // Ask the browser/user for webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
        })

        return {
            webcamEnabled: true,
            webcamPermissionStatus: "granted",
            stream,
        }
    } catch (error) {
        console.warn("Webcam permission was not granted:", error)

        return {
            webcamEnabled: false,
            webcamPermissionStatus: "denied",
            stream: null,
        }
    }
}