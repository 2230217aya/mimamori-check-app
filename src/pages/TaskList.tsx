// src/pages/TaskList.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react"; // ⭐ useMemo を追加
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  deleteField,
  deleteDoc,
  getDocs,
  getDoc,
  QuerySnapshot, // ⭐ 追加: QuerySnapshot をインポート
  QueryDocumentSnapshot,
} from "firebase/firestore";
// ⭐ OK: `../firebase` で正しいパスであることが多いですが、プロジェクト構造に合わせて確認してください。
import { db, auth } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  startOfDay,
  endOfDay,
  format, // ⭐ format を追加
  subDays, // ⭐ subDays を追加
  addDays, // ⭐ addDays を追加
  isToday, // ⭐ isToday を追加
} from "date-fns"; // ⭐ date-fns のインポートを更新
import { ja } from "date-fns/locale/ja"; // ⭐ 日本語ロケールを追加
import { type Task, type UserNameMap, type Comment } from "../types/index";
import TaskForm from "../components/tasks/TaskForm";
import TaskItem from "../components/tasks/TaskItem";
import TaskCalendarModal from "../components/calendar/TaskCalendarModal";

// ⭐ 追加: MUIのFabコンポーネントとアイコンをインポート
import Fab from "@mui/material/Fab";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import Box from "@mui/material/Box";

import styles from "./TaskList.module.css";

const TaskList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const groupId = searchParams.get("group_id");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userNames, setUserNames] = useState<UserNameMap>({});
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [displayDate, setDisplayDate] = useState<Date>(new Date());

  // ⭐ 変更点: コメントの購読解除関数を管理するためのref
  const commentUnsubscribesRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // ⭐ 修正: Firestoreからタスクとコメントを取得するリアルタイムリスナー
  useEffect(() => {
    if (!groupId) {
      setTasks([]);
      // groupId がない場合、全てのリスナーを解除してタスクをクリア
      Object.values(commentUnsubscribesRef.current).forEach((unsub) => unsub());
      commentUnsubscribesRef.current = {};
      return;
    }

    const start = startOfDay(displayDate);
    const end = endOfDay(displayDate);

    // ⭐ 修正1: tasksQuery を onSnapshot の呼び出し直前に定義
    const tasksQuery = query(
      collection(db, "tasks"),
      where("groupId", "==", groupId),
      where("dueDate", ">=", Timestamp.fromDate(start)),
      where("dueDate", "<=", Timestamp.fromDate(end)),
      orderBy("dueDate", "asc"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeTasks = onSnapshot(
      tasksQuery, // ⭐ 修正1: tasksQuery をここで参照
      (querySnapshot: QuerySnapshot) => {
        // ⭐ 修正2: querySnapshot に型アノテーション

        const newTaskIds = new Set<string>();
        const newTasks: Task[] = [];
        const newCommentUnsubscribes: Record<string, () => void> = {};

        querySnapshot.forEach((docSnapshot: QueryDocumentSnapshot) => {
          // ⭐ 修正3: docSnapshot に型アノテーション
          const task = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as Task;
          newTaskIds.add(task.id);
          newTasks.push(task); // まずはコメントなしでタスクを追加

          if (commentUnsubscribesRef.current[task.id]) {
            newCommentUnsubscribes[task.id] =
              commentUnsubscribesRef.current[task.id];
          } else {
            const commentsQuery = query(
              collection(db, "tasks", task.id, "comments"),
              orderBy("postedAt", "asc")
            );

            const unsubscribeComments = onSnapshot(
              commentsQuery,
              (commentsSnapshot: QuerySnapshot) => {
                // ⭐ commentsSnapshot にも型アノテーション
                const comments: Comment[] = commentsSnapshot.docs.map(
                  (commentDoc: QueryDocumentSnapshot) =>
                    // ⭐ commentDoc にも型アノテーション
                    ({
                      id: commentDoc.id,
                      ...commentDoc.data(),
                    } as Comment)
                );

                setTasks((prevTasks) =>
                  prevTasks.map((prevTask) =>
                    prevTask.id === task.id
                      ? { ...prevTask, comments }
                      : prevTask
                  )
                );
              }
            );
            newCommentUnsubscribes[task.id] = unsubscribeComments;
          }
        });

        // 削除されたタスクのコメントリスナーを解除
        Object.keys(commentUnsubscribesRef.current).forEach((taskId) => {
          if (!newTaskIds.has(taskId)) {
            commentUnsubscribesRef.current[taskId](); // 解除
            delete commentUnsubscribesRef.current[taskId]; // refから削除
          }
        });

        commentUnsubscribesRef.current = newCommentUnsubscribes; // refを更新
        setTasks(newTasks); // コメントは後から更新される前提で、まずはタスクリストを更新
      }
    );

    // クリーンアップ関数: タスクのリスナーと全てのコメントのリスナーを解除
    return () => {
      unsubscribeTasks();
      Object.values(commentUnsubscribesRef.current).forEach((unsub) => unsub());
      commentUnsubscribesRef.current = {}; // リスナー解除後にrefをクリア
    };
  }, [groupId, displayDate]); // 依存配列は変更なし

  // ✅ 必要: タスクの完了者などのユーザー名を取得するロジック
  useEffect(() => {
    if (tasks.length === 0) return;

    const uidsToFetch = new Set<string>();
    tasks.forEach((task) => {
      if (task.completedBy && !userNames[task.completedBy]) {
        uidsToFetch.add(task.completedBy);
      }

      // ⭐ 変更点2: 各タメントの投稿者を追加 (前回の提案でこの部分を修正済みであること)
      if (task.comments && task.comments.length > 0) {
        task.comments.forEach((comment) => {
          if (comment.postedBy && !userNames[comment.postedBy]) {
            uidsToFetch.add(comment.postedBy);
          }
        });
      }
    });

    // 現在ログインしているユーザーの UID も必要であれば追加
    if (currentUser && !userNames[currentUser.uid]) {
      uidsToFetch.add(currentUser.uid);
    }

    if (uidsToFetch.size > 0) {
      console.log("Fetching user names for UIDs:", Array.from(uidsToFetch)); // デバッグ用
      fetchUserNames(Array.from(uidsToFetch));
    }

    async function fetchUserNames(uids: string[]) {
      const fetchedNames: UserNameMap = {};
      try {
        for (const uid of uids) {
          if (userNames[uid]) continue;

          const userDocRef = doc(db, "users", uid);
          const userDocSnap = await getDoc(userDocRef); // ✅ OK: getDoc を使用

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            fetchedNames[uid] = userData.name || userData.email || "名無し";
          } else {
            fetchedNames[uid] = "不明なユーザー";
          }
        }
        setUserNames((prevNames) => ({ ...prevNames, ...fetchedNames }));
      } catch (error) {
        console.error("ユーザー名取得エラー:", error);
      }
    }
  }, [tasks, userNames, currentUser, groupId]);

  // ✅ 必要: タスク完了状態のトグル
  const handleToggleComplete = async (taskId: string, isCompleted: boolean) => {
    if (!currentUser) return;
    const taskDocRef = doc(db, "tasks", taskId);

    const newCompletedStatus = !isCompleted;
    const updateData: { [key: string]: any } = {
      isCompleted: newCompletedStatus,
    };

    if (newCompletedStatus) {
      updateData.completedBy = currentUser.uid;
      updateData.completedAt = serverTimestamp();
    } else {
      updateData.completedBy = deleteField();
      updateData.completedAt = deleteField();
    }

    try {
      await updateDoc(taskDocRef, updateData);
    } catch (e) {
      console.error("タスク更新エラー: ", e);
    }
  };

  // ✅ 必要: 新しいタスクの追加 (メイン画面のフォーム用)
  const handleAddTask = async (taskName: string) => {
    if (!groupId || !taskName.trim()) return; // ⭐ groupId が null でないか確認
    try {
      await addDoc(collection(db, "tasks"), {
        name: taskName,
        groupId: groupId,
        isCompleted: false,
        createdAt: serverTimestamp(),
        dueDate: Timestamp.fromDate(displayDate), // ⭐ displayDate を使用
      });
      console.log(
        "タスクがFirestoreに追加されました:",
        taskName,
        "期限:",
        displayDate
      ); // ⭐ 成功ログを追加
    } catch (e) {
      console.error("タスク追加エラー (TaskList): ", e); // ⭐ エラーログを強化
      alert("タスクの追加に失敗しました。");
    }
  };

  // ✅ 必要: タスクの削除
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("このタスクを本当に削除しますか？")) return;

    const taskDocRef = doc(db, "tasks", taskId);
    const commentsCollectionRef = collection(db, "tasks", taskId, "comments");
    try {
      const commentsSnapshot = await getDocs(commentsCollectionRef);
      const deletePromises: Promise<void>[] = [];
      commentsSnapshot.forEach((commentDoc) => {
        deletePromises.push(deleteDoc(commentDoc.ref));
      });
      await Promise.all(deletePromises);
      await deleteDoc(taskDocRef);
    } catch (e) {
      console.error("タスク削除エラー: ", e);
    }
  };

  // ✅ 必要: 設定画面への遷移
  const handleGoToSettings = () => {
    navigate(`/settings?groupId=${groupId}`);
  };

  // ✅ 必要: カレンダーモーダルの開閉
  const handleOpenCalendarModal = () => {
    setIsCalendarModalOpen(true);
  };

  const handleCloseCalendarModal = () => {
    setIsCalendarModalOpen(false);
  };

  // ⭐ 追加: 日付ナビゲーションハンドラー
  const goToPreviousDay = () => {
    setDisplayDate((prev) => subDays(prev, 1));
  };
  const goToNextDay = () => {
    setDisplayDate((prev) => addDays(prev, 1));
  };
  const goToToday = () => {
    setDisplayDate(new Date());
  };

  // ⭐ 追加: 表示日付の整形 (「今日のタスク」や「yyyy年MM月dd日 (曜日)」)
  const formattedDisplayDate = useMemo(() => {
    if (isToday(displayDate)) {
      return "今日のタスク";
    }
    return format(displayDate, "yyyy年MM月dd日 (eee)", { locale: ja });
  }, [displayDate]);

  // ⭐ 戻るボタンのハンドラー
  const handleGoBack = useCallback(() => {
    // groupId がない場合（直接 /tasklist にアクセスされたなど）はグループ選択画面へ
    navigate("/groups");
  }, [navigate, groupId]);

  // ⭐ 健康記録ダッシュボードへの遷移ハンドラを修正
  const handleGoToHealthRecords = useCallback(() => {
    if (groupId) {
      // ⭐ group_id をクエリパラメータとして渡す
      navigate(`/health-records-dashboard?group_id=${groupId}`);
    } else {
      console.error("Group ID not found for navigation to health records.");
      // グループIDがない場合は、一旦グループ選択画面などへリダイレクトすることも検討
      navigate("/groups");
    }
  }, [navigate, groupId]); // groupId を依存配列に追加

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleGoBack}>
          &lt; 戻る
        </button>

        <div className={styles.dateNavigation}>
          <button onClick={goToPreviousDay} className={styles.navButton}>
            &lt;
          </button>
          <h1 className={styles.pageTitle} onClick={goToToday}>
            {formattedDisplayDate}
          </h1>
          <button onClick={goToNextDay} className={styles.navButton}>
            &gt;
          </button>
        </div>

        {/* ⭐ 修正: アイコンボタンを `headerActions` で囲む */}
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton} // ⭐ 変更
            onClick={handleOpenCalendarModal}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#5db075"
            >
              <path d="M200-80q-33 0-56.5-23.5T120-160v-640q0-33 23.5-56.5T200-880h80v-80h80v80h320v-80h80v80h80q33 0 56.5 23.5T840-720v640q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" />
            </svg>
          </button>
          <button className={styles.iconButton} onClick={handleGoToSettings}>
            {" "}
            {/* ⭐ 変更 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#5db075"
            >
              <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" />
            </svg>
          </button>
        </div>
      </div>

      <TaskForm onAddTask={handleAddTask} />

      <div className={styles.taskListContainer}>
        {tasks.length > 0 ? (
          <ul className={styles.taskList}>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                currentUser={currentUser}
                userNames={userNames}
                onToggleComplete={handleToggleComplete}
                onDeleteTask={handleDeleteTask}
                groupId={groupId}
              />
            ))}
          </ul>
        ) : (
          // ⭐ 修正: タスクがない場合のメッセージも displayDate に基づく
          <p className={styles.noTasksMessage}>
            {isToday(displayDate)
              ? "今日のタスクはありません。"
              : `${formattedDisplayDate} のタスクはありません。`}
          </p>
        )}
      </div>

      <TaskCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={handleCloseCalendarModal}
        groupId={groupId}
        // ⭐ 追加: DailyTaskListModal に渡すために必要な props を渡す
        currentUser={currentUser}
        userNames={userNames}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
      />

      {/* ⭐ ここからFABの追加 ⭐ */}
      <Box className={styles.fabContainer}>
        <Fab
          color="primary"
          aria-label="健康記録"
          onClick={handleGoToHealthRecords}
          // ⭐ groupId がない場合はボタンを無効化することも検討
          disabled={!groupId}
        >
          <MedicalServicesIcon />
        </Fab>
      </Box>
      {/* ⭐ ここまでFABの追加 ⭐ */}
    </div>
  );
};

export default TaskList;
