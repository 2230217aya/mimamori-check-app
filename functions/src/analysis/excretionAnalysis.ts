// functions/src/analysis/excretionAnalysis.ts (修正後)

import * as admin from "firebase-admin"; // admin のインポートは削除しない！Timestamp.now() で必要になるため。
import { ExcretionRecord, HealthInsight } from "../types";
import { isSameDay, differenceInDays, format } from "date-fns";

export function analyzeExcretion(
  records: (ExcretionRecord & { id: string })[],
  latestRecord: ExcretionRecord & { id: string },
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  const now = admin.firestore.Timestamp.now().toDate(); // ⭐ now は現在時刻取得に必要なので残す
  const today = latestRecord.recordedAt.toDate();
  console.log(
    `[Excretion Analysis] Processing record for ${format(today, "yyyy-MM-dd HH:mm")}, latestRecord ID: ${latestRecord.id}`,
  );
  console.log(
    `[Excretion Analysis] Latest record stoolShape: ${latestRecord.stoolShape}, urineColor: ${latestRecord.urineColor}`,
  );

  // -----------------------------------------------------------
  // ⭐ 便秘の兆候分析
  // -----------------------------------------------------------
  const stoolRecords = records
    .filter(
      (r) =>
        r.excretionType.includes("便") &&
        r.stoolShape !== null && // stoolShape が存在する便記録
        r.stoolShape !== undefined,
    )
    .sort(
      (a, b) =>
        a.recordedAt.toDate().getTime() - b.recordedAt.toDate().getTime(),
    );

  const lastStoolRecord = stoolRecords[stoolRecords.length - 1]; // 最新の便記録

  if (
    lastStoolRecord &&
    isSameDay(lastStoolRecord.recordedAt.toDate(), today)
  ) {
    // 最新が今日の便記録なら、その内容をチェック
    if (lastStoolRecord.stoolShape === "硬い") {
      insights.push({
        type: "constipation_risk",
        message: `【注意】便が硬いようです。水分補給を促してください。`,
        severity: "medium",
        triggerValue: lastStoolRecord.stoolShape,
        relatedRecordId: lastStoolRecord.id,
        relatedRecordType: "excretion",
      });
    }
  }

  // 過去数日間の便記録を確認して、便秘の傾向を見る
  if (stoolRecords.length >= 2) {
    const daysSinceLastStool = differenceInDays(
      today,
      lastStoolRecord.recordedAt.toDate(),
    );

    // 最後に便が出てから3日以上経過しており、かつ今日排便記録がないか、あってもそれが「便」ではない場合
    if (
      daysSinceLastStool >= 3 &&
      (!isSameDay(latestRecord.recordedAt.toDate(), today) ||
        !latestRecord.excretionType.includes("便"))
    ) {
      insights.push({
        type: "constipation_risk",
        message: `【要経過観察】3日以上排便がない状態が続いています。便秘に注意してください。`,
        severity: "high",
        triggerValue: daysSinceLastStool,
        relatedRecordId: latestRecord.id,
        relatedRecordType: "excretion",
      });
    }
  } else if (
    stoolRecords.length === 1 &&
    differenceInDays(today, lastStoolRecord.recordedAt.toDate()) >= 3
  ) {
    // 初めての便記録で、それから3日以上経っている場合
    insights.push({
      type: "constipation_risk",
      message: `【要経過観察】排便が記録されてから3日以上経過しています。`,
      severity: "high",
      triggerValue: differenceInDays(
        today,
        lastStoolRecord.recordedAt.toDate(),
      ),
      relatedRecordId: latestRecord.id,
      relatedRecordType: "excretion",
    });
  }

  // -----------------------------------------------------------
  // ⭐ 下痢の継続分析
  // -----------------------------------------------------------
  const wateryStoolRecordsToday = records.filter(
    (r) =>
      isSameDay(r.recordedAt.toDate(), today) &&
      r.excretionType.includes("便") &&
      r.stoolShape === "水様", // ⭐ "水様" に変更
  );

  if (wateryStoolRecordsToday.length >= 2) {
    // 同じ日に2回以上水様便があった場合
    insights.push({
      type: "diarrhea_alert",
      message: `【緊急】本日、水様便が複数回記録されています。脱水症状にご注意ください。`,
      severity: "critical",
      triggerValue: wateryStoolRecordsToday.length,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "excretion",
    });
  }

  // -----------------------------------------------------------
  // ⭐ 排尿回数の異常分析
  // -----------------------------------------------------------
  // ⭐ urinationRecordsToday の定義 (これは使われています)
  const urinationRecordsToday = records.filter(
    (r) =>
      isSameDay(r.recordedAt.toDate(), today) && r.excretionType.includes("尿"),
  );

  // ⭐ totalUrinationEventCountToday の定義 (ここまではOK)
  const totalUrinationEventCountToday = urinationRecordsToday.length;

  // ⭐⭐ ここに totalUrinationEventCountToday を使用したロジックを追加 ⭐⭐
  // 例: 今日の日中に尿の記録が極端に少ない場合
  const currentHour = now.getHours(); // 現在時刻の「時」
  if (currentHour >= 17 && totalUrinationEventCountToday < 2) {
    // 例えば17時以降で、今日の尿記録が2件未満の場合
    insights.push({
      type: "low_urination_frequency",
      message: `【注意】今日の排尿記録イベントが少ないようです。(現在までに${totalUrinationEventCountToday}回)`,
      severity: "medium",
      triggerValue: totalUrinationEventCountToday,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "excretion",
    });
  }
  // 例: 今日の尿記録が極端に多い場合 (例えば、通常は1日5回だが、8回以上ある場合など)
  // if (totalUrinationEventCountToday >= 8) { // 仮の閾値
  //     insights.push({
  //         type: "high_urination_frequency", // 新しいインサイトタイプ
  //         message: `【注意】今日の排尿記録イベントが非常に多いです。(本日${totalUrinationEventCountToday}回)`,
  //         severity: "medium",
  //         triggerValue: totalUrinationEventCountToday,
  //         relatedRecordId: latestRecord.id,
  //         relatedRecordType: "excretion",
  //     });
  // }

  // 夜間の排尿回数が多い場合（夜間頻尿の兆候）
  const nightUrinationEventCount = records.filter(
    (r) =>
      isSameDay(r.recordedAt.toDate(), today) &&
      r.excretionType.includes("尿") &&
      r.recordedAt.toDate().getHours() >= 21, // 21時以降
  ).length;

  if (nightUrinationEventCount >= 3) {
    insights.push({
      type: "frequent_night_urination",
      message: `【注意】本日、夜間の排尿回数が多いようです。(夜間記録イベント: ${nightUrinationEventCount}回)`,
      severity: "medium",
      triggerValue: nightUrinationEventCount,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "excretion",
    });
  }

  // ⭐ 新しい分析: 尿の色が赤い場合
  if (
    latestRecord.excretionType.includes("尿") &&
    latestRecord.urineColor === "赤"
  ) {
    insights.push({
      type: "blood_in_urine_alert",
      message: `【緊急】尿に血液が混じっている可能性があります（尿の色: 赤）。医療機関の受診を検討してください。`,
      severity: "critical",
      triggerValue: latestRecord.urineColor,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "excretion",
    });
  }

  // ⭐ 新しい分析: 排便時に痛みがある場合
  if (
    latestRecord.excretionType.includes("便") &&
    latestRecord.pain === "あり"
  ) {
    insights.push({
      type: "excretion_pain_alert",
      message: `【注意】排便時に痛みがあったようです。原因を確認してください。`,
      severity: "medium",
      triggerValue: latestRecord.pain,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "excretion",
    });
  }

  return insights;
}
