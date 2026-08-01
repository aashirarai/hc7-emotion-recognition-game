# Online Emotion-Recognition Game for Early Identification of & Training on Social-Communication Differences
Browser-based prototype for an emotion-recognition game with performance logging, dashboard summaries, adaptive difficulty, and an optional webcam-based gaze estimation module.

## Project status
Prototype in development.

## Intended use
This project is support-focused and non-diagnostic. It aims to aid structured observation (identification) and practice (training) of facial emotion recognition rather than assign diagnostic labels.

The core game must remain usable without webcam access, adaptive difficulty, or any optional module including gaze estimation.

## Planned features
- Student-facing game UI
- Multiple-choice emotion labelling task
- Trial-level performance logging
- CSV export
- Teacher-facing dashboard summaries (accuracy, RT, confusions)
- Adaptive difficulty module, with an intended machine-learning-based component
- Optional webcam gaze estimation module
- Coarse AOI-based attention proxies
- Tracking-quality metrics

## Tech stack
- Vite
- React
- Javascript
- CSS
- Node.js / Express (API server)
- SQLite (participant data store)

## Running locally 

This is two processes: the API server (`server/`) and the Vite frontend
(repo root). Start both, in separate terminals.

**1. API server**
```bash
cd server
npm install
npm run dev
```
Starts on `http://localhost:3001` by default and creates `server/data.sqlite`
on first run. Copy `server/.env.example` to `server/.env` to set `PORT` or
`ADMIN_API_KEY` (used to protect the dashboard endpoints — see
`docs/data-schema.md`).

**2. Frontend**
```bash
npm install
npm run dev
```
Then open the local URL shown in the terminal. The frontend talks to the API
server at `VITE_API_BASE_URL` (defaults to `http://localhost:3001` if unset —
copy `.env.example` to `.env` at the repo root to override it).

## Repository structure
```text
src/game/           Core game logic and trial flow
src/data/           Trial logging, schema helpers, CSV export
src/dashboard/      Dashboard summaries and visualisations
src/adaptive/       Adaptive difficulty logic
src/gaze/           Optional webcam/gaze functionality
src/stimuli/        Stimulus metadata
src/components/     Shared UI components
src/utils/          General helper functions
server/             API server (Express + SQLite) for participant/session/trial data
docs/               Project documentation and development notes
tests/              Tests
```

## Data and privacy
- Do not commit real participant data.
- Do not commit raw webcam footage.
- Do not commit `.env` files, API keys, or private files.
- Webcam functionality should be optional and require consent.
- Use pseudonymous session IDs for logs.
- Keep example data clearly marked as dummy data.

## Contributors
- Aashira Rai -
- Chloe Cheung - 
- Shared - core game, logging, dashboard, integration