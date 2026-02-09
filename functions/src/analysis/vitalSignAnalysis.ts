// functions/src/analysis/vitalSignAnalysis.ts
// import * as admin from "firebase-admin";
import { VitalSignRecord, HealthInsight } from "../types";

// analyzeBloodPressureTrend 関数 (中身は index.ts から移動)
export function analyzeBloodPressureTrend(
  records: (VitalSignRecord & { id: string })[],
  latestRecord: VitalSignRecord & { id: string },
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  const systolicPressures = records
    .filter(
      (r) =>
        r.bloodPressure?.systolic !== undefined &&
        r.bloodPressure?.systolic !== null,
    )
    .map((r) => r.bloodPressure!.systolic!);

  if (systolicPressures.length < 3) {
    console.log(
      `Not enough systolic pressure data for trend analysis. Found: ${systolicPressures.length}`,
    );
    return insights;
  }

  const latestSystolic = latestRecord.bloodPressure!.systolic!;
  const latestDiastolic = latestRecord.bloodPressure!.diastolic!;

  // slice(0, -1) は最新の記録を除外するために行う。
  // 注意: `records` は `newRecordData.recordedAt` を基準にソートされ、
  // 最新のレコードが含まれている可能性があるため、`latestRecord` 自体は除外する。
  // ただし、もし `records` が既に最新の記録を含まず、`historicalRecords` のみを指すなら、この `slice` は不要。
  // 現在の実装では `allRelevantRecords` に `newRecordData` が含まれる可能性があるため、slice は適切。
  const recentSystolicPressuresForAverage = systolicPressures.slice(0, -1);
  if (recentSystolicPressuresForAverage.length === 0) {
    console.log(
      "Not enough historical data to calculate average for trend analysis (after excluding latest record).",
    );
    return insights;
  }

  const averageRecentSystolic =
    recentSystolicPressuresForAverage.reduce((sum, val) => sum + val, 0) /
    recentSystolicPressuresForAverage.length;

  const percentageIncreaseThreshold = 0.05;
  const absoluteIncreaseThreshold = 10;
  const highBloodPressureThresholdSystolic = 140;
  const highBloodPressureThresholdDiastolic = 90;

  if (
    latestSystolic > averageRecentSystolic &&
    (latestSystolic / averageRecentSystolic - 1 > percentageIncreaseThreshold ||
      latestSystolic - averageRecentSystolic > absoluteIncreaseThreshold) &&
    latestSystolic >= highBloodPressureThresholdSystolic
  ) {
    insights.push({
      type: "blood_pressure_trend",
      message: `【要経過観察】最新の収縮期血圧が上昇傾向にあり、高血圧の予兆があるかもしれません。(最新: ${latestSystolic}mmHg, 過去平均: ${averageRecentSystolic.toFixed(1)}mmHg)`,
      severity: "high",
      triggerValue: latestSystolic,
      baselineValue: parseFloat(averageRecentSystolic.toFixed(1)),
      relatedRecordId: latestRecord.id,
      relatedRecordType: "vitalSign",
    });
  }

  if (
    latestSystolic >= highBloodPressureThresholdSystolic ||
    latestDiastolic >= highBloodPressureThresholdDiastolic
  ) {
    insights.push({
      type: "high_blood_pressure",
      message: `【注意】最新の血圧が国際的な高血圧の基準値を超えています。(収縮期: ${latestSystolic}mmHg, 拡張期: ${latestDiastolic}mmHg)`,
      severity: "medium",
      triggerValue: latestSystolic,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "vitalSign",
    });
  }

  return insights;
}

// analyzeTemperature 関数 (中身は前回の回答で提示したもの)
export function analyzeTemperature(
  records: (VitalSignRecord & { id: string })[],
  latestRecord: VitalSignRecord & { id: string },
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  const latestTemp = latestRecord.temperature;

  if (latestTemp === null || latestTemp === undefined) {
    return insights;
  }

  const feverThreshold = 37.5;
  const hypothermiaThreshold = 35.0;

  if (latestTemp >= feverThreshold) {
    insights.push({
      type: "fever_alert",
      message: `【緊急】発熱の可能性があります。体温を確認してください。(最新: ${latestTemp}℃)`,
      severity: "critical",
      triggerValue: latestTemp,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "vitalSign",
    });
  }

  if (latestTemp <= hypothermiaThreshold) {
    insights.push({
      type: "hypothermia_alert",
      message: `【緊急】低体温の可能性があります。体温を確認してください。(最新: ${latestTemp}℃)`,
      severity: "critical",
      triggerValue: latestTemp,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "vitalSign",
    });
  }

  const pastTemps = records
    .filter(
      (r) =>
        r.type === "vitalSign" &&
        r.temperature !== null &&
        r.temperature !== undefined &&
        r.id !== latestRecord.id, // ⭐ 最新の記録自身は除外
    )
    .map((r) => r.temperature!);

  if (pastTemps.length >= 2) {
    // 少なくとも2つの過去データで傾向を見る
    const averagePastTemp =
      pastTemps.reduce((sum, t) => sum + t, 0) / pastTemps.length;
    if (latestTemp > averagePastTemp + 1.0) {
      // 例: 過去平均より1度以上上昇
      insights.push({
        type: "temperature_spike",
        message: `【注意】体温が急激に上昇しています。(最新: ${latestTemp}℃, 過去平均: ${averagePastTemp.toFixed(1)}℃)`,
        severity: "high",
        triggerValue: latestTemp,
        baselineValue: parseFloat(averagePastTemp.toFixed(1)),
        relatedRecordId: latestRecord.id,
        relatedRecordType: "vitalSign",
      });
    }
  }

  return insights;
}
