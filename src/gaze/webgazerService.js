let webgazerInstance = null

export async function startWebGazer(onGazeData) {
    try {
        console.log("Starting WebGazer...")

        const webgazer = window.webgazer

        if (!webgazer) {
            console.error("WebGazer is not available on window. Check the script tag in index.html.")
            return null
        }

        webgazerInstance = webgazer

        console.log("WebGazer instance:", webgazer)

        webgazer
            .setGazeListener((data, elapsedTime) => {
                // console.log("WebGazer raw data:", data)

                if (!data) return

                onGazeData({
                    x: data.x,
                    y: data.y,
                    elapsedTime,
                    timestamp: performance.now(),
                })
            })

            // Re-enable WebGazer's built-in debugging visuals
            webgazer.showVideo(true)
            webgazer.showPredictionPoints(true)
            webgazer.showFaceFeedbackBox(true)
            webgazer.showFaceOverlay(true)

            console.log("Gaze listener attached")
            
            await webgazer.begin()

            console.log("WebGazer begin complete")

            return webgazer
    } catch (error) {
        console.error('Failed to start WebGazer:', error)
        return null
    }
}

export async function stopWebGazer() {
    if (!webgazerInstance) return

    const webgazer = webgazerInstance

    // Stop gaze predictions
    webgazer.clearGazeListener()

    // WebGazer attaches its camera stream to this video element
    const videoElement = document.getElementById("webgazerVideoFeed")
    const videoStream = videoElement?.srcObject

    // Explicitly stop every camera track in that stream
    if (videoStream) {
        videoStream.getTracks().forEach((track) => {
            track.stop()
        })

        // Disconnect the stopped stream from the video element
        videoElement.srcObject = null
    }

    // Hide WebGazer's debugging interface
    webgazer.showPredictionPoints(false)
    webgazer.showFaceFeedbackBox(false)
    webgazer.showFaceOverlay(false)
    webgazer.showVideo(false)

    try {
        await webgazer.end()
    } finally {
        webgazerInstance = null
    }
}