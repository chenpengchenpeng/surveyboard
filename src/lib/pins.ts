export type Pin = {
  id: string;
  name: string;
  note: string;
  lng: number;
  lat: number;
};

export function createPin(lng: number, lat: number, index: number): Pin {
  return {
    id: crypto.randomUUID(),
    name: `勘点 ${index}`,
    note: "",
    lng,
    lat,
  };
}
