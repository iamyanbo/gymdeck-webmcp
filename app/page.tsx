"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type View = "today" | "plan" | "progress" | "library";
type Unit = "lb" | "kg";
type WorkoutStatus = "ready" | "active" | "paused" | "completed";

type Athlete = {
  name: string;
  goal: "Strength" | "Muscle gain" | "General fitness" | "Endurance";
  unit: Unit;
  experience: "Beginner" | "Intermediate" | "Advanced";
  equipment: string[];
  weeklyDays: number;
};

type ExerciseDefinition = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  movement: string;
  instructions: string;
  alternatives: string[];
  category?: "strength" | "cardio";
  custom?: boolean;
};

type SetLog = {
  id: string;
  targetReps: number;
  actualReps: number;
  weight: number;
  effort: number;
  completed: boolean;
  note: string;
  durationMinutes?: number;
};

type WorkoutExercise = {
  id: string;
  libraryId: string;
  name: string;
  muscle: string;
  equipment: string;
  restSeconds: number;
  skipped: boolean;
  swapReason?: string;
  durationMinutes?: number;
  sets: SetLog[];
};

type Workout = {
  id: string;
  name: string;
  focus: string;
  date: string;
  status: WorkoutStatus;
  startedAt?: string;
  exercises: WorkoutExercise[];
};

type Prescription = {
  id: string;
  libraryId: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number;
  durationMinutes?: number;
};

type PlanDay = {
  id: string;
  label: string;
  focus: string;
  exercises: Prescription[];
};

type TrainingPlan = {
  id: string;
  name: string;
  goal: string;
  days: PlanDay[];
};

type HistoryEntry = {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
  durationMinutes?: number;
};

type Recommendation = {
  id: string;
  exerciseName: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
  status: "pending" | "accepted" | "ignored";
};

type Activity = {
  id: string;
  source: "Agent" | "You" | "System";
  message: string;
  time: string;
};

type AppState = {
  schemaVersion: 1;
  athlete: Athlete;
  library: ExerciseDefinition[];
  plan: TrainingPlan;
  currentWorkout: Workout;
  history: HistoryEntry[];
  recommendations: Recommendation[];
  activities: Activity[];
};

type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<string> | string;
};

type ModelContext = {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => Promise<void>;
};

const STORAGE_KEY = "gymdeck-workspace-v1";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function shortDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const BASE_LIBRARY: ExerciseDefinition[] = [
  { id: "bench-press", name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell", movement: "Horizontal push", instructions: "Set your shoulder blades, lower with control, and press over mid-chest.", alternatives: ["db-bench", "push-up"] },
  { id: "db-bench", name: "Dumbbell Bench Press", muscle: "Chest", equipment: "Dumbbells", movement: "Horizontal push", instructions: "Keep wrists stacked, lower evenly, and press without bouncing.", alternatives: ["bench-press", "push-up"] },
  { id: "incline-db", name: "Incline Dumbbell Press", muscle: "Upper chest", equipment: "Dumbbells", movement: "Incline push", instructions: "Use a low incline, keep shoulders down, and finish with weights over the chest.", alternatives: ["bench-press", "push-up"] },
  { id: "cable-row", name: "Seated Cable Row", muscle: "Back", equipment: "Cable", movement: "Horizontal pull", instructions: "Brace the torso and pull toward the lower ribs without leaning back.", alternatives: ["chest-row", "one-arm-row"] },
  { id: "chest-row", name: "Chest-Supported Row", muscle: "Back", equipment: "Dumbbells", movement: "Horizontal pull", instructions: "Keep the chest supported and drive elbows toward the hips.", alternatives: ["cable-row", "one-arm-row"] },
  { id: "one-arm-row", name: "One-Arm Dumbbell Row", muscle: "Back", equipment: "Dumbbells", movement: "Horizontal pull", instructions: "Brace with the free arm and pull the dumbbell toward the hip.", alternatives: ["cable-row", "chest-row"] },
  { id: "overhead-press", name: "Standing Overhead Press", muscle: "Shoulders", equipment: "Barbell", movement: "Vertical push", instructions: "Brace the torso, keep the bar close, and finish stacked overhead.", alternatives: ["landmine-press", "lateral-raise"] },
  { id: "landmine-press", name: "Half-Kneeling Landmine Press", muscle: "Shoulders", equipment: "Landmine", movement: "Angled push", instructions: "Stay tall and press up and forward while keeping the ribs down.", alternatives: ["overhead-press", "lateral-raise"] },
  { id: "lateral-raise", name: "Dumbbell Lateral Raise", muscle: "Shoulders", equipment: "Dumbbells", movement: "Shoulder isolation", instructions: "Lift with soft elbows and stop near shoulder height.", alternatives: ["landmine-press", "overhead-press"] },
  { id: "back-squat", name: "Back Squat", muscle: "Quads & glutes", equipment: "Barbell", movement: "Squat", instructions: "Brace before descending and keep pressure through the whole foot.", alternatives: ["goblet-squat", "leg-press"] },
  { id: "goblet-squat", name: "Goblet Squat", muscle: "Quads & glutes", equipment: "Dumbbell", movement: "Squat", instructions: "Hold the weight close, sit between the hips, and stand tall.", alternatives: ["back-squat", "leg-press"] },
  { id: "leg-press", name: "Leg Press", muscle: "Quads & glutes", equipment: "Machine", movement: "Squat", instructions: "Control the depth and keep the lower back supported.", alternatives: ["back-squat", "goblet-squat"] },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscle: "Hamstrings", equipment: "Barbell", movement: "Hinge", instructions: "Push the hips back, keep the bar close, and stop before the back rounds.", alternatives: ["leg-curl", "hip-thrust"] },
  { id: "leg-curl", name: "Seated Leg Curl", muscle: "Hamstrings", equipment: "Machine", movement: "Knee flexion", instructions: "Keep hips anchored and control both directions.", alternatives: ["romanian-deadlift", "hip-thrust"] },
  { id: "hip-thrust", name: "Barbell Hip Thrust", muscle: "Glutes", equipment: "Barbell", movement: "Hip extension", instructions: "Keep the chin tucked and finish with the ribs stacked over the pelvis.", alternatives: ["romanian-deadlift", "leg-curl"] },
  { id: "lat-pulldown", name: "Lat Pulldown", muscle: "Lats", equipment: "Cable", movement: "Vertical pull", instructions: "Pull elbows toward the ribs and avoid swinging backward.", alternatives: ["assisted-pullup", "one-arm-row"] },
  { id: "assisted-pullup", name: "Assisted Pull-Up", muscle: "Lats", equipment: "Machine", movement: "Vertical pull", instructions: "Start from a controlled hang and drive elbows down.", alternatives: ["lat-pulldown", "one-arm-row"] },
  { id: "curl", name: "Dumbbell Curl", muscle: "Biceps", equipment: "Dumbbells", movement: "Elbow flexion", instructions: "Keep elbows quiet and lower through a full range.", alternatives: ["cable-curl"] },
  { id: "cable-curl", name: "Cable Curl", muscle: "Biceps", equipment: "Cable", movement: "Elbow flexion", instructions: "Keep the shoulders still and squeeze at the top.", alternatives: ["curl"] },
  { id: "triceps-extension", name: "Dumbbell Triceps Extension", muscle: "Triceps", equipment: "Dumbbells", movement: "Elbow extension", instructions: "Keep elbows pointed forward and lower the dumbbell with control.", alternatives: ["push-up"] },
  { id: "push-up", name: "Push-Up", muscle: "Chest", equipment: "Bodyweight", movement: "Horizontal push", instructions: "Keep a straight line from shoulders to heels and lower as one unit.", alternatives: ["bench-press", "db-bench"] },
  { id: "treadmill", name: "Treadmill", muscle: "Cardio", equipment: "Treadmill", movement: "Steady-state cardio", instructions: "Choose a sustainable pace, keep posture tall, and ease into the first few minutes.", alternatives: ["stationary-bike", "elliptical"], category: "cardio" },
  { id: "stationary-bike", name: "Stationary Bike", muscle: "Cardio", equipment: "Bike", movement: "Low-impact cardio", instructions: "Set a smooth resistance and maintain a pace you can sustain for the full block.", alternatives: ["treadmill", "elliptical"], category: "cardio" },
  { id: "rowing-machine", name: "Rowing Machine", muscle: "Cardio", equipment: "Rower", movement: "Full-body cardio", instructions: "Drive with the legs, then the torso and arms; return in the reverse order.", alternatives: ["stationary-bike", "treadmill"], category: "cardio" },
  { id: "stair-climber", name: "Stair Climber", muscle: "Cardio", equipment: "Stair machine", movement: "Upright cardio", instructions: "Use a controlled step rhythm and avoid leaning heavily on the rails.", alternatives: ["treadmill", "elliptical"], category: "cardio" },
  { id: "elliptical", name: "Elliptical", muscle: "Cardio", equipment: "Elliptical", movement: "Low-impact cardio", instructions: "Keep an easy, even stride and adjust resistance before starting the block.", alternatives: ["stationary-bike", "treadmill"], category: "cardio" },
];

function createSets(count: number, reps: number, weight: number): SetLog[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `set-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
    targetReps: reps,
    actualReps: reps,
    weight,
    effort: 7,
    completed: false,
    note: "",
  }));
}

function workoutExercise(libraryId: string, name: string, muscle: string, equipment: string, setCount: number, reps: number, weight: number, restSeconds: number): WorkoutExercise {
  return { id: `work-${libraryId}`, libraryId, name, muscle, equipment, restSeconds, skipped: false, sets: createSets(setCount, reps, weight) };
}

function cardioWorkoutExercise(definition: ExerciseDefinition, durationMinutes: number): WorkoutExercise {
  const [cardioSet] = createSets(1, 0, 0);
  return { ...workoutExercise(definition.id, definition.name, definition.muscle, definition.equipment, 1, 0, 0, 0), durationMinutes, sets: [{ ...cardioSet, durationMinutes }] };
}

function buildDemoState(): AppState {
  const planDays: PlanDay[] = [
    { id: "day-upper-a", label: "Day 1", focus: "Upper strength", exercises: [
      { id: "p-bench", libraryId: "bench-press", name: "Barbell Bench Press", sets: 4, reps: 8, weight: 140, restSeconds: 120 },
      { id: "p-row", libraryId: "cable-row", name: "Seated Cable Row", sets: 3, reps: 10, weight: 120, restSeconds: 90 },
      { id: "p-incline", libraryId: "incline-db", name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 50, restSeconds: 90 },
      { id: "p-curl", libraryId: "curl", name: "Dumbbell Curl", sets: 3, reps: 12, weight: 25, restSeconds: 60 },
    ] },
    { id: "day-lower", label: "Day 2", focus: "Lower strength", exercises: [
      { id: "p-squat", libraryId: "back-squat", name: "Back Squat", sets: 4, reps: 6, weight: 185, restSeconds: 150 },
      { id: "p-rdl", libraryId: "romanian-deadlift", name: "Romanian Deadlift", sets: 3, reps: 8, weight: 155, restSeconds: 120 },
      { id: "p-curl-leg", libraryId: "leg-curl", name: "Seated Leg Curl", sets: 3, reps: 12, weight: 90, restSeconds: 75 },
    ] },
    { id: "day-upper-b", label: "Day 3", focus: "Upper volume", exercises: [
      { id: "p-ohp", libraryId: "overhead-press", name: "Standing Overhead Press", sets: 3, reps: 8, weight: 75, restSeconds: 120 },
      { id: "p-pull", libraryId: "lat-pulldown", name: "Lat Pulldown", sets: 3, reps: 10, weight: 110, restSeconds: 90 },
      { id: "p-db-bench", libraryId: "db-bench", name: "Dumbbell Bench Press", sets: 3, reps: 12, weight: 45, restSeconds: 90 },
      { id: "p-lateral", libraryId: "lateral-raise", name: "Dumbbell Lateral Raise", sets: 3, reps: 15, weight: 15, restSeconds: 60 },
    ] },
  ];
  const history: HistoryEntry[] = [
    { id: "h1", date: isoDate(-35), exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 125, reps: 8, sets: 4, volume: 4000 },
    { id: "h2", date: isoDate(-28), exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 130, reps: 8, sets: 4, volume: 4160 },
    { id: "h3", date: isoDate(-21), exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 135, reps: 8, sets: 4, volume: 4320 },
    { id: "h4", date: isoDate(-14), exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 135, reps: 9, sets: 4, volume: 4860 },
    { id: "h5", date: isoDate(-7), exerciseId: "bench-press", exerciseName: "Barbell Bench Press", weight: 140, reps: 8, sets: 4, volume: 4480 },
    { id: "h6", date: isoDate(-6), exerciseId: "back-squat", exerciseName: "Back Squat", weight: 175, reps: 6, sets: 4, volume: 4200 },
    { id: "h7", date: isoDate(-4), exerciseId: "lat-pulldown", exerciseName: "Lat Pulldown", weight: 105, reps: 10, sets: 3, volume: 3150 },
    { id: "h8", date: isoDate(-2), exerciseId: "romanian-deadlift", exerciseName: "Romanian Deadlift", weight: 145, reps: 8, sets: 3, volume: 3480 },
  ];
  return {
    schemaVersion: 1,
    athlete: { name: "Alex", goal: "Strength", unit: "lb", experience: "Intermediate", equipment: ["Barbell", "Dumbbells", "Cable", "Machine"], weeklyDays: 3 },
    library: BASE_LIBRARY,
    plan: { id: "plan-foundation", name: "Foundation 3", goal: "Build strength with repeatable full-gym sessions", days: planDays },
    currentWorkout: { id: "today-upper-a", name: "Upper Strength", focus: "Chest · Back · Arms", date: isoDate(), status: "ready", exercises: [
      workoutExercise("bench-press", "Barbell Bench Press", "Chest", "Barbell", 4, 8, 140, 120),
      workoutExercise("cable-row", "Seated Cable Row", "Back", "Cable", 3, 10, 120, 90),
      workoutExercise("incline-db", "Incline Dumbbell Press", "Upper chest", "Dumbbells", 3, 10, 50, 90),
      workoutExercise("curl", "Dumbbell Curl", "Biceps", "Dumbbells", 3, 12, 25, 60),
    ] },
    history,
    recommendations: [{ id: "rec-bench", exerciseName: "Barbell Bench Press", currentWeight: 140, suggestedWeight: 145, reason: "You completed 4 × 8 at 140 lb last week with consistent reps.", status: "pending" }],
    activities: [
      { id: "a1", source: "Agent", message: "Prepared today’s Upper Strength session from Foundation 3.", time: "8:42 AM" },
      { id: "a2", source: "System", message: "Your workout history is stored privately on this device.", time: "8:41 AM" },
    ],
  };
}

function prescriptionToWorkoutExercise(prescription: Prescription, library: ExerciseDefinition[]): WorkoutExercise {
  const definition = library.find((item) => item.id === prescription.libraryId);
  if (prescription.durationMinutes) return cardioWorkoutExercise(definition ?? { id: prescription.libraryId, name: prescription.name, muscle: "Cardio", equipment: "Cardio machine", movement: "Cardio", instructions: "", alternatives: [], category: "cardio" }, prescription.durationMinutes);
  return workoutExercise(prescription.libraryId, prescription.name, definition?.muscle ?? "Custom", definition?.equipment ?? "Other", prescription.sets, prescription.reps, prescription.weight, prescription.restSeconds);
}

function currentTime() { return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function completedSetCount(workout: Workout) { return workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0); }
function totalSetCount(workout: Workout) { return workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0); }
function totalVolume(history: HistoryEntry[]) { return history.reduce((total, item) => total + item.volume, 0); }

function buildRecommendations(state: AppState): Recommendation[] {
  return state.currentWorkout.exercises.filter((exercise) => !exercise.durationMinutes && !exercise.skipped && exercise.sets.some((set) => set.completed)).map((exercise) => {
    const completed = exercise.sets.filter((set) => set.completed);
    const allTargetsHit = completed.length === exercise.sets.length && completed.every((set) => set.actualReps >= set.targetReps);
    const averageEffort = completed.reduce((sum, set) => sum + set.effort, 0) / completed.length;
    const currentWeight = Math.max(...completed.map((set) => set.weight));
    const isLowerCompound = /squat|deadlift|leg press|hip thrust/i.test(exercise.name);
    const increment = state.athlete.unit === "kg" ? (isLowerCompound ? 5 : 2.5) : (isLowerCompound ? 10 : 5);
    return {
      id: uid("rec"), exerciseName: exercise.name, currentWeight,
      suggestedWeight: allTargetsHit && averageEffort <= 8 ? currentWeight + increment : currentWeight,
      reason: allTargetsHit && averageEffort <= 8 ? `All prescribed reps were completed at an average effort of ${averageEffort.toFixed(1)}/10.` : "Keep the current load until every prescribed rep is completed consistently.",
      status: "pending" as const,
    };
  });
}

export default function Home() {
  const [state, setState] = useState<AppState>(() => buildDemoState());
  const stateRef = useRef(state);
  const undoStack = useRef<AppState[]>([]);
  const importInput = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("today");
  const [expandedExercise, setExpandedExercise] = useState<string>("work-bench-press");
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [swapChoice, setSwapChoice] = useState("");
  const [swapReason, setSwapReason] = useState("Equipment unavailable");
  const [profileOpen, setProfileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [customExerciseOpen, setCustomExerciseOpen] = useState(false);
  const [customExercise, setCustomExercise] = useState({ name: "", muscle: "", equipment: "" });
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [webMcpStatus, setWebMcpStatus] = useState<"unavailable" | "registering" | "ready">("unavailable");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppState;
        if (parsed.schemaVersion === 1) { stateRef.current = parsed; setState(parsed); }
      } catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const interval = window.setInterval(() => setTimerSeconds((seconds) => {
      if (seconds <= 1) { setTimerRunning(false); return 0; }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const commit = useCallback((message: string, source: Activity["source"], recipe: (draft: AppState) => void) => {
    const previous = stateRef.current;
    undoStack.current = [...undoStack.current.slice(-9), previous];
    const next = structuredClone(previous);
    recipe(next);
    next.activities.unshift({ id: uid("activity"), source, message, time: currentTime() });
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const updateQuietly = useCallback((recipe: (draft: AppState) => void) => {
    const next = structuredClone(stateRef.current);
    recipe(next);
    stateRef.current = next;
    setState(next);
  }, []);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    const restored = structuredClone(previous);
    restored.activities.unshift({ id: uid("activity"), source: "System", message: "Undid the most recent change.", time: currentTime() });
    stateRef.current = restored;
    setState(restored);
  }, []);

  const logSetById = useCallback((exerciseId: string, setIndex: number, source: Activity["source"] = "You") => {
    const exercise = stateRef.current.currentWorkout.exercises.find((item) => item.id === exerciseId);
    const set = exercise?.sets[setIndex];
    if (!exercise || !set) return;
    const action = set.completed ? "Reopened" : "Logged";
    const next = commit(`${action} set ${setIndex + 1} of ${exercise.name}.`, source, (draft) => {
      const target = draft.currentWorkout.exercises.find((item) => item.id === exerciseId);
      if (!target) return;
      const targetSet = target.sets[setIndex];
      targetSet.completed = !targetSet.completed;
      if (targetSet.completed) {
        draft.currentWorkout.status = "active";
        draft.currentWorkout.startedAt ||= new Date().toISOString();
        draft.history.push({ id: uid("history"), date: draft.currentWorkout.date, exerciseId: target.libraryId, exerciseName: target.name, weight: targetSet.weight, reps: targetSet.actualReps, sets: 1, volume: targetSet.weight * targetSet.actualReps, durationMinutes: target.durationMinutes });
      } else {
        const historyIndex = [...draft.history].reverse().findIndex((entry) => entry.date === draft.currentWorkout.date && entry.exerciseName === target.name && entry.weight === targetSet.weight && entry.reps === targetSet.actualReps);
        if (historyIndex >= 0) draft.history.splice(draft.history.length - 1 - historyIndex, 1);
      }
    });
    const updated = next.currentWorkout.exercises.find((item) => item.id === exerciseId)?.sets[setIndex];
    if (updated?.completed) { setTimerSeconds(exercise.restSeconds); setTimerRunning(true); }
  }, [commit]);

  const swapExercise = useCallback((exerciseId: string, replacementId: string, reason: string, source: Activity["source"] = "You") => {
    const before = stateRef.current.currentWorkout.exercises.find((item) => item.id === exerciseId);
    const replacement = stateRef.current.library.find((item) => item.id === replacementId);
    if (!before || !replacement) return null;
    const next = commit(`Replaced ${before.name} with ${replacement.name}${reason ? ` — ${reason}` : ""}.`, source, (draft) => {
      const target = draft.currentWorkout.exercises.find((item) => item.id === exerciseId);
      if (!target) return;
      target.libraryId = replacement.id; target.name = replacement.name; target.muscle = replacement.muscle; target.equipment = replacement.equipment; target.swapReason = reason; target.skipped = false;
    });
    setSwapExerciseId(null); setSwapChoice("");
    return next;
  }, [commit]);

  const addExerciseToWorkout = useCallback((definition: ExerciseDefinition, source: Activity["source"] = "You", sets = 3, reps = 10, weight = 0) => {
    const isCardio = definition.category === "cardio";
    return commit(`Added ${isCardio ? "a 20 min " : ""}${definition.name} ${isCardio ? "cardio block" : "to today’s workout"}.`, source, (draft) => {
      draft.currentWorkout.exercises.push(isCardio ? cardioWorkoutExercise(definition, 20) : workoutExercise(definition.id, definition.name, definition.muscle, definition.equipment, sets, reps, weight, 75));
    });
  }, [commit]);

  useEffect(() => {
    const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext;
    if (!modelContext) { setWebMcpStatus("unavailable"); return; }
    setWebMcpStatus("registering");
    const controller = new AbortController();
    const readOnly = { readOnlyHint: true, untrustedContentHint: false };
    const write = { readOnlyHint: false, untrustedContentHint: false };
    const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
    const tools: ModelContextTool[] = [
      { name: "get_athlete_profile", title: "Get athlete profile", description: "Read the current GymDeck athlete profile, training goal, units, experience, equipment, and weekly schedule.", inputSchema: objectSchema({}), annotations: readOnly, execute: async () => JSON.stringify(stateRef.current.athlete) },
      { name: "get_today_workout", title: "Get today’s workout", description: "Read today’s workout, including exercise order, target and completed sets, reps, weights, rest times, and status.", inputSchema: objectSchema({}), annotations: readOnly, execute: async () => JSON.stringify(stateRef.current.currentWorkout) },
      { name: "search_exercises", title: "Search exercises", description: "Search GymDeck’s exercise library by name, muscle, movement, or equipment before adding or swapping an exercise.", inputSchema: objectSchema({ query: { type: "string", description: "Exercise, muscle, movement, or equipment to search for." } }, ["query"]), annotations: readOnly, execute: async ({ query }) => {
        const term = String(query).toLowerCase();
        return JSON.stringify(stateRef.current.library.filter((item) => [item.name, item.muscle, item.equipment, item.movement].some((value) => value.toLowerCase().includes(term))));
      } },
      { name: "get_exercise_history", title: "Get exercise history", description: "Read the athlete’s recorded performance history for one exercise, ordered by date.", inputSchema: objectSchema({ exerciseName: { type: "string" } }, ["exerciseName"]), annotations: readOnly, execute: async ({ exerciseName }) => JSON.stringify(stateRef.current.history.filter((entry) => entry.exerciseName.toLowerCase().includes(String(exerciseName).toLowerCase()))) },
      { name: "create_training_plan", title: "Create training plan", description: "Create a new 2–5 day training plan using GymDeck’s exercise library. This replaces the current plan but not workout history.", inputSchema: objectSchema({ name: { type: "string" }, goal: { type: "string" }, daysPerWeek: { type: "integer", minimum: 2, maximum: 5 } }, ["name", "goal", "daysPerWeek"]), annotations: write, execute: async ({ name, goal, daysPerWeek }) => {
        const count = Math.max(2, Math.min(5, Number(daysPerWeek)));
        const splits = [["bench-press", "cable-row", "incline-db", "curl"], ["back-squat", "romanian-deadlift", "leg-curl"], ["overhead-press", "lat-pulldown", "db-bench", "lateral-raise"], ["leg-press", "hip-thrust", "goblet-squat"], ["push-up", "one-arm-row", "landmine-press", "cable-curl"]];
        commit(`Agent created the ${String(name)} training plan.`, "Agent", (draft) => {
          draft.plan = { id: uid("plan"), name: String(name), goal: String(goal), days: Array.from({ length: count }, (_, index) => ({ id: uid("day"), label: `Day ${index + 1}`, focus: index % 2 === 0 ? "Upper body" : "Lower body", exercises: splits[index].map((id) => { const item = draft.library.find((exercise) => exercise.id === id)!; return { id: uid("prescription"), libraryId: item.id, name: item.name, sets: 3, reps: 8, weight: 0, restSeconds: 90 }; }) })) };
        });
        return `Created ${String(name)} with ${count} training days.`;
      } },
      { name: "add_workout_day", title: "Add focused workout day", description: "Add a focused workout day directly to the active plan. Use this when someone asks for a day such as shoulders and arms, push, pull, legs, or upper body. It selects relevant exercises from GymDeck’s library, updates the visible plan, and records the change.", inputSchema: objectSchema({ focus: { type: "string", description: "The requested workout focus, such as 'shoulders and arms'." }, label: { type: "string", description: "Optional short label for the workout day." } }, ["focus"]), annotations: write, execute: async ({ focus, label }) => {
        const requestedFocus = String(focus).trim();
        const normalizedFocus = requestedFocus.toLowerCase();
        const presets = normalizedFocus.includes("shoulder") || normalizedFocus.includes("arm")
          ? [
              { id: "overhead-press", sets: 3, reps: 8, weight: 65, restSeconds: 120 },
              { id: "lateral-raise", sets: 3, reps: 15, weight: 15, restSeconds: 60 },
              { id: "curl", sets: 3, reps: 12, weight: 25, restSeconds: 60 },
              { id: "triceps-extension", sets: 3, reps: 12, weight: 20, restSeconds: 60 },
            ]
          : normalizedFocus.includes("leg") || normalizedFocus.includes("lower")
            ? [
                { id: "back-squat", sets: 3, reps: 8, weight: 135, restSeconds: 120 },
                { id: "romanian-deadlift", sets: 3, reps: 10, weight: 115, restSeconds: 120 },
                { id: "leg-curl", sets: 3, reps: 12, weight: 90, restSeconds: 75 },
              ]
            : normalizedFocus.includes("pull") || normalizedFocus.includes("back")
              ? [
                  { id: "chest-row", sets: 3, reps: 10, weight: 50, restSeconds: 90 },
                  { id: "lat-pulldown", sets: 3, reps: 10, weight: 100, restSeconds: 90 },
                  { id: "curl", sets: 3, reps: 12, weight: 25, restSeconds: 60 },
                ]
              : [
                  { id: "bench-press", sets: 3, reps: 8, weight: 135, restSeconds: 120 },
                  { id: "one-arm-row", sets: 3, reps: 10, weight: 45, restSeconds: 90 },
                  { id: "lateral-raise", sets: 3, reps: 15, weight: 15, restSeconds: 60 },
                ];
        const dayLabel = String(label ?? "").trim() || `Day ${stateRef.current.plan.days.length + 1}`;
        const dayFocus = requestedFocus || "Focused training";
        let addedExercises: string[] = [];
        commit(`Agent added ${dayFocus} to ${stateRef.current.plan.name}.`, "Agent", (draft) => {
          const exercises = presets.map((prescription) => {
            const exercise = draft.library.find((item) => item.id === prescription.id)!;
            return { id: uid("prescription"), libraryId: exercise.id, name: exercise.name, sets: prescription.sets, reps: prescription.reps, weight: prescription.weight, restSeconds: prescription.restSeconds };
          });
          addedExercises = exercises.map((exercise) => exercise.name);
          draft.plan.days.push({ id: uid("day"), label: dayLabel, focus: dayFocus, exercises });
        });
        return `Added ${dayFocus} as ${dayLabel}: ${addedExercises.join(", ")}.`;
      } },
      { name: "add_cardio_block", title: "Add timed cardio", description: "Add a timed cardio block after today’s strength work. Use this when someone says they want 20 minutes of cardio and specifies or needs to choose a treadmill, stationary bike, rowing machine, stair climber, or elliptical. Cardio is logged as duration, not fake reps or weight.", inputSchema: objectSchema({ machine: { type: "string", enum: ["Treadmill", "Stationary Bike", "Rowing Machine", "Stair Climber", "Elliptical"], description: "The cardio machine to use." }, durationMinutes: { type: "integer", minimum: 5, maximum: 180, description: "Planned cardio duration in minutes." }, destination: { type: "string", enum: ["today", "plan"], description: "Add to the end of today’s workout (default) or the newest plan day." } }, ["machine", "durationMinutes"]), annotations: write, execute: async ({ machine, durationMinutes, destination }) => {
        const definition = stateRef.current.library.find((item) => item.category === "cardio" && item.name.toLowerCase() === String(machine).toLowerCase());
        const minutes = Math.round(Number(durationMinutes));
        if (!definition || !Number.isFinite(minutes) || minutes < 5 || minutes > 180) return "Choose a supported cardio machine and a duration from 5 to 180 minutes.";
        const target = String(destination ?? "today");
        commit(`Agent added ${minutes} min of ${definition.name} cardio after the strength work.`, "Agent", (draft) => {
          if (target === "plan") {
            const day = draft.plan.days.at(-1);
            if (!day) return;
            day.exercises.push({ id: uid("prescription"), libraryId: definition.id, name: definition.name, sets: 1, reps: 0, weight: 0, restSeconds: 0, durationMinutes: minutes });
          } else {
            draft.currentWorkout.exercises.push(cardioWorkoutExercise(definition, minutes));
          }
        });
        return `Added ${minutes} minutes of ${definition.name} ${target === "plan" ? "to the end of the newest plan day" : "after today’s strength work"}.`;
      } },
      { name: "add_exercise", title: "Add exercise", description: "Add an exercise from the GymDeck library to today’s workout with a target prescription.", inputSchema: objectSchema({ exerciseName: { type: "string" }, sets: { type: "integer", minimum: 1, maximum: 10 }, reps: { type: "integer", minimum: 1, maximum: 100 }, weight: { type: "number", minimum: 0 } }, ["exerciseName", "sets", "reps", "weight"]), annotations: write, execute: async ({ exerciseName, sets, reps, weight }) => {
        const definition = stateRef.current.library.find((item) => item.name.toLowerCase() === String(exerciseName).toLowerCase());
        if (!definition) return `Exercise not found: ${String(exerciseName)}. Use search_exercises first.`;
        if (definition.category === "cardio") return "Use add_cardio_block for a timed cardio session so GymDeck records minutes instead of reps and weight.";
        addExerciseToWorkout(definition, "Agent", Number(sets), Number(reps), Number(weight));
        return `Added ${definition.name}: ${Number(sets)} sets × ${Number(reps)} reps at ${Number(weight)} ${stateRef.current.athlete.unit}.`;
      } },
      { name: "update_exercise_prescription", title: "Update exercise prescription", description: "Change the target sets, reps, weight, or rest time for an exercise in today’s workout.", inputSchema: objectSchema({ exerciseName: { type: "string" }, sets: { type: "integer", minimum: 1, maximum: 10 }, reps: { type: "integer", minimum: 1, maximum: 100 }, weight: { type: "number", minimum: 0 }, restSeconds: { type: "integer", minimum: 15, maximum: 600 } }, ["exerciseName"]), annotations: write, execute: async ({ exerciseName, sets, reps, weight, restSeconds }) => {
        const target = stateRef.current.currentWorkout.exercises.find((item) => item.name.toLowerCase() === String(exerciseName).toLowerCase());
        if (!target) return `Exercise not found in today’s workout: ${String(exerciseName)}.`;
        commit(`Agent updated the prescription for ${target.name}.`, "Agent", (draft) => {
          const exercise = draft.currentWorkout.exercises.find((item) => item.id === target.id)!;
          if (sets !== undefined && Number(sets) !== exercise.sets.length) {
            const desired = Number(sets);
            if (desired > exercise.sets.length) exercise.sets.push(...createSets(desired - exercise.sets.length, Number(reps ?? exercise.sets[0]?.targetReps ?? 8), Number(weight ?? exercise.sets[0]?.weight ?? 0)));
            else exercise.sets = exercise.sets.slice(0, desired);
          }
          exercise.sets.forEach((set) => { if (reps !== undefined) { set.targetReps = Number(reps); if (!set.completed) set.actualReps = Number(reps); } if (weight !== undefined && !set.completed) set.weight = Number(weight); });
          if (restSeconds !== undefined) exercise.restSeconds = Number(restSeconds);
        });
        return `Updated ${target.name}.`;
      } },
      { name: "swap_exercise", title: "Swap exercise", description: "Replace an exercise in today’s workout while preserving completed set history and recording the reason.", inputSchema: objectSchema({ currentExercise: { type: "string" }, replacementExercise: { type: "string" }, reason: { type: "string" } }, ["currentExercise", "replacementExercise", "reason"]), annotations: write, execute: async ({ currentExercise, replacementExercise, reason }) => {
        const existing = stateRef.current.currentWorkout.exercises.find((item) => item.name.toLowerCase() === String(currentExercise).toLowerCase());
        const replacement = stateRef.current.library.find((item) => item.name.toLowerCase() === String(replacementExercise).toLowerCase());
        if (!existing || !replacement) return "Could not find the current or replacement exercise. Use get_today_workout and search_exercises first.";
        swapExercise(existing.id, replacement.id, String(reason), "Agent");
        return `Replaced ${existing.name} with ${replacement.name}. Completed sets were preserved.`;
      } },
      { name: "log_set", title: "Log completed set", description: "Record one completed set in today’s workout using the actual reps, weight, and optional effort rating.", inputSchema: objectSchema({ exerciseName: { type: "string" }, setNumber: { type: "integer", minimum: 1 }, reps: { type: "integer", minimum: 0, maximum: 100 }, weight: { type: "number", minimum: 0 }, effort: { type: "integer", minimum: 1, maximum: 10 } }, ["exerciseName", "setNumber", "reps", "weight"]), annotations: write, execute: async ({ exerciseName, setNumber, reps, weight, effort }) => {
        const exercise = stateRef.current.currentWorkout.exercises.find((item) => item.name.toLowerCase() === String(exerciseName).toLowerCase());
        const index = Number(setNumber) - 1;
        if (!exercise || !exercise.sets[index]) return "Exercise or set not found in today’s workout.";
        updateQuietly((draft) => { const set = draft.currentWorkout.exercises.find((item) => item.id === exercise.id)!.sets[index]; set.actualReps = Number(reps); set.weight = Number(weight); if (effort !== undefined) set.effort = Number(effort); });
        logSetById(exercise.id, index, "Agent");
        return `Logged set ${Number(setNumber)} of ${exercise.name}: ${Number(reps)} reps at ${Number(weight)} ${stateRef.current.athlete.unit}.`;
      } },
      { name: "edit_set", title: "Edit logged set", description: "Correct reps, weight, effort, or notes for a set in today’s workout without changing its completion status.", inputSchema: objectSchema({ exerciseName: { type: "string" }, setNumber: { type: "integer", minimum: 1 }, reps: { type: "integer", minimum: 0, maximum: 100 }, weight: { type: "number", minimum: 0 }, effort: { type: "integer", minimum: 1, maximum: 10 }, note: { type: "string" } }, ["exerciseName", "setNumber"]), annotations: write, execute: async ({ exerciseName, setNumber, reps, weight, effort, note }) => {
        const exercise = stateRef.current.currentWorkout.exercises.find((item) => item.name.toLowerCase() === String(exerciseName).toLowerCase());
        const index = Number(setNumber) - 1;
        if (!exercise || !exercise.sets[index]) return "Exercise or set not found in today’s workout.";
        commit(`Agent edited set ${Number(setNumber)} of ${exercise.name}.`, "Agent", (draft) => { const set = draft.currentWorkout.exercises.find((item) => item.id === exercise.id)!.sets[index]; if (reps !== undefined) set.actualReps = Number(reps); if (weight !== undefined) set.weight = Number(weight); if (effort !== undefined) set.effort = Number(effort); if (note !== undefined) set.note = String(note); });
        return `Updated set ${Number(setNumber)} of ${exercise.name}.`;
      } },
      { name: "adjust_current_workout", title: "Adjust current workout", description: "Adapt today’s remaining workout by shortening it, skipping an exercise, adding a set, or moving an exercise in the order.", inputSchema: objectSchema({ action: { type: "string", enum: ["shorten", "skip", "add_set", "move"] }, exerciseName: { type: "string" }, targetMinutes: { type: "integer", minimum: 5, maximum: 180 }, position: { type: "integer", minimum: 1 }, reason: { type: "string" } }, ["action"]), annotations: write, execute: async ({ action, exerciseName, targetMinutes, position, reason }) => {
        const actionName = String(action);
        commit(`Agent adjusted today’s workout: ${actionName.replace("_", " ")}${reason ? ` — ${String(reason)}` : ""}.`, "Agent", (draft) => {
          const exercise = draft.currentWorkout.exercises.find((item) => item.name.toLowerCase() === String(exerciseName ?? "").toLowerCase());
          if (actionName === "skip" && exercise) exercise.skipped = true;
          if (actionName === "add_set" && exercise) { const base = exercise.sets.at(-1) ?? createSets(1, 10, 0)[0]; exercise.sets.push({ ...base, id: uid("set"), completed: false }); }
          if (actionName === "move" && exercise) { const from = draft.currentWorkout.exercises.findIndex((item) => item.id === exercise.id); const [moved] = draft.currentWorkout.exercises.splice(from, 1); draft.currentWorkout.exercises.splice(Math.max(0, Math.min(draft.currentWorkout.exercises.length, Number(position ?? 1) - 1)), 0, moved); }
          if (actionName === "shorten") { const targetSets = Math.max(3, Math.floor(Number(targetMinutes ?? 20) / 3)); let remaining = targetSets; draft.currentWorkout.exercises.forEach((item) => { const completed = item.sets.filter((set) => set.completed); const pending = item.sets.filter((set) => !set.completed).slice(0, Math.max(0, remaining)); item.sets = [...completed, ...pending]; remaining -= pending.length; if (remaining <= 0 && completed.length === 0) item.skipped = true; }); }
        });
        return `Adjusted today’s workout with action: ${actionName}${targetMinutes ? ` for a ${Number(targetMinutes)} minute target` : ""}.`;
      } },
      { name: "get_progress_summary", title: "Get progress summary", description: "Read overall training volume, workout completion, current personal records, consistency, and recent performance.", inputSchema: objectSchema({}), annotations: readOnly, execute: async () => {
        const current = stateRef.current;
        const prs = Object.values(current.history.filter((entry) => !entry.durationMinutes).reduce<Record<string, HistoryEntry>>((acc, entry) => { if (!acc[entry.exerciseName] || entry.weight > acc[entry.exerciseName].weight) acc[entry.exerciseName] = entry; return acc; }, {}));
        return JSON.stringify({ totalVolume: totalVolume(current.history), cardioMinutes: current.history.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0), unit: current.athlete.unit, loggedSets: current.history.reduce((sum, item) => sum + item.sets, 0), trainingDays: new Set(current.history.map((item) => item.date)).size, personalRecords: prs });
      } },
      { name: "recommend_next_session", title: "Recommend next session", description: "Calculate and save transparent load recommendations from the completed sets in today’s workout.", inputSchema: objectSchema({}), annotations: write, execute: async () => {
        const recommendations = buildRecommendations(stateRef.current);
        commit("Agent reviewed today’s performance and prepared next-session recommendations.", "Agent", (draft) => { draft.recommendations = recommendations; });
        return recommendations.length ? JSON.stringify(recommendations) : "Complete at least one set before requesting recommendations.";
      } },
      { name: "get_weekly_summary", title: "Get weekly summary", description: "Summarize the athlete’s last seven days of training, volume, exercises, and notable progress.", inputSchema: objectSchema({}), annotations: readOnly, execute: async () => {
        const cutoff = isoDate(-7); const entries = stateRef.current.history.filter((entry) => entry.date >= cutoff);
        return JSON.stringify({ period: `${cutoff} to ${isoDate()}`, loggedSets: entries.reduce((sum, item) => sum + item.sets, 0), totalVolume: totalVolume(entries), cardioMinutes: entries.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0), exercises: [...new Set(entries.map((item) => item.exerciseName))], topSet: entries.sort((a, b) => b.weight - a.weight)[0] ?? null });
      } },
    ];
    Promise.allSettled(tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal }))).then((results) => setWebMcpStatus(results.every((result) => result.status === "fulfilled") ? "ready" : "unavailable"));
    return () => controller.abort();
  }, [addExerciseToWorkout, commit, logSetById, swapExercise, updateQuietly]);

  const currentWorkout = state.currentWorkout;
  const completedSets = completedSetCount(currentWorkout);
  const allSets = totalSetCount(currentWorkout);
  const completion = allSets ? Math.round((completedSets / allSets) * 100) : 0;
  const benchHistory = useMemo(() => state.history.filter((entry) => entry.exerciseId === "bench-press").reduce<HistoryEntry[]>((points, entry) => { const existing = points.find((point) => point.date === entry.date); if (!existing) points.push(entry); else if (entry.weight > existing.weight) Object.assign(existing, entry); return points; }, []).slice(-7), [state.history]);
  const maxBench = Math.max(1, ...benchHistory.map((entry) => entry.weight));
  const filteredLibrary = state.library.filter((exercise) => [exercise.name, exercise.muscle, exercise.equipment, exercise.movement].some((value) => value.toLowerCase().includes(libraryQuery.toLowerCase())));

  const openSwap = (exercise: WorkoutExercise) => {
    setSwapExerciseId(exercise.id);
    const definition = state.library.find((item) => item.id === exercise.libraryId);
    setSwapChoice(definition?.alternatives[0] ?? state.library.find((item) => item.id !== exercise.libraryId)?.id ?? "");
  };

  const updateSet = (exerciseId: string, setIndex: number, field: "actualReps" | "weight" | "effort" | "note", value: string | number) => updateQuietly((draft) => {
    const set = draft.currentWorkout.exercises.find((item) => item.id === exerciseId)?.sets[setIndex];
    if (!set) return;
    if (field === "note") set.note = String(value); else set[field] = Number(value);
  });

  const startOrPauseWorkout = () => {
    const nextStatus: WorkoutStatus = currentWorkout.status === "active" ? "paused" : "active";
    commit(nextStatus === "paused" ? "Paused today’s workout." : "Started today’s workout.", "You", (draft) => { draft.currentWorkout.status = nextStatus; draft.currentWorkout.startedAt ||= new Date().toISOString(); });
  };
  const finishWorkout = () => { const recs = buildRecommendations(stateRef.current); commit(`Finished ${currentWorkout.name} with ${completedSets} logged sets.`, "You", (draft) => { draft.currentWorkout.status = "completed"; draft.recommendations = recs; }); setView("progress"); };
  const startPlanDay = (day: PlanDay) => { commit(`Loaded ${day.focus} as today’s workout.`, "You", (draft) => { draft.currentWorkout = { id: uid("workout"), name: day.focus, focus: day.exercises.map((item) => draft.library.find((entry) => entry.id === item.libraryId)?.muscle).filter(Boolean).slice(0, 3).join(" · "), date: isoDate(), status: "ready", exercises: day.exercises.map((item) => prescriptionToWorkoutExercise(item, draft.library)) }; }); setView("today"); };
  const addPlanDay = () => commit("Added a new training day to the plan.", "You", (draft) => { const starter = draft.library.find((item) => item.id === "goblet-squat")!; draft.plan.days.push({ id: uid("day"), label: `Day ${draft.plan.days.length + 1}`, focus: "New training day", exercises: [{ id: uid("prescription"), libraryId: starter.id, name: starter.name, sets: 3, reps: 10, weight: 0, restSeconds: 90 }] }); });
  const addCustomExercise = () => {
    if (!customExercise.name.trim()) return;
    const definition: ExerciseDefinition = { id: uid("custom"), name: customExercise.name.trim(), muscle: customExercise.muscle.trim() || "Custom", equipment: customExercise.equipment.trim() || "Other", movement: "Custom movement", instructions: "Use your preferred setup and controlled technique.", alternatives: [], custom: true };
    commit(`Created custom exercise ${definition.name}.`, "You", (draft) => { draft.library.unshift(definition); });
    setCustomExercise({ name: "", muscle: "", equipment: "" }); setCustomExerciseOpen(false);
  };
  const exportData = () => { const blob = new Blob([JSON.stringify(stateRef.current, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `gymdeck-${isoDate()}.json`; anchor.click(); URL.revokeObjectURL(url); };
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const parsed = JSON.parse(await file.text()) as AppState; if (parsed.schemaVersion !== 1) throw new Error(); parsed.activities.unshift({ id: uid("activity"), source: "System", message: "Imported a GymDeck workspace.", time: currentTime() }); stateRef.current = parsed; setState(parsed); } catch { window.alert("That file is not a valid GymDeck export."); }
    event.target.value = "";
  };
  const resetDemo = () => { if (!window.confirm("Reset GymDeck and reload the demo athlete? Your current local data will be replaced.")) return; const demo = buildDemoState(); stateRef.current = demo; undoStack.current = []; setState(demo); setProfileOpen(false); setView("today"); };
  const acceptRecommendation = (id: string) => { const recommendation = state.recommendations.find((item) => item.id === id); if (!recommendation) return; commit(`Accepted ${recommendation.suggestedWeight} ${state.athlete.unit} for ${recommendation.exerciseName} next session.`, "You", (draft) => { const target = draft.plan.days.flatMap((day) => day.exercises).find((item) => item.name === recommendation.exerciseName); if (target) target.weight = recommendation.suggestedWeight; const stored = draft.recommendations.find((item) => item.id === id); if (stored) stored.status = "accepted"; }); };

  if (!hydrated) return <main className="loading-shell"><div className="loading-mark">GD</div><p>Loading your training workspace…</p></main>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("today")} aria-label="GymDeck home"><span className="brand-mark">GD</span><span><strong>GymDeck</strong><small>Train with memory</small></span></button>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavButton active={view === "today"} icon="⌁" label="Today" onClick={() => setView("today")} />
          <NavButton active={view === "plan"} icon="▤" label="My plan" onClick={() => setView("plan")} />
          <NavButton active={view === "progress"} icon="↗" label="Progress" onClick={() => setView("progress")} />
          <NavButton active={view === "library"} icon="＋" label="Exercises" onClick={() => setView("library")} />
        </nav>
        <div className="sidebar-bottom">
          <div className={`agent-status ${webMcpStatus}`}><span className="status-dot" /><div><strong>{webMcpStatus === "ready" ? "Ready when you are" : webMcpStatus === "registering" ? "Connecting tools" : "Browser mode"}</strong><small>{webMcpStatus === "ready" ? "16 WebMCP tools live" : "Tools activate in WebMCP"}</small></div></div>
          <button className="profile-card" onClick={() => setProfileOpen(true)}><span className="avatar">{state.athlete.name.slice(0, 1).toUpperCase()}</span><span><strong>{state.athlete.name}</strong><small>{state.athlete.goal} · {state.athlete.experience}</small></span><span className="chevron">›</span></button>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">GD</span><strong>GymDeck</strong></div>
          <div className="topbar-copy"><span className="eyebrow">{formatDate(isoDate())}</span><strong>{view === "today" ? "Ready when you are" : view === "plan" ? state.plan.name : view === "progress" ? "Your progress" : "Exercise library"}</strong></div>
          <div className="topbar-actions"><span className="local-pill"><span>●</span> Saved on device</span><button className="icon-button" onClick={() => setActivityOpen(true)} aria-label="Open agent activity">⌁<span className="notification-dot" /></button><button className="avatar-button" onClick={() => setProfileOpen(true)} aria-label="Open athlete profile">{state.athlete.name.slice(0, 1).toUpperCase()}</button></div>
        </header>
        {view === "today" && <div className="page-content today-layout">
          <section className="today-main">
            <div className="workout-hero">
              <div><span className="hero-kicker">TODAY’S SESSION</span><h1>{currentWorkout.name}</h1><p>{currentWorkout.focus} <span>•</span> {currentWorkout.exercises.length} exercises <span>•</span> ~52 min</p></div>
              <div className="hero-actions"><button className="secondary-button" onClick={startOrPauseWorkout}>{currentWorkout.status === "active" ? "Pause" : currentWorkout.status === "paused" ? "Resume" : "Start workout"}</button><button className="primary-button" onClick={finishWorkout} disabled={completedSets === 0}>Finish session <span>→</span></button></div>
              <div className="progress-strip"><div><span>{completedSets} of {allSets} sets</span><strong>{completion}%</strong></div><div className="progress-track"><span style={{ width: `${completion}%` }} /></div></div>
            </div>
            <div className="section-heading"><div><span className="eyebrow">WORKOUT</span><h2>Move through your sets</h2></div><button className="text-button" onClick={() => setView("library")}>＋ Add exercise</button></div>
            <div className="exercise-list">
              {currentWorkout.exercises.map((exercise, exerciseIndex) => {
                const complete = exercise.sets.filter((set) => set.completed).length; const expanded = expandedExercise === exercise.id;
                return <article className={`exercise-card ${expanded ? "expanded" : ""} ${exercise.skipped ? "skipped" : ""}`} key={exercise.id}>
                  <button className="exercise-summary" onClick={() => setExpandedExercise(expanded ? "" : exercise.id)}><span className="exercise-order">{String(exerciseIndex + 1).padStart(2, "0")}</span><span className="exercise-copy"><strong>{exercise.name}</strong><small>{exercise.muscle} · {exercise.equipment}{exercise.swapReason ? ` · Swapped: ${exercise.swapReason}` : ""}</small></span><span className="set-count">{exercise.durationMinutes ? `${exercise.durationMinutes} min` : `${complete}/${exercise.sets.length} sets`}</span><span className={`expand-icon ${expanded ? "open" : ""}`}>⌄</span></button>
                  {expanded && <div className="exercise-detail">
                    {exercise.durationMinutes ? <div className="cardio-detail"><span className="eyebrow">CARDIO BLOCK</span><strong>{exercise.durationMinutes} minutes on the {exercise.name}</strong><p>Log it when you finish. Your duration stays in the workout history without being treated as reps or weight.</p><div><label>Effort<select value={exercise.sets[0]?.effort ?? 7} onChange={(event) => updateSet(exercise.id, 0, "effort", event.target.value)}>{[5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}/10</option>)}</select></label><button className="primary-button" onClick={() => logSetById(exercise.id, 0)}>{exercise.sets[0]?.completed ? "✓ Completed" : "Complete cardio"}</button></div></div> : <><div className="set-table-header"><span>SET</span><span>WEIGHT ({state.athlete.unit.toUpperCase()})</span><span>REPS</span><span>EFFORT</span><span>DONE</span></div>
                    {exercise.sets.map((set, setIndex) => <div className={`set-row ${set.completed ? "done" : ""}`} key={set.id}><span className="set-number">{setIndex + 1}</span><label><span className="sr-only">Weight for set {setIndex + 1}</span><input type="number" min="0" value={set.weight} onChange={(event) => updateSet(exercise.id, setIndex, "weight", event.target.value)} /></label><label><span className="sr-only">Reps for set {setIndex + 1}</span><input type="number" min="0" value={set.actualReps} onChange={(event) => updateSet(exercise.id, setIndex, "actualReps", event.target.value)} /></label><label><span className="sr-only">Effort for set {setIndex + 1}</span><select value={set.effort} onChange={(event) => updateSet(exercise.id, setIndex, "effort", event.target.value)}>{[5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}/10</option>)}</select></label><button className="complete-set" onClick={() => logSetById(exercise.id, setIndex)} aria-label={`${set.completed ? "Reopen" : "Complete"} set ${setIndex + 1}`}>{set.completed ? "✓" : ""}</button></div>)}
                    <div className="exercise-footer"><span>Rest {Math.floor(exercise.restSeconds / 60)}:{String(exercise.restSeconds % 60).padStart(2, "0")}</span><div><button onClick={() => openSwap(exercise)}>↻ Swap</button><button onClick={() => commit(`Added one set to ${exercise.name}.`, "You", (draft) => { const target = draft.currentWorkout.exercises.find((item) => item.id === exercise.id)!; const base = target.sets.at(-1)!; target.sets.push({ ...base, id: uid("set"), completed: false }); })}>＋ Set</button><button onClick={() => commit(`Skipped ${exercise.name} for today.`, "You", (draft) => { draft.currentWorkout.exercises.find((item) => item.id === exercise.id)!.skipped = true; })}>Skip</button></div></div></>}
                  </div>}
                </article>;
              })}
            </div>
          </section>
          <aside className="today-rail">
            <section className="rail-card next-card"><div className="rail-title"><span className="spark">✦</span><div><span className="eyebrow">NEXT MOVE</span><h3>Progression ready</h3></div></div><p>{state.recommendations[0]?.reason ?? "Complete today’s sets and GymDeck will prepare the next load."}</p>{state.recommendations[0] && <div className="weight-jump"><span>{state.recommendations[0].currentWeight}<small>{state.athlete.unit}</small></span><i>→</i><strong>{state.recommendations[0].suggestedWeight}<small>{state.athlete.unit}</small></strong></div>}<button onClick={() => setView("progress")}>Review recommendation <span>→</span></button></section>
            <section className="rail-card activity-card"><div className="rail-card-heading"><div><span className="eyebrow">LIVE</span><h3>Agent activity</h3></div><button onClick={() => setActivityOpen(true)}>View all</button></div><div className="activity-feed">{state.activities.slice(0, 3).map((activity) => <div className="activity-item" key={activity.id}><span className={`activity-icon ${activity.source.toLowerCase()}`}>{activity.source === "Agent" ? "✦" : activity.source === "You" ? "Y" : "•"}</span><div><p>{activity.message}</p><small>{activity.time}</small></div></div>)}</div><button className="undo-button" onClick={undo} disabled={undoStack.current.length === 0}>↶ Undo last change</button></section>
            <section className="rail-card privacy-card"><span>⌂</span><div><strong>Private by default</strong><p>Your profile and training history stay in this browser.</p></div></section>
          </aside>
        </div>}
        {view === "plan" && <div className="page-content single-page">
          <div className="page-hero-row"><div><span className="eyebrow">YOUR PROGRAM</span><h1>{state.plan.name}</h1><p>{state.plan.goal}. {state.plan.days.length} sessions per week.</p></div><button className="primary-button" onClick={addPlanDay}>＋ Add training day</button></div>
          <div className="plan-grid">{state.plan.days.map((day, dayIndex) => <article className="plan-day" key={day.id}><div className="plan-day-top"><span>{day.label}</span><strong>{day.focus}</strong><small>{day.exercises.length} exercises · {day.exercises.reduce((sum, item) => sum + item.sets, 0)} sets</small></div><div className="plan-exercises">{day.exercises.map((exercise, index) => <div key={exercise.id}><span>{index + 1}</span><strong>{exercise.name}</strong><small>{exercise.durationMinutes ? `${exercise.durationMinutes} min cardio` : `${exercise.sets} × ${exercise.reps} · ${exercise.weight} ${state.athlete.unit}`}</small></div>)}</div><button onClick={() => startPlanDay(day)}>Start this session <span>→</span></button><span className="day-watermark">0{dayIndex + 1}</span></article>)}</div>
          <section className="plan-note"><span>✦</span><div><strong>Built for collaboration</strong><p>Ask your browser agent to create a new plan, change the weekly split, or adapt a session. Every change appears here and in the activity history.</p></div></section>
        </div>}
        {view === "progress" && <div className="page-content single-page">
          <div className="page-hero-row"><div><span className="eyebrow">TRAINING MEMORY</span><h1>Progress you can act on</h1><p>Every completed set becomes context for your next session.</p></div><button className="secondary-button" onClick={() => setView("today")}>Back to workout</button></div>
          <div className="metric-grid"><Metric label="Total volume" value={`${Math.round(totalVolume(state.history) / 1000)}k`} detail={`${state.athlete.unit} moved`} /><Metric label="Cardio time" value={`${state.history.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0)} min`} detail="Logged conditioning" /><Metric label="Training days" value={String(new Set(state.history.map((item) => item.date)).size)} detail="Current workspace" /><Metric label="Bench trend" value={`+${Math.max(0, (benchHistory.at(-1)?.weight ?? 0) - (benchHistory[0]?.weight ?? 0))}`} detail={`${state.athlete.unit} in 5 weeks`} /></div>
          <div className="progress-grid"><section className="chart-card"><div className="chart-heading"><div><span className="eyebrow">STRENGTH TREND</span><h2>Barbell Bench Press</h2></div><span className="trend-pill">↗ Moving up</span></div><div className="bar-chart" aria-label="Bench press weight history">{benchHistory.map((entry) => <div className="bar-column" key={`${entry.id}-${entry.date}`}><span className="bar-value">{entry.weight}</span><div className="bar" style={{ height: `${Math.max(20, (entry.weight / maxBench) * 100)}%` }} /><small>{shortDate(entry.date)}</small></div>)}</div></section>
          <section className="recommendation-card"><span className="eyebrow">NEXT SESSION</span><h2>Progression suggestions</h2><div className="recommendation-list">{state.recommendations.length ? state.recommendations.map((rec) => <div className={`recommendation ${rec.status}`} key={rec.id}><div><strong>{rec.exerciseName}</strong><p>{rec.reason}</p></div><div className="recommendation-action"><span>{rec.currentWeight} → <strong>{rec.suggestedWeight} {state.athlete.unit}</strong></span>{rec.status === "pending" ? <button onClick={() => acceptRecommendation(rec.id)}>Accept</button> : <em>{rec.status}</em>}</div></div>) : <p className="empty-copy">Complete a few sets to unlock recommendations.</p>}</div></section></div>
          <section className="history-card"><div className="chart-heading"><div><span className="eyebrow">RECENT WORK</span><h2>Training log</h2></div><button className="text-button" onClick={exportData}>Export data</button></div><div className="history-table"><div className="history-row header"><span>Date</span><span>Exercise</span><span>Load</span><span>Output</span><span>Total</span></div>{[...state.history].reverse().slice(0, 8).map((entry) => <div className="history-row" key={entry.id}><span>{shortDate(entry.date)}</span><strong>{entry.exerciseName}</strong><span>{entry.durationMinutes ? "—" : `${entry.weight} ${state.athlete.unit}`}</span><span>{entry.durationMinutes ? `${entry.durationMinutes} min` : entry.reps}</span><span>{entry.durationMinutes ? "Cardio" : entry.volume.toLocaleString()}</span></div>)}</div></section>
        </div>}
        {view === "library" && <div className="page-content single-page">
          <div className="page-hero-row"><div><span className="eyebrow">MOVEMENT LIBRARY</span><h1>Find the right next move</h1><p>Search by exercise, muscle group, movement, or equipment.</p></div><button className="primary-button" onClick={() => setCustomExerciseOpen(true)}>＋ Custom exercise</button></div>
          <div className="library-search"><span>⌕</span><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search bench, back, cable…" aria-label="Search exercise library" /><small>{filteredLibrary.length} exercises</small></div>
          <div className="library-grid">{filteredLibrary.map((exercise) => <article className="library-card" key={exercise.id}><div className="movement-mark">{exercise.muscle.slice(0, 2).toUpperCase()}</div><div className="library-copy"><span>{exercise.movement}</span><h3>{exercise.name}</h3><p>{exercise.instructions}</p><div><small>{exercise.muscle}</small><small>{exercise.equipment}</small>{exercise.custom && <small>Custom</small>}</div></div><button onClick={() => { addExerciseToWorkout(exercise); setView("today"); }}>{exercise.category === "cardio" ? "Add 20 min" : "Add to today"} <span>＋</span></button></article>)}</div>
        </div>}
      </section>
      <nav className="mobile-nav" aria-label="Mobile navigation"><NavButton active={view === "today"} icon="⌁" label="Today" onClick={() => setView("today")} /><NavButton active={view === "plan"} icon="▤" label="Plan" onClick={() => setView("plan")} /><NavButton active={view === "progress"} icon="↗" label="Progress" onClick={() => setView("progress")} /><NavButton active={view === "library"} icon="＋" label="Exercises" onClick={() => setView("library")} /></nav>
      {timerSeconds > 0 && <div className="rest-timer"><span>REST</span><strong>{Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, "0")}</strong><button onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}>Skip</button></div>}
      {swapExerciseId && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSwapExerciseId(null); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="swap-title"><button className="modal-close" onClick={() => setSwapExerciseId(null)}>×</button><span className="eyebrow">ADAPT TODAY</span><h2 id="swap-title">Swap exercise</h2><p>Completed sets stay in your history. The replacement takes over the remaining work.</p><label>Replacement<select value={swapChoice} onChange={(event) => setSwapChoice(event.target.value)}>{state.library.filter((item) => item.id !== state.currentWorkout.exercises.find((exercise) => exercise.id === swapExerciseId)?.libraryId).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.equipment}</option>)}</select></label><label>Reason<input value={swapReason} onChange={(event) => setSwapReason(event.target.value)} /></label><button className="primary-button wide" onClick={() => swapExercise(swapExerciseId, swapChoice, swapReason)}>Apply swap</button></section></div>}
      {profileOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}><section className="modal-card profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className="modal-close" onClick={() => setProfileOpen(false)}>×</button><span className="eyebrow">LOCAL ATHLETE</span><h2 id="profile-title">Your training profile</h2><p>This profile and its history stay on this device unless you export them.</p><div className="profile-form"><label>Name<input value={state.athlete.name} onChange={(event) => updateQuietly((draft) => { draft.athlete.name = event.target.value; })} /></label><label>Goal<select value={state.athlete.goal} onChange={(event) => updateQuietly((draft) => { draft.athlete.goal = event.target.value as Athlete["goal"]; })}><option>Strength</option><option>Muscle gain</option><option>General fitness</option><option>Endurance</option></select></label><label>Experience<select value={state.athlete.experience} onChange={(event) => updateQuietly((draft) => { draft.athlete.experience = event.target.value as Athlete["experience"]; })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Units<select value={state.athlete.unit} onChange={(event) => updateQuietly((draft) => { draft.athlete.unit = event.target.value as Unit; })}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label></div><div className="data-actions"><button onClick={exportData}>Export data</button><button onClick={() => importInput.current?.click()}>Import data</button><button className="danger-text" onClick={resetDemo}>Reset demo athlete</button></div><input ref={importInput} type="file" accept="application/json" hidden onChange={importData} /><button className="primary-button wide" onClick={() => setProfileOpen(false)}>Save profile</button></section></div>}
      {customExerciseOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomExerciseOpen(false); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="custom-title"><button className="modal-close" onClick={() => setCustomExerciseOpen(false)}>×</button><span className="eyebrow">YOUR LIBRARY</span><h2 id="custom-title">Create an exercise</h2><p>Add a movement specific to your gym or training style.</p><label>Name<input value={customExercise.name} onChange={(event) => setCustomExercise((value) => ({ ...value, name: event.target.value }))} placeholder="e.g. Belt squat" /></label><label>Muscle group<input value={customExercise.muscle} onChange={(event) => setCustomExercise((value) => ({ ...value, muscle: event.target.value }))} placeholder="e.g. Quads" /></label><label>Equipment<input value={customExercise.equipment} onChange={(event) => setCustomExercise((value) => ({ ...value, equipment: event.target.value }))} placeholder="e.g. Machine" /></label><button className="primary-button wide" onClick={addCustomExercise}>Create exercise</button></section></div>}
      {activityOpen && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActivityOpen(false); }}><aside className="activity-drawer"><div className="drawer-heading"><div><span className="eyebrow">SHARED CONTEXT</span><h2>Activity history</h2></div><button onClick={() => setActivityOpen(false)}>×</button></div><p className="drawer-intro">Every manual and agent change is visible here. GymDeck never hides what changed.</p><div className="activity-feed full">{state.activities.map((activity) => <div className="activity-item" key={activity.id}><span className={`activity-icon ${activity.source.toLowerCase()}`}>{activity.source === "Agent" ? "✦" : activity.source === "You" ? "Y" : "•"}</span><div><strong>{activity.source}</strong><p>{activity.message}</p><small>{activity.time}</small></div></div>)}</div><button className="undo-button sticky" onClick={undo} disabled={undoStack.current.length === 0}>↶ Undo last change</button></aside></div>}
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span>{icon}</span><strong>{label}</strong></button>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
