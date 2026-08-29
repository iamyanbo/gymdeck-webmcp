export type ProgressUnit = "lb" | "kg";

export type ProgressSet = {
  id: string;
  targetReps: number;
  actualReps: number;
  weight: number;
  effort: number;
  completed: boolean;
  note: string;
};

export type ProgressHistoryEntry = {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
  durationMinutes?: number;
  setId?: string;
  effort?: number;
  note?: string;
};

export type ProgressRecommendation = {
  id: string;
  exerciseName: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
  status: "pending" | "accepted" | "ignored";
};

type ProgressExercise = {
  id: string;
  libraryId: string;
  name: string;
  durationMinutes?: number;
  sets: ProgressSet[];
};

type ProgressPrescription = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
};

export type ProgressState = {
  athlete: { unit: ProgressUnit };
  plan: { days: Array<{ exercises: ProgressPrescription[] }> };
  currentWorkout: { date: string; exercises: ProgressExercise[] };
  history: ProgressHistoryEntry[];
  recommendations: ProgressRecommendation[];
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function incrementFor(exerciseName: string, unit: ProgressUnit) {
  const lowerCompound = /squat|deadlift|leg press|hip thrust/i.test(exerciseName);
  return unit === "kg" ? (lowerCompound ? 5 : 2.5) : (lowerCompound ? 10 : 5);
}

function latestHistoryFor(history: ProgressHistoryEntry[], exerciseName: string) {
  const matching = history.filter((entry) => !entry.durationMinutes && normalize(entry.exerciseName) === normalize(exerciseName));
  const latestDate = matching.reduce((latest, entry) => entry.date > latest ? entry.date : latest, "");
  return matching.filter((entry) => entry.date === latestDate);
}

export function syncCompletedSetHistory(state: ProgressState, exerciseId: string, setIndex: number) {
  const exercise = state.currentWorkout.exercises.find((item) => item.id === exerciseId);
  const set = exercise?.sets[setIndex];
  if (!exercise || !set?.completed) return false;
  const exact = state.history.find((entry) => entry.setId === set.id);
  const fallback = [...state.history].reverse().find((entry) => !entry.setId && entry.date === state.currentWorkout.date && entry.exerciseId === exercise.libraryId);
  const entry = exact ?? fallback;
  if (!entry) return false;
  entry.weight = set.weight;
  entry.reps = set.actualReps;
  entry.volume = set.weight * set.actualReps;
  entry.effort = set.effort;
  entry.note = set.note;
  entry.setId ||= set.id;
  return true;
}

export function buildProgressRecommendations(
  state: ProgressState,
  scope: "current" | "plan" = "current",
  makeId: () => string = () => `rec-${Math.random().toString(36).slice(2, 10)}`,
): ProgressRecommendation[] {
  const prescriptions = state.plan.days.flatMap((day) => day.exercises);
  const currentNames = state.currentWorkout.exercises
    .filter((exercise) => !exercise.durationMinutes && exercise.sets.some((set) => set.completed))
    .map((exercise) => exercise.name);
  const planNames = prescriptions.map((exercise) => exercise.name);
  const names = [...new Set(scope === "current" && currentNames.length ? currentNames : planNames)];

  return names.flatMap((exerciseName) => {
    const workoutExercise = state.currentWorkout.exercises.find((exercise) => normalize(exercise.name) === normalize(exerciseName));
    const prescription = prescriptions.find((exercise) => normalize(exercise.name) === normalize(exerciseName));
    const completed = workoutExercise?.sets.filter((set) => {
      if (!set.completed) return false;
      const logged = state.history.find((entry) => entry.setId === set.id);
      return !logged || normalize(logged.exerciseName) === normalize(exerciseName);
    }) ?? [];
    const latestHistory = latestHistoryFor(state.history, exerciseName);
    if (!completed.length && !latestHistory.length) return [];

    const performedSets = completed.length || latestHistory.reduce((sum, entry) => sum + Math.max(1, entry.sets), 0);
    const minimumReps = completed.length ? Math.min(...completed.map((set) => set.actualReps)) : Math.min(...latestHistory.map((entry) => entry.reps));
    const currentWeight = completed.length ? Math.max(...completed.map((set) => set.weight)) : Math.max(...latestHistory.map((entry) => entry.weight));
    if (currentWeight <= 0) return [];
    const targetSets = prescription?.sets ?? workoutExercise?.sets.length ?? performedSets;
    const targetReps = prescription?.reps ?? workoutExercise?.sets[0]?.targetReps ?? minimumReps;
    const efforts = completed.length ? completed.map((set) => set.effort) : latestHistory.map((entry) => entry.effort).filter((value): value is number => value !== undefined);
    const averageEffort = efforts.length ? efforts.reduce((sum, effort) => sum + effort, 0) / efforts.length : 8;
    const allTargetsHit = performedSets >= targetSets && minimumReps >= targetReps;
    const increment = incrementFor(exerciseName, state.athlete.unit);
    const source = completed.length ? "Today" : `Latest history (${latestHistory[0].date})`;
    let suggestedWeight = currentWeight;
    let reason = `${source}: ${performedSets} set${performedSets === 1 ? "" : "s"} at ${currentWeight} ${state.athlete.unit}, with at least ${minimumReps} reps. `;

    if (allTargetsHit && averageEffort <= 8) {
      suggestedWeight = Math.max(currentWeight + increment, prescription?.weight ?? 0);
      reason += `That met the ${targetSets} × ${targetReps} target at a manageable effort, so add ${increment} ${state.athlete.unit}.`;
    } else if (minimumReps < Math.max(1, targetReps - 2)) {
      suggestedWeight = Math.max(0, currentWeight - increment);
      reason += `That was below the ${targetReps}-rep target, so reduce by ${increment} ${state.athlete.unit} and rebuild clean reps.`;
    } else {
      reason += `Repeat ${currentWeight} ${state.athlete.unit} until all ${targetSets} × ${targetReps} reps are consistent.`;
    }

    return [{ id: makeId(), exerciseName, currentWeight, suggestedWeight, reason, status: "pending" as const }];
  });
}

export function applyPendingRecommendations(state: ProgressState, exerciseName?: string, overrideWeight?: number) {
  const requested = exerciseName ? normalize(exerciseName) : "";
  const recommendations = state.recommendations.filter((recommendation) => recommendation.status === "pending" && (!requested || normalize(recommendation.exerciseName) === requested));
  const updates: Array<{ exerciseName: string; previousWeight: number; nextWeight: number; prescriptions: number }> = [];

  for (const recommendation of recommendations) {
    const targets = state.plan.days.flatMap((day) => day.exercises).filter((exercise) => normalize(exercise.name) === normalize(recommendation.exerciseName));
    if (!targets.length) continue;
    const nextWeight = overrideWeight !== undefined && recommendations.length === 1 ? Math.max(0, overrideWeight) : recommendation.suggestedWeight;
    const previousWeight = targets[0].weight;
    targets.forEach((target) => { target.weight = nextWeight; });
    recommendation.suggestedWeight = nextWeight;
    recommendation.status = "accepted";
    updates.push({ exerciseName: recommendation.exerciseName, previousWeight, nextWeight, prescriptions: targets.length });
  }

  return updates;
}
