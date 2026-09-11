import { createPin, type Pin } from "@/lib/pins";
import { lookupPlace } from "@/lib/agent/places";
import type { AgentState, ToolTrace } from "@/lib/agent/types";

export const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "list_pins",
      description: "查看当前全部勘点（含 id、名称、备注、经纬度、顺序）。改点前先调用。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_place",
      description: "把地点名解析成经纬度。只覆盖内置北京演示地点；找不到就请用户给坐标。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "地点名，如 天安门、故宫" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_pin",
      description: "新增一个勘点，并选中它。",
      parameters: {
        type: "object",
        properties: {
          lng: { type: "number", description: "经度" },
          lat: { type: "number", description: "纬度" },
          name: { type: "string", description: "名称" },
          note: { type: "string", description: "现场备注" },
        },
        required: ["lng", "lat"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_pin",
      description: "按 id 改勘点名称或备注。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          note: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_pin",
      description: "按 id 删除勘点。",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "select_pin",
      description: "选中一个勘点，地图和属性栏会跟着跳转。",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sort_pins",
      description: "按地理方向重排任务流顺序。",
      parameters: {
        type: "object",
        properties: {
          order: {
            type: "string",
            enum: [
              "north_to_south",
              "south_to_north",
              "west_to_east",
              "east_to_west",
            ],
          },
        },
        required: ["order"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reorder_pins",
      description: "按给定 id 列表重排。未出现的点会接到后面。",
      parameters: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" } },
        },
        required: ["ids"],
        additionalProperties: false,
      },
    },
  },
];

type SortOrder =
  | "north_to_south"
  | "south_to_north"
  | "west_to_east"
  | "east_to_west";

function cloneState(state: AgentState): AgentState {
  return {
    selectedId: state.selectedId,
    pins: state.pins.map((pin) => ({ ...pin })),
  };
}

function summarize(state: AgentState) {
  return state.pins.map((pin, index) => ({
    index: index + 1,
    id: pin.id,
    name: pin.name,
    note: pin.note,
    lng: pin.lng,
    lat: pin.lat,
    selected: pin.id === state.selectedId,
  }));
}

function requirePin(state: AgentState, id: string): Pin {
  const pin = state.pins.find((item) => item.id === id);
  if (!pin) {
    throw new Error(`找不到勘点 ${id}`);
  }
  return pin;
}

export function executeTool(
  state: AgentState,
  name: string,
  args: Record<string, unknown>,
): { state: AgentState; result: string } {
  const next = cloneState(state);

  switch (name) {
    case "list_pins": {
      return {
        state: next,
        result: JSON.stringify(summarize(next), null, 2),
      };
    }
    case "lookup_place": {
      const query = String(args.query ?? "");
      const place = lookupPlace(query);
      if (!place) {
        return {
          state: next,
          result: JSON.stringify({
            found: false,
            message: `未收录「${query}」。请直接给经纬度，或换天安门/故宫/景山/北海/鸟巢/国贸。`,
          }),
        };
      }
      return {
        state: next,
        result: JSON.stringify({
          found: true,
          name: place.name,
          lng: place.lng,
          lat: place.lat,
          note: place.note,
        }),
      };
    }
    case "add_pin": {
      const lng = Number(args.lng);
      const lat = Number(args.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error("lng / lat 必须是数字");
      }
      const pin = createPin(lng, lat, next.pins.length + 1);
      if (typeof args.name === "string" && args.name.trim()) {
        pin.name = args.name.trim();
      }
      if (typeof args.note === "string") {
        pin.note = args.note;
      }
      next.pins.push(pin);
      next.selectedId = pin.id;
      return {
        state: next,
        result: JSON.stringify({ added: pin, count: next.pins.length }),
      };
    }
    case "update_pin": {
      const id = String(args.id ?? "");
      const pin = requirePin(next, id);
      if (typeof args.name === "string") pin.name = args.name;
      if (typeof args.note === "string") pin.note = args.note;
      return {
        state: next,
        result: JSON.stringify({ updated: pin }),
      };
    }
    case "remove_pin": {
      const id = String(args.id ?? "");
      requirePin(next, id);
      next.pins = next.pins.filter((pin) => pin.id !== id);
      if (next.selectedId === id) {
        next.selectedId = next.pins.at(-1)?.id ?? null;
      }
      return {
        state: next,
        result: JSON.stringify({ removed: id, count: next.pins.length }),
      };
    }
    case "select_pin": {
      const id = String(args.id ?? "");
      requirePin(next, id);
      next.selectedId = id;
      return {
        state: next,
        result: JSON.stringify({ selectedId: id }),
      };
    }
    case "sort_pins": {
      const order = String(args.order ?? "") as SortOrder;
      const compare: Record<SortOrder, (a: Pin, b: Pin) => number> = {
        north_to_south: (a, b) => b.lat - a.lat,
        south_to_north: (a, b) => a.lat - b.lat,
        west_to_east: (a, b) => a.lng - b.lng,
        east_to_west: (a, b) => b.lng - a.lng,
      };
      const fn = compare[order];
      if (!fn) {
        throw new Error(`不支持的排序 ${order}`);
      }
      next.pins.sort(fn);
      return {
        state: next,
        result: JSON.stringify({
          order,
          names: next.pins.map((pin) => pin.name),
        }),
      };
    }
    case "reorder_pins": {
      const ids = Array.isArray(args.ids)
        ? args.ids.map((id) => String(id))
        : [];
      const map = new Map(next.pins.map((pin) => [pin.id, pin]));
      const ordered: Pin[] = [];
      for (const id of ids) {
        const pin = map.get(id);
        if (pin) {
          ordered.push(pin);
          map.delete(id);
        }
      }
      next.pins = [...ordered, ...map.values()];
      return {
        state: next,
        result: JSON.stringify({ names: next.pins.map((pin) => pin.name) }),
      };
    }
    default:
      throw new Error(`未知工具 ${name}`);
  }
}

export function runTool(
  state: AgentState,
  name: string,
  args: Record<string, unknown>,
): { state: AgentState; trace: ToolTrace } {
  try {
    const result = executeTool(state, name, args);
    return {
      state: result.state,
      trace: { name, args, result: result.result },
    };
  } catch (error) {
    return {
      state,
      trace: {
        name,
        args,
        result: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
