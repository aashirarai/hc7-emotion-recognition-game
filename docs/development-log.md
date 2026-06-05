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