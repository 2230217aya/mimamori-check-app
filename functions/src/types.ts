// functions/src/types/index.ts
import * as admin from "firebase-admin"; // Timestamp型のためにインポート

export type HealthInsightType =
  | "blood_pressure_trend"
  | "high_blood_pressure"
  | "fever_alert"
  | "hypothermia_alert"
  | "temperature_spike"
  | "low_single_fluid_intake"
  | "frequent_night_urination" // ⭐ 追加
  | "blood_in_urine_alert" // ⭐ 追加
  | "excretion_pain_alert" // ⭐ 追加
  | "dehydration_risk"
  | "constipation_risk" // ⭐ 追加
  | "diarrhea_alert" // ⭐ 追加
  | "low_urination_frequency" // ⭐ 追加
  | "medication_missed"
  | "medication_missed" // ⭐ 追加
  | "medication_missed_summary" // ⭐ 追加
  | "general_alert";

export type HealthInsightSeverity = "low" | "medium" | "high" | "critical";

export interface HealthInsight {
  type: HealthInsightType;
  message: string;
  severity: HealthInsightSeverity;
  timestamp?: admin.firestore.Timestamp;
  triggerValue?: number | string | boolean;
  baselineValue?: number | string | boolean;
  relatedRecordId?: string;
  relatedRecordType?: string; // ⭐ どのタイプの記録が関連しているかを示す
}

// --------------------------------------------------------------------------
// ⭐ 各記録タイプのインターフェース (再掲)
// --------------------------------------------------------------------------

export interface VitalSignRecord {
  id?: string;
  type: "vitalSign";
  recordedBy: string;
  recordedAt: admin.firestore.Timestamp;
  temperature: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
  spo2: number | null;
  notes: string;
}

export type DishAmount = "完食" | "8割" | "5割" | "3割" | "なし";
export type MealTime = "朝食" | "昼食" | "夕食" | "間食";
export type FluidType =
  | "水"
  | "お茶"
  | "ジュース"
  | "牛乳"
  | "スープ"
  | "その他";

export interface MealRecord {
  id?: string;
  type: "meal";
  recordedBy: string;
  recordedAt: admin.firestore.Timestamp;
  mealTime: MealTime[];
  stapleFoodAmount: DishAmount | null;
  mainDishAmount: DishAmount | null;
  sideDishAmount: DishAmount | null;
  fluidAmount: number | null;
  fluidType: FluidType[] | null;
  notes: string;
}

export type ExcretionType = "尿" | "便" | "嘔吐";
export type ExcretionAmount = "少量" | "普通" | "多量";

export type StoolShape =
  | "普通"
  | "硬い"
  | "軟らかい"
  | "水様"
  | "泥状"
  | "その他";
export type StoolColor = "黄土色" | "茶色" | "黒" | "白" | "赤" | "その他";
export type UrineColor = "薄黄" | "黄" | "濃黄" | "赤" | "その他";
export type ExcretionPain = "なし" | "あり";

export interface ExcretionRecord {
  id?: string;
  type: "excretion";
  recordedBy: string;
  recordedAt: admin.firestore.Timestamp;
  excretionType: ExcretionType[];

  // ⭐ urineCount の定義を削除
  // urinationAmount: ExcretionAmount | null; // 尿の量 (フロントの urineAmountOptions を参照)
  urineColor: UrineColor | null;
  urineNotes: string | null;

  // stoolCount はフロントエンドの入力から推測されるが、画像にはないため一旦削除
  // ⭐ stoolCount の定義を削除
  // stoolAmount: ExcretionAmount | null;

  stoolShape: StoolShape | null;
  stoolColor: StoolColor | null;
  stoolNotes: string | null;

  overallNotes: string | null;
  pain: ExcretionPain | null;

  // ※ フロントエンドで実際にどのフィールドを保存しているか、改めて確認が必要です。
  // 画像のデータには以下のフィールドが見えましたので、これらは残します。
  stoolCount: number | null; // 画像に存在
  stoolAmount: ExcretionAmount | null; // 画像に存在
  // urineCount は画像にも見えず、定数にもないので一旦削除
}

export interface MedicationRecord {
  id?: string;
  type: "medication";
  recordedBy: string;
  recordedAt: admin.firestore.Timestamp;
  medicationName: string;
  dose: string | null;
  isTaken: boolean;
  scheduledTime: admin.firestore.Timestamp | null;
  notes: string;
}

// ⭐ 全ての健康記録タイプのユニオン型
export type HealthRecord =
  | VitalSignRecord
  | MealRecord
  | ExcretionRecord
  | MedicationRecord;
