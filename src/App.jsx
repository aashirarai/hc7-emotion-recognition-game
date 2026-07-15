import { useState } from 'react'

// Import the main game session component
import GameSession from './game/GameSession'
import LoginScreen from './game/LoginScreen'

function App() {
    // The logged-in participant, or null if no one is logged in yet
    const [participant, setParticipant] = useState(null)

    return (
        <main className="app">
            {participant ? (
                <GameSession participant={participant} onLogout={() => setParticipant(null)} />
            ) : (
                <LoginScreen onLogin={setParticipant} />
            )}
        </main>
    )
}

export default App
