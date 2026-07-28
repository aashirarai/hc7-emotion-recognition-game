// SQLite connection + schema setup. See docs/data-schema.md for field meanings.
// Uses Node's built-in node:sqlite module (stable from Node 22.5+) rather than
// a native-addon driver, so `npm install` needs no C++ build toolchain.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data.sqlite')

export const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

// node:sqlite's DatabaseSync has no built-in .transaction() helper (unlike
// better-sqlite3) — this wraps a block of statements in BEGIN/COMMIT, rolling
// back on error.
export function withTransaction(fn) {
    db.exec('BEGIN')
    try {
        const result = fn()
        db.exec('COMMIT')
        return result
    } catch (err) {
        db.exec('ROLLBACK')
        throw err
    }
}

db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
        participant_id TEXT PRIMARY KEY,
        pin_hash TEXT NOT NULL,
        pin_salt TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL REFERENCES participants(participant_id),
        expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adaptive_state (
        participant_id TEXT PRIMARY KEY REFERENCES participants(participant_id),
        version INTEGER NOT NULL,
        tier_index INTEGER NOT NULL,
        consecutive_above INTEGER NOT NULL,
        consecutive_below INTEGER NOT NULL,
        history_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL REFERENCES participants(participant_id),
        composite_score REAL NOT NULL,
        accuracy_score REAL NOT NULL,
        correct_count INTEGER NOT NULL,
        total_trials INTEGER NOT NULL,
        mean_reaction_time_ms REAL NOT NULL,
        timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trial_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id TEXT NOT NULL REFERENCES participants(participant_id),
        session_id TEXT NOT NULL REFERENCES sessions(session_id),
        trial_id TEXT NOT NULL,
        stimulus_id TEXT NOT NULL,
        correct_emotion TEXT NOT NULL,
        selected_emotion TEXT,
        is_correct INTEGER,
        reaction_time_ms REAL,
        difficulty TEXT,
        mode TEXT,
        timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_tokens_participant ON auth_tokens(participant_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id);
    CREATE INDEX IF NOT EXISTS idx_trial_logs_participant ON trial_logs(participant_id);
    CREATE INDEX IF NOT EXISTS idx_trial_logs_session ON trial_logs(session_id);
`)
