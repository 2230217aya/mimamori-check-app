// src/components/healthRecords/MealOverviewCard.tsx

import React from "react";
import {
  type MealRecord,
  type UserNameMap,
  type DishAmount,
  type MealTime,
  type FluidType,
} from "../../types";
import { Timestamp } from "firebase/firestore";

import styles from "./OverviewCard.module.css"; // 共通のスタイルシートを想定

interface MealOverviewCardProps {
  latestMealRecord: MealRecord | null;
  isLoading: boolean;
  userNames: UserNameMap;
  formatTimestamp: (timestamp: Timestamp | undefined | null) => string;
}

const MealOverviewCard: React.FC<MealOverviewCardProps> = ({
  latestMealRecord,
  isLoading,
  userNames,
  formatTimestamp,
}) => {
  // ⭐ 摂取量の表示テキストを生成するヘルパー関数
  const getDishAmountText = (amount: DishAmount | null) => {
    switch (amount) {
      case "完食":
        return "完食";
      case "8割":
        return "8割";
      case "5割":
        return "5割";
      case "3割":
        return "3割";
      case "なし":
        return "なし";
      default:
        return "--";
    }
  };

  // ⭐ 食事時間の表示テキストを生成するヘルパー関数
  const getMealTimeText = (mealTimes: MealTime[] | undefined) => {
    if (!mealTimes || mealTimes.length === 0) return "--";
    return mealTimes.join("、");
  };

  // ⭐ 水分タイプ表示テキストを生成するヘルパー関数
  const getFluidTypeText = (fluidTypes: FluidType[] | undefined) => {
    if (!fluidTypes || fluidTypes.length === 0) return "なし";
    return fluidTypes.join("、");
  };

  if (isLoading) {
    return (
      <p className={styles.loadingText}>食事・水分摂取記録を読み込み中...</p>
    );
  }

  if (!latestMealRecord) {
    return (
      <p className={styles.noRecordText}>
        まだ食事・水分摂取の記録はありません。
      </p>
    );
  }

  return (
    <div className={styles.overviewCard}>
      <p>
        最新の記録:{" "}
        <strong>{getMealTimeText(latestMealRecord.mealTime)}</strong>
      </p>
      <p className={styles.recordSubInfo}>
        主食: {getDishAmountText(latestMealRecord.stapleFoodAmount)}、 主菜:{" "}
        {getDishAmountText(latestMealRecord.mainDishAmount)}、 副菜:{" "}
        {getDishAmountText(latestMealRecord.sideDishAmount)}
      </p>
      {latestMealRecord.fluidAmount !== null && (
        <p className={styles.recordSubInfo}>
          水分摂取: {getFluidTypeText(latestMealRecord.fluidType)}{" "}
          {latestMealRecord.fluidAmount}ml
        </p>
      )}
      {latestMealRecord.notes && (
        <p className={styles.notesText}>備考: {latestMealRecord.notes}</p>
      )}
      <p className={styles.recordInfo}>
        (記録日時: {formatTimestamp(latestMealRecord.recordedAt)} by{" "}
        {userNames[latestMealRecord.recordedBy] || "不明"})
      </p>
    </div>
  );
};

export default MealOverviewCard;
