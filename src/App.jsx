import { useState } from 'react'

// Import the main game session component
import GameSession from './game/GameSession'
import LoginScreen from './game/LoginScreen'
import RoleSelectScreen from './RoleSelectScreen'
import GuardianAuthScreen from './dashboard/GuardianAuthScreen'
import GuardianDashboard from './dashboard/GuardianDashboard'
import { clearGuardianSession } from './data/guardianStore'
import { ThemeProvider } from './theme/ThemeContext'

function App() {
    // 'student' or 'guardian' fork, or null while on the role picker
    const [role, setRole] = useState(null)

    // The logged-in participant, or null if no one is logged in yet
    const [participant, setParticipant] = useState(null)

    // The signed-in guardian, or null if not signed in yet
    const [guardian, setGuardian] = useState(null)

    function handleBackToRoleSelect() {
        setParticipant(null)
        setGuardian(null)
        clearGuardianSession()
        setRole(null)
    }

    let content
    if (!role) {
        content = <RoleSelectScreen onSelectRole={setRole} />
    } else if (role === 'student') {
        content = participant ? (
            <GameSession participant={participant} onLogout={handleBackToRoleSelect} />
        ) : (
            <LoginScreen onLogin={setParticipant} />
        )
    } else {
        content = guardian ? (
            <GuardianDashboard guardian={guardian} onLogout={handleBackToRoleSelect} />
        ) : (
            <GuardianAuthScreen onAuth={setGuardian} onBack={handleBackToRoleSelect} />
        )
    }

    return (
        <ThemeProvider key={participant?.participantId ?? 'global'} scopeId={participant?.participantId ?? null}>
            <main className="app">{content}</main>
        </ThemeProvider>
    )
}

export default App
