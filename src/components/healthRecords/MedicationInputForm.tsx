// src/components/healthRecords/MedicationInputForm.tsx

import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect, // ⭐ useEffect を追加
} from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { type User } from "firebase/auth";
import { type MedicationStatus, type HealthInputFormRef } from "../../types"; // ⭐ HealthInputFormRef をインポート
import { useSnackbar } from "notistack";

import styles from "./MedicationInputForm.module.css";

interface MedicationInputFormProps {
  groupId: string;
  currentUser: User;
  onRecordSuccess?: () => void; // 記録成功時のコールバック（任意）
  hideSubmitButton?: boolean; // ⭐ 個別の記録ボタンを非表示にするか
  // ⭐ バッチ入力用に追加: フォームの状態が変更されたことを親に通知
  onFormStateChange?: (
    isValid: boolean,
    hasInput: boolean,
    error: string | null
  ) => void;
}

const medicationStatusOptions: MedicationStatus[] = [
  "服用済",
  "未服用",
  "部分服用",
  "服用中止",
];

// ⭐ forwardRef を使用して、親コンポーネントからこのコンポーネントのメソッドを呼び出せるようにする
const MedicationInputForm = forwardRef<
  HealthInputFormRef,
  MedicationInputFormProps
>(
  (
    {
      groupId,
      currentUser,
      onRecordSuccess,
      hideSubmitButton = false, // デフォルトは表示
      onFormStateChange,
    },
    ref
  ) => {
    const { enqueueSnackbar } = useSnackbar();

    const [medicationName, setMedicationName] = useState<string>("");
    const [status, setStatus] = useState<MedicationStatus | "">(""); // デフォルトは空文字列
    const [dose, setDose] = useState<string>(""); // 用量 (stringで保持し、Firestore保存時に数値に変換)
    const [unit, setUnit] = useState<string>(""); // 単位
    const [notes, setNotes] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // ⭐ 入力値があるかどうかを判定する関数
    const hasInput = useCallback(() => {
      return (
        medicationName.trim() !== "" ||
        status !== "" ||
        dose !== "" ||
        unit.trim() !== "" ||
        notes.trim() !== ""
      );
    }, [medicationName, status, dose, unit, notes]);

    // ⭐ バリデーションロジックを分離
    const validateForm = useCallback(() => {
      // 全て空の場合はバリデーションOK
      if (!hasInput()) {
        return null;
      }

      // 必須フィールドのバリデーション
      if (!medicationName.trim() || !status) {
        return "薬の名前と服薬状況は必須項目です。";
      }

      // 用量の数値バリデーション
      const parsedDose = parseFloat(dose);
      if (dose && (isNaN(parsedDose) || parsedDose <= 0)) {
        return "用量は正の数値を入力してください。";
      }

      return null; // エラーがなければ null を返す
    }, [medicationName, status, dose, hasInput]);

    // ⭐ フォームの状態変更を親に通知
    useEffect(() => {
      const currentError = validateForm();
      const isValid = currentError === null;
      if (onFormStateChange) {
        onFormStateChange(isValid, hasInput(), currentError);
      }
      setError(currentError); // 内部のエラー状態も更新
    }, [
      medicationName,
      status,
      dose,
      unit,
      notes,
      onFormStateChange,
      validateForm,
      hasInput,
    ]);

    // ⭐ フォームをリセットする関数
    const resetForm = useCallback(() => {
      setMedicationName("");
      setStatus("");
      setDose("");
      setUnit("");
      setNotes("");
      setError(null);
    }, []);

    // ⭐ 記録処理のコアロジックを関数化
    const recordMedication = useCallback(async () => {
      if (!groupId || !currentUser.uid) {
        enqueueSnackbar("グループまたはユーザー情報が不足しています。", {
          variant: "error",
        });
        return false;
      }

      const validationError = validateForm();
      if (validationError) {
        setError(validationError); // 内部エラーもセット
        enqueueSnackbar(validationError, { variant: "error" });
        return false;
      }

      // 入力値が一つもない場合は記録しない（成功扱いにするか、何もしないか）
      if (!hasInput()) {
        resetForm();
        return true; // 記録するデータがないが、エラーではないので成功として扱う
      }

      setIsLoading(true);
      try {
        const parsedDose = parseFloat(dose);

        await addDoc(collection(db, "groups", groupId, "healthRecords"), {
          type: "medication", // 記録の種類を識別
          recordedBy: currentUser.uid,
          recordedAt: Timestamp.now(),
          medicationName: medicationName.trim(),
          status: status,
          dose: dose ? parsedDose : null,
          unit: unit.trim() || null,
          notes: notes.trim() || null,
          recordedDate: Timestamp.fromDate(new Date()), // 今日の日付
        });

        resetForm(); // 記録成功後にフォームをリセット
        if (onRecordSuccess) {
          onRecordSuccess();
        }

        enqueueSnackbar("服薬記録を登録しました！", { variant: "success" });
        return true;
      } catch (err) {
        console.error("服薬記録登録エラー:", err);
        setError("記録に失敗しました。もう一度お試しください。");
        enqueueSnackbar("記録に失敗しました。もう一度お試しください。", {
          variant: "error",
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    }, [
      groupId,
      currentUser,
      medicationName,
      status,
      dose,
      unit,
      notes,
      onRecordSuccess,
      enqueueSnackbar,
      validateForm,
      resetForm,
      hasInput,
    ]);

    // ⭐ 個別の記録ボタンクリック時のハンドラ
    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        await recordMedication();
      },
      [recordMedication]
    );

    // ⭐ useImperativeHandle を使用して、親コンポーネントにメソッドを公開
    useImperativeHandle(ref, () => ({
      getValues: () => ({
        medicationName,
        status,
        dose,
        unit,
        notes,
      }),
      validate: validateForm,
      resetForm: resetForm,
      submitFormExternally: recordMedication, // 外部からの記録トリガー
    }));

    const currentDisplayError = error;

    return (
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h3>服薬記録</h3>
        {currentDisplayError && (
          <p className={styles.errorText}>{currentDisplayError}</p>
        )}

        <div className={styles.inputGroup}>
          <label htmlFor="medicationName">
            薬の名前 <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="medicationName"
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            placeholder="例: 高血圧薬、食後薬"
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="status">
            服薬状況 <span className={styles.required}>*</span>
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MedicationStatus)}
            required
            className={styles.selectInput}
          >
            <option value="">選択してください</option>
            {medicationStatusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>用量・単位</label>
          <div className={styles.doseUnitInputs}>
            <input
              type="number"
              step="0.01"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="用量"
              className={styles.doseInput}
            />
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="単位 (例: 錠、ml)"
              className={styles.unitInput}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="notes">備考</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="特記事項や副作用など"
          ></textarea>
        </div>

        {!hideSubmitButton && ( // ⭐ hideSubmitButton が true の場合はボタンを非表示
          <button
            type="submit"
            disabled={isLoading || !!currentDisplayError} // エラーがある場合も無効化
            className={styles.submitButton}
          >
            {isLoading ? "記録中..." : "記録する"}
          </button>
        )}
      </form>
    );
  }
);

export default MedicationInputForm;
