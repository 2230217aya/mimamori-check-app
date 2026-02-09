import { Timestamp } from "firebase/firestore";
//\src\types\index.ts

export interface Group {
  name: string;
  members: string[];
  createdBy: string;
  createdAt: any; // Timestamp型になる想定
  inviteCode: string;
}

// Firestoreから取得するグループドキュメントの型
export interface GroupDocument {
  id: string;
  name: string;
  inviteCode: string;
  members: string[]; // メンバーのUIDリスト
  createdAt: Timestamp; // 追加
  // inviteCode: string; // 必要に応じてここに追加
}

export interface Task {
  id: string;
  name: string;
  groupId: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  dueDate?: Timestamp;
  comments?: Comment[];
  createdBy?: string;
}

export interface UserNameMap {
  [uid: string]: string;
}

export interface Comment {
  id: string;
  text: string;
  postedBy: string;
  postedAt: Timestamp;
  fileAttachment?: FileAttachment;
}

export interface FileAttachment {
  fileName: string;
  fileUrl: string; // Firebase Storage のダウンロードURL
  mimeType?: string; // 例: "image/jpeg", "application/pdf"
  thumbnailUrl?: string; // 画像の場合、サムネイルURL
}

// 緊急連絡先
export interface EmergencyContact {
  id: string; // FirestoreのドキュメントID
  name: string; // 氏名や機関名
  relationship?: string; // 関係性（例: かかりつけ医、家族、友人）
  phoneNumber: string; // 電話番号
  notes?: string; // 備考
  createdAt: Timestamp;
}

// 緊急時対応ガイド
export interface EmergencyGuide {
  id: string; // FirestoreのドキュメントID
  title: string; // ガイドのタイトル（例: 発熱時の対応フロー）
  content: string; // ガイドの内容
  createdAt: Timestamp;
}

// 各健康記録入力フォームが公開するメソッドのインターフェース
export interface HealthInputFormRef {
  // フォームの現在の入力値を取得する
  getValues: () => {
    // フォームの型に応じて具体的な値を定義
    [key: string]: any;
  };
  // フォームのバリデーションを実行し、エラーがあれば返す
  validate: () => string | null;
  // フォームをリセットする
  resetForm: () => void;
  // 外部から記録処理をトリガーする（個別の記録ボタンが非表示の場合用）
  submitFormExternally: () => Promise<boolean>;
}

// バイタルサインの記録
export interface VitalSignRecord {
  id?: string; // FirestoreドキュメントID
  type: "vitalSign";
  recordedBy: string;
  recordedAt: Timestamp;
  temperature: number | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
  spo2: number | null;
  notes: string;
}

// 食事・水分摂取の記録
export type MealTime = "朝食" | "昼食" | "夕食" | "間食" | "その他";
export type FluidType = "水" | "お茶" | "ジュース" | "牛乳" | "その他";
export type DishAmount = "完食" | "8割" | "5割" | "3割" | "なし"; // 主食・主菜・副菜の摂取量

export interface MealRecord {
  id?: string; // FirestoreドキュメントID
  type: "meal"; // 記録の種類を識別（"mealAndHydration"から"meal"に変更）
  recordedBy: string;
  recordedAt: Timestamp;
  mealTime: MealTime[]; // 食事の種類 (複数選択可)
  stapleFoodAmount: DishAmount | null; // 主食量
  mainDishAmount: DishAmount | null; // 主菜量
  sideDishAmount: DishAmount | null; // 副菜量
  fluidType: FluidType[]; // 摂取した水分 (複数選択可)
  fluidAmount: number | null; // 摂取水分量 (ml)
  notes: string; // 特記事項
  recordedDate: Timestamp; // 記録された日（グラフ表示などに利用）
}

// 排泄の記録
export type ExcretionType = "urine" | "stool"; // 排泄の種類
export type UrineAmount = "少量" | "普通" | "多量"; // 排尿量
export type UrineColor = "薄黄" | "黄" | "濃黄" | "赤" | "その他"; // 排尿の色
export type StoolShape =
  | "普通"
  | "硬い"
  | "軟らかい"
  | "水様"
  | "泥状"
  | "その他"; // 便の形状
export type StoolColor = "黄土色" | "茶色" | "黒" | "白" | "赤" | "その他"; // 便の色
export type ExcretionPain = "なし" | "あり"; // 排泄時の痛み

export interface ExcretionRecord {
  id?: string; // FirestoreドキュメントID
  type: "excretion"; // 記録の種類を識別
  recordedBy: string;
  recordedAt: Timestamp; // 記録日時

  // 排尿に関する記録
  urineCount: number; // 排尿回数
  urineAmount: UrineAmount | null; // 排尿量 (例: "少量", "普通", "多量")
  urineColor: UrineColor | null; // 排尿の色
  urineNotes: string; // 排尿に関する特記事項

  // 排便に関する記録
  stoolCount: number; // 排便回数
  stoolShape: StoolShape | null; // 便の形状
  stoolColor: StoolColor | null; // 便の色
  stoolNotes: string; // 排便に関する特記事項

  pain: ExcretionPain | null; // 排泄時の痛み
  overallNotes: string; // 全体的な特記事項
}

// 服薬の記録
export type MedicationStatus = "服用済" | "未服用" | "部分服用" | "服用中止";

export interface MedicationRecord {
  id: string;
  type: "medication";
  recordedBy: string;
  recordedAt: Timestamp;
  medicationName: string;
  status: MedicationStatus;
  dose?: number; // 用量 (例: 1, 0.5)
  unit?: string; // 単位 (例: "錠", "ml")
  notes?: string;
}
