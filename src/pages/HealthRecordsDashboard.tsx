// src/pages/HealthRecordsDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  type UserNameMap,
  type Group,
  type VitalSignRecord,
  type MealRecord,
  type ExcretionRecord,
  type MedicationRecord,
} from "../types";

import HealthRecordSection from "../components/healthRecords/HealthRecordSection"; // ⭐ 新規
import VitalSignOverviewCard from "../components/healthRecords/VitalSignOverviewCard"; // ⭐ 新規
import MealOverviewCard from "../components/healthRecords/MealOverviewCard"; // ⭐ 新規
import ExcretionOverviewCard from "../components/healthRecords/ExcretionOverviewCard.tsx"; // ⭐ 新規
import MedicationOverviewCard from "../components/healthRecords/MedicationOverviewCard"; // ⭐ MedicationOverviewCard をインポート

import styles from "./HealthRecordsDashboard.module.css"; // 親のCSSは残す

const HealthRecordsDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [userNames, setUserNames] = useState<UserNameMap>({});
  const [isLoadingGroupInfo, setIsLoadingGroupInfo] = useState<boolean>(true);

  // ⭐ 最新のバイタルサイン記録を保持するState
  const [latestVitalSign, setLatestVitalSign] =
    useState<VitalSignRecord | null>(null);
  const [isLoadingVitalSign, setIsLoadingVitalSign] = useState<boolean>(false);

  // ⭐ 最新の食事記録を保持するState
  const [latestMealRecord, setLatestMealRecord] = useState<MealRecord | null>(
    null
  );
  const [isLoadingMealRecord, setIsLoadingMealRecord] =
    useState<boolean>(false);

  // ⭐ 最新の排泄記録を保持するState
  const [latestExcretionRecord, setLatestExcretionRecord] =
    useState<ExcretionRecord | null>(null);
  const [isLoadingExcretionRecord, setIsLoadingExcretionRecord] =
    useState<boolean>(false);

  // ⭐ 最新の服薬記録を保持するState
  const [latestMedicationRecord, setLatestMedicationRecord] =
    useState<MedicationRecord | null>(null);
  const [isLoadingMedicationRecord, setIsLoadingMedicationRecord] =
    useState<boolean>(false);

  // 認証状態の監視とgroupIdの取得
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const urlGroupId = searchParams.get("group_id");
        setCurrentGroupId(urlGroupId);

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserNames((prev) => ({
            ...prev,
            [user.uid]:
              userData.name || user.displayName || user.email || "名無し",
          }));
        } else {
          setUserNames((prev) => ({
            ...prev,
            [user.uid]: user.displayName || user.email || "名無し",
          }));
        }
      } else {
        setCurrentGroupId(null);
        setUserNames({});
      }
    });
    return () => unsubscribeAuth();
  }, [searchParams]);

  // ⭐ グループ情報の取得 (SettingsScreen.tsxとほぼ同じロジック)
  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (!currentGroupId) {
        setGroupName("グループが選択されていません");
        setIsLoadingGroupInfo(false);
        return;
      }

      setIsLoadingGroupInfo(true);
      try {
        const groupDocRef = doc(db, "groups", currentGroupId);
        const groupDocSnap = await getDoc(groupDocRef);

        if (groupDocSnap.exists()) {
          const groupData = groupDocSnap.data() as Group;
          setGroupName(groupData.name);

          // グループメンバーの名前も取得する（オプション）
          const memberUids = groupData.members || [];
          if (memberUids.length > 0) {
            const fetchedMemberNames: UserNameMap = {};
            for (const uid of memberUids) {
              if (userNames[uid]) continue; // 既に取得済みならスキップ
              const memberDocRef = doc(db, "users", uid);
              const memberDocSnap = await getDoc(memberDocRef);
              if (memberDocSnap.exists()) {
                const memberData = memberDocSnap.data();
                fetchedMemberNames[uid] =
                  memberData.name || memberData.email || "名無し";
              } else {
                fetchedMemberNames[uid] = "不明なユーザー";
              }
            }
            setUserNames((prev) => ({ ...prev, ...fetchedMemberNames }));
          }
        } else {
          setGroupName("不明なグループ");
          console.warn(`Group with ID ${currentGroupId} not found.`);
        }
      } catch (error) {
        console.error("グループ情報の取得エラー:", error);
        setGroupName("グループ名取得失敗");
      } finally {
        setIsLoadingGroupInfo(false);
      }
    };

    fetchGroupInfo();
  }, [currentGroupId]); // currentGroupId が変更されたら再実行

  // ⭐ 最新のバイタルサイン記録を取得するuseEffect
  useEffect(() => {
    const fetchLatestVitalSign = async () => {
      if (!currentGroupId) {
        setLatestVitalSign(null);
        return;
      }

      setIsLoadingVitalSign(true);
      try {
        const q = query(
          collection(db, "groups", currentGroupId, "healthRecords"),
          where("type", "==", "vitalSign"), // バイタルサインのみをフィルタ
          orderBy("recordedAt", "desc"), // 最新のものから順にソート
          limit(1) // 1件のみ取得
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          // TimestampオブジェクトをDateオブジェクトに変換する必要がある場合はここで行う
          // または、VitalSignRecord型でTimestampのまま扱う
          setLatestVitalSign({
            id: querySnapshot.docs[0].id,
            ...(docData as Omit<VitalSignRecord, "id">),
          });
        } else {
          setLatestVitalSign(null); // 記録がない場合
        }
      } catch (error) {
        console.error("最新バイタルサインの取得エラー:", error);
        setLatestVitalSign(null);
      } finally {
        setIsLoadingVitalSign(false);
      }
    };

    fetchLatestVitalSign();
  }, [currentGroupId]); // currentGroupId が変更されたら再実行

  // ⭐ 最新の食事・水分摂取記録を取得するuseEffect
  useEffect(() => {
    const fetchLatestMealRecord = async () => {
      if (!currentGroupId) {
        setLatestMealRecord(null);
        return;
      }

      setIsLoadingMealRecord(true);
      try {
        const q = query(
          collection(db, "groups", currentGroupId, "healthRecords"),
          where("type", "==", "meal"), // ⭐ type を "meal" に変更
          orderBy("recordedAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setLatestMealRecord({
            id: querySnapshot.docs[0].id,
            ...(docData as Omit<MealRecord, "id">),
          });
        } else {
          setLatestMealRecord(null);
        }
      } catch (error) {
        console.error("最新食事記録の取得エラー:", error);
        setLatestMealRecord(null);
      } finally {
        setIsLoadingMealRecord(false);
      }
    };

    fetchLatestMealRecord();
  }, [currentGroupId]);

  // ⭐ 最新の排泄記録を取得するuseEffect
  useEffect(() => {
    const fetchLatestExcretionRecord = async () => {
      if (!currentGroupId) {
        setLatestMealRecord(null);
        return;
      }

      setIsLoadingExcretionRecord(true);

      try {
        const q = query(
          collection(db, "groups", currentGroupId, "healthRecords"),
          where("type", "==", "excretion"),
          orderBy("recordedAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setLatestExcretionRecord({
            id: querySnapshot.docs[0].id,
            ...(docData as Omit<ExcretionRecord, "id">),
          });
        } else {
          setLatestExcretionRecord(null);
        }
      } catch (error) {
        console.error("最新排泄記録の取得エラー:", error);
        setLatestExcretionRecord(null);
      } finally {
        setIsLoadingExcretionRecord(false);
      }
    };
    fetchLatestExcretionRecord();
  }, [currentGroupId]);

  // ⭐ 最新の服薬記録を取得するuseEffect
  useEffect(() => {
    const fetchLatestMedicationRecord = async () => {
      if (!currentGroupId) {
        setLatestMedicationRecord(null);
        return;
      }

      setIsLoadingMedicationRecord(true);
      try {
        const q = query(
          collection(db, "groups", currentGroupId, "healthRecords"),
          where("type", "==", "medication"),
          orderBy("recordedAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setLatestMedicationRecord({
            id: querySnapshot.docs[0].id,
            ...(docData as Omit<MedicationRecord, "id">),
          });
        } else {
          setLatestMedicationRecord(null);
        }
      } catch (error) {
        console.error("最新服薬記録の取得エラー:", error);
        setLatestMedicationRecord(null);
      } finally {
        setIsLoadingMedicationRecord(false);
      }
    };

    fetchLatestMedicationRecord();
  }, [currentGroupId]);

  // ⭐ ユーザー名の取得 (タスクリストなどで必要になった場合に、ここに追加することも可能)
  // 例えば、特定の記録者が記録したデータがある場合、そのUIDの名前を取得するロジックなど

  const handleGoBackToTasks = useCallback(() => {
    if (currentGroupId) {
      navigate(`/tasklist?group_id=${currentGroupId}`); // ⭐ group_id をURLに含めて遷移
    } else {
      navigate("/tasklist"); // fallback
    }
  }, [navigate, currentGroupId]);

  // バイタル入力画面への遷移ハンドラを追加
  const handleGoToVitalSignInput = useCallback(() => {
    if (currentGroupId) {
      navigate(
        `/health-records-dashboard/vital-sign/input?group_id=${currentGroupId}`
      );
    }
  }, [navigate, currentGroupId]);

  // 食事入力画面への遷移ハンドラを追加
  const handleGoMealInput = useCallback(() => {
    if (currentGroupId) {
      navigate(
        `/health-records-dashboard/meal/input?group_id=${currentGroupId}`
      );
    }
  }, [navigate, currentGroupId]);

  // 排泄入力画面への遷移ハンドラを追加
  const handleGoExcretionInput = useCallback(() => {
    if (currentGroupId) {
      navigate(
        `/health-records-dashboard/excretion/input?group_id=${currentGroupId}`
      );
    }
  }, [navigate, currentGroupId]);

  const handleGoToMedicationInput = useCallback(() => {
    if (currentGroupId) {
      navigate(
        `/health-records-dashboard/medication/input?group_id=${currentGroupId}`
      );
    }
  }, [navigate, currentGroupId]);

  // ⭐ 「今日の記録をまとめて入力」ハンドラ（これはルーティングではなく、モーダルやインライン表示が考えられる）
  const handleGoToBatchInput = useCallback(() => {
    if (currentGroupId) {
      navigate(
        `/health-records-dashboard/batch-input?group_id=${currentGroupId}`
      ); // ⭐ 新しいルートへ遷移
    }
  }, [navigate, currentGroupId]);

  if (!currentUser) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.header}>
          <button onClick={handleGoBackToTasks} className={styles.backButton}>
            &lt; 戻る
          </button>
          <h2 className={styles.pageTitle}>健康記録ダッシュボード</h2>
        </div>
        <p style={{ textAlign: "center", color: "var(--color-text-medium)" }}>
          ログインしていません。
        </p>
      </div>
    );
  }

  if (!currentGroupId || isLoadingGroupInfo) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.header}>
          <button onClick={handleGoBackToTasks} className={styles.backButton}>
            &lt; 戻る
          </button>
          <h2 className={styles.pageTitle}>健康記録ダッシュボード</h2>
        </div>
        <p style={{ textAlign: "center", color: "var(--color-text-medium)" }}>
          {isLoadingGroupInfo
            ? "グループ情報を読み込み中..."
            : "グループが選択されていません。"}
        </p>
      </div>
    );
  }

  const currentUserName = currentUser
    ? userNames[currentUser.uid] || currentUser.displayName || "あなた"
    : "ゲスト";

  // ⭐ formatTimestamp ヘルパー関数 (Common Utility に移動するのもあり)
  const formatTimestamp = (timestamp: Timestamp | undefined | null): string => {
    if (!timestamp) return "不明";
    const date = timestamp.toDate();
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <button onClick={handleGoBackToTasks} className={styles.backButton}>
          &lt; 戻る
        </button>
        <h2 className={styles.pageTitle}>健康記録ダッシュボード</h2>
      </div>

      <p className={styles.dashboardDescription}>
        {groupName}グループの健康記録です。
        <br />
        記録者: {currentUserName}
      </p>

      <HealthRecordSection
        title="バイタルサイン"
        onRecordClick={handleGoToVitalSignInput}
        onGraphClick={() => alert("バイタルサインのグラフを表示（未実装）")}
      >
        <VitalSignOverviewCard
          latestVitalSign={latestVitalSign}
          isLoading={isLoadingVitalSign}
          userNames={userNames}
          formatTimestamp={formatTimestamp} // ヘルパー関数を渡す
        />
      </HealthRecordSection>

      <HealthRecordSection
        title="食事・水分摂取"
        onRecordClick={handleGoMealInput}
      >
        <MealOverviewCard
          latestMealRecord={latestMealRecord}
          isLoading={isLoadingMealRecord}
          userNames={userNames}
          formatTimestamp={formatTimestamp} // ヘルパー関数を渡す
        />
      </HealthRecordSection>

      <HealthRecordSection title="排泄" onRecordClick={handleGoExcretionInput}>
        <ExcretionOverviewCard
          latestExcretionRecord={latestExcretionRecord}
          isLoading={isLoadingExcretionRecord}
          userNames={userNames}
          formatTimestamp={formatTimestamp}
        />
      </HealthRecordSection>

      <HealthRecordSection
        title="服薬"
        onRecordClick={handleGoToMedicationInput}
        // onGraphClick={() => alert("服薬のグラフを表示（未実装）")}
      >
        <MedicationOverviewCard
          latestMedicationRecord={latestMedicationRecord}
          isLoading={isLoadingMedicationRecord}
          userNames={userNames}
          formatTimestamp={formatTimestamp}
        />
      </HealthRecordSection>

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <button
          className={`${styles.recordButton} ${styles.batchInputButton}`}
          onClick={handleGoToBatchInput} // ⭐ ここで新しいハンドラが呼ばれる
        >
          今日の記録をまとめて入力
        </button>
      </div>
    </div>
  );
};

export default HealthRecordsDashboard;
