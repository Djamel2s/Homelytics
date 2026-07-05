"use client";

import { useEffect, useState } from "react";
import styles from "./history.module.css";

type HistoryEntry = {
  id: string;
  timestamp: string;
  form: {
    median_income: number;
    house_age: number;
    avg_rooms: number;
    avg_bedrooms: number;
    population: number;
    avg_occupancy: number;
    latitude: number;
    longitude: number;
  };
  result: number;
};

export default function History() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("homelytics_history");
    setHistory(raw ? JSON.parse(raw) : []);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("homelytics_history");
    setHistory([]);
  };

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <p className={styles.eyebrow}>Registre</p>
        <h1 className={styles.title}>Historique des estimations</h1>

        {history.length === 0 ? (
          <p className={styles.empty}>
            Aucune estimation enregistrée pour l&apos;instant. Fais une
            estimation depuis la page d&apos;accueil pour la voir apparaître ici.
          </p>
        ) : (
          <>
            <div className={styles.list}>
              {history.map((entry) => (
                <div key={entry.id} className={styles.entry}>
                  <div className={styles.entryHeader}>
                    <span className={styles.date}>
                      {new Date(entry.timestamp).toLocaleString("fr-FR")}
                    </span>
                    <span className={styles.price}>
                      ${entry.result.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.details}>
                    <span>
                      {entry.form.avg_rooms} pièces · {entry.form.house_age}{" "}
                      ans · {entry.form.population} hab.
                    </span>
                    <span>
                      {entry.form.latitude.toFixed(2)},{" "}
                      {entry.form.longitude.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.clearButton} onClick={clearHistory}>
              Vider l&apos;historique
            </button>
          </>
        )}
      </div>
    </main>
  );
}