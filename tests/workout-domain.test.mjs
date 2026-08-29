import assert from "node:assert/strict";
import test from "node:test";
import { applyPendingRecommendations, buildProgressRecommendations, syncCompletedSetHistory } from "../app/workout-domain.ts";

function workspace() {
  return {
    athlete: { unit: "lb" },
    plan: { days: [{ exercises: [{ name: "Barbell Bench Press", sets: 3, reps: 8, weight: 100 }] }] },
    currentWorkout: { date: "2026-08-29", exercises: [{ id: "bench-work", libraryId: "bench-press", name: "Barbell Bench Press", sets: [{ id: "set-1", targetReps: 8, actualReps: 8, weight: 100, effort: 8, completed: false, note: "" }] }] },
    history: [],
    recommendations: [],
  };
}

test("builds a transparent progression recommendation from saved history", () => {
  const state = workspace();
  state.history.push({ id: "history-1", date: "2026-08-22", exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 100, reps: 8, sets: 3, volume: 2400 });
  const recommendations = buildProgressRecommendations(state, "plan", () => "rec-1");
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].suggestedWeight, 105);
  assert.match(recommendations[0].reason, /Latest history/);
  assert.match(recommendations[0].reason, /met the 3 × 8 target/);
});

test("recommends a small reduction when recent reps are well below target", () => {
  const state = workspace();
  state.history.push({ id: "history-1", date: "2026-08-22", exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 100, reps: 5, sets: 3, volume: 1500 });
  const [recommendation] = buildProgressRecommendations(state, "plan", () => "rec-1");
  assert.equal(recommendation.suggestedWeight, 95);
  assert.match(recommendation.reason, /below the 8-rep target/);
});

test("editing a completed set keeps its persisted history in sync", () => {
  const state = workspace();
  state.currentWorkout.exercises[0].sets[0] = { id: "set-1", targetReps: 8, actualReps: 9, weight: 105, effort: 9, completed: true, note: "Last rep slow" };
  state.history.push({ id: "history-1", setId: "set-1", date: "2026-08-29", exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 100, reps: 8, sets: 1, volume: 800 });
  assert.equal(syncCompletedSetHistory(state, "bench-work", 0), true);
  assert.deepEqual(state.history[0], { id: "history-1", setId: "set-1", date: "2026-08-29", exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 105, reps: 9, sets: 1, volume: 945, effort: 9, note: "Last rep slow" });
});

test("applying a recommendation updates every matching saved prescription", () => {
  const state = workspace();
  state.plan.days.push({ exercises: [{ name: "Barbell Bench Press", sets: 3, reps: 10, weight: 95 }] });
  state.recommendations.push({ id: "rec-1", exerciseName: "Barbell Bench Press", currentWeight: 100, suggestedWeight: 105, reason: "Targets met", status: "pending" });
  const updates = applyPendingRecommendations(state, "Barbell Bench Press");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].prescriptions, 2);
  assert.equal(state.plan.days[0].exercises[0].weight, 105);
  assert.equal(state.plan.days[1].exercises[0].weight, 105);
  assert.equal(state.recommendations[0].status, "accepted");
});
