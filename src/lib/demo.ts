import type { Project, TimeSession, TrackerData } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Seed = {
  name: string;
  description: string;
  /** [days ago, hour of day, minutes worked] */
  sessions: [number, number, number][];
};

const SEEDS: Seed[] = [
  {
    name: "Smith v. Johnson",
    description: "Smith Holdings Ltd.",
    sessions: [
      [12, 9, 152],
      [10, 13, 190],
      [8, 10, 105],
      [6, 9, 260],
      [4, 14, 135],
      [2, 9, 160],
      [1, 15, 120],
    ],
  },
  {
    name: "ACME Contract",
    description: "ACME Industries",
    sessions: [
      [9, 11, 145],
      [5, 16, 95],
      [3, 9, 195],
    ],
  },
  {
    name: "Jones Estate",
    description: "Estate of R. Jones",
    sessions: [
      [7, 10, 92],
      [3, 14, 130],
    ],
  },
  {
    name: "Property Acquisition",
    description: "Harbour Point Development",
    sessions: [[2, 13, 86]],
  },
];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Seeded once, on the very first visit, so the app is not empty. */
export function createDemoData(now: number): TrackerData {
  const projects: Project[] = [];
  const sessions: TimeSession[] = [];

  SEEDS.forEach((seed, index) => {
    const project: Project = {
      id: newId(),
      name: seed.name,
      description: seed.description,
      createdAt: now - (SEEDS.length - index) * 14 * DAY,
    };
    projects.push(project);

    for (const [daysAgo, hourOfDay, minutes] of seed.sessions) {
      const day = new Date(now - daysAgo * DAY);
      day.setHours(hourOfDay, 0, 0, 0);
      const startedAt = day.getTime();
      const duration = minutes * MINUTE;
      sessions.push({
        id: newId(),
        projectId: project.id,
        startedAt,
        endedAt: startedAt + duration,
        duration,
      });
    }
  });

  return {
    projects,
    sessions,
    selectedProjectId: projects[0]?.id ?? null,
    currentSessionId: null,
    runningSince: null,
  };
}

export { newId };
