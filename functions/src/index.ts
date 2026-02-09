// functions/src/index.ts
import { firestore } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { subDays } from "date-fns";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

import { assertNever } from "./typeUtils"; // ⭐ インポート

// ⭐ 拡張された型定義をインポート
import {
  HealthRecord, // 全ての記録タイプの共通インターフェース（後述）
  VitalSignRecord,
  MealRecord,
  ExcretionRecord, // まだ実装していませんが、型だけ追加
  MedicationRecord, // まだ実装していませんが、型だけ追加
  HealthInsight,
} from "./types";

// ⭐ 各分析関数をインポート
import {
  analyzeBloodPressureTrend,
  analyzeTemperature,
} from "./analysis/vitalSignAnalysis"; // vitalSignAnalysis.ts に両方をまとめることを推奨
import { analyzeHydration } from "./analysis/hydrationAnalysis";
import { analyzeExcretion } from "./analysis/excretionAnalysis"; // まだ実装していません
import { analyzeMedication } from "./analysis/medicationAnalysis"; // まだ実装していません

admin.initializeApp();
const db = admin.firestore();

/**
 * 新しい健康記録が追加または更新されたときにトリガーされる関数
 * groups/{groupId}/healthRecords/{recordId} の変更を監視
 */
exports.analyzeHealthRecord = firestore.onDocumentWritten(
  "groups/{groupId}/healthRecords/{recordId}",
  async (event) => {
    const groupId = event.params.groupId as string;
    const recordId = event.params.recordId as string;

    const newRecordSnapshot = event.data?.after;

    if (!newRecordSnapshot || !newRecordSnapshot.exists) {
      console.log(`Record ${recordId} deleted. No analysis needed.`);
      return null;
    }

    // ⭐ ドキュメントデータと ID を同時に取得し、HealthRecord型で扱う
    // HealthRecord は VitalSignRecord | MealRecord | ... のユニオン型
    const newRecordDataWithId: HealthRecord & { id: string } = {
      ...(newRecordSnapshot.data() as HealthRecord), // ここで型アサーション
      id: newRecordSnapshot.id,
    };

    // ⭐ recordedAt の存在と型を厳密にチェック
    if (
      !newRecordDataWithId.recordedAt ||
      !(newRecordDataWithId.recordedAt instanceof Timestamp)
    ) {
      console.log(
        `Record ${recordId} has invalid or missing recordedAt timestamp. Skipping analysis.`,
      );
      return null;
    }

    console.log(
      `Starting health analysis for group ${groupId}, record ${recordId} (Type: ${newRecordDataWithId.type}). Recorded at: ${newRecordDataWithId.recordedAt.toDate().toISOString()}`,
    );

    // ⭐ 汎用化された performHealthAnalysis を呼び出す
    await performHealthAnalysis(groupId, newRecordDataWithId);

    return null;
  },
);

async function performHealthAnalysis(
  groupId: string,
  newRecordData: HealthRecord & { id: string }, // ⭐ 汎用 HealthRecord 型を受け取る
) {
  const daysToLookBack = 7;
  const cutoffDate = subDays(newRecordData.recordedAt.toDate(), daysToLookBack);

  // ⭐ 全ての healthRecords を一度に取得
  // type でフィルタリングしないことで、様々な分析で利用可能にする
  const allHealthRecordsQuery = await db
    .collection("groups")
    .doc(groupId)
    .collection("healthRecords")
    // bloodPressure.systolicでのwhere句はバイタルサイン限定なので削除
    .where("recordedAt", ">=", Timestamp.fromDate(cutoffDate))
    .orderBy("recordedAt", "asc")
    .get();

  const historicalRecordsWithIds: (HealthRecord & { id: string })[] =
    allHealthRecordsQuery.docs.map(
      (doc) => ({ ...doc.data(), id: doc.id }) as HealthRecord & { id: string },
    );

  let insights: HealthInsight[] = [];

  const recordType = newRecordData.type;

  // ⭐ 新しいレコードのタイプに基づいて分析を分岐
  switch (newRecordData.type) {
    case "vitalSign":
      const latestVitalSign = newRecordData as VitalSignRecord & { id: string };
      const vitalSignRecords = historicalRecordsWithIds.filter(
        (r): r is VitalSignRecord & { id: string } => r.type === "vitalSign",
      );
      // 血圧データが揃っているか最低限のチェック
      if (
        latestVitalSign.bloodPressure?.systolic &&
        latestVitalSign.bloodPressure?.diastolic
      ) {
        insights = insights.concat(
          analyzeBloodPressureTrend(vitalSignRecords, latestVitalSign),
        );
      }
      // 体温データが揃っているかチェック
      if (latestVitalSign.temperature) {
        insights = insights.concat(
          analyzeTemperature(vitalSignRecords, latestVitalSign),
        );
      }
      break;

    case "meal":
      const latestMealRecord = newRecordData as MealRecord & { id: string };
      const mealRecords = historicalRecordsWithIds.filter(
        (r): r is MealRecord & { id: string } => r.type === "meal",
      );
      // 水分摂取分析
      if (
        latestMealRecord.fluidAmount !== null &&
        latestMealRecord.fluidAmount !== undefined
      ) {
        insights = insights.concat(
          analyzeHydration(mealRecords, latestMealRecord),
        );
      }
      break;

    case "excretion":
      const latestExcretionRecord = newRecordData as ExcretionRecord & {
        id: string;
      };
      const excretionRecords = historicalRecordsWithIds.filter(
        (r): r is ExcretionRecord & { id: string } => r.type === "excretion",
      );
      // ⭐ analyzeExcretion 関数を呼び出す
      insights = insights.concat(
        analyzeExcretion(excretionRecords, latestExcretionRecord),
      );
      console.log(
        `Excretion record ${newRecordData.id} processed for analysis.`,
      ); // ログも変更
      break;

    case "medication":
      const latestMedicationRecord = newRecordData as MedicationRecord & {
        id: string;
      };
      const medicationRecords = historicalRecordsWithIds.filter(
        (r): r is MedicationRecord & { id: string } => r.type === "medication",
      );
      // ⭐ analyzeMedication 関数を呼び出す
      insights = insights.concat(
        analyzeMedication(medicationRecords, latestMedicationRecord),
      );
      console.log(
        `Medication record ${newRecordData.id} processed for analysis.`,
      ); // ログも変更
      break;

    default:
      assertNever(newRecordData); // ⭐ ここで型エラーが出れば、型定義に漏れがある
      console.log(
        `Unknown record type: ${recordType}. Skipping analysis.`, // ⭐ 変更
      );
      break;
  }

  if (insights.length > 0) {
    console.log(`Found ${insights.length} insights. Saving to Firestore.`);
    const batch = db.batch();
    const insightsCollectionRef = db
      .collection("groups")
      .doc(groupId)
      .collection("healthInsights");

    for (const insight of insights) {
      batch.set(insightsCollectionRef.doc(), {
        ...insight,
        timestamp: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log("Insights saved successfully.");
  } else {
    console.log("No significant insights found for this record.");
  }
}
