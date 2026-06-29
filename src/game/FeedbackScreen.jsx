// Feedback screen shown after the user answers a question
// It receives the most recent trial log and displays the result
function FeedbackScreen({ lastTrialLog, onNext, isFinalTrial }) {
    return (
        <section>
            {/* Show different feedback depending on answer */}
            <h2>{lastTrialLog.isCorrect ? 'Correct!' : 'Not quite'}</h2>

            <p>
                You selected: <strong>{lastTrialLog.selectedEmotion}</strong>
            </p>

            <p>
                Correct answer: <strong>{lastTrialLog.correctEmotion}</strong>
            </p>

            <p>
                Reaction time: <strong>{lastTrialLog.reactionTimeMs} ms</strong>
            </p>

            {/* Button text changes on the final trial */}
            <button onClick={onNext}>
                {isFinalTrial ? 'Finish' : 'Next'}
            </button>
        </section>
    )
}

export default FeedbackScreen