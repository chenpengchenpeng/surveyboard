"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AgentPanel } from "@/components/agent-panel";
import { AmapMap } from "@/components/amap-map";
import { TaskFlow } from "@/components/task-flow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { hasAmapKey } from "@/lib/amap";
import { createPin, type Pin } from "@/lib/pins";
import { cn } from "@/lib/utils";

export function Workbench() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => pins.find((pin) => pin.id === selectedId) ?? null,
    [pins, selectedId],
  );

  const addPin = (lng: number, lat: number) => {
    const pin = createPin(lng, lat, pins.length + 1);
    setPins((current) => [...current, pin]);
    setSelectedId(pin.id);
  };

  const updateSelected = (patch: Partial<Pick<Pin, "name" | "note">>) => {
    if (!selectedId) return;
    setPins((current) =>
      current.map((pin) => (pin.id === selectedId ? { ...pin, ...patch } : pin)),
    );
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setPins((current) => current.filter((pin) => pin.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MapPin className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">Surveyboard</div>
            <div className="mt-1 text-xs text-muted-foreground">
              勘点任务台 · 地图 / 流程 / 业务助手
            </div>
          </div>
        </div>
        <Badge variant="secondary">{pins.length} 个点</Badge>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="flex min-h-0 flex-col border-r bg-card">
          <div className="px-4 py-3 text-sm font-medium">勘点列表</div>
          <Separator />
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-1 p-2">
              {pins.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  点击地图添加勘点
                </p>
              ) : (
                pins.map((pin) => (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => setSelectedId(pin.id)}
                    className={cn(
                      "rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                      selectedId === pin.id && "bg-accent",
                    )}
                  >
                    <div className="font-medium">{pin.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {pin.lng.toFixed(5)}, {pin.lat.toFixed(5)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_240px] bg-muted">
          <div className="relative min-h-0">
            {hasAmapKey() ? (
              <AmapMap
                pins={pins}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={addPin}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <Card className="max-w-md">
                  <CardHeader>
                    <CardTitle>需要高德 Key</CardTitle>
                    <CardDescription>
                      在{" "}
                      <a
                        className="underline underline-offset-4"
                        href="https://console.amap.com/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        高德开放平台
                      </a>{" "}
                      创建 Web 端 Key，写入项目根目录的{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        .env.local
                      </code>
                      后重启开发服务器。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
                    <div>NEXT_PUBLIC_AMAP_KEY=你的Key</div>
                    <div>NEXT_PUBLIC_AMAP_SECURITY_CODE=安全密钥（可选）</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <div className="min-h-0 border-t">
            <TaskFlow
              pins={pins}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l bg-card">
          <div className="flex max-h-[42%] min-h-[240px] flex-col overflow-hidden">
            <div className="px-4 py-3 text-sm font-medium">属性</div>
            <Separator />
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-4">
                {selected ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="pin-name">名称</Label>
                      <Input
                        id="pin-name"
                        value={selected.name}
                        onChange={(event) =>
                          updateSelected({ name: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pin-note">备注</Label>
                      <textarea
                        id="pin-note"
                        value={selected.note}
                        onChange={(event) =>
                          updateSelected({ note: event.target.value })
                        }
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {selected.lng.toFixed(6)}, {selected.lat.toFixed(6)}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removeSelected}
                    >
                      <Trash2 />
                      删除此点
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    选中左侧列表或地图上的点后，在这里改名称和备注。
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
          <Separator />
          <div className="flex min-h-0 flex-1 flex-col">
            <AgentPanel
              pins={pins}
              selectedId={selectedId}
              onApply={(next) => {
                setPins(next.pins);
                setSelectedId(next.selectedId);
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
