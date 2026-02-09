// src/components/healthRecords/ExcretionOverviewCard.tsx (新規作成)

import React from "react";
import {
  type ExcretionRecord,
  type UserNameMap,
  type UrineAmount,
  type UrineColor,
  type StoolShape,
  type StoolColor,
  type ExcretionPain,
} from "../../types";
import { Timestamp } from "firebase/firestore"; // Timestamp型が必要

import styles from "./OverviewCard.module.css"; // 共通のスタイルシートを再利用

interface ExcretionOverviewCardProps {
  latestExcretionRecord: ExcretionRecord | null;
  isLoading: boolean;
  userNames: UserNameMap;
  formatTimestamp: (timestamp: Timestamp | undefined | null) => string;
}

const ExcretionOverviewCard: React.FC<ExcretionOverviewCardProps> = ({
  latestExcretionRecord,
  isLoading,
  userNames,
  formatTimestamp,
}) => {
  // ⭐ 排尿量の表示テキスト
  const getUrineAmountText = (amount: UrineAmount | null) => {
    return amount || "--";
  };

  // ⭐ 排尿の色の表示テキスト
  const getUrineColorText = (color: UrineColor | null) => {
    return color || "--";
  };

  // ⭐ 便の形状の表示テキスト
  const getStoolShapeText = (shape: StoolShape | null) => {
    return shape || "--";
  };

  // ⭐ 便の色の表示テキスト
  const getStoolColorText = (color: StoolColor | null) => {
    return color || "--";
  };

  // ⭐ 排泄時の痛みの表示テキスト
  const getPainText = (pain: ExcretionPain | null) => {
    return pain || "なし"; // 記録がない場合は「なし」をデフォルトに
  };

  if (isLoading) {
    return <p className={styles.loadingText}>排泄記録を読み込み中...</p>;
  }

  if (!latestExcretionRecord) {
    return (
      <p className={styles.noRecordText}>まだ排泄記録の記録はありません。</p>
    );
  }

  const {
    urineCount,
    urineAmount,
    urineColor,
    urineNotes,
    stoolCount,
    stoolShape,
    stoolColor,
    stoolNotes,
    pain,
    overallNotes,
    recordedAt,
    recordedBy,
  } = latestExcretionRecord;

  // 排尿と排便のどちらかの記録があるか確認
  const hasUrineRecord = urineCount > 0;
  const hasStoolRecord = stoolCount > 0;

  return (
    <div className={styles.overviewCard}>
      {/* ⭐ 排尿の概要表示 */}
      {hasUrineRecord && (
        <div className={styles.recordSubSection}>
          <h4>排尿</h4>
          <p>
            回数: <strong>{urineCount}回</strong>, 量:{" "}
            {getUrineAmountText(urineAmount)}, 色:{" "}
            {getUrineColorText(urineColor)}
          </p>
          {urineNotes && <p className={styles.notesText}>備考: {urineNotes}</p>}
        </div>
      )}

      {/* ⭐ 排便の概要表示 */}
      {hasStoolRecord && (
        <div className={styles.recordSubSection}>
          <h4>排便</h4>
          <p>
            回数: <strong>{stoolCount}回</strong>, 形状:{" "}
            {getStoolShapeText(stoolShape)}, 色: {getStoolColorText(stoolColor)}
          </p>
          {stoolNotes && <p className={styles.notesText}>備考: {stoolNotes}</p>}
        </div>
      )}

      {/* 排尿も排便も記録がない場合は、このメッセージを表示 (本来はlatestExcretionRecordがnullで返るはずだが念のため) */}
      {!hasUrineRecord && !hasStoolRecord && (
        <p className={styles.noRecordText}>排尿・排便の記録がありません。</p>
      )}

      {/* ⭐ 全体的な情報 */}
      <p className={styles.recordSubInfo}>
        痛み: <strong>{getPainText(pain)}</strong>
      </p>
      {overallNotes && (
        <p className={styles.notesText}>全体備考: {overallNotes}</p>
      )}

      <p className={styles.recordInfo}>
        (記録日時: {formatTimestamp(recordedAt)} by{" "}
        {userNames[recordedBy] || "不明"})
      </p>
    </div>
  );
};

export default ExcretionOverviewCard;
