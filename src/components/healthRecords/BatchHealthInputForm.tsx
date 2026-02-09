// src/components/healthRecords/BatchHealthInputForm.tsx

import React, { useState, useCallback, useRef } from "react";
import { type User } from "firebase/auth";
import { useSnackbar } from "notistack";
import { type HealthInputFormRef } from "../../types";

// 各入力フォームコンポーネントをインポート
import VitalSignInputForm from "./VitalSignInputForm";
import MealInputForm from "./MealInputForm";
import ExcretionInputForm from "./ExcretionInputForm";
import MedicationInputForm from "./MedicationInputForm";

import styles from "./BatchHealthInputForm.module.css";

interface BatchHealthInputFormProps {
  groupId: string;
  currentUser: User;
  onAllRecordsSuccess?: () => void; // 全ての記録が成功した際のコールバック
}

// ⭐ 各フォームの状態を管理するための型（isSubmitting は不要）
interface FormState {
  isValid: boolean;
  hasInput: boolean;
  error: string | null;
}

const BatchHealthInputForm: React.FC<BatchHealthInputFormProps> = ({
  groupId,
  currentUser,
  onAllRecordsSuccess,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  // ⭐ 各フォームの ref を保持
  const vitalSignFormRef = useRef<HealthInputFormRef>(null);
  const mealFormRef = useRef<HealthInputFormRef>(null);
  const excretionFormRef = useRef<HealthInputFormRef>(null);
  const medicationFormRef = useRef<HealthInputFormRef>(null);

  // ⭐ 各フォームの状態を管理する State
  const [vitalSignFormState, setVitalSignFormState] = useState<FormState>({
    isValid: true,
    hasInput: false,
    error: null,
  });
  const [mealFormState, setMealFormState] = useState<FormState>({
    isValid: true,
    hasInput: false,
    error: null,
  }); // ⭐ isSubmitting を削除
  const [excretionFormState, setExcretionFormState] = useState<FormState>({
    isValid: true,
    hasInput: false,
    error: null,
  });
  const [medicationFormState, setMedicationFormState] = useState<FormState>({
    isValid: true,
    hasInput: false,
    error: null,
  });

  const [isBatchSubmitting, setIsBatchSubmitting] = useState<boolean>(false);

  // ⭐ 各フォームの onFormStateChange ハンドラ
  const handleVitalSignFormStateChange = useCallback(
    (isValid: boolean, hasInput: boolean, error: string | null) => {
      setVitalSignFormState((prev) => ({ ...prev, isValid, hasInput, error }));
    },
    []
  );

  const handleMealFormStateChange = useCallback(
    (isValid: boolean, hasInput: boolean, error: string | null) => {
      setMealFormState((prev) => ({ ...prev, isValid, hasInput, error }));
    },
    []
  );

  const handleExcretionFormStateChange = useCallback(
    (isValid: boolean, hasInput: boolean, error: string | null) => {
      setExcretionFormState((prev) => ({ ...prev, isValid, hasInput, error }));
    },
    []
  );

  const handleMedicationFormStateChange = useCallback(
    (isValid: boolean, hasInput: boolean, error: string | null) => {
      setMedicationFormState((prev) => ({ ...prev, isValid, hasInput, error }));
    },
    []
  );

  // ⭐ 一括記録ボタンが有効かどうかを判断
  const isBatchSubmitButtonDisabled = React.useMemo(() => {
    // 少なくとも一つのフォームに入力があること
    const hasAnyInput =
      vitalSignFormState.hasInput ||
      mealFormState.hasInput ||
      excretionFormState.hasInput ||
      medicationFormState.hasInput;

    // 全てのフォームが有効（エラーがない）であること
    const allFormsValid =
      vitalSignFormState.isValid &&
      mealFormState.isValid &&
      excretionFormState.isValid &&
      medicationFormState.isValid;

    // 全体送信中か、入力がない、または無効なフォームがある場合は無効
    return isBatchSubmitting || !hasAnyInput || !allFormsValid;
  }, [
    isBatchSubmitting,
    vitalSignFormState.isValid,
    vitalSignFormState.hasInput,
    mealFormState.isValid,
    mealFormState.hasInput,
    excretionFormState.isValid,
    excretionFormState.hasInput,
    medicationFormState.isValid,
    medicationFormState.hasInput,
  ]);

  // ⭐ 入力値があるかをより汎用的にチェックするヘルパー関数
  const hasFormInput = useCallback(
    (values: { [key: string]: any }): boolean => {
      if (!values) return false;
      for (const key in values) {
        const value = values[key];
        if (value === null || value === undefined) continue;

        if (typeof value === "string") {
          if (value.trim() !== "") return true;
        } else if (typeof value === "number") {
          // 0も有効な入力とみなす
          return true;
        } else if (Array.isArray(value)) {
          if (value.length > 0) return true;
        } else if (typeof value === "object" && !Array.isArray(value)) {
          // オブジェクトの場合、その中の値もチェック
          if (hasFormInput(value)) return true;
        }
      }
      return false;
    },
    []
  );

  // ⭐ 一括記録処理
  const handleBatchSubmit = useCallback(async () => {
    setIsBatchSubmitting(true);
    let allRecordsSuccess = true;
    const recordsAttemptedPromises: Promise<boolean>[] = [];

    // フォームの参照を配列にまとめる
    const formRefs = [
      vitalSignFormRef.current,
      mealFormRef.current,
      excretionFormRef.current,
      medicationFormRef.current,
    ].filter(Boolean); // nullやundefinedを除外

    // まず全てのフォームでバリデーションを実行し、エラーがあれば即座に中断
    for (const formRef of formRefs) {
      if (formRef) {
        const error = formRef.validate();
        if (error) {
          enqueueSnackbar(`入力エラー: ${error}`, { variant: "error" });
          setIsBatchSubmitting(false); // 送信を停止
          return; // 処理中断
        }
      }
    }

    // 各フォームの記録を試みる（入力がある場合のみ）
    for (const formRef of formRefs) {
      if (formRef && formRef.getValues) {
        const values = formRef.getValues();
        if (hasFormInput(values)) {
          // ⭐ 新しいヘルパー関数を使用
          recordsAttemptedPromises.push(formRef.submitFormExternally());
        }
      }
    }

    if (recordsAttemptedPromises.length === 0) {
      enqueueSnackbar("入力された記録がありません。", { variant: "info" });
      setIsBatchSubmitting(false);
      return;
    }

    // 全ての記録処理が完了するのを待つ
    const results = await Promise.all(recordsAttemptedPromises);
    allRecordsSuccess = results.every(Boolean); // 全ての記録が成功したかを確認

    if (allRecordsSuccess) {
      enqueueSnackbar("全ての記録をまとめて記録しました！", {
        variant: "success",
      });
      if (onAllRecordsSuccess) {
        onAllRecordsSuccess();
      }
    } else {
      enqueueSnackbar("一部の記録に失敗しました。", { variant: "error" });
    }
    setIsBatchSubmitting(false);
  }, [
    enqueueSnackbar,
    onAllRecordsSuccess,
    // refオブジェクト自体を依存配列に入れる
    vitalSignFormRef,
    mealFormRef,
    excretionFormRef,
    medicationFormRef,
    hasFormInput, // ⭐ ヘルパー関数も依存配列に追加
  ]);

  return (
    <div className={styles.batchFormContainer}>
      <h3 className={styles.batchFormTitle}>今日の記録をまとめて入力</h3>

      {/* ⭐ バイタルサイン入力フォーム */}
      <div className={styles.formSection}>
        <VitalSignInputForm
          ref={vitalSignFormRef}
          groupId={groupId}
          currentUser={currentUser}
          hideSubmitButton={true}
          onFormStateChange={handleVitalSignFormStateChange}
        />
      </div>

      {/* ⭐ 食事・水分摂取入力フォーム */}
      <div className={styles.formSection}>
        <MealInputForm
          ref={mealFormRef}
          groupId={groupId}
          currentUser={currentUser}
          hideSubmitButton={true}
          onFormStateChange={handleMealFormStateChange}
        />
      </div>

      {/* ⭐ 排泄入力フォーム (仮) */}
      <div className={styles.formSection}>
        <ExcretionInputForm
          ref={excretionFormRef}
          groupId={groupId}
          currentUser={currentUser}
          hideSubmitButton={true}
          onFormStateChange={handleExcretionFormStateChange}
        />
      </div>

      {/* ⭐ 服薬入力フォーム (仮) */}
      <div className={styles.formSection}>
        <MedicationInputForm
          ref={medicationFormRef}
          groupId={groupId}
          currentUser={currentUser}
          hideSubmitButton={true}
          onFormStateChange={handleMedicationFormStateChange}
        />
      </div>

      {/* ⭐ 一括記録ボタン */}
      <button
        type="button"
        onClick={handleBatchSubmit}
        disabled={isBatchSubmitButtonDisabled}
        className={styles.batchSubmitButton}
      >
        {isBatchSubmitting ? "記録中..." : "まとめて記録する"}
      </button>
    </div>
  );
};

export default BatchHealthInputForm;
