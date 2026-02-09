// functions/src/analysis/hydrationAnalysis.ts
// import * as admin from "firebase-admin";
import { MealRecord, HealthInsight } from "../types";
import { isSameDay } from "date-fns"; // date-fns をインポート

export function analyzeHydration(
  records: (MealRecord & { id: string })[],
  latestRecord: MealRecord & { id: string },
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  const dailyFluidIntakeGoal = 1500; // ml (例: 1日1.5L)

  // 最新の記録での水分摂取が著しく低い場合（食事時以外の単一記録でもチェックできるよう修正）
  if (
    latestRecord.fluidAmount !== null &&
    latestRecord.fluidAmount !== undefined &&
    latestRecord.fluidAmount > 0 && // ゼロ以外の摂取があった場合
    latestRecord.fluidAmount < 200 // 1回の摂取量が200ml未満
  ) {
    insights.push({
      type: "low_single_fluid_intake",
      message: `【注意】一度の水分摂取量が少ないようです。(今回: ${latestRecord.fluidAmount}ml)`,
      severity: "medium",
      triggerValue: latestRecord.fluidAmount,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "meal",
    });
  }

  // ⭐ 今日一日（または過去24時間）の合計水分摂取量を計算し、目標と比較する
  const today = latestRecord.recordedAt.toDate(); // 最新の記録の日付を今日の基準とする
  const recordsToday = records.filter((r) => {
    return isSameDay(r.recordedAt.toDate(), today);
  });

  const totalFluidIntakeToday = recordsToday.reduce(
    (sum, r) => sum + (r.fluidAmount || 0),
    0,
  );

  // 一日の終わり近くで水分摂取量が目標の半分以下の場合など
  // 簡単な例として、単純に現時点の合計量が目標の半分以下で、かつある程度の時間が経過していると仮定
  // 厳密には時刻によるチェックが必要だが、ここでは簡略化
  if (
    totalFluidIntakeToday > 0 &&
    totalFluidIntakeToday < dailyFluidIntakeGoal / 2
  ) {
    insights.push({
      type: "dehydration_risk",
      message: `【要経過観察】今日の水分摂取量が目標の半分以下です。(現在: ${totalFluidIntakeToday}ml / 目標: ${dailyFluidIntakeGoal}ml)`,
      severity: "high",
      triggerValue: totalFluidIntakeToday,
      baselineValue: dailyFluidIntakeGoal,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "meal",
    });
  }
  // ※より詳細な分析には、時間帯に応じた目標設定や、日中の経過時間考慮が必要

  return insights;
}
