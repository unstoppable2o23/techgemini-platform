export interface AssessmentProgress {
  kind: string;
  label: string;
  completed: boolean;
  assigned: boolean;
  /** Lifecycle state for the assigned kind; null when never assigned. */
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | null;
}
