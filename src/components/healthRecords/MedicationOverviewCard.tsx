// src/components/healthRecords/MedicationOverviewCard.tsx (新規作成)

import React from "react";
import {
  type MedicationRecord,
  type UserNameMap,
  type MedicationStatus,
} from "../../types";
import { Timestamp } from "firebase/firestore"; // Timestamp型が必要

import styles from "./OverviewCard.module.css"; // 共通のスタイルシートを再利用

interface MedicationOverviewCardProps {
  latestMedicationRecord: MedicationRecord | null;
  isLoading: boolean;
  userNames: UserNameMap;
  formatTimestamp: (timestamp: Timestamp | undefined | null) => string;
}

const MedicationOverviewCard: React.FC<MedicationOverviewCardProps> = ({
  latestMedicationRecord,
  isLoading,
  userNames,
  formatTimestamp,
}) => {
  // ⭐ 服薬状況の表示テキスト
  const getMedicationStatusText = (status: MedicationStatus | null) => {
    switch (status) {
      case "服用済":
        return "服用済";
      case "未服用":
        return "未服用";
      case "部分服用":
        return "部分服用";
      case "服用中止":
        return "服用中止";
      default:
        return "--";
    }
  };

  if (isLoading) {
    return <p className={styles.loadingText}>服薬記録を読み込み中...</p>;
  }

  if (!latestMedicationRecord) {
    return (
      <p className={styles.noRecordText}>まだ服薬記録の記録はありません。</p>
    );
  }

  const { medicationName, status, dose, unit, notes, recordedAt, recordedBy } =
    latestMedicationRecord;

  return (
    <div className={styles.overviewCard}>
      <p>
        最新の服薬: <strong>{medicationName || "--"}</strong>
      </p>
      <p className={styles.recordSubInfo}>
        状況: <strong>{getMedicationStatusText(status)}</strong>
        {dose && unit && ` (${dose}${unit})`}
      </p>
      {notes && <p className={styles.notesText}>備考: {notes}</p>}
      <p className={styles.recordInfo}>
        (記録日時: {formatTimestamp(recordedAt)} by{" "}
        {userNames[recordedBy] || "不明"})
      </p>
    </div>
  );
};

export default MedicationOverviewCard;
