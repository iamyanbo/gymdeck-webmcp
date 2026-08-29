# GymDeck — Devpost submission draft

## One-line description

GymDeck is a workout checklist with memory, where people and browser agents work together to make steady progress.

## Project description

Good training is built on routine. The real challenge is turning that routine into measurable progress: remembering what you lifted, knowing when to increase the load, and keeping enough history to make the next session useful. GymDeck is built around that process.

Today’s workout is a simple checklist. People can quickly mark sets complete and log reps, weight, effort, rest, and cardio without losing focus on training. The app keeps those logs over time, so a browser agent can act like a personal trainer: review recent performance, suggest the next weight or reps, and help plan the next session.

The agent can also help when the routine needs a practical adjustment. If an exercise is taken or time runs short, the user can ask for a replacement or a shorter remaining workout. For example, a user can say, “Make me a shoulders and arms workout for today,” then follow up with, “Add 20 minutes on the bike.” The agent creates the workout and adds the cardio block. Completed work is preserved when a workout changes. Every agent or human change appears in an activity history and can be undone.

GymDeck stores its workspace locally in the browser, including workout history and progression suggestions. It does not need an account, external database, or API key, which makes it easy to try in a gym and easy for judges to inspect. The app also includes seeded demo history so the agent has real context from the first interaction.

## Why WebMCP

Without WebMCP, an agent could give generic training advice, but it would not have a reliable way to read the user’s actual logs or update the checklist. GymDeck gives the agent named tools with clear inputs and outputs for reading plans, searching exercises, logging sets, swapping movements, adjusting a live workout, and reviewing progress.

The normal UI and the WebMCP tools use the same state-management functions. That means the result of an agent action is visible immediately, persisted after refresh, reflected in the activity history, and available to the person for review or undo. The agent is working from the person’s actual training history rather than starting from a blank conversation each time.

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
