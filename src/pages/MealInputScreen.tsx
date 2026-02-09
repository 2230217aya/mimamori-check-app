// src/pages/healthRecords/MealInputScreen.tsx (新規作成)

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase";

import MealInputForm from "../components/healthRecords/MealInputForm"; // ⭐ 作成したフォームコンポーネント
import styles from "./MealInputScreen.module.css"; // ⭐ 新規CSS

const MealInputScreen: React.FC = () => {
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
      navigate("/health-records-dashboard");
    }
  }, [navigate, groupId]);

  const handleRecordSuccess = useCallback(() => {
    // alert("食事・水分摂取の記録が完了しました！");
    handleGoBack();
  }, [handleGoBack]);

  if (!currentUser) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleGoBack} className={styles.backButton}>
            &lt; 戻る
          </button>
          <h2 className={styles.pageTitle}>食事・水分摂取記録</h2>
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
          <h2 className={styles.pageTitle}>食事・水分摂取記録</h2>
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
        <h2 className={styles.pageTitle}>食事・水分摂取記録</h2>
      </div>
      <MealInputForm
        groupId={groupId}
        currentUser={currentUser}
        onRecordSuccess={handleRecordSuccess}
      />
    </div>
  );
};

export default MealInputScreen;
