// src/pages/GroupJoinCreateScreen.tsx

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
//import { useAuth } from "../contexts/AuthContext"; // 認証情報を取得
import { db } from "../firebase"; // Firestoreインスタンスをインポート
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { type User } from "firebase/auth";
import styles from "./GroupJoinCreateScreen.module.css"; // CSSモジュール

interface GroupJoinCreateScreenProps {
  currentUser: User | null;
}

const GroupJoinCreateScreen: React.FC<GroupJoinCreateScreenProps> = ({
  currentUser,
}) => {
  //const { currentUser } = useAuth(); // AuthContextから現在のユーザーを取得
  const navigate = useNavigate();

  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // グループ作成ロジック
  const handleCreateGroup = useCallback(async () => {
    if (!newGroupName.trim() || !currentUser) {
      setError("グループ名を入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. 新しいグループドキュメントを作成
      const newGroupRef = doc(collection(db, "groups"));
      const groupId = newGroupRef.id;
      const inviteCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase(); // 6桁のランダムな招待コード

      await setDoc(newGroupRef, {
        name: newGroupName.trim(),
        ownerUid: currentUser.uid,
        members: [currentUser.uid], // 作成者をメンバーに追加
        inviteCode: inviteCode,
        createdAt: Timestamp.now(),
      });

      // 2. ユーザーの所属グループリストを更新
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        memberOfGroups: arrayUnion(groupId), // ユーザーが所属するグループに新しいIDを追加
      });

      setSuccessMessage(
        `「${newGroupName}」を作成しました！招待コードは「${inviteCode}」です。`
      );
      setNewGroupName(""); // フォームをクリア
      // 成功後、グループ選択画面へ戻る
      setTimeout(() => navigate("/groups"), 2000);
    } catch (err) {
      console.error("グループ作成エラー:", err);
      setError("グループの作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [newGroupName, currentUser, navigate]);

  // グループ参加ロジック
  const handleJoinGroup = useCallback(async () => {
    if (!joinCode.trim() || !currentUser) {
      setError("招待コードを入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. 招待コードでグループを検索
      const groupsRef = collection(db, "groups");
      const q = query(
        groupsRef,
        where("inviteCode", "==", joinCode.trim().toUpperCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("一致する招待コードが見つかりませんでした。");
        return;
      }

      const groupDoc = querySnapshot.docs[0]; // 招待コードはユニークと仮定
      const groupId = groupDoc.id;
      const groupData = groupDoc.data();

      // 既にメンバーであるかチェック
      if (groupData.members && groupData.members.includes(currentUser.uid)) {
        setError("あなたは既にこのグループのメンバーです。");
        return;
      }

      // 2. グループのメンバーリストを更新
      await updateDoc(groupDoc.ref, {
        members: arrayUnion(currentUser.uid), // グループにユーザーを追加
      });

      // 3. ユーザーの所属グループリストを更新
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        memberOfGroups: arrayUnion(groupId), // ユーザーが所属するグループに新しいIDを追加
      });

      setSuccessMessage(`グループ「${groupData.name}」に参加しました！`);
      setJoinCode(""); // フォームをクリア
      // 成功後、グループ選択画面へ戻る
      setTimeout(() => navigate("/groups"), 2000);
    } catch (err) {
      console.error("グループ参加エラー:", err);
      setError("グループへの参加に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [joinCode, currentUser, navigate]);

  if (!currentUser) {
    // ログインしていない場合は認証画面へリダイレクト
    navigate("/auth");
    return null;
  }

  return (
    <div className={styles.container}>
      <button onClick={() => navigate("/groups")} className={styles.backButton}>
        ← グループ選択に戻る
      </button>

      <h1 className={styles.title}>グループを作成 / 参加</h1>

      {error && <p className={styles.errorMessage}>{error}</p>}
      {successMessage && (
        <p className={styles.successMessage}>{successMessage}</p>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>新しいグループを作成</h2>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="新しいグループ名"
          className={styles.inputField}
          disabled={loading}
        />
        <button
          onClick={handleCreateGroup}
          disabled={loading}
          className={styles.actionButton}
        >
          {loading && newGroupName ? "作成中..." : "グループを作成"}
        </button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>招待コードで参加</h2>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="招待コードを入力"
          className={styles.inputField}
          disabled={loading}
        />
        <button
          onClick={handleJoinGroup}
          disabled={loading}
          className={styles.actionButton}
        >
          {loading && joinCode ? "参加中..." : "グループに参加"}
        </button>
      </div>
    </div>
  );
};

export default GroupJoinCreateScreen;
