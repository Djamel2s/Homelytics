"use client";

import { useState } from "react";

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

export default function Home() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/predict`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      setResult(data.predicted_price);
    } catch (err) {
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1>Homelytics — Estimateur de prix immobilier</h1>
      <form onSubmit={handleSubmit}>
        {Object.keys(initialForm).map((key) => (
          <div key={key} style={{ marginBottom: "1rem" }}>
            <label>{key}</label>
            <input
              type="number"
              step="any"
              value={form[key as keyof FormData]}
              onChange={(e) => handleChange(key as keyof FormData, e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
        ))}
        <button type="submit" disabled={loading}>
          {loading ? "Calcul..." : "Estimer le prix"}
        </button>
      </form>
      {result !== null && (
        <p style={{ marginTop: "1rem", fontWeight: "bold" }}>
          Prix estimé : ${result.toLocaleString()}
        </p>
      )}
    </main>
  );
}