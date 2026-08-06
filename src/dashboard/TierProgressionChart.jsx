import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TIER_LABELS } from '../adaptive/tierEngine'

function formatSessionDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Sessions older than adaptive_state.history_json's 20-entry cap resolve to
// tierIndex: null server-side and are dropped here — a pre-existing
// limitation of the adaptive-state history, not something fixed by this chart.
function TierProgressionChart({ sessions }) {
    const data = sessions
        .filter((session) => session.tierIndex !== null)
        .map((session) => ({
            date: formatSessionDate(session.timestamp),
            tierIndex: session.tierIndex,
        }))

    if (data.length === 0) {
        return (
            <div>
                <h3>Difficulty tier</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Not enough recent data to show tier history.
                </p>
            </div>
        )
    }

    return (
        <div>
            <h3>Difficulty tier</h3>
            <ResponsiveContainer width="100%" height={220} className="chart-svg">
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, TIER_LABELS.length - 1]}
                        ticks={TIER_LABELS.map((_, index) => index)}
                        tickFormatter={(value) => TIER_LABELS[value]}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        width={70}
                    />
                    <Tooltip
                        formatter={(value) => [TIER_LABELS[value], 'Tier']}
                        contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }}
                    />
                    <Line
                        type="stepAfter"
                        dataKey="tierIndex"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

export default TierProgressionChart
