// src/pages/SettingsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { type Group } from "../types";

// 子コンポーネントをインポート
import AccountInfoSection from "../components/settings/AccountInfoSection";
import GroupSettingsSection from "../components/settings/GroupSettingsSection";
import NotificationSettingsSection from "../components/settings/NotificationSettingsSection"; // 新しく追加
import EmergencyContactSection from "../components/settings/EmergencyContactSection";
import LogoutSection from "../components/settings/LogoutSection";

import styles from "./SettingsScreen.module.css"; // CSSはpagesディレクトリ内に維持

// 型定義 (UserProfile, Group は SettingsScreen.tsx または共通の型ファイルで定義)
export interface UserProfile {
  // export を追加して他のファイルからインポート可能にする
  email: string;
  role: "admin" | "member";
  currentGroupId?: string;
  name?: string;
}

// 招待コード生成関数 (このファイルに残しておくか、utils/に切り出しても良い)
const generateInviteCode = (length = 6) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGroupAdmin, setIsGroupAdmin] = useState<boolean>(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [isLoadingGroupActions, setIsLoadingGroupActions] =
    useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserProfile;
          setUserProfile(data);
          setCurrentGroupId(data.currentGroupId || null);

          if (data.currentGroupId) {
            const groupDocRef = doc(db, "groups", data.currentGroupId);
            const groupDocSnap = await getDoc(groupDocRef);

            if (groupDocSnap.exists()) {
              const groupData = groupDocSnap.data() as Group;
              setGroupName(groupData.name);
              setInviteCode(groupData.inviteCode);
              setIsGroupAdmin(groupData.createdBy === user.uid);
            } else {
              console.warn(
                `Group with ID ${data.currentGroupId} not found in 'groups' collection.`
              );
              // グループが見つからない場合、userProfileのcurrentGroupIdをクリアするなどのハンドリングが必要になる可能性あり
              // 例:
              // await updateDoc(userDocRef, { currentGroupId: deleteField() });
              // setUserProfile(prev => prev ? { ...prev, currentGroupId: undefined } : null);
              setIsGroupAdmin(false);
              setGroupName("");
              setInviteCode("");
            }
          } else {
            setIsGroupAdmin(false);
            setGroupName("");
            setInviteCode("");
          }
        } else {
          // Firestoreにユーザープロファイルがない場合、最低限の情報を設定
          setUserProfile({
            email: user.email || "N/A",
            role: "member", // デフォルトはメンバー
            name: user.displayName || "名無しさん",
          });
          setIsGroupAdmin(false);
          setGroupName("");
          setInviteCode("");
        }
      } else {
        setUserProfile(null);
        setCurrentGroupId(null);
        setIsGroupAdmin(false);
        setGroupName("");
        setInviteCode("");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("ログアウト中にエラーが発生しました:", error);
      alert("ログアウトに失敗しました。");
    }
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleUpdateGroupName = useCallback(
    async (newName: string) => {
      if (!currentGroupId || !currentUser || !isGroupAdmin || !newName.trim())
        return false;

      setIsLoadingGroupActions(true);
      try {
        const groupDocRef = doc(db, "groups", currentGroupId);
        await updateDoc(groupDocRef, {
          name: newName.trim(),
        });
        setGroupName(newName.trim());
        alert("グループ名を更新しました。");
        return true;
      } catch (error) {
        console.error("グループ名更新エラー:", error);
        alert("グループ名の更新に失敗しました。");
        return false;
      } finally {
        setIsLoadingGroupActions(false);
      }
    },
    [currentGroupId, currentUser, isGroupAdmin]
  );

  const handleRegenerateCode = useCallback(async () => {
    if (!currentGroupId || !currentUser || !isGroupAdmin) return false;

    if (
      !window.confirm(
        "招待コードを再生成しますか？古いコードは無効になります。"
      )
    ) {
      return false;
    }

    setIsLoadingGroupActions(true);
    try {
      const newCode = generateInviteCode();
      const groupDocRef = doc(db, "groups", currentGroupId);
      await updateDoc(groupDocRef, {
        inviteCode: newCode,
      });
      setInviteCode(newCode);
      alert("新しい招待コードを生成しました。");
      return true;
    } catch (error) {
      console.error("招待コード再生成エラー:", error);
      alert("招待コードの再生成に失敗しました。");
      return false;
    } finally {
      setIsLoadingGroupActions(false);
    }
  }, [currentGroupId, currentUser, isGroupAdmin]);

  const handleDeleteCurrentGroup = useCallback(async () => {
    if (!currentGroupId || !currentUser || !isGroupAdmin) return false;

    if (
      !window.confirm(
        "本当にこのグループを削除しますか？この操作は元に戻せません。"
      )
    ) {
      return false;
    }

    setIsLoadingGroupActions(true);
    try {
      // グループ内の全ユーザーのcurrentGroupIdをnullにするなどの処理が必要
      // 例: const membersSnapshot = await getDocs(query(collection(db, "users"), where("currentGroupId", "==", currentGroupId)));
      // for (const memberDoc of membersSnapshot.docs) { await updateDoc(memberDoc.ref, { currentGroupId: null }); }
      await deleteDoc(doc(db, "groups", currentGroupId));
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        currentGroupId: null,
      });
      alert("グループを削除しました。");
      navigate("/groups"); // グループ選択画面に戻る
      return true;
    } catch (error) {
      console.error("グループ削除エラー:", error);
      alert("グループの削除に失敗しました。");
      return false;
    } finally {
      setIsLoadingGroupActions(false);
    }
  }, [currentGroupId, currentUser, isGroupAdmin, navigate]);

  if (!currentUser) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleBack} className={styles.backButton}>
            &lt; 戻る
          </button>
          <h2 className={styles.pageTitle}>設定</h2>
        </div>
        <p style={{ textAlign: "center", color: "var(--color-text-medium)" }}>
          読み込み中...またはログインしていません。
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          &lt; 戻る
        </button>
        <h2 className={styles.pageTitle}>設定</h2>
      </div>

      {userProfile && (
        <AccountInfoSection
          userProfile={userProfile}
          isGroupAdmin={isGroupAdmin}
          styles={styles} // stylesオブジェクトを子に渡す
        />
      )}

      {currentGroupId && (
        <>
          <GroupSettingsSection
            currentGroupId={currentGroupId}
            groupName={groupName}
            inviteCode={inviteCode}
            isGroupAdmin={isGroupAdmin}
            isLoading={isLoadingGroupActions}
            onUpdateGroupName={handleUpdateGroupName}
            onRegenerateInviteCode={handleRegenerateCode}
            onDeleteGroup={handleDeleteCurrentGroup}
            styles={styles} // stylesオブジェクトを子に渡す
          />

          <EmergencyContactSection styles={styles} groupId={currentGroupId} />
        </>
      )}

      {/* 新しく追加する通知設定セクション */}
      <NotificationSettingsSection styles={styles} />

      <LogoutSection
        onLogout={handleLogout}
        isLoading={isLoadingGroupActions}
        styles={styles} // stylesオブジェクトを子に渡す
      />
    </div>
  );
};

export default SettingsScreen;
