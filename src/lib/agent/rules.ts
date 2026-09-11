import { findPlacesInText } from "@/lib/agent/places";
import { runTool } from "@/lib/agent/tools";
import type { AgentOutput, AgentState, ToolTrace } from "@/lib/agent/types";

const SORT_PATTERNS: { test: RegExp; order: string; label: string }[] = [
  { test: /北.{0,4}南/, order: "north_to_south", label: "从北到南" },
  { test: /南.{0,4}北/, order: "south_to_north", label: "从南到北" },
  { test: /西.{0,4}东/, order: "west_to_east", label: "从西到东" },
  { test: /东.{0,4}西/, order: "east_to_west", label: "从东到西" },
];

function apply(
  state: AgentState,
  trace: ToolTrace[],
  name: string,
  args: Record<string, unknown>,
) {
  const result = runTool(state, name, args);
  trace.push(result.trace);
  return result.state;
}

export function runRulesAgent(
  prompt: string,
  initial: AgentState,
): AgentOutput {
  const trace: ToolTrace[] = [];
  let state = initial;
  const text = prompt.trim();

  const sort = SORT_PATTERNS.find((item) => item.test.test(text));
  if (sort) {
    if (state.pins.length < 2) {
      return {
        state,
        trace,
        engine: "rules",
        reply: "至少两个勘点才能排序。先在地图上加点，或让我规划一条示例路线。",
      };
    }
    state = apply(state, trace, "sort_pins", { order: sort.order });
    const names = state.pins.map((pin) => pin.name).join(" → ");
    return {
      state,
      trace,
      engine: "rules",
      reply: `已按${sort.label}重排任务流：${names}。`,
    };
  }

  const rename = text.match(/(?:改名为|命名为|叫做)\s*(.+)$/);
  if (rename) {
    if (!state.selectedId) {
      return {
        state,
        trace,
        engine: "rules",
        reply: "请先在列表或地图上选中一个勘点，再说改名。",
      };
    }
    const name = rename[1].trim().replace(/^["'“]+|["'”]+$/g, "");
    state = apply(state, trace, "update_pin", {
      id: state.selectedId,
      name,
    });
    return {
      state,
      trace,
      engine: "rules",
      reply: `已把选中点改名为「${name}」。`,
    };
  }

  if (/备注|注意|现场/.test(text) && state.pins.length > 0) {
    state.pins.forEach((pin, index) => {
      state = apply(state, trace, "update_pin", {
        id: pin.id,
        note: `第 ${index + 1} 站 ${pin.name}：到点后核对坐标、拍照、记录周边环境和交通。`,
      });
    });
    return {
      state,
      trace,
      engine: "rules",
      reply: `已为 ${state.pins.length} 个勘点写好现场注意事项，可在右侧属性栏查看。`,
    };
  }

  if (/删除选中|删掉这|删除这/.test(text) && state.selectedId) {
    const target = state.pins.find((pin) => pin.id === state.selectedId);
    state = apply(state, trace, "remove_pin", { id: state.selectedId });
    return {
      state,
      trace,
      engine: "rules",
      reply: `已删除「${target?.name ?? "选中点"}」。`,
    };
  }

  if (/清空/.test(text) && state.pins.length > 0) {
    for (const pin of [...state.pins]) {
      state = apply(state, trace, "remove_pin", { id: pin.id });
    }
    return {
      state,
      trace,
      engine: "rules",
      reply: "已清空全部勘点。",
    };
  }

  const wantRoute = /示例|演示|规划|路线|加几个/.test(text);
  const places = findPlacesInText(text);
  const toAdd =
    places.length > 0
      ? places
      : wantRoute
        ? findPlacesInText("天安门 故宫 景山 北海")
        : [];

  if (toAdd.length > 0) {
    const added: string[] = [];
    for (const place of toAdd) {
      const exists = state.pins.some(
        (pin) =>
          pin.name === place.name ||
          (Math.abs(pin.lng - place.lng) < 1e-4 &&
            Math.abs(pin.lat - place.lat) < 1e-4),
      );
      if (exists) continue;
      state = apply(state, trace, "add_pin", {
        lng: place.lng,
        lat: place.lat,
        name: place.name,
        note: place.note,
      });
      added.push(place.name);
    }
    if (added.length === 0) {
      return {
        state,
        trace,
        engine: "rules",
        reply: "这些地点已经在任务台里了，不用重复添加。",
      };
    }
    return {
      state,
      trace,
      engine: "rules",
      reply: `已加入 ${added.join("、")}，地图和底部任务流会同步更新。`,
    };
  }

  if (state.pins.length === 0) {
    return {
      state,
      trace,
      engine: "rules",
      reply: "还没有勘点。可以说「规划一条北京示例路线」，或直接在地图上点击加点。",
    };
  }

  const names = state.pins.map((pin) => pin.name).join(" → ");
  return {
    state,
    trace,
    engine: "rules",
    reply: `当前 ${state.pins.length} 个点：${names}。我可以排序、改名、写备注、加示例地点（天安门/故宫/景山/北海/鸟巢/国贸）。配置 LLM_API_KEY 后能听更自然语言。`,
  };
}
