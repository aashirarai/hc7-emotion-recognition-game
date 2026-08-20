import { useMemo, useState } from 'react'
import { getLatestGazePoint } from './webgazerService'

function calculateMedian(values) {
    if (values.length === 0) return null

    // Sort values in ascending order
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)

    // If even number of values, compute median
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2
    }

    return sorted[middle]
}

function getCalibrationQualityFlag(meanErrorPx) {
    if (meanErrorPx === null) return 'not_available'
    if (meanErrorPx < 100) return 'excellent'
    if (meanErrorPx < 200) return 'usable'
    return 'poor'
}

function summariseCalibration(samples) {
    if (samples.length === 0) {
        return {
            calibrationCompleted: false,
            calibrationTargetCount: 0,
            meanCalibrationErrorPx: null,
            medianCalibrationErrorPx: null,
            maxCalibrationErrorPx: null,
            meanXErrorPx: null,
            meanYErrorPx: null,
            medianYErrorPx: null,
            calibrationQualityFlag: 'not_available',
        }
    }

    const absoluteErrors = samples.map((sample) => sample.absoluteErrorPx)
    const xErrors = samples.map((sample) => sample.xErrorPx)
    const yErrors = samples.map((sample) => sample.yErrorPx)

    const meanCalibrationErrorPx = absoluteErrors.reduce((sum, value) => sum + value, 0) / absoluteErrors.length

    const meanXErrorPx = xErrors.reduce((sum, value) => sum + value, 0) / xErrors.length

    const meanYErrorPx = yErrors.reduce((sum, value) => sum + value, 0) / yErrors.length

    return {
        calibrationCompleted: true,
        calibrationTargetCount: samples.length,
        meanCalibrationErrorPx,
        medianCalibrationErrorPx: calculateMedian(absoluteErrors),
        maxCalibrationErrorPx: Math.max(...absoluteErrors),
        meanXErrorPx,
        meanYErrorPx,
        medianYErrorPx: calculateMedian(yErrors),
        calibrationQualityFlag: getCalibrationQualityFlag(meanCalibrationErrorPx),
    }
}

function downloadCalibrationCSV(samples, summary) {
    const rows = samples.map((sample) => ({
        ...sample,

        // Repeat summary fields on every row for easier analysis.
        calibrationCompleted: summary.calibrationCompleted,
        calibrationTargetCount: summary.calibrationTargetCount,
        meanCalibrationErrorPx: summary.meanCalibrationErrorPx,
        medianCalibrationErrorPx: summary.medianCalibrationErrorPx,
        maxCalibrationErrorPx: summary.maxCalibrationErrorPx,
        meanXErrorPx: summary.meanXErrorPx,
        meanYErrorPx: summary.meanYErrorPx,
        medianYErrorPx: summary.medianYErrorPx,
        calibrationQualityFlag: summary.calibrationQualityFlag,
    }))

    if (rows.length === 0) return

    const headers = Object.keys(rows[0])

    const csvRows = [
        headers.join(','),
        ...rows.map((row) =>
            headers
                .map((header) => {
                    const value = row[header]

                    if (value === null || value === undefined) return ''

                    // Wrap every value in quotes and escape quotes inside values.
                    return `"${String(value).replaceAll('"', '""')}"`
                })
                .join(',')
        ),
    ]

    const blob = new Blob([csvRows.join('\n')], {
        type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `gaze_calibration_check_${Date.now()}.csv`
    link.click()

    URL.revokeObjectURL(url)
}

export default function GazeCalibrationCheck({ mode = 'standalone', onComplete, onCancel }) {
    /**
     * Five-point target layout with one warm-up centre point.
     * 
     * Ratios are used instead of fixed pixels so the targets adapt to
     * different screen sizes.
     */

    // useMemo lets you cache the result of a calculation
    // between re-renders
    const targets = useMemo(() => [
            {label: 'warm-up centre', xRatio: 0.5, yRatio: 0.5, isWarmUp: true},
            {label: 'centre', xRatio: 0.5, yRatio: 0.5, isWarmUp: false},
            {label: 'top-left', xRatio: 0.2, yRatio: 0.2, isWarmUp: false},
            {label: 'top-right', xRatio: 0.8, yRatio: 0.2, isWarmUp: false },
            {label: 'bottom-left', xRatio: 0.2, yRatio: 0.8, isWarmUp: false},
            {label: 'bottom-right', xRatio: 0.8, yRatio: 0.8, isWarmUp: false},
        ],
        []
    )

    const [currentTargetIndex, setCurrentTargetIndex] = useState(0)
    const [samples, setSamples] = useState([])
    const [isComplete, setIsComplete] = useState(false)

    const currentTarget = targets[currentTargetIndex]

    const recordedTargets = targets.filter((target) => !target.isWarmUp)
    const recordedTargetNumber = targets.slice(0, currentTargetIndex + 1).filter((target) => !target.isWarmUp).length

    // Recalculate the summary whenever samples change
    const summary = summariseCalibration(samples)

    /**
     * Handles a click on the current calibration target
     * 
     * The target position is known from the target ratio and current viewport.
     * The predicted position comes from WebGazer's latest gaze point.
     */
    function handleTargetClick() {
        const latestGazePoint = getLatestGazePoint()

        if (
            !latestGazePoint ||
            latestGazePoint.x === null ||
            latestGazePoint.y === null ||
            Number.isNaN(latestGazePoint.x) ||
            Number.isNaN(latestGazePoint.y)
        ) {
            alert('No gaze prediction available yet. Look at the target for a second, then click again.')
            return
        }

        const targetX = Math.round(window.innerWidth * currentTarget.xRatio)
        const targetY = Math.round(window.innerHeight * currentTarget.yRatio)

        const predictedX = latestGazePoint.x
        const predictedY = latestGazePoint.y

        // xErrorPx > 0 means prediction is to the right of target
        // xErrorPx < 0 means prediction is to the left of target
        const xErrorPx = predictedX - targetX

        // yErrorPx > 0 means prediction is below target
        // yErrorPx < 0 means prediction is above target
        const yErrorPx = predictedY - targetY

        // Euclidean distance between target and predicted point
        const absoluteErrorPx = Math.sqrt(xErrorPx * xErrorPx + yErrorPx * yErrorPx)

        const newSample = {
            targetIndex: currentTargetIndex,
            targetLabel: currentTarget.label,
            targetX,
            targetY,
            predictedX,
            predictedY,
            xErrorPx,
            yErrorPx,
            absoluteErrorPx,
            timestamp: performance.now(),
        }

        // Warm-up targets are used to let WebGazer settle, but are not included
        // in the exported samples or calibration summary
        const updatedSamples = currentTarget.isWarmUp ? samples : [...samples, newSample]
        
        setSamples(updatedSamples)

        if (currentTargetIndex === targets.length - 1) {
            setIsComplete(true)
        } else {
            setCurrentTargetIndex(currentTargetIndex + 1)
        }
    }

    /**
     * Sends the final calibration summary and raw samples back to GameSession.
     */
    function handleFinish() {
        const finalSummary = summariseCalibration(samples)

        if (onComplete) {
            onComplete(finalSummary, samples)
        }
    }

    function handleDownload() {
        downloadCalibrationCSV(samples, summary)
    }

    function handleRetry() {
        setCurrentTargetIndex(0)
        setSamples([])
        setIsComplete(false)
    }

    /**
     * Completed Screen.
     * 
     * This is shown after all calibration targets have been clicked.
     */
    if (isComplete) {
        return (
            <main className="calibration-check-screen">
                <h1>{mode === 'pre_game' ? 'Gaze setup complete': 'Gaze gaze complete'}</h1>

                <p>
                    This check estimates WebGazer prediction error and directional
                    x/y offset.
                </p>

                <section className="calibration-summary">
                    <p>
                        <strong>Targets:</strong>{' '}
                        {summary.calibrationTargetCount}
                    </p>

                    <p>
                        <strong>Mean error:</strong>{' '}
                        {summary.meanCalibrationErrorPx?.toFixed(1)} px
                    </p>

                    <p>
                        <strong>Median error:</strong>{' '}
                        {summary.medianCalibrationErrorPx?.toFixed(1)} px
                    </p>

                    <p>
                        <strong>Max error:</strong>{' '}
                        {summary.maxCalibrationErrorPx?.toFixed(1)} px
                    </p>

                    <p>
                        <strong>Mean x-error:</strong>{' '}
                        {summary.meanXErrorPx?.toFixed(1)} px
                    </p>

                    <p>
                        <strong>Mean y-error:</strong>{' '}
                        {summary.meanYErrorPx?.toFixed(1)} px
                    </p>

                    <p>
                        <strong>Median y-error:</strong>{' '}
                        {summary.medianYErrorPx?.toFixed(1)} px
                    </p>

                    <p>
                        <strong>Quality:</strong>{' '}
                        {summary.calibrationQualityFlag}
                    </p>
                </section>

                <div className="calibration-actions">
                    <button type="button" onClick={handleDownload}>
                        Download calibration CSV
                    </button>

                    <button type="button" onClick={handleRetry}>
                        {mode === 'pre_game' ? 'Retry setup' : 'Retry gaze check'}
                    </button>

                    <button type="button" onClick={handleFinish}>
                        {mode === 'pre_game' ? 'Start game' : 'Finish gaze check'}
                    </button>

                </div>
            </main>
        )
    }

    /**
     * Active calibration screen.
     * 
     * The target dot is fixed to the viewport using the current target ratios.
     */
    return (
        <main className="calibration-check-screen">
            <h1>{mode === 'pre_game' ? 'Gaze setup' : 'Gaze check'}</h1>

            <p>
                {mode === 'pre_game'
                    ? 'Before the game starts, follow the dot so the webcam gaze tracker can check that it is working.'
                    : 'Look directly at the dot, hold your gaze briefly, then click it.'}
            </p>

            {currentTarget.isWarmUp ? (
                <p>
                    Warm-up target:{' '}
                    <strong>{currentTarget.label}</strong>
                </p>
            ) : (
                <p>
                    Recorded target {recordedTargetNumber} of {recordedTargets.length}:{' '}
                    <strong>{currentTarget.label}</strong>
                </p>
            )}

            <button
                type="button"
                className="calibration-target"
                onClick={handleTargetClick}
                style={{
                    position: 'fixed',
                    left: `${currentTarget.xRatio * 100}%`,
                    top: `${currentTarget.yRatio * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '3px solid currentColor',
                    background: 'transparent',
                    cursor: 'pointer',
                    zIndex: 9999,
                }}
                aria-label={`Calibration target ${currentTarget.label}`}
            />

            {onCancel && (
                <button type="button" onClick={onCancel}>
                    Cancel gaze check
                </button>
            )}
        </main>
    )
}
