import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatSessionDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ResponseTimeChart({ sessions }) {
    const data = sessions.map((session) => ({
        date: formatSessionDate(session.timestamp),
        meanReactionTimeMs: Math.round(session.meanReactionTimeMs),
    }))

    return (
        <div>
            <h3>Response time over time</h3>
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
                        tickFormatter={(value) => `${value}ms`}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        width={56}
                    />
                    <Tooltip
                        formatter={(value) => [`${value} ms`, 'Mean RT']}
                        contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="meanReactionTimeMs"
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

export default ResponseTimeChart
