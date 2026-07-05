"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import styles from "./page.module.css";
import Image from "next/image";

const LocationPicker = dynamic(() => import("../components/LocationPicker"), {
  ssr: false,
});

type FormData = {
  median_income: number;
  house_age: number;
  avg_rooms: number;
  avg_bedrooms: number;
  population: number;
  avg_occupancy: number;
  latitude: number;
  longitude: number;
};

const initialForm: FormData = {
  median_income: 5,
  house_age: 20,
  avg_rooms: 5,
  avg_bedrooms: 1,
  population: 1000,
  avg_occupancy: 3,
  latitude: 34.05,
  longitude: -118.25,
};

type NumericFieldKey = Exclude<keyof FormData, "latitude" | "longitude">;

const fieldMeta: Record<NumericFieldKey, { label: string; unit: string }> = {
  median_income: { label: "Revenu médian", unit: "x10 000 $" },
  house_age: { label: "Âge des logements", unit: "années" },
  avg_rooms: { label: "Pièces par logement", unit: "moyenne" },
  avg_bedrooms: { label: "Chambres par logement", unit: "moyenne" },
  population: { label: "Population du secteur", unit: "habitants" },
  avg_occupancy: { label: "Occupants par logement", unit: "moyenne" },
};

type HistoryEntry = {
  id: string;
  timestamp: string;
  form: FormData;
  result: number;
};

function saveToHistory(form: FormData, result: number) {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    form,
    result,
  };
  const raw = localStorage.getItem("homelytics_history");
  const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
  history.unshift(entry);
  localStorage.setItem(
    "homelytics_history",
    JSON.stringify(history.slice(0, 50)) 
  );
}

export default function Home() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: NumericFieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) }));
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data.predicted_price);
      saveToHistory(form, data.predicted_price);
    } catch (err) {
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <div className={styles.brandRow}>
  <Image src="/logo.svg" alt="Homelytics" width={40} height={40} />
  <p className={styles.eyebrow}>Fiche d&apos;estimation</p>
</div>
<h1 className={styles.title}>
  Homelytics — Estimateur de prix immobilier
</h1>

        <form onSubmit={handleSubmit}>
          <div className={styles.field} style={{ marginBottom: "24px" }}>
            <label className={styles.label}>
              Localisation
              <span className={styles.unit}> (clique sur la carte)</span>
            </label>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={handleLocationChange}
            />
          </div>

          <div className={styles.grid}>
            {(Object.keys(fieldMeta) as NumericFieldKey[]).map((key) => (
              <div key={key} className={styles.field}>
                <label className={styles.label}>
                  {fieldMeta[key].label}
                  <span className={styles.unit}> ({fieldMeta[key].unit})</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={styles.input}
                />
              </div>
            ))}
          </div>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Calcul en cours…" : "Estimer le prix"}
          </button>
        </form>

        {result !== null && (
          <div className={styles.result}>
            <p className={styles.resultLabel}>Estimation</p>
            <div className={styles.stamp}>
              <span className={styles.stampValue}>
                ${result.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}