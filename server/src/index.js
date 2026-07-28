import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'

import './db.js'

// Minimal .env loader (KEY=VALUE per line) — avoids pulling in the dotenv
// dependency for a single-file, no-nesting env config.
function loadEnvFile() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const envPath = path.join(__dirname, '..', '.env')
    if (!fs.existsSync(envPath)) return

    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        const equalsIndex = trimmed.indexOf('=')
        if (equalsIndex === -1) continue

        const key = trimmed.slice(0, equalsIndex).trim()
        const value = trimmed.slice(equalsIndex + 1).trim()
        if (!(key in process.env)) {
            process.env[key] = value
        }
    }
}
loadEnvFile()
import participantsRouter from './routes/participants.js'
import sessionsRouter from './routes/sessions.js'
import trialsRouter from './routes/trials.js'
import dashboardRouter from './routes/dashboard.js'

const PORT = process.env.PORT ?? 3001

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/participants', participantsRouter)
app.use('/api/participants', sessionsRouter)
app.use('/api/participants', trialsRouter)
app.use('/api/dashboard', dashboardRouter)

app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`)
})
