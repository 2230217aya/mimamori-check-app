// src/components/healthRecords/VitalSignInputForm.tsx (微修正)

import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { type User } from "firebase/auth";
import { useSnackbar } from "notistack";
import { type HealthInputFormRef } from "../../types";

import styles from "./VitalSignInputForm.module.css";

interface VitalSignInputFormProps {
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

const VitalSignInputForm = forwardRef<
  HealthInputFormRef,
  VitalSignInputFormProps
>(
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

    const [temperature, setTemperature] = useState<string>("");
    const [systolic, setSystolic] = useState<string>("");
    const [diastolic, setDiastolic] = useState<string>("");
    const [spo2, setSpo2] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const hasInput = useCallback(() => {
      return (
        temperature !== "" ||
        systolic !== "" ||
        diastolic !== "" ||
        spo2 !== "" ||
        notes !== ""
      );
    }, [temperature, systolic, diastolic, spo2, notes]);

    const validateForm = useCallback(() => {
      if (!hasInput()) {
        return null;
      }

      const parsedTemp = parseFloat(temperature);
      const parsedSystolic = parseInt(systolic, 10);
      const parsedDiastolic = parseInt(diastolic, 10);
      const parsedSpo2 = parseInt(spo2, 10);

      if (
        (temperature &&
          (isNaN(parsedTemp) || parsedTemp < 34 || parsedTemp > 42)) ||
        (systolic &&
          (isNaN(parsedSystolic) ||
            parsedSystolic < 50 ||
            parsedSystolic > 250)) ||
        (diastolic &&
          (isNaN(parsedDiastolic) ||
            parsedDiastolic < 30 ||
            parsedDiastolic > 150)) ||
        (spo2 && (isNaN(parsedSpo2) || parsedSpo2 < 70 || parsedSpo2 > 100))
      ) {
        return "入力された数値が不適切です。正しい値を入力してください。";
      }
      return null;
    }, [temperature, systolic, diastolic, spo2, hasInput]);

    // ⭐ 依存配列に hasInput と validateForm を追加
    React.useEffect(() => {
      const currentError = validateForm();
      const isValid = currentError === null;
      if (onFormStateChange) {
        onFormStateChange(isValid, hasInput(), currentError);
      }
      setError(currentError);
    }, [
      temperature,
      systolic,
      diastolic,
      spo2,
      notes,
      onFormStateChange,
      validateForm,
      hasInput,
    ]);

    const resetForm = useCallback(() => {
      setTemperature("");
      setSystolic("");
      setDiastolic("");
      setSpo2("");
      setNotes("");
      setError(null);
    }, []);

    const recordVitalSigns = useCallback(async () => {
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
          type: "vitalSign",
          recordedBy: currentUser.uid,
          recordedAt: Timestamp.now(),
          temperature: temperature ? parseFloat(temperature) : null,
          bloodPressure:
            systolic && diastolic
              ? {
                  systolic: parseInt(systolic, 10),
                  diastolic: parseInt(diastolic, 10),
                }
              : null,
          spo2: spo2 ? parseInt(spo2, 10) : null,
          notes: notes.trim(),
        });

        resetForm();
        if (onRecordSuccess) {
          onRecordSuccess();
        }
        enqueueSnackbar("バイタルサインを記録しました！", {
          variant: "success",
        });
        return true;
      } catch (err) {
        console.error("バイタルサイン記録エラー:", err);
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
      temperature,
      systolic,
      diastolic,
      spo2,
      notes,
      onRecordSuccess,
      enqueueSnackbar,
      validateForm,
      resetForm,
      hasInput,
    ]);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        await recordVitalSigns();
      },
      [recordVitalSigns]
    );

    useImperativeHandle(ref, () => ({
      getValues: () => ({
        temperature,
        systolic,
        diastolic,
        spo2,
        notes,
      }),
      validate: validateForm,
      resetForm: resetForm,
      submitFormExternally: recordVitalSigns,
    }));

    const currentDisplayError = error;

    return (
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h3>バイタルサイン記録</h3>
        {currentDisplayError && (
          <p className={styles.errorText}>{currentDisplayError}</p>
        )}
        <div className={styles.inputGroup}>
          <label htmlFor="temperature">体温 (℃)</label>
          <input
            type="number"
            step="0.1"
            id="temperature"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="例: 36.5"
          />
        </div>
        <div className={styles.inputGroup}>
          <label>血圧 (mmHg)</label>
          <div className={styles.bloodPressureInputs}>
            <input
              type="number"
              id="systolic"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="最高"
            />
            <span>/</span>
            <input
              type="number"
              id="diastolic"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="最低"
            />
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="spo2">SPO2 (%)</label>
          <input
            type="number"
            id="spo2"
            value={spo2}
            onChange={(e) => setSpo2(e.target.value)}
            placeholder="例: 98"
          />
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
  }
);

export default VitalSignInputForm;
