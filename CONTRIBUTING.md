# Contributing Guide

This document explains how we will keep the repository organised and safe to work on collaboratively.

## Branches
Use these branch types:

```text
main            Stable milestone versions only
dev             Shared development branch
feature/        Clean app code intended to be merged
experiment/     Rough prototypes or exploratory work
fix/            Bug fixes
docs/           Documentation update
```

Examples:
```text
feature/core-game-loop
feature/trial-logging

experiment/game-UI-prototype
experiment/webcam-gaze-test

fix/reaction-time-bug

docs/data-schema
```

## Workflow
Most work should follow:
```text
branch -> pull request -> review -> merge into dev
```

Start from the latest `dev`:
```bash
git checkout dev
git pull origin dev
```
Create a branch:
```bash
git checkout -b feature/example-feature
```
Commit with a clear message:
```bash
git add .
git commit -m "feat: add example feature"
```
Push the branch:
```bash
git push -u origin feature/example-feature
```
Then open a pull request into `dev`.

## Experiment vs feature branches
Use `experiment/` branches for rough ideas that may be changed or discarded.

Use `feature/` branches for clean code intended to become part of the app.

Experimental code should not be pushed directly into `src/` unless it is already being integrated properly. If needed, place early prototypes in:
```text
experiments/
```

## Commit messages
Use clear commit messages.

Good examples:
```text
feat: add core trial loop
fix: prevent multiple responses per trial
docs: add gaze module notes
experiment: add drag-and-drop game mode
chore: update project structure
```

## Data and documentation reminders
Do not commit real participant data, raw webcam footage, `.env` files, API keys, or private files.

If a change adds, removes, or renames logged fields, update:
```text
docs/data-schema.md
```
For detailed privacy and data-handling rules, see:
```text
docs/ethics-and-data-handling.md
```

## Before merging
Before merging into `dev`, check:
- the app runs with `npm run dev`, if affected
- code is in the correct folder
- any new data fields are documented
- no private or real participant data is included
- the pull request template is filled in properly

Only merge `dev` into `main` when the project is stable enough to represent a milestone.
