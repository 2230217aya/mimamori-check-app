// functions/src/analysis/medicationAnalysis.ts
import * as admin from "firebase-admin";
import { MedicationRecord, HealthInsight } from "../types";
import {
  isSameDay,
  isPast,
  isAfter,
  setHours,
  setMinutes,
  format,
} from "date-fns";

export function analyzeMedication(
  records: (MedicationRecord & { id: string })[],
  latestRecord: MedicationRecord & { id: string },
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  const now = admin.firestore.Timestamp.now().toDate(); // 現在時刻
  const today = latestRecord.recordedAt.toDate(); // 最新の記録の日付を今日の基準とする

  // -----------------------------------------------------------
  // ⭐ 服薬忘れの検知
  // -----------------------------------------------------------
  // latestRecord が「服用済み」として記録されたものではない場合（つまり服用を忘れた可能性のある場合）
  if (!latestRecord.isTaken && latestRecord.scheduledTime) {
    const scheduledTimeDate = latestRecord.scheduledTime.toDate();

    // 予定時刻が過去であり、まだ服用済みとして記録されていない場合
    if (isPast(scheduledTimeDate) && isSameDay(scheduledTimeDate, today)) {
      insights.push({
        type: "medication_missed",
        message: `【注意】${format(scheduledTimeDate, "HH:mm")} の ${latestRecord.medicationName} の服薬が確認されていません。`,
        severity: "high",
        triggerValue: latestRecord.medicationName,
        baselineValue: format(scheduledTimeDate, "HH:mm"),
        relatedRecordId: latestRecord.id,
        relatedRecordType: "medication",
      });
    }
  }

  // ⭐ 今日一日の服薬状況を俯瞰して、未服用のアラートを出す（より積極的な検知）
  // 注意: このロジックは、予定時刻が複数あり、それらが個別記録される場合に機能します。
  // まとめて記録される場合は、別途ロジック調整が必要です。
  const scheduledMedicationsToday = records.filter(
    (r) =>
      isSameDay(r.scheduledTime?.toDate() || new Date(0), today) &&
      r.scheduledTime !== null &&
      r.scheduledTime !== undefined,
  );

  const missedMedicationsCount = scheduledMedicationsToday.filter(
    (r) => !r.isTaken && isPast(r.scheduledTime!.toDate()),
  ).length;

  if (
    missedMedicationsCount > 0 &&
    isAfter(now, setHours(setMinutes(today, 0), 18))
  ) {
    // 例えば夕方18時以降で未服用がある場合
    insights.push({
      type: "medication_missed_summary",
      message: `【要確認】本日、${missedMedicationsCount}件の服薬が確認されていません。服薬状況をご確認ください。`,
      severity: "high",
      triggerValue: missedMedicationsCount,
      relatedRecordId: latestRecord.id, // 最新の記録に紐付ける
      relatedRecordType: "medication",
    });
  }

  // -----------------------------------------------------------
  // ⭐ 特定の薬の服用とバイタルサイン変化の関連性分析 (高度な機能、今回はスキップ)
  // 例えば、ある降圧剤を服用した後、血圧が急激に下がりすぎた場合など
  // これは複数の記録タイプ（MedicationRecord と VitalSignRecord）を横断的に分析する必要があります。
  // -----------------------------------------------------------

  return insights;
}
