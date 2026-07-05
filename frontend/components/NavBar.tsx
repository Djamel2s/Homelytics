"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavBar.module.css";

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>Homelytics</span>
      <div className={styles.links}>
        <Link
          href="/"
          className={`${styles.link} ${pathname === "/" ? styles.active : ""}`}
        >
          Estimation
        </Link>
        <Link
          href="/history"
          className={`${styles.link} ${
            pathname === "/history" ? styles.active : ""
          }`}
        >
          Historique
        </Link>
      </div>
    </nav>
  );
}