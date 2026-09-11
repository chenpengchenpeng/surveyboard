export type Place = {
  name: string;
  aliases: string[];
  lng: number;
  lat: number;
  note: string;
};

export const PLACES: Place[] = [
  {
    name: "天安门广场",
    aliases: ["天安门", "天安门广场"],
    lng: 116.397428,
    lat: 39.90923,
    note: "到点后核对广场东/西侧入口，避开安检高峰。",
  },
  {
    name: "故宫午门",
    aliases: ["故宫", "紫禁城", "午门"],
    lng: 116.397026,
    lat: 39.916345,
    note: "核对午门中轴线，记录游客流线与施工围挡。",
  },
  {
    name: "景山公园",
    aliases: ["景山", "景山万春亭"],
    lng: 116.3966,
    lat: 39.9256,
    note: "登高点确认视线，注意闭园时间。",
  },
  {
    name: "北海公园",
    aliases: ["北海", "白塔"],
    lng: 116.3892,
    lat: 39.9284,
    note: "沿湖岸核对坐标，标注游船码头。",
  },
  {
    name: "鸟巢",
    aliases: ["国家体育场", "奥体中心"],
    lng: 116.3908,
    lat: 39.9928,
    note: "核对外围安检口与临时占道。",
  },
  {
    name: "国贸",
    aliases: ["国贸桥", "CBD"],
    lng: 116.4618,
    lat: 39.9092,
    note: "注意高架桥下停车与人流高峰。",
  },
];

export function lookupPlace(query: string): Place | null {
  const q = query.trim();
  if (!q) return null;

  const exact = PLACES.find(
    (place) => place.name === q || place.aliases.includes(q),
  );
  if (exact) return exact;

  return (
    PLACES.find(
      (place) =>
        place.name.includes(q) ||
        q.includes(place.name) ||
        place.aliases.some((alias) => alias.includes(q) || q.includes(alias)),
    ) ?? null
  );
}

export function findPlacesInText(text: string): Place[] {
  const matched: Place[] = [];
  const names = [...PLACES].sort(
    (a, b) => b.name.length - a.name.length || b.aliases[0].length - a.aliases[0].length,
  );

  for (const place of names) {
    const keys = [place.name, ...place.aliases].sort((a, b) => b.length - a.length);
    if (keys.some((key) => text.includes(key))) {
      matched.push(place);
    }
  }

  return matched;
}
