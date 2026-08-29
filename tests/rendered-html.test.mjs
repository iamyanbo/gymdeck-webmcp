import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the GymDeck product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>GymDeck — Train with memory<\/title>/i);
  assert.match(html, /Loading your training workspace/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
});

test("ships local persistence and the core WebMCP tool surface", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /document as unknown as \{ modelContext\?: ModelContext \}/);
  assert.match(page, /gymdeck-workspace-v1/);
  const tools = [
    "get_athlete_profile",
    "get_today_workout",
    "search_exercises",
    "get_exercise_history",
    "create_training_plan",
    "add_workout_day",
    "add_cardio_block",
    "add_exercise",
    "update_exercise_prescription",
    "swap_exercise",
    "log_set",
    "edit_set",
    "adjust_current_workout",
    "get_progress_summary",
    "recommend_next_session",
    "get_weekly_summary",
  ];
  for (const tool of tools) {
    assert.match(page, new RegExp(`name: "${tool}"`));
  }
  assert.match(page, /modelContext\.registerTool\(tool/);
  assert.match(page, /readOnlyHint: true/);
  assert.match(page, /readOnlyHint: false/);
  assert.match(page, /durationMinutes/);
  assert.match(page, /Stationary Bike/);
});
