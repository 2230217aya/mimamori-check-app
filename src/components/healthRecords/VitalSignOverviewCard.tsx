// src/components/healthRecords/VitalSignOverviewCard.tsx

import React from "react";
import { type VitalSignRecord, type UserNameMap } from "../../types";
import { Timestamp } from "firebase/firestore"; // Timestamp型が必要

import styles from "./OverviewCard.module.css"; // 共通のスタイルシートを想定

interface VitalSignOverviewCardProps {
  latestVitalSign: VitalSignRecord | null;
  isLoading: boolean;
  userNames: UserNameMap;
  formatTimestamp: (timestamp: Timestamp | undefined | null) => string; // 親からヘルパー関数を受け取る
}

const VitalSignOverviewCard: React.FC<VitalSignOverviewCardProps> = ({
  latestVitalSign,
  isLoading,
  userNames,
  formatTimestamp,
}) => {
  if (isLoading) {
    return <p className={styles.loadingText}>バイタルサインを読み込み中...</p>;
  }

  if (!latestVitalSign) {
    return (
      <p className={styles.noRecordText}>
        まだバイタルサインの記録はありません。
      </p>
    );
  }

  return (
    <div className={styles.overviewCard}>
      <p>
        最新の体温: <strong>{latestVitalSign.temperature || "--"}℃</strong>,
        血圧:{" "}
        <strong>
          {latestVitalSign.bloodPressure?.systolic || "--"}/
          {latestVitalSign.bloodPressure?.diastolic || "--"}mmHg
        </strong>
        , SPO2: <strong>{latestVitalSign.spo2 || "--"}%</strong>
      </p>
      <p className={styles.recordInfo}>
        (記録日時: {formatTimestamp(latestVitalSign.recordedAt)} by{" "}
        {userNames[latestVitalSign.recordedBy] || "不明"})
      </p>
      {latestVitalSign.notes && (
        <p className={styles.notesText}>備考: {latestVitalSign.notes}</p>
      )}
    </div>
  );
};

export default VitalSignOverviewCard;
