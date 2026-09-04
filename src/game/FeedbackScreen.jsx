import CelebrationBurst from './CelebrationBurst'

function FeedbackScreen({ lastTrialLog, onNext, isFinalTrial }) {
    const { isCorrect, selectedEmotion, correctEmotion, reactionTimeMs } = lastTrialLog

    return (
        <div className="card">
            <div className={`feedback-banner ${isCorrect ? 'correct' : 'incorrect'}`} role="alert">
                {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                {isCorrect && <CelebrationBurst />}
            </div>

            <div className="feedback-details">
                <p>You selected: <strong>{selectedEmotion}</strong></p>
                {!isCorrect && (
                    <p>Correct answer: <strong>{correctEmotion}</strong></p>
                )}
                <p>Reaction time: <strong>{reactionTimeMs} ms</strong></p>
            </div>

            <button className="btn-primary" onClick={onNext}>
                {isFinalTrial ? 'Finish' : 'Next →'}
            </button>
        </div>
    )
}

export default FeedbackScreen
