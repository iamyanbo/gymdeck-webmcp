# GymDeck

GymDeck is a workout tracker for the part of training that most apps ignore: the plan changes once you are actually at the gym.

You can build a weekly plan, log sets and cardio, swap an exercise when equipment is busy, and use your past performance to decide what to do next. A browser agent can work with the same workout state through WebMCP, so a short request can make a real change in the app instead of just producing advice in a chat.

**Try GymDeck:** [gymdeck.yanbocheng01234.chatgpt.site](https://gymdeck.yanbocheng01234.chatgpt.site)

## Why WebMCP fits

Gym sessions are rarely perfectly predictable. The cable machine is taken, a shoulder movement does not feel right, or there is only twenty minutes left. GymDeck lets a person handle the quick physical work—logging a set or starting a rest timer—while an external browser agent handles structured changes such as:

> The cable machine is busy and I only have 20 minutes. Replace cable rows with a dumbbell alternative and shorten the remaining workout without removing anything I completed.

The agent reads and changes GymDeck through `document.modelContext.registerTool()`. The tools call the same state functions as the normal interface, so agent changes appear in the UI immediately, are recorded in the activity history, can be undone, and survive a refresh.

## What is included

- A mobile-first workout screen for quick set logging, rest timers, notes, effort ratings, and cardio
- Multi-day plans with editable exercises, sets, reps, weight, rest time, and order
- Exercise swaps that preserve completed work and record why the change happened
- A built-in exercise library plus custom exercises
- Progress charts, volume, consistency, personal records, and recent performance
- Transparent next-session weight suggestions that can be accepted, edited, or ignored
- Local persistence, demo data, JSON export/import, and a reset option
- An activity history showing both human and agent changes, with undo

## WebMCP tools

GymDeck exposes twenty-one tools. Read tools inspect the current workspace; write tools update it and return a concise result describing the change.

| Tool | What it does |
| --- | --- |
| `get_athlete_profile` | Read the athlete’s goals, units, experience, equipment, and schedule |
| `get_today_workout` | Read today’s exercises, prescriptions, completed sets, and status |
| `get_training_plan` | Read every saved training day and prescription |
| `search_exercises` | Search the exercise library |
| `get_exercise_history` | Read past performance for an exercise |
| `get_progress_summary` | Read volume, consistency, records, and recent performance |
| `get_weekly_summary` | Summarize the previous seven days |
| `create_training_plan` | Create a multi-day plan |
| `prepare_focused_workout` | Turn a short focus request into today’s workout or a saved plan day |
| `set_plan_day` | Create or replace a saved day with an exact exercise list |
| `edit_plan_day` | Rename, delete, add, update, remove, or reorder plan exercises |
| `load_plan_day` | Load a saved day into today’s workout |
| `add_cardio_block` | Add timed treadmill, bike, rower, stair-climber, or elliptical work |
| `undo_last_change` | Undo the most recent GymDeck change |
| `add_exercise` | Add an exercise to today’s workout |
| `update_exercise_prescription` | Change sets, reps, weight, or rest time |
| `swap_exercise` | Replace an exercise while preserving completed history |
| `log_set` | Record a completed set |
| `edit_set` | Correct a logged set |
| `adjust_current_workout` | Shorten, skip, add a set, or reorder the current workout |
| `recommend_next_session` | Save an explainable progression suggestion |

## Try the agent workflow

1. Open the live app in ChatGPT’s in-app browser.
2. Open **Site tools** in the address bar and confirm that GymDeck exposes twenty-one tools.
3. Reset or load the demo athlete if needed.
4. Ask the agent:

   > Make me a shoulders and arms workout for today.

5. Then ask:

   > Add 20 minutes on the bike.

6. Check that both changes appear in Today’s Workout and Activity History.
7. Log a set manually, ask the agent to read the new history, and request a next-session recommendation.
8. Refresh the page and confirm that the workout and history are still there.

## How it works

- React and TypeScript
- Vinext/Vite deployment targeting Cloudflare Workers through ChatGPT Sites
- Browser-local, versioned `localStorage` data with automatic migration
- No application server, external database, authentication, or API key
- The external agent comes from a WebMCP-capable browser; GymDeck does not include a fake chatbot

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The manual interface works in a standard browser. Agent tools require ChatGPT’s WebMCP-capable in-app browser or Chrome with WebMCP testing enabled.

## Validation

```bash
npm test
npm run lint
```

## Safety

GymDeck provides training suggestions, not medical advice or injury diagnosis. The user remains in control of every change.

## License

[MIT](LICENSE)
