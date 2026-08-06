import { TIER_LABELS } from '../adaptive/tierEngine'

function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function SessionLogTable({ sessions }) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="session-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Accuracy</th>
                        <th>Correct</th>
                        <th>Mean RT</th>
                        <th>Tier</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((session) => (
                        <tr key={session.sessionId}>
                            <td>{formatDateTime(session.timestamp)}</td>
                            <td>{Math.round(session.accuracyScore * 100)}%</td>
                            <td>
                                {session.correctCount} / {session.totalTrials}
                            </td>
                            <td>{Math.round(session.meanReactionTimeMs)} ms</td>
                            <td>{session.tierIndex !== null ? TIER_LABELS[session.tierIndex] : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default SessionLogTable
