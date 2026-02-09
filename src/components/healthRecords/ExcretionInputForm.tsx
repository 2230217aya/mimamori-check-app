// src/components/healthRecords/ExcretionInputForm.tsx

import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { type User } from "firebase/auth";
import {
  type UrineAmount,
  type UrineColor,
  type StoolShape,
  type StoolColor,
  type ExcretionPain,
  type HealthInputFormRef,
} from "../../types";
import { useSnackbar } from "notistack";

import styles from "./ExcretionInputForm.module.css";

interface ExcretionInputFormProps {
  groupId: string;
  currentUser: User;
  onRecordSuccess?: () => void;
  hideSubmitButton?: boolean;
  onFormStateChange?: (
    isValid: boolean,
    hasInput: boolean,
    error: string | null,
  ) => void;
}

const urineAmountOptions: UrineAmount[] = ["少量", "普通", "多量"];
const urineColorOptions: UrineColor[] = ["薄黄", "黄", "濃黄", "赤", "その他"];
const stoolShapeOptions: StoolShape[] = [
  "普通",
  "硬い",
  "軟らかい",
  "水様",
  "泥状",
  "その他",
];
const stoolColorOptions: StoolColor[] = [
  "黄土色",
  "茶色",
  "黒",
  "白",
  "赤",
  "その他",
];
const painOptions: ExcretionPain[] = ["なし", "あり"];

const ExcretionInputForm = forwardRef<
  HealthInputFormRef,
  ExcretionInputFormProps
>(
  (
    {
      groupId,
      currentUser,
      onRecordSuccess,
      hideSubmitButton = false,
      onFormStateChange,
    },
    ref,
  ) => {
    const { enqueueSnackbar } = useSnackbar();

    const [urineCount, setUrineCount] = useState<number>(0);
    const [urineAmount, setUrineAmount] = useState<UrineAmount | null>(null);
    const [urineColor, setUrineColor] = useState<UrineColor | null>(null);
    const [urineNotes, setUrineNotes] = useState<string>("");

    const [stoolCount, setStoolCount] = useState<number>(0);
    const [stoolShape, setStoolShape] = useState<StoolShape | null>(null);
    const [stoolColor, setStoolColor] = useState<StoolColor | null>(null);
    const [stoolNotes, setStoolNotes] = useState<string>("");

    const [pain, setPain] = useState<ExcretionPain | null>(null);
    const [overallNotes, setOverallNotes] = useState<string>("");

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // ⭐ 新しいStateを追加: ユーザーが入力中かどうかを判別
    const [isUrineCountEditing, setIsUrineCountEditing] =
      useState<boolean>(false);
    const [isStoolCountEditing, setIsStoolCountEditing] =
      useState<boolean>(false);
    // ⭐ 新しいStateを追加: inputの表示用
    const [urineCountInputValue, setUrineCountInputValue] =
      useState<string>("0");
    const [stoolCountInputValue, setStoolCountInputValue] =
      useState<string>("0");

    // ⭐ 初期化時に urineCountInputValue と stoolCountInputValue も設定
    useEffect(() => {
      setUrineCountInputValue(String(urineCount));
      setStoolCountInputValue(String(stoolCount));
    }, [urineCount, stoolCount]); // urineCountやstoolCountの内部状態が0以外に変わったときに表示も更新される

    const hasInput = useCallback(() => {
      return (
        urineCount > 0 || // 内部的な数値で判定
        urineAmount !== null ||
        urineColor !== null ||
        urineNotes !== "" ||
        stoolCount > 0 || // 内部的な数値で判定
        stoolShape !== null ||
        stoolColor !== null ||
        stoolNotes !== "" ||
        pain !== null ||
        overallNotes !== ""
      );
    }, [
      urineCount,
      urineAmount,
      urineColor,
      urineNotes,
      stoolCount,
      stoolShape,
      stoolColor,
      stoolNotes,
      pain,
      overallNotes,
    ]);

    const validateForm = useCallback(() => {
      if (!hasInput()) {
        return null;
      }

      // urineCountInputValue や stoolCountInputValue ではなく、
      // 内部的な urineCount / stoolCount (数値) を使用してバリデーション
      if (urineCount < 0 || stoolCount < 0) {
        return "回数は0以上の値を入力してください。";
      }

      if (urineCount > 0 && (urineAmount === null || urineColor === null)) {
        return "排尿回数を入力した場合は、量と色も選択してください。";
      }

      if (stoolCount > 0 && (stoolShape === null || stoolColor === null)) {
        return "排便回数を入力した場合は、形状と色も選択してください。";
      }

      // 入力があるのに回数が両方0の場合もエラーとする
      if (hasInput() && urineCount === 0 && stoolCount === 0) {
        return "排尿または排便の回数を入力してください。";
      }

      return null;
    }, [
      urineCount,
      urineAmount,
      urineColor,
      stoolCount,
      stoolShape,
      stoolColor,
      hasInput,
    ]);

    // ⭐ フォームの状態変更を親に通知する useEffect はそのまま
    useEffect(() => {
      const currentError = validateForm();
      const isValid = currentError === null;
      if (onFormStateChange) {
        onFormStateChange(isValid, hasInput(), currentError);
      }
      setError(currentError);
    }, [
      urineCount,
      urineAmount,
      urineColor,
      urineNotes,
      stoolCount,
      stoolShape,
      stoolColor,
      stoolNotes,
      pain,
      overallNotes,
      onFormStateChange,
      validateForm,
      hasInput,
    ]);

    // ⭐ フォームをリセットする関数を修正
    const resetForm = useCallback(() => {
      setUrineCount(0);
      setUrineAmount(null);
      setUrineColor(null);
      setUrineNotes("");
      setStoolCount(0);
      setStoolShape(null);
      setStoolColor(null);
      setStoolNotes("");
      setPain(null);
      setOverallNotes("");
      setError(null);
      // ⭐ 入力表示用のStateもリセット
      setUrineCountInputValue("0");
      setStoolCountInputValue("0");
      setIsUrineCountEditing(false);
      setIsStoolCountEditing(false);
    }, []);

    const recordExcretion = useCallback(async () => {
      if (!groupId || !currentUser.uid) {
        enqueueSnackbar("グループまたはユーザー情報が不足しています。", {
          variant: "error",
        });
        return false;
      }

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        enqueueSnackbar(validationError, { variant: "error" });
        return false;
      }

      if (!hasInput()) {
        resetForm();
        return true;
      }

      setIsLoading(true);
      try {
        await addDoc(collection(db, "groups", groupId, "healthRecords"), {
          type: "excretion",
          recordedBy: currentUser.uid,
          recordedAt: Timestamp.now(),
          // ⭐ 内部的な数値の状態を使用
          urineCount,
          urineAmount,
          urineColor,
          urineNotes: urineNotes.trim(),
          // ⭐ 内部的な数値の状態を使用
          stoolCount,
          stoolShape,
          stoolColor,
          stoolNotes: stoolNotes.trim(),
          pain,
          overallNotes: overallNotes.trim(),
        });

        resetForm();
        if (onRecordSuccess) {
          onRecordSuccess();
        }
        enqueueSnackbar("排泄記録を記録しました！", { variant: "success" });
        return true;
      } catch (err) {
        console.error("排泄記録エラー:", err);
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
      urineCount,
      urineAmount,
      urineColor,
      urineNotes,
      stoolCount,
      stoolShape,
      stoolColor,
      stoolNotes,
      pain,
      overallNotes,
      onRecordSuccess,
      enqueueSnackbar,
      validateForm,
      resetForm,
      hasInput,
    ]);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        await recordExcretion();
      },
      [recordExcretion],
    );

    useImperativeHandle(ref, () => ({
      getValues: () => ({
        urineCount,
        urineAmount,
        urineColor,
        urineNotes,
        stoolCount,
        stoolShape,
        stoolColor,
        stoolNotes,
        pain,
        overallNotes,
      }),
      validate: validateForm,
      resetForm: resetForm,
      submitFormExternally: recordExcretion,
    }));

    const currentDisplayError = error;

    // ⭐ 排尿回数入力フィールドの変更ハンドラ
    const handleUrineCountInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUrineCountInputValue(value); // 表示用のstateを更新
        if (value === "") {
          setUrineCount(0); // 内部stateは0にする
          setIsUrineCountEditing(false); // 入力がないので編集状態ではない
        } else {
          const parsedValue = parseInt(value, 10);
          if (!isNaN(parsedValue)) {
            setUrineCount(Math.max(0, parsedValue)); // 有効な数値なら内部stateも更新
          }
          setIsUrineCountEditing(true); // 入力中
        }
      },
      [],
    );

    // ⭐ 排便回数入力フィールドの変更ハンドラ
    const handleStoolCountInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setStoolCountInputValue(value); // 表示用のstateを更新
        if (value === "") {
          setStoolCount(0); // 内部stateは0にする
          setIsStoolCountEditing(false); // 入力がないので編集状態ではない
        } else {
          const parsedValue = parseInt(value, 10);
          if (!isNaN(parsedValue)) {
            setStoolCount(Math.max(0, parsedValue)); // 有効な数値なら内部stateも更新
          }
          setIsStoolCountEditing(true); // 入力中
        }
      },
      [],
    );

    return (
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h3>排泄記録</h3>
        {currentDisplayError && (
          <p className={styles.errorText}>{currentDisplayError}</p>
        )}

        <div className={styles.section}>
          <h4>排尿</h4>
          <div className={styles.inputGroup}>
            <label htmlFor="urineCount">回数</label>
            <input
              type="number"
              id="urineCount"
              min="0"
              // ⭐ value の表示ロジックを修正
              value={isUrineCountEditing ? urineCountInputValue : urineCount}
              onChange={handleUrineCountInputChange}
              onFocus={() => setIsUrineCountEditing(true)} // フォーカス時に入力中とする
              onBlur={() => {
                // フォーカスが外れたら入力完了とする
                setIsUrineCountEditing(false);
                // 値が空の場合は内部状態と表示を0にリセット
                if (urineCountInputValue === "") {
                  setUrineCount(0);
                  setUrineCountInputValue("0");
                }
              }}
            />
          </div>

          {urineCount > 0 && ( // ⭐ 内部の urineCount (数値) で条件を判断
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="urineAmount">量</label>
                <select
                  id="urineAmount"
                  value={urineAmount || ""}
                  onChange={(e) =>
                    setUrineAmount(e.target.value as UrineAmount)
                  }
                >
                  <option value="">選択してください</option>
                  {urineAmountOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="urineColor">色</label>
                <select
                  id="urineColor"
                  value={urineColor || ""}
                  onChange={(e) => setUrineColor(e.target.value as UrineColor)}
                >
                  <option value="">選択してください</option>
                  {urineColorOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="urineNotes">備考</label>
                <textarea
                  id="urineNotes"
                  value={urineNotes}
                  onChange={(e) => setUrineNotes(e.target.value)}
                  rows={2}
                  placeholder="排尿に関する特記事項"
                ></textarea>
              </div>
            </>
          )}
        </div>

        <div className={styles.section}>
          <h4>排便</h4>
          <div className={styles.inputGroup}>
            <label htmlFor="stoolCount">回数</label>
            <input
              type="number"
              id="stoolCount"
              min="0"
              // ⭐ value の表示ロジックを修正
              value={isStoolCountEditing ? stoolCountInputValue : stoolCount}
              onChange={handleStoolCountInputChange}
              onFocus={() => setIsStoolCountEditing(true)}
              onBlur={() => {
                setIsStoolCountEditing(false);
                if (stoolCountInputValue === "") {
                  setStoolCount(0);
                  setStoolCountInputValue("0");
                }
              }}
            />
          </div>

          {stoolCount > 0 && ( // ⭐ 内部の stoolCount (数値) で条件を判断
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="stoolShape">形状</label>
                <select
                  id="stoolShape"
                  value={stoolShape || ""}
                  onChange={(e) => setStoolShape(e.target.value as StoolShape)}
                >
                  <option value="">選択してください</option>
                  {stoolShapeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="stoolColor">色</label>
                <select
                  id="stoolColor"
                  value={stoolColor || ""}
                  onChange={(e) => setStoolColor(e.target.value as StoolColor)}
                >
                  <option value="">選択してください</option>
                  {stoolColorOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="stoolNotes">備考</label>
                <textarea
                  id="stoolNotes"
                  value={stoolNotes}
                  onChange={(e) => setStoolNotes(e.target.value)}
                  rows={2}
                  placeholder="排便に関する特記事項"
                ></textarea>
              </div>
            </>
          )}
        </div>

        {/* ... (その他のセクションとボタン) ... */}
        <div className={styles.section}>
          <h4>その他</h4>
          <div className={styles.inputGroup}>
            <label htmlFor="pain">排泄時の痛み</label>
            <select
              id="pain"
              value={pain || ""}
              onChange={(e) => setPain(e.target.value as ExcretionPain)}
            >
              <option value="">選択してください</option>
              {painOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="overallNotes">全体的な備考</label>
            <textarea
              id="overallNotes"
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              rows={3}
              placeholder="全体的な特記事項があれば入力してください"
            ></textarea>
          </div>
        </div>

        {!hideSubmitButton && (
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
  },
);

export default ExcretionInputForm;
