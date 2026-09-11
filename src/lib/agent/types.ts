import type { Pin } from "@/lib/pins";

export type AgentState = {
  pins: Pin[];
  selectedId: string | null;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ToolTrace = {
  name: string;
  args: unknown;
  result: string;
};

export type AgentEngine = "llm" | "rules";

export type AgentInput = {
  prompt: string;
  history: ChatTurn[];
  state: AgentState;
};

export type AgentOutput = {
  state: AgentState;
  reply: string;
  trace: ToolTrace[];
  engine: AgentEngine;
};
