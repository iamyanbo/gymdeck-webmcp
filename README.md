# GymDeck

GymDeck is a local-first workout workspace built for people and browser agents to use together. It creates training plans, tracks sets, reps, weights, and effort, adapts active workouts, and turns exercise history into transparent progression suggestions.

**Live app:** [gymdeck.yanbocheng01234.chatgpt.site](https://gymdeck.yanbocheng01234.chatgpt.site)

## Why WebMCP

GymDeck is most useful in the middle of a workout, when plans need to change quickly. A person can log sets through the touch-friendly interface while an external browser agent reads the same live state and handles multi-step changes such as:

> The cable machine is busy and I only have 20 minutes. Replace cable rows with a dumbbell alternative and shorten the remaining workout without removing anything I completed.

The agent does not guess its way through buttons or rely on a chatbot embedded in the app. GymDeck registers structured tools with `document.modelContext.registerTool()`. Those tools use the same state-management functions as the normal interface, update the visible page immediately, and persist their changes in the browser.

## Product experience

- Mobile-first workout logging with large touch targets and a rest timer
- Editable target and actual sets, reps, weights, notes, and effort ratings
- Multi-day training plans and a searchable exercise library
- Exercise swaps that preserve completed sets and record the reason
- Dynamic shortening, skipping, reordering, and set additions
- Browser-local persistence, versioned data, JSON export/import, and demo reset
- Seeded bench-press history, progress charts, records, and training volume
- Transparent next-session load suggestions that can be accepted, edited, or ignored
- Undoable activity history for both human and agent changes

## WebMCP tools

GymDeck registers fourteen JavaScript tools from the top-level page:

| Tool | Type | Purpose |
| --- | --- | --- |
| `get_athlete_profile` | Read | Read goals, units, experience, equipment, and schedule |
| `get_today_workout` | Read | Read exercise order, prescriptions, completed sets, and status |
| `search_exercises` | Read | Search by name, muscle, movement, or equipment |
| `get_exercise_history` | Read | Read recorded performance for an exercise |
| `get_progress_summary` | Read | Read volume, consistency, records, and recent performance |
| `get_weekly_summary` | Read | Summarize the previous seven days |
| `create_training_plan` | Write | Create a multi-day training plan |
| `add_exercise` | Write | Add an exercise and prescription to today’s workout |
| `update_exercise_prescription` | Write | Change sets, reps, weight, or rest time |
| `swap_exercise` | Write | Replace an exercise while preserving completed history |
| `log_set` | Write | Record a completed set |
| `edit_set` | Write | Correct a logged set |
| `adjust_current_workout` | Write | Shorten, skip, add a set, or reorder exercises |
| `recommend_next_session` | Write | Save explainable progression recommendations |

Read tools are marked with `readOnlyHint`. Write tools describe their side effects, update the visible workspace, return a concise verification result, and add an entry to GymDeck’s activity history.

## Architecture

- React 19 and TypeScript
- Vinext/Vite deployment targeting Cloudflare Workers through ChatGPT Sites
- No application server, external database, authentication, or API key
- A versioned `localStorage` workspace under `gymdeck-workspace-v1`
- The external agent is supplied by a WebMCP-capable browser; GymDeck does not ship a fake chatbot

All athlete data remains in the current browser unless the user explicitly exports it. Every judge or visitor starts with an isolated demo workspace on their own device.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. The complete manual interface works in a standard browser. Agent tools require ChatGPT’s WebMCP-capable in-app browser or Chrome with WebMCP testing enabled.

## Test the agent workflow

1. Open the live app in ChatGPT’s in-app browser.
2. Open **Site tools** in the address bar and confirm that GymDeck exposes fourteen tools.
3. Load or reset the demo athlete if needed.
4. Send this prompt to the browser agent:

   > Read today’s workout and my recent bench-press history. The cable machine is busy and I only have 20 minutes. Replace Seated Cable Row with Chest-Supported Row, preserve completed work, and shorten the remaining workout.

5. Confirm that the workout and activity history update visibly.
6. Log a bench-press set manually, then ask the agent to read it and recommend the next session.
7. Accept or edit the recommendation from Progress and refresh the page to prove persistence.

Current ChatGPT documentation recommends GPT-5.6 Sol or GPT-5.6 Terra for site tools and notes that availability depends on the desktop app version and account rollout.

## Validation

```bash
npm run build
npm test
```

The focused tests verify the production-rendered product shell, browser persistence marker, and core WebMCP tool surface.

## Safety and privacy

GymDeck provides transparent training suggestions, not medical advice or injury diagnosis. Users remain in control of every change and can inspect or undo recent activity. Workout data stays local unless exported.

## License

[MIT](LICENSE)
