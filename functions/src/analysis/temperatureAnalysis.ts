// functions/src/analysis/temperatureAnalysis.ts
// import * as admin from "firebase-admin";
import { VitalSignRecord, HealthInsight } from "../types";

export function analyzeTemperature(
  records: (VitalSignRecord & { id: string })[],
  latestRecord: VitalSignRecord & { id: string },
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  const latestTemp = latestRecord.temperature;

  if (latestTemp === null || latestTemp === undefined) {
    return insights; // 体温データがない場合は分析しない
  }

  const feverThreshold = 37.5;
  const hypothermiaThreshold = 35.0; // ⭐ ここは既に正しい

  // 発熱アラート
  if (latestTemp >= feverThreshold) {
    insights.push({
      type: "fever_alert",
      message: `【緊急】発熱の可能性があります。体温を確認してください。(最新: ${latestTemp}℃)`,
      severity: "critical", // ⭐ types.ts の修正で解決
      triggerValue: latestTemp,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "vitalSign",
    });
  }

  // 低体温アラート
  if (latestTemp <= hypothermiaThreshold) {
    // ⭐ ここを修正: hypotherthermiaThreshold -> hypothermiaThreshold
    insights.push({
      type: "hypothermia_alert",
      message: `【緊急】低体温の可能性があります。体温を確認してください。(最新: ${latestTemp}℃)`,
      severity: "critical", // ⭐ types.ts の修正で解決
      triggerValue: latestTemp,
      relatedRecordId: latestRecord.id,
      relatedRecordType: "vitalSign",
    });
  }

  // 過去の体温データを使った傾向分析もここに追加可能
  const pastTemps = records
    .filter(
      (r) =>
        r.type === "vitalSign" &&
        r.temperature !== null &&
        r.temperature !== undefined,
    )
    .map((r) => r.temperature!);

  if (pastTemps.length >= 3) {
    const averagePastTemp =
      pastTemps.slice(0, -1).reduce((sum, t) => sum + t, 0) /
      (pastTemps.length - 1 || 1);
    if (latestTemp > averagePastTemp + 1.0) {
      // 例: 過去平均より1度以上上昇
      insights.push({
        type: "temperature_spike",
        message: `【注意】体温が急激に上昇しています。(最新: ${latestTemp}℃, 過去平均: ${averagePastTemp.toFixed(1)}℃)`,
        severity: "high",
        triggerValue: latestTemp,
        baselineValue: parseFloat(averagePastTemp.toFixed(1)),
        relatedRecordId: latestRecord.id,
        relatedRecordType: "vitalSign", // ⭐ types.ts の修正で解決
      });
    }
  }

  return insights;
}
