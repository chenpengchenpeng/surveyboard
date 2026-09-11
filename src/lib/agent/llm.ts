import { runRulesAgent } from "@/lib/agent/rules";
import { TOOL_DEFS, runTool } from "@/lib/agent/tools";
import type {
  AgentInput,
  AgentOutput,
  ChatTurn,
  ToolTrace,
} from "@/lib/agent/types";

const MAX_STEPS = 8;

type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
};

type OpenAIResponse = {
  error?: { message?: string };
  choices?: {
    finish_reason?: string;
    message?: OpenAIMessage;
  }[];
};

function systemPrompt(snapshot: string) {
  return `你是 Surveyboard 勘点任务台的业务助手。只能通过工具改勘点，不要假装已经改过。

能力：新增/修改/删除/选中勘点，按方向排序，给现场备注。
地点名先 lookup_place；未收录的地点不要编造坐标，请用户给经纬度或在地图上点。
改已有点之前先 list_pins，只用返回的真实 id。
完成后用一两句中文说明做了什么。

当前任务台：
${snapshot}`;
}

function snapshotOf(input: AgentInput) {
  return JSON.stringify(
    {
      selectedId: input.state.selectedId,
      pins: input.state.pins.map((pin, index) => ({
        index: index + 1,
        id: pin.id,
        name: pin.name,
        note: pin.note,
        lng: pin.lng,
        lat: pin.lat,
      })),
    },
    null,
    2,
  );
}

export function llmConfigured() {
  return Boolean(process.env.LLM_API_KEY);
}

export async function runLlmAgent(input: AgentInput): Promise<AgentOutput> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return runRulesAgent(input.prompt, input.state);
  }

  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt(snapshotOf(input)) },
    ...input.history.slice(-8).map((turn: ChatTurn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: "user", content: input.prompt },
  ];

  let state = {
    pins: input.state.pins.map((pin) => ({ ...pin })),
    selectedId: input.state.selectedId,
  };
  const trace: ToolTrace[] = [];

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages,
        tools: TOOL_DEFS,
        tool_choice: "auto",
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message ?? `LLM 请求失败 ${response.status}`);
    }

    const message = payload.choices?.[0]?.message;
    if (!message) {
      throw new Error("LLM 没有返回消息");
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return {
        state,
        trace,
        engine: "llm",
        reply: message.content?.trim() || "已处理。",
      };
    }

    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        args = {};
      }
      const result = runTool(state, call.function.name, args);
      state = result.state;
      trace.push(result.trace);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.trace.result,
      });
    }
  }

  return {
    state,
    trace,
    engine: "llm",
    reply: "步数用尽，已停下。可以再发一条让我继续。",
  };
}
