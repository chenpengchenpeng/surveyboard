"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentEngine, ChatTurn, ToolTrace } from "@/lib/agent/types";
import type { Pin } from "@/lib/pins";
import { cn } from "@/lib/utils";

type AgentPanelProps = {
  pins: Pin[];
  selectedId: string | null;
  onApply: (next: { pins: Pin[]; selectedId: string | null }) => void;
};

type PanelMessage = ChatTurn & {
  id: string;
  trace?: ToolTrace[];
  engine?: AgentEngine;
};

const SUGGESTIONS = [
  "规划一条北京示例路线",
  "按从北到南排任务流",
  "给每个点写现场注意事项",
  "把选中点改名为东门入口",
];

export function AgentPanel({ pins, selectedId, onApply }: AgentPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;

    const userMessage: PanelMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt("");
    setPending(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          history: messages.map(({ role, content }) => ({ role, content })),
          pins,
          selectedId,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        reply?: string;
        trace?: ToolTrace[];
        engine?: AgentEngine;
        state?: { pins: Pin[]; selectedId: string | null };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "请求失败");
      }

      if (payload.state) {
        onApply(payload.state);
      }

      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.reply ?? "已处理。",
          trace: payload.trace,
          engine: payload.engine,
        },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "助手出错",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4" />
          勘点助手
        </div>
        <Badge variant="secondary">业务 agent</Badge>
      </div>
      <p className="px-4 pb-2 text-xs text-muted-foreground">
        改列表、地图和任务流。未配置 LLM 时走内置规则。
      </p>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 px-3 pb-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void send(item)}
                  className="rounded-md border bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                message.role === "user"
                  ? "ml-6 bg-primary text-primary-foreground"
                  : "mr-2 bg-muted",
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.trace && message.trace.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.trace.map((item, index) => (
                    <span
                      key={`${message.id}-${index}`}
                      className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {pending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              正在处理…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(prompt);
        }}
      >
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例如：按从西到东排序"
          disabled={pending}
          className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button type="submit" size="icon" disabled={pending || !prompt.trim()}>
          <Send />
        </Button>
      </form>
    </div>
  );
}
