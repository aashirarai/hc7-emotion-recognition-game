# Development Log

This file records key technical and project decisions during development.

## 05/06/2026

### Decision
Set up the project repository using React + Vite.

### Reason
The project is a browser-based interactive prototype, so React is suitable for building reusable UI components such as the game screen, response buttons, dashboard views, webcam consent screen, and adaptive difficulty controls. Vite provides a lightweight development setup.

### Impact / Next step
Use the React/Vite scaffold as the foundation for the shared game platform. Core game code will be organised under `src/`, with separate areas for the game, data logging, dashboard, adaptive difficulty, and optional gaze functionality.


## 05/06/2026

### Decision

Create an initial trial-level data schema.

### Reason

The core game, dashboard, adaptive difficulty module, and optional gaze module will all depend on consistent trial-level field names. Defining the main fields early should reduce integration issues later.

### Impact / Next step

Use `docs/data-schema.md` as the reference for data logging fields such as `sessionId`, `trialId`, `stimulusId`, `correctEmotion`, `selectedEmotion`, `isCorrect`, and `reactionTimeMs`. These can change during development.

Adaptive difficulty and gaze estimation fields will be added once those modules are developed.


## 14/07/2026

### Decision

Add a participant login screen (participant ID + 4-digit PIN) as a prerequisite for adaptive difficulty. Participants self-register on first use — there is no researcher-side pre-issued ID list. Data is stored client-side in `localStorage` (`hc7_participants_v1`), with the PIN hashed (SHA-256) rather than stored in plain text.

### Reason

Adaptive difficulty and "show my previous results" both require the game to know which participant is currently playing and to reload their history. There is no backend yet, so `localStorage` is the only available persistence layer — consistent with how `hc7_adaptive_state_v1` was already planned. The PIN is explicitly *not* a security mechanism (no server, no rate limiting); it exists only to reduce accidental cross-loading of another child's profile on a shared device.

### Impact / Next step

- `sessionId` is now derived from `participantId` (`{participantId}_{timestamp}`), and trial logs carry a `participantId` field.
- Session composite scores are saved to the participant's history (`sessions`, capped at 20) on session completion, and the start screen shows the most recent one.
- Next: scope `hc7_adaptive_state_v1` per participant (currently still global) so the adaptive difficulty module can read/write per-child state.
- If the game later needs to run across multiple devices for the same participant, this login flow will need to move to a real backend — the current approach will not carry over automatically.