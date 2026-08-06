import { useEffect, useState } from 'react'
import { getGuardianDashboard } from '../data/guardianStore'
import SessionLogTable from './SessionLogTable'
import AccuracyChart from './AccuracyChart'
import ResponseTimeChart from './ResponseTimeChart'
import TierProgressionChart from './TierProgressionChart'
import ConfusionMatrixHeatmap from './ConfusionMatrixHeatmap'

function GuardianDashboard({ guardian, onLogout }) {
    const [dashboard, setDashboard] = useState(null)
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        getGuardianDashboard().then((data) => {
            if (cancelled) return
            setIsLoading(false)
            if (!data) {
                setError("Couldn't load progress data. Please try logging in again.")
                return
            }
            setDashboard(data)
        })

        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className="card" style={{ maxWidth: '900px' }}>
            <div className="start-header">
                <div>
                    <h1>{dashboard?.participantId ?? guardian.participantId}&rsquo;s progress</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Signed in as {guardian.guardianId}</p>
                </div>
                <button className="btn-link" onClick={onLogout}>
                    Log out
                </button>
            </div>

            {isLoading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}
            {error && <p className="login-error">{error}</p>}

            {dashboard && dashboard.sessions.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>No sessions recorded yet.</p>
            )}

            {dashboard && dashboard.sessions.length > 0 && (
                <>
                    <SessionLogTable sessions={dashboard.sessions} />

                    <div className="dashboard-charts">
                        <AccuracyChart sessions={dashboard.sessions} />
                        <ResponseTimeChart sessions={dashboard.sessions} />
                        <TierProgressionChart sessions={dashboard.sessions} />
                    </div>

                    <ConfusionMatrixHeatmap confusionMatrix={dashboard.confusionMatrix} />
                </>
            )}
        </div>
    )
}

export default GuardianDashboard
