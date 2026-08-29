# GymDeck

GymDeck is a private, local-first workout workspace built for people and browser agents to use together. It creates training plans, tracks real sets/reps/weights, adapts an active session, and turns history into transparent progression suggestions.

## What works

- Mobile-first workout logging with rest timers and editable set details
- Multi-day training plans and a searchable exercise library
- Exercise swaps that preserve completed history and record the reason
- Local browser persistence with JSON export/import and demo reset
- Progress trends, training volume, personal history, and next-load suggestions
- An undoable activity feed for both human and agent changes
- Fourteen WebMCP tools registered with `document.modelContext.registerTool()`

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by the development server. GymDeck needs a WebMCP-enabled browser for agent tools, but the full manual interface works in standard browsers.

## Demo flow

1. Open Today and inspect the seeded Upper Strength workout.
2. Ask the browser agent to read today’s workout.
3. Replace Seated Cable Row with Chest-Supported Row because the cable is busy.
4. Log one or more bench press sets.
5. Ask for bench press history and a next-session recommendation.
6. Accept the recommendation from Progress.

All athlete data remains in the current browser unless the user explicitly exports it.

## Validation

```bash
npm run build
npm test
```
