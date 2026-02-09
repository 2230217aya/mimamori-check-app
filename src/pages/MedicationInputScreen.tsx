// src/pages/healthRecords/MedicationInputScreen.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase"; // firebaseパスを調整

import MedicationInputForm from "../components/healthRecords/MedicationInputForm"; // ⭐ 作成したフォームコンポーネント
import styles from "./VitalSignInputScreen.module.css"; // ⭐ 新規CSS

const MedicationInputScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // URLからgroupIdを取得
  useEffect(() => {
    const urlGroupId = searchParams.get("group_id");
    setGroupId(urlGroupId);
  }, [searchParams]);

  const handleGoBack = useCallback(() => {
    if (groupId) {
      navigate(`/health-records-dashboard?group_id=${groupId}`);
    } else {
      navigate("/health-records-dashboard"); // グループIDがない場合のフォールバック
    }
  }, [navigate, groupId]);

  const handleRecordSuccess = useCallback(() => {
    // 記録成功時のアラートはフォーム側で行われるので、ここではダッシュボードへの遷移のみ
    handleGoBack();
  }, [handleGoBack]);

  if (!currentUser) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleGoBack} className={styles.backButton}>
            &lt; 戻る
          </button>
          <h2 className={styles.pageTitle}>服薬記録</h2>
        </div>
        <p style={{ textAlign: "center", color: "#6c757d" }}>
          ログインしていません。
        </p>
      </div>
    );
  }

  if (!groupId) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleGoBack} className={styles.backButton}>
            &lt; 戻る
          </button>
          <h2 className={styles.pageTitle}>服薬記録</h2>
        </div>
        <p style={{ textAlign: "center", color: "#6c757d" }}>
          グループが選択されていません。
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleGoBack} className={styles.backButton}>
          &lt; 戻る
        </button>
        <h2 className={styles.pageTitle}>服薬記録</h2>
      </div>
      <MedicationInputForm
        groupId={groupId}
        currentUser={currentUser}
        onRecordSuccess={handleRecordSuccess}
      />
    </div>
  );
};

export default MedicationInputScreen;
