import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatSessionDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Single-series chart — no legend needed, the heading already names the metric.
function AccuracyChart({ sessions }) {
    const data = sessions.map((session) => ({
        date: formatSessionDate(session.timestamp),
        accuracy: Math.round(session.accuracyScore * 100),
    }))

    return (
        <div>
            <h3>Accuracy over time</h3>
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
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        width={40}
                    />
                    <Tooltip
                        formatter={(value) => [`${value}%`, 'Accuracy']}
                        contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="accuracy"
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

export default AccuracyChart
