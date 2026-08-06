import { useState } from 'react'
import { loginGuardian, signupGuardian } from '../data/guardianStore'

const ERROR_MESSAGES = {
    invalid_participant_id: "That doesn't look like a valid participant ID.",
    invalid_pin: 'PIN must be exactly 4 digits.',
    invalid_guardian_id: 'Guardian ID must look like an email address.',
    weak_password: 'Password must be at least 8 characters.',
    participant_not_found: 'No participant found with that ID.',
    wrong_pin: "That PIN doesn't match this participant ID.",
    guardian_id_taken: 'An account with that guardian ID already exists.',
    invalid_credentials: 'Incorrect guardian ID or password.',
    network_error: "Couldn't reach the server. Check your connection and try again.",
}

function GuardianAuthScreen({ onAuth, onBack }) {
    const [mode, setMode] = useState('login') // 'login' | 'signup'
    const [participantId, setParticipantId] = useState('')
    const [participantPin, setParticipantPin] = useState('')
    const [guardianId, setGuardianId] = useState('')
    const [guardianPassword, setGuardianPassword] = useState('')
    const [error, setError] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const result =
            mode === 'signup'
                ? await signupGuardian(participantId, participantPin, guardianId, guardianPassword)
                : await loginGuardian(guardianId, guardianPassword)

        setIsSubmitting(false)

        if (!result.ok) {
            setError(ERROR_MESSAGES[result.error] ?? 'Something went wrong. Please try again.')
            return
        }

        onAuth(result.guardian)
    }

    return (
        <div className="card">
            <div>
                <h1>Guardian {mode === 'signup' ? 'Sign Up' : 'Login'}</h1>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    {mode === 'signup'
                        ? "Enter your child's participant ID and current PIN to link a guardian account. Their game PIN will not be changed."
                        : 'Sign in with your guardian ID and password to view progress.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
                {mode === 'signup' && (
                    <>
                        <label className="login-field">
                            <span>Child's participant ID</span>
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
                            <span>Child's current 4-digit PIN</span>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="\d{4}"
                                value={participantPin}
                                onChange={(event) =>
                                    setParticipantPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                                }
                                maxLength={4}
                                autoComplete="off"
                                placeholder="****"
                                required
                            />
                        </label>
                    </>
                )}

                <label className="login-field">
                    <span>Guardian ID (email)</span>
                    <input
                        type="email"
                        value={guardianId}
                        onChange={(event) => setGuardianId(event.target.value)}
                        autoComplete="off"
                        placeholder="you@example.com"
                        required
                    />
                </label>

                <label className="login-field">
                    <span>Password</span>
                    <input
                        type="password"
                        value={guardianPassword}
                        onChange={(event) => setGuardianPassword(event.target.value)}
                        autoComplete="off"
                        placeholder={mode === 'signup' ? 'At least 8 characters' : 'Password'}
                        required
                    />
                </label>

                {error && <p className="login-error">{error}</p>}

                <button className="btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Checking...' : mode === 'signup' ? 'Create account' : 'Log in'}
                </button>
            </form>

            <button
                className="btn-link"
                onClick={() => {
                    setError(null)
                    setMode((current) => (current === 'signup' ? 'login' : 'signup'))
                }}
            >
                {mode === 'signup'
                    ? 'Already have a guardian account? Log in'
                    : "Don't have an account yet? Sign up"}
            </button>

            <button className="btn-link" onClick={onBack}>
                Back
            </button>
        </div>
    )
}

export default GuardianAuthScreen
