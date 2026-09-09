"use client";

import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useMemo } from "react";

import type { Pin } from "@/lib/pins";

type TaskFlowProps = {
  pins: Pin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function TaskFlow({ pins, selectedId, onSelect }: TaskFlowProps) {
  const nodes = useMemo<Node[]>(
    () =>
      pins.map((pin, index) => ({
        id: pin.id,
        position: { x: index * 190, y: index % 2 === 0 ? 36 : 106 },
        data: { label: pin.name },
        className:
          selectedId === pin.id
            ? "!border-primary !bg-primary !text-primary-foreground"
            : "!border-border !bg-card !text-card-foreground",
      })),
    [pins, selectedId],
  );

  const edges = useMemo<Edge[]>(
    () =>
      pins.slice(1).map((pin, index) => ({
        id: `${pins[index].id}-${pin.id}`,
        source: pins[index].id,
        target: pin.id,
        animated: true,
      })),
    [pins],
  );

  return (
    <div className="h-full bg-background">
      {pins.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          添加勘点后，这里会自动生成任务流程
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => onSelect(node.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </div>
  );
}
