// src/components/healthRecords/HealthRecordSection.tsx

import React from "react";
import styles from "./HealthRecordSection.module.css";

interface HealthRecordSectionProps {
  title: string;
  children: React.ReactNode;
  onRecordClick?: () => void;
  onGraphClick?: () => void;
}

const HealthRecordSection: React.FC<HealthRecordSectionProps> = ({
  title,
  children,
  onRecordClick,
  onGraphClick,
}) => {
  return (
    <div className={styles.recordSection}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.content}>{children}</div>
      <div className={styles.actions}>
        {onRecordClick && (
          <button className={styles.recordButton} onClick={onRecordClick}>
            記録する
          </button>
        )}
        {onGraphClick && (
          <button className={styles.graphButton} onClick={onGraphClick}>
            グラフを見る
          </button>
        )}
      </div>
    </div>
  );
};

export default HealthRecordSection;
