import { NextResponse } from "next/server";

import { runSurveyAgent } from "@/lib/agent/run";
import type { ChatTurn } from "@/lib/agent/types";
import type { Pin } from "@/lib/pins";

export const maxDuration = 60;

function isPin(value: unknown): value is Pin {
  if (!value || typeof value !== "object") return false;
  const pin = value as Pin;
  return (
    typeof pin.id === "string" &&
    typeof pin.name === "string" &&
    typeof pin.note === "string" &&
    typeof pin.lng === "number" &&
    typeof pin.lat === "number"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const payload = body as {
    prompt?: unknown;
    history?: unknown;
    pins?: unknown;
    selectedId?: unknown;
  };

  if (typeof payload.prompt !== "string") {
    return NextResponse.json({ error: "缺少 prompt" }, { status: 400 });
  }
  if (!Array.isArray(payload.pins) || !payload.pins.every(isPin)) {
    return NextResponse.json({ error: "pins 格式不对" }, { status: 400 });
  }

  const selectedId =
    typeof payload.selectedId === "string" || payload.selectedId === null
      ? payload.selectedId
      : null;

  const history: ChatTurn[] = [];
  if (Array.isArray(payload.history)) {
    for (const turn of payload.history) {
      if (
        turn &&
        typeof turn === "object" &&
        "role" in turn &&
        "content" in turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string"
      ) {
        history.push({ role: turn.role, content: turn.content });
      }
    }
  }

  try {
    const result = await runSurveyAgent({
      prompt: payload.prompt,
      history,
      state: { pins: payload.pins, selectedId },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "助手出错";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
