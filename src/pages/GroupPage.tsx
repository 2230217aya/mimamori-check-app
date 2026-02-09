import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  getDocs, // 💡 JoinGroupModalで必要なので追加
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { type GroupDocument } from "../types/index";
import { createGroup } from "./GroupCreation";
import styles from "./GroupPage.module.css";

// 💡 1. GroupCreatedSuccessModal を GroupPage.tsx の先頭、または GroupPage コンポーネントの外部に定義
const GroupCreatedSuccessModal = ({
  onClose,
  groupName,
  inviteCode,
}: {
  onClose: () => void;
  groupName: string;
  inviteCode: string;
}) => {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert("招待コードをコピーしました！");
  };

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>グループを作成しました！</h2>
        <p className={styles.modalText}>
          グループ名: <strong>{groupName}</strong>
        </p>
        <p className={styles.modalText}>メンバーを招待しましょう。</p>
        <div className={styles.inviteCodeDisplay}>
          <span className={styles.inviteCodeText}>{inviteCode}</span>
          <button className={styles.copyButton} onClick={handleCopyCode}>
            コピー
          </button>
        </div>
        <div className={styles.modalButtonGroup}>
          <button
            className={`${styles.modalButton} ${styles.primary}`}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

// --- メインコンポーネント ---
const GroupPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userGroups, setUserGroups] = useState<GroupDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // モーダル表示用のstate
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  // 💡 追加: 成功モーダル表示用のstate
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdGroupName, setCreatedGroupName] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");

  const navigate = useNavigate();

  // 1. ログイン状態を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. ユーザーが所属するグループをリアルタイムで取得
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const groupsData: GroupDocument[] = [];
      querySnapshot.forEach((doc) => {
        groupsData.push({ id: doc.id, ...doc.data() } as GroupDocument);
      });
      setUserGroups(groupsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. グループカードがクリックされたときの処理
  const handleGroupSelect = (groupId: string) => {
    // userId はTasklistで認証済みのuser.uidを使うので不要に
    navigate(`/tasklist?group_id=${groupId}`);
  };

  // 💡 追加: CreateGroupModal から呼び出されるコールバック
  const handleCreateGroupSuccess = (groupName: string, inviteCode: string) => {
    setCreatedGroupName(groupName);
    setCreatedInviteCode(inviteCode);
    setShowCreateModal(false); // 作成モーダルを閉じる
    setShowSuccessModal(true); // 成功モーダルを表示
  };

  // 💡 追加: 成功モーダルを閉じる処理
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // 成功後、グループリストが自動で更新されるのを待つか、
    // 必要であればここで手動で再度グループ情報を取得するトリガーを引く
  };

  if (isLoading) {
    return <div className={styles.loading}>読み込み中...</div>; // ローディングメッセージにスタイル適用
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>
        {userGroups.length > 0 ? "グループを選択" : "はじめに"}
      </h1>
      {/* 所属グループの一覧 */}
      <div className={styles.groupList}>
        {userGroups.map((group) => (
          <div
            key={group.id}
            className={styles.groupCard}
            onClick={() => handleGroupSelect(group.id)} // userIdを渡さない
          >
            <span className={styles.groupCardIcon}>🏠</span>
            {group.name}
          </div>
        ))}
      </div>
      {/* グループ未所属の場合の強調表示 */}
      {userGroups.length === 0 && (
        <p className={styles.noGroupMessage}>
          所属しているグループはありません。
          <br />
          新しいグループを作成するか、招待コードで参加してください。
        </p>
      )}
      {/* ボタン類 */}
      <div className={styles.groupActions}>
        <button
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={() => setShowCreateModal(true)}
        >
          新規グループを作成
        </button>
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={() => setShowJoinModal(true)}
        >
          招待コードで参加
        </button>
      </div>
      {/* モーダルウィンドウ */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateGroupSuccess} // 💡 onSucess プロップスを追加
        />
      )}
      {showJoinModal && (
        <JoinGroupModal onClose={() => setShowJoinModal(false)} user={user} />
      )}
      {/* 💡 追加: グループ作成成功モーダル */}
      {showSuccessModal && (
        <GroupCreatedSuccessModal
          onClose={handleSuccessModalClose}
          groupName={createdGroupName}
          inviteCode={createdInviteCode}
        />
      )}
    </div>
  );
};

// --- グループ作成用モーダルコンポーネント ---
// 💡 プロップスの型定義に onSuccess を追加
const CreateGroupModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (groupName: string, inviteCode: string) => void;
}) => {
  const [groupName, setGroupName] = useState("");

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    // 💡 createGroupの戻り値を受け取るように修正
    const result = await createGroup(groupName);
    if (result) {
      onSuccess(groupName, result.inviteCode); // 💡 成功時にコールバックを呼び出す
      setGroupName(""); // 入力欄をクリア
    } else {
      alert("グループの作成に失敗しました。");
    }
  };

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>新しいグループを作成</h2>
        <div className={styles.modalFormGroup}>
          <input
            type="text"
            className={styles.modalFormInput}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="グループ名"
          />
        </div>
        <div className={styles.modalButtonGroup}>
          <button
            className={`${styles.modalButton} ${styles.primary}`}
            onClick={handleCreate}
            disabled={!groupName.trim()} // グループ名がないとボタン無効
          >
            作成
          </button>
          <button
            className={`${styles.modalButton} ${styles.secondary}`}
            onClick={onClose}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

// --- グループ参加用モーダルコンポーネント ---
const JoinGroupModal = ({
  onClose,
  user,
}: {
  onClose: () => void;
  user: User | null;
}) => {
  const [inviteCode, setInviteCode] = useState("");

  const handleJoin = async () => {
    if (!inviteCode.trim() || !user) return;

    try {
      // 💡 修正: inviteCodeを使ってグループをクエリする (前回の提案)
      const q = query(
        collection(db, "groups"),
        where("inviteCode", "==", inviteCode.trim())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("無効な招待コードです。");
        return;
      }

      const groupDoc = querySnapshot.docs[0];
      const groupDocRef = doc(db, "groups", groupDoc.id);

      const currentMembers = groupDoc.data().members || [];
      if (currentMembers.includes(user.uid)) {
        alert("あなたは既にこのグループのメンバーです。");
        onClose();
        return;
      }

      await updateDoc(groupDocRef, {
        members: arrayUnion(user.uid),
      });
      alert("グループに参加しました！");
      onClose();
    } catch (error) {
      console.error("グループ参加エラー:", error);
      alert("グループへの参加に失敗しました。招待コードを確認してください。");
    }
  };

  return (
    <div className={`${styles.modalOverlay} ${styles.open}`}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>招待コードで参加</h2>
        <div className={styles.modalFormGroup}>
          <input
            type="text"
            className={styles.modalFormInput}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="招待コード"
          />
        </div>
        <div className={styles.modalButtonGroup}>
          <button
            className={`${styles.modalButton} ${styles.primary}`}
            onClick={handleJoin}
            disabled={!inviteCode.trim()} // 招待コードがないとボタン無効
          >
            参加
          </button>
          <button
            className={`${styles.modalButton} ${styles.secondary}`}
            onClick={onClose}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupPage;
