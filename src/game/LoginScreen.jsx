import { useState } from 'react'
import { loginOrRegister } from '../data/participantStore'

const ERROR_MESSAGES = {
    invalid_id: 'Participant ID must be 2-20 letters or numbers.',
    invalid_pin: 'PIN must be exactly 4 digits.',
    wrong_pin: "That PIN doesn't match this participant ID.",
    network_error: "Couldn't reach the server. Check your connection and try again.",
}

function LoginScreen({ onLogin }) {
    const [participantId, setParticipantId] = useState('')
    const [pin, setPin] = useState('')
    const [error, setError] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const result = await loginOrRegister(participantId, pin)

        setIsSubmitting(false)

        if (!result.ok) {
            setError(ERROR_MESSAGES[result.error])
            return
        }

        onLogin(result.participant)
    }

    return (
        <div className="card">
            <div>
                <h1>Welcome</h1>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    Enter your participant ID and PIN to continue. First time here?
                    Make up a fun nickname (not your real name!) and a 4-digit PIN.
                    Use the same ones next time to see your past results.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
                <label className="login-field">
                    <span>Participant ID</span>
                    <input
                        type="text"
                        value={participantId}
                        onChange={(event) => setParticipantId(event.target.value)}
                        maxLength={20}
                        autoComplete="off"
                        placeholder="e.g. STAR7"
                        required
                    />
                </label>

                <label className="login-field">
                    <span>4-digit PIN</span>
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="\d{4}"
                        value={pin}
                        onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        autoComplete="off"
                        placeholder="****"
                        required
                    />
                </label>

                {error && <p className="login-error">{error}</p>}

                <button className="btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Checking...' : 'Continue'}
                </button>
            </form>
        </div>
    )
}

export default LoginScreen
