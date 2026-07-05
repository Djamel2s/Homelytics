"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../app/page.module.css";

// Correctif nécessaire : Next.js/Webpack casse le chemin par défaut des icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
};

function ClickHandler({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(
        Math.round(e.latlng.lat * 100) / 100,
        Math.round(e.latlng.lng * 100) / 100
      );
    },
  });
  return null;
}

export default function LocationPicker({ latitude, longitude, onChange }: Props) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setAddress(data.display_name ?? null);
      } catch {
        setAddress(null);
      }
    }, 600); // debounce pour éviter de spammer Nominatim

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [latitude, longitude]);

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={9}
        style={{ height: "260px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Marker position={[latitude, longitude]} />
        <ClickHandler onChange={onChange} />
      </MapContainer>
      {address && <p className={styles.addressCaption}>{address}</p>}
    </div>
  );
}