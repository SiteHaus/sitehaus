import Image from "next/image";
import { Button } from "@site-haus/ui/components/base/button";
import styles from "./page.module.css";

export default function App() {
  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.flex}>
          <div className={styles.textBlock}>
            <h3 className={styles.heading}>
              Reliable tech consultation for your business
            </h3>
            <Button className={styles.primary}>In Development...</Button>
          </div>
          <Image
            src="/sitehausLight.png"
            alt="SiteHaus logo"
            width={220}
            height={46}
            sizes="(max-width: 768px) 100px, 180px"
            priority
            className={styles.logo}
          />
        </div>
      </div>

      <div className={styles.footer}>
        © 2025 SiteHaus. All rights reserved. SiteHaus and the SiteHaus logo
        are trademarks or registered trademarks of SiteHaus, Inc. Unauthorized
        use, reproduction, or distribution of any content, design elements, or
        materials on this site is strictly prohibited without prior written
        consent.
      </div>
    </div>
  );
}
