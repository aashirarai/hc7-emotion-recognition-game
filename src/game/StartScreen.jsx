// Start screen shown before the session begins
// It receives an onStart function from GameSession
// When the button is clicked, GameSession starts the trial loop
function StartScreen({ onStart }) {
  return (
    <section>
      <h2>Emotion Recognition Game</h2>

      <button onClick={onStart}>Start</button>
    </section>
  )
}

export default StartScreen