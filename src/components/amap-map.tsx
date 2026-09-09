"use client";

import { useEffect, useRef, useState } from "react";

import {
  loadAmap,
  type AMapMapInstance,
  type AMapMarker,
  type AMapNamespace,
} from "@/lib/amap";
import type { Pin } from "@/lib/pins";

type AmapMapProps = {
  pins: Pin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (lng: number, lat: number) => void;
};

export function AmapMap({ pins, selectedId, onSelect, onAdd }: AmapMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const amapRef = useRef<AMapNamespace | null>(null);
  const markersRef = useRef<Map<string, AMapMarker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const onAddRef = useRef(onAdd);
  const [ready, setReady] = useState(false);

  onSelectRef.current = onSelect;
  onAddRef.current = onAdd;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const markers = markersRef.current;

    loadAmap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;

        amapRef.current = AMap;
        const map = new AMap.Map(containerRef.current, {
          viewMode: "2D",
          zoom: 12,
          center: [116.397428, 39.90923],
        });

        map.on("click", (event) => {
          onAddRef.current(event.lnglat.lng, event.lnglat.lat);
        });

        mapRef.current = map;
        setReady(true);
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = amapRef.current;
    if (!ready || !map || !AMap) return;

    const current = markersRef.current;
    const nextIds = new Set(pins.map((pin) => pin.id));

    for (const [id, marker] of current) {
      if (!nextIds.has(id)) {
        map.remove([marker]);
        current.delete(id);
      }
    }

    for (const pin of pins) {
      if (current.has(pin.id)) continue;

      const marker = new AMap.Marker({
        position: [pin.lng, pin.lat],
        title: pin.name,
        extData: { id: pin.id },
      });

      marker.on("click", () => {
        onSelectRef.current(pin.id);
      });

      map.add(marker);
      current.set(pin.id, marker);
    }

    if (pins.length > 0) {
      map.setFitView([...current.values()], false, [48, 48, 48, 48]);
    }
  }, [pins, ready]);

  useEffect(() => {
    if (!selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (!marker || !mapRef.current) return;
    mapRef.current.setFitView([marker], false, [80, 80, 80, 80]);
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
