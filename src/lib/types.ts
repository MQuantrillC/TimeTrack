export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
};

export type TimeSession = {
  id: string;
  projectId: string;
  startedAt: number;
  /** null while the session is the one currently running */
  endedAt: number | null;
  /** worked milliseconds banked into this session (excludes the live segment) */
  duration: number;
};

export type TrackerData = {
  projects: Project[];
  sessions: TimeSession[];
  selectedProjectId: string | null;
  /** the session START will resume; cleared by NEW and by switching projects */
  currentSessionId: string | null;
  /** timestamp of the last START, or null when paused */
  runningSince: number | null;
};
