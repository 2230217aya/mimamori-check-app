// src/components/healthRecords/MealInputForm.tsx

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
import {
  type MealTime,
  type FluidType,
  type HealthInputFormRef,
  type DishAmount, // ⭐ DishAmount をインポート
} from "../../types";
import { useSnackbar } from "notistack";

import styles from "./MealInputForm.module.css";

interface MealInputFormProps {
  groupId: string;
  currentUser: User;
  onRecordSuccess?: () => void;
  hideSubmitButton?: boolean;
  onFormStateChange?: (
    isValid: boolean,
    hasInput: boolean,
    error: string | null
  ) => void;
}

const mealTimeOptions: MealTime[] = ["朝食", "昼食", "夕食", "間食", "その他"];
const amountOptions: DishAmount[] = ["完食", "8割", "5割", "3割", "なし"]; // ⭐ 型を DishAmount に
const fluidTypeOptions: FluidType[] = [
  "水",
  "お茶",
  "ジュース",
  "牛乳",
  "その他",
];

const MealInputForm = forwardRef<HealthInputFormRef, MealInputFormProps>(
  (
    {
      groupId,
      currentUser,
      onRecordSuccess,
      hideSubmitButton = false,
      onFormStateChange,
    },
    ref
  ) => {
    const { enqueueSnackbar } = useSnackbar();

    const [selectedMealTimes, setSelectedMealTimes] = useState<MealTime[]>([]);
    const [stapleFood, setStapleFood] = useState<DishAmount | null>(null); // ⭐ 型を DishAmount に
    const [mainDish, setMainDish] = useState<DishAmount | null>(null); // ⭐ 型を DishAmount に
    const [sideDish, setSideDish] = useState<DishAmount | null>(null); // ⭐ 型を DishAmount に
    const [selectedFluidTypes, setSelectedFluidTypes] = useState<FluidType[]>(
      []
    );
    const [fluidAmount, setFluidAmount] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleMealTimeChange = useCallback((time: MealTime) => {
      setSelectedMealTimes((prev) =>
        prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
      );
    }, []);

    const handleFluidTypeChange = useCallback((type: FluidType) => {
      setSelectedFluidTypes((prev) =>
        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      );
    }, []);

    // ⭐ 入力値があるかどうかを判定する関数
    const hasInput = useCallback(() => {
      return (
        selectedMealTimes.length > 0 ||
        stapleFood !== null ||
        mainDish !== null ||
        sideDish !== null ||
        selectedFluidTypes.length > 0 ||
        fluidAmount !== "" ||
        notes !== ""
      );
    }, [
      selectedMealTimes,
      stapleFood,
      mainDish,
      sideDish,
      selectedFluidTypes,
      fluidAmount,
      notes,
    ]);

    // ⭐ バリデーションロジックを分離
    const validateForm = useCallback(() => {
      // 全て空の場合はバリデーションOK（入力がないのでエラーではない）
      if (!hasInput()) {
        return null;
      }

      // 食事の種類が選択されている場合、最低でもどれか一つの食事量も選択されているかチェック
      if (selectedMealTimes.length > 0) {
        if (stapleFood === null && mainDish === null && sideDish === null) {
          return "食事の種類を選択した場合は、主食、主菜、副菜のいずれかの量を記録してください。";
        }
      }

      const parsedFluidAmount = fluidAmount ? parseInt(fluidAmount, 10) : null;
      if (
        fluidAmount &&
        (isNaN(parsedFluidAmount!) || parsedFluidAmount! < 0)
      ) {
        return "水分摂取量は正の数で入力してください。";
      }

      return null; // エラーがなければ null を返す
    }, [
      selectedMealTimes,
      stapleFood,
      mainDish,
      sideDish,
      fluidAmount,
      hasInput,
    ]);

    // ⭐ フォームの状態変更を親に通知
    useEffect(() => {
      const currentError = validateForm();
      const isValid = currentError === null;
      if (onFormStateChange) {
        onFormStateChange(isValid, hasInput(), currentError);
      }
      setError(currentError); // 内部のエラー状態も更新
    }, [
      selectedMealTimes,
      stapleFood,
      mainDish,
      sideDish,
      selectedFluidTypes,
      fluidAmount,
      notes,
      onFormStateChange,
      validateForm,
      hasInput,
    ]);

    // ⭐ フォームをリセットする関数
    const resetForm = useCallback(() => {
      setSelectedMealTimes([]);
      setStapleFood(null);
      setMainDish(null);
      setSideDish(null);
      setSelectedFluidTypes([]);
      setFluidAmount("");
      setNotes("");
      setError(null);
    }, []);

    // ⭐ 記録処理のコアロジックを関数化
    const recordMeal = useCallback(async () => {
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
        const parsedFluidAmount = fluidAmount
          ? parseInt(fluidAmount, 10)
          : null;

        await addDoc(collection(db, "groups", groupId, "healthRecords"), {
          type: "meal",
          recordedBy: currentUser.uid,
          recordedAt: Timestamp.now(),
          mealTime: selectedMealTimes,
          stapleFoodAmount: stapleFood,
          mainDishAmount: mainDish,
          sideDishAmount: sideDish,
          fluidType: selectedFluidTypes,
          fluidAmount: parsedFluidAmount,
          notes: notes.trim(),
          recordedDate: Timestamp.fromDate(new Date()), // 今日の日付
        });

        resetForm(); // 記録成功後にフォームをリセット
        if (onRecordSuccess) {
          onRecordSuccess();
        }
        enqueueSnackbar("食事・水分摂取を記録しました！", {
          variant: "success",
        });
        return true;
      } catch (err) {
        console.error("食事・水分摂取記録エラー:", err);
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
      selectedMealTimes,
      stapleFood,
      mainDish,
      sideDish,
      selectedFluidTypes,
      fluidAmount,
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
        await recordMeal();
      },
      [recordMeal]
    );

    // ⭐ useImperativeHandle を使用して、親コンポーネントにメソッドを公開
    useImperativeHandle(ref, () => ({
      getValues: () => ({
        selectedMealTimes,
        stapleFood,
        mainDish,
        sideDish,
        selectedFluidTypes,
        fluidAmount,
        notes,
      }),
      validate: validateForm,
      resetForm: resetForm,
      submitFormExternally: recordMeal, // 外部からの記録トリガー
    }));

    const currentDisplayError = error;

    return (
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h3>食事・水分摂取記録</h3>
        {currentDisplayError && (
          <p className={styles.errorText}>{currentDisplayError}</p>
        )}

        <div className={styles.inputGroup}>
          <label>食事の種類</label>
          <div className={styles.checkboxGroup}>
            {mealTimeOptions.map((time) => (
              <label key={time} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedMealTimes.includes(time)}
                  onChange={() => handleMealTimeChange(time)}
                />
                {time}
              </label>
            ))}
          </div>
        </div>

        {selectedMealTimes.length > 0 && (
          <>
            <div className={styles.inputGroup}>
              <label htmlFor="stapleFood">主食量</label>
              <select
                id="stapleFood"
                value={stapleFood || ""}
                onChange={(e) => setStapleFood(e.target.value as DishAmount)} // ⭐ 型アサーション
              >
                <option value="">選択してください</option>
                {amountOptions.map((amount) => (
                  <option key={amount} value={amount}>
                    {amount}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="mainDish">主菜量</label>
              <select
                id="mainDish"
                value={mainDish || ""}
                onChange={(e) => setMainDish(e.target.value as DishAmount)} // ⭐ 型アサーション
              >
                <option value="">選択してください</option>
                {amountOptions.map((amount) => (
                  <option key={amount} value={amount}>
                    {amount}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="sideDish">副菜量</label>
              <select
                id="sideDish"
                value={sideDish || ""}
                onChange={(e) => setSideDish(e.target.value as DishAmount)} // ⭐ 型アサーション
              >
                <option value="">選択してください</option>
                {amountOptions.map((amount) => (
                  <option key={amount} value={amount}>
                    {amount}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className={styles.inputGroup}>
          <label>水分摂取</label>
          <div className={styles.checkboxGroup}>
            {fluidTypeOptions.map((type) => (
              <label key={type} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedFluidTypes.includes(type)}
                  onChange={() => handleFluidTypeChange(type)}
                />
                {type}
              </label>
            ))}
          </div>
          {selectedFluidTypes.length > 0 && (
            <div className={styles.fluidAmountInput}>
              <input
                type="number"
                value={fluidAmount}
                onChange={(e) => setFluidAmount(e.target.value)}
                placeholder="摂取量 (ml)"
                min="0"
              />
              <span>ml</span>
            </div>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="notes">備考</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="特記事項があれば入力してください"
          ></textarea>
        </div>

        {!hideSubmitButton && ( // ⭐ hideSubmitButton が true の場合はボタンを非表示
          <button
            type="submit"
            disabled={isLoading || !!currentDisplayError}
            className={styles.submitButton}
          >
            {isLoading ? "記録中..." : "記録する"}
          </button>
        )}
      </form>
    );
  }
);

export default MealInputForm;
