# GymDeck — Devpost submission draft

## One-line description

GymDeck is a workout tracker where people and browser agents can build, log, and adapt a training session together.

## Project description

Most workout plans are written as if the gym will cooperate. In practice, the cable machine is busy, time runs short, or an exercise needs to be changed halfway through a session. GymDeck is built around that reality.

It gives people a fast, touch-friendly way to log sets, reps, weight, effort, rest, and cardio. It also exposes the workout as structured WebMCP tools, so a browser agent can read the current plan and make useful changes directly in the app. For example, a user can say, “Make me a shoulders and arms workout for today,” then follow up with, “Add 20 minutes on the bike.” The agent creates the workout, adds the cardio block, and the user can immediately see and use the result.

The collaboration becomes more valuable as the session continues. An agent can replace an unavailable exercise, shorten the remaining workout, add a set, read previous performance, or recommend a next-session weight. Completed work is preserved when a workout changes. Every agent or human change appears in an activity history and can be undone.

GymDeck stores its workspace locally in the browser, including workout history and progression suggestions. It does not need an account, external database, or API key, which makes it easy to try in a gym and easy for judges to inspect. The app also includes seeded demo history so the agent has real context from the first interaction.

## Why WebMCP

Without WebMCP, an agent would have to guess its way through a workout interface or return instructions for the user to carry out manually. GymDeck gives the agent named tools with clear inputs and outputs for reading plans, searching exercises, logging sets, swapping movements, adjusting a live workout, and reviewing progress.

The normal UI and the WebMCP tools use the same state-management functions. That means the result of an agent action is visible immediately, persisted after refresh, reflected in the activity history, and available to the person for review or undo.

## How it was built

- React and TypeScript
- `document.modelContext.registerTool()` for the WebMCP surface
- Twenty-one read and write tools
- Versioned browser-local persistence with JSON export/import
- Hosted as a browser-based app without an application server

## Links

- Live app: https://gymdeck.yanbocheng01234.chatgpt.site
- Source code: https://github.com/iamyanbo/gymdeck-webmcp

## Suggested demo sequence

1. Show the live workout and open Site tools.
2. Ask for a shoulders and arms workout.
3. Add 20 minutes of bike cardio.
4. Log a set manually.
5. Ask the agent to read the history and recommend the next weight.
6. Refresh the page to show persistence.
7. Swap or shorten part of the workout and show the activity history and undo button.
