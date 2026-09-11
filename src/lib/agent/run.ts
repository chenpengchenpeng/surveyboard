import { runLlmAgent, llmConfigured } from "@/lib/agent/llm";
import { runRulesAgent } from "@/lib/agent/rules";
import type { AgentInput, AgentOutput } from "@/lib/agent/types";

export async function runSurveyAgent(input: AgentInput): Promise<AgentOutput> {
  if (!input.prompt.trim()) {
    return {
      state: input.state,
      trace: [],
      engine: llmConfigured() ? "llm" : "rules",
      reply: "说一下要做什么，例如：规划一条北京示例路线。",
    };
  }

  if (llmConfigured()) {
    return runLlmAgent(input);
  }

  return runRulesAgent(input.prompt, input.state);
}
