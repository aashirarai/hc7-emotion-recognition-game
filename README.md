# Emotion Recognition Game

A browser-based research prototype for practising facial emotion recognition and exploring whether optional webcam gaze estimates add useful context to behavioural results. Built as part of the HC7 MSc Biomedical Engineering (Neurotechnology) project at Imperial College London.

**Status:** research prototype. The gaze analysis is exploratory, the project has only been self-tested, and it is not a diagnostic or clinically validated tool.

## What it does

- Presents a seven-choice facial emotion task and records accuracy and response time for each trial.
- Adjusts difficulty across sessions using performance-based scoring.
- Stores pseudonymous participant sessions in SQLite and displays history, charts and confusion matrices in a guardian dashboard.
- Offers an optional webcam setup and calibration check. Gaze estimates are summarised against the displayed image and its upper/lower halves; these regions are **not** verified face or eye/mouth regions. The game can be played without a webcam, and raw video is not stored.
- Includes theme and reduced-motion support.

## Stack

React, Vite and CSS on the frontend; Node.js, Express and SQLite on the API; WebGazer and MediaPipe for the optional gaze flow; Recharts for dashboard plots.

## Run locally

Requires Node.js 22.5 or newer and npm. Start the API and frontend in separate terminals:

```bash
cd server
npm ci
npm run dev
```

```bash
npm ci
npm run dev:web
```

Open the URL printed by Vite. The API defaults to `http://localhost:3001`; it creates `server/data.sqlite` on first run. To change its port or set an admin key, copy `server/.env.example` to `server/.env` and edit the values. To change the frontend API URL, copy `.env.example` to `.env` and set `VITE_API_BASE_URL`. Keep the API local for this demo: its default CORS policy and example configuration are not a production deployment setup.

For a production bundle, run `npm run build`. Run `npm run lint` to check the frontend source.

## Where to look

| Area | Code |
| --- | --- |
| Game flow and trial logging | `src/game/`, `src/data/` |
| Scoring and adaptive tiers | `src/adaptive/` |
| Webcam setup and gaze summaries | `src/gaze/` |
| Dashboard | `src/dashboard/` |
| API, authentication and database | `server/src/` |
| Schema and self-test notes | `docs/data-schema.md`, `docs/evaluation/gaze-self-test.md` |

## Data and stimulus images

Use made-up participant IDs when trying the app. Do not enter real participant data. The repository contains KDEF facial stimuli; their inclusion here does not grant permission to reuse or redistribute them. Check the dataset's terms with its rights holder before using those images elsewhere. The `KDEF/` source set and `src/stimuli/images/` playable copies make this repository unusually large.

## Contributions

This is a group project by Aashira Rai and Chloe Cheung. Aashira's work included the webcam gaze module, pre-game calibration flow, game-loop prototype and unit tests. The game, API and dashboard include collaborative work; commit history provides further provenance.
