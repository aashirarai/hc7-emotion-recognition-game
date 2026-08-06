// Fixed 7x7 grid — kept as custom markup rather than a Recharts primitive,
// since Recharts has no natural heatmap chart type worth adopting here.
// Cell shading is a sequential single-hue (--primary) ramp: near-surface for
// low counts, full intensity for the max cell in the matrix.
function ConfusionMatrixHeatmap({ confusionMatrix }) {
    const { emotions, matrix, totalTrials } = confusionMatrix
    const maxCount = Math.max(1, ...matrix.flat())

    const cells = [<div key="corner" className="confusion-cell confusion-corner" />]

    for (const emotion of emotions) {
        cells.push(
            <div key={`col-${emotion}`} className="confusion-cell confusion-header">
                {emotion}
            </div>
        )
    }

    emotions.forEach((rowEmotion, rowIndex) => {
        cells.push(
            <div key={`row-${rowEmotion}`} className="confusion-cell confusion-header">
                {rowEmotion}
            </div>
        )

        emotions.forEach((colEmotion, colIndex) => {
            const count = matrix[rowIndex][colIndex]
            const intensity = count / maxCount
            cells.push(
                <div
                    key={`${rowEmotion}-${colEmotion}`}
                    className={`confusion-cell${rowIndex === colIndex ? ' confusion-diagonal' : ''}`}
                    style={{ background: `rgba(79, 110, 247, ${(0.06 + intensity * 0.74).toFixed(2)})` }}
                    title={`${count} trial${count === 1 ? '' : 's'}: correct "${rowEmotion}", selected "${colEmotion}"`}
                >
                    {count > 0 ? count : ''}
                </div>
            )
        })
    })

    return (
        <div>
            <h3>Confusion matrix</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Rows = correct emotion, columns = selected emotion. Diagonal = correct answers.{' '}
                {totalTrials} answered trial{totalTrials === 1 ? '' : 's'} total.
            </p>
            <div
                className="confusion-grid"
                style={{ gridTemplateColumns: `88px repeat(${emotions.length}, 1fr)` }}
            >
                {cells}
            </div>
        </div>
    )
}

export default ConfusionMatrixHeatmap
