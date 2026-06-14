export type LinearAgentPlanStep = {
  content: string;
  status: "pending" | "inProgress" | "completed" | "canceled";
};

export type LinearAgentActivityContent =
  | { type: "thought"; body: string }
  | { type: "action"; action: string; parameter: string | null; result: string | null }
  | { type: "response"; body: string }
  | { type: "elicitation"; body: string }
  | { type: "error"; body: string }
  | { type: "prompt"; body: string }
  | { type: "unknown" };

export type LinearAgentActivity = {
  updatedAt: string;
  ephemeral: boolean;
  content: LinearAgentActivityContent;
};

export type LinearAgentSessionSnapshot = {
  id: string;
  status: string | null;
  summary: string | null;
  plan: LinearAgentPlanStep[];
  activities: LinearAgentActivity[];
};
