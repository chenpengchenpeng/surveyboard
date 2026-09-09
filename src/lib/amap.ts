export const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY ?? "";
export const AMAP_SECURITY_CODE =
  process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ?? "";

let loadPromise: Promise<AMapNamespace> | null = null;

export type AMapMarker = {
  setMap: (map: AMapMapInstance | null) => void;
  on: (event: string, handler: () => void) => void;
  getExtData: () => { id: string };
  setExtData: (data: { id: string }) => void;
};

export type AMapMapInstance = {
  add: (overlay: AMapMarker) => void;
  remove: (overlays: AMapMarker[]) => void;
  on: (
    event: string,
    handler: (event: { lnglat: { lng: number; lat: number } }) => void,
  ) => void;
  setFitView: (
    overlays?: AMapMarker[],
    immediately?: boolean,
    avoid?: [number, number, number, number],
  ) => void;
  destroy: () => void;
};

export type AMapNamespace = {
  Map: new (
    container: HTMLElement,
    options: {
      viewMode?: string;
      zoom?: number;
      center?: [number, number];
      mapStyle?: string;
    },
  ) => AMapMapInstance;
  Marker: new (options: {
    position: [number, number];
    title?: string;
    extData?: { id: string };
  }) => AMapMarker;
  plugin: (name: string | string[], callback: () => void) => void;
};

export function hasAmapKey() {
  return AMAP_KEY.length > 0;
}

export async function loadAmap(): Promise<AMapNamespace> {
  if (!hasAmapKey()) {
    throw new Error("缺少 NEXT_PUBLIC_AMAP_KEY");
  }

  if (!loadPromise) {
    if (AMAP_SECURITY_CODE) {
      window._AMapSecurityConfig = {
        securityJsCode: AMAP_SECURITY_CODE,
      };
    }

    loadPromise = import("@amap/amap-jsapi-loader").then(
      ({ default: AMapLoader }) =>
        AMapLoader.load({
          key: AMAP_KEY,
          version: "2.0",
          plugins: ["AMap.Scale", "AMap.ToolBar"],
        }) as Promise<AMapNamespace>,
    );
  }

  return loadPromise;
}
