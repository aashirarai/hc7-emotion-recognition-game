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
                console.log("WebGazer raw data:", data)

                if (!data) return

                onGazeData({
                    x: data.x,
                    y: data.y,
                    elapsedTime,
                    timestamp: performance.now(),
                })
            })

            console.log("Gaze listener attached")
            
            await webgazer.begin()

            console.log("WebGazer begin complete")

            return webgazer
    } catch (error) {
        console.error('Failed to start WebGazer:', error)
        return null
    }
}

export function stopWebGazer() {
    if (!webgazerInstance) return

    webgazerInstance.clearGazeListener()
    webgazerInstance.end()
    webgazerInstance = null
}