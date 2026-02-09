// src/components/TaskItem.tsx
import React, { useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";
import { type Task, type UserNameMap } from "../../types";
import type { User } from "firebase/auth";
import styles from "../../pages/TaskList.module.css";
import CommentSection from "./CommentSection";
// Firestore の updateDoc をインポート
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface TaskItemProps {
  task: Task;
  currentUser: User | null;
  userNames: UserNameMap;
  onToggleComplete: (taskId: string, isCompleted: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  groupId: string | null; // ⭐ groupId を追加
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  currentUser,
  userNames,
  onToggleComplete,
  onDeleteTask,
  groupId, // ⭐ groupId を受け取る
}) => {
  // ⭐ 編集モードの状態管理
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedTaskName, setEditedTaskName] = useState(task.name);
  const inputRef = useRef<HTMLInputElement>(null); // input要素への参照

  // 編集モード開始ハンドラ
  const handleNameClick = useCallback(() => {
    // 完了済みタスクは編集させない、または条件に応じて編集可能にする
    if (!task.isCompleted) {
      // ⭐ 完了済みタスクは編集不可にする場合
      setIsEditingName(true);
      // input要素がレンダリングされてからフォーカスを当てる
      // 次のレンダリングサイクルでinputが存在することを保証するため
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select(); // テキストを全選択
      }, 0);
    }
  }, [task.isCompleted]);

  // 編集内容の保存ハンドラ
  const handleSaveName = useCallback(async () => {
    // タスク名が空の場合は更新しない、またはエラーメッセージを表示する
    if (editedTaskName.trim() === "") {
      alert("タスク名は空にできません。");
      setEditedTaskName(task.name); // 元のタスク名に戻す
      setIsEditingName(false);
      return;
    }

    // 変更がない場合はFirestoreを更新しない
    if (editedTaskName === task.name) {
      setIsEditingName(false);
      return;
    }

    try {
      // Firestoreのタスク名を更新
      const taskRef = doc(db, "tasks", task.id);
      await updateDoc(taskRef, {
        name: editedTaskName,
      });
      setIsEditingName(false); // 編集モード終了
    } catch (error) {
      console.error("タスク名の更新エラー:", error);
      alert("タスク名の更新に失敗しました。");
      setEditedTaskName(task.name); // 失敗したら元のタスク名に戻す
      setIsEditingName(false);
    }
  }, [editedTaskName, task.name, task.id]);

  // inputフィールドの変更ハンドラ
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedTaskName(e.target.value);
    },
    []
  );

  // Enterキーでの保存ハンドラ
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault(); // 改行を防ぐ
        handleSaveName();
      } else if (e.key === "Escape") {
        // Escapeキーでキャンセル
        setEditedTaskName(task.name); // 元に戻す
        setIsEditingName(false);
      }
    },
    [handleSaveName, task.name]
  );

  return (
    <li className={styles.taskItem}>
      <div className={styles.taskInfo}>
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={() => onToggleComplete(task.id, task.isCompleted)}
          className={styles.taskCheckbox}
        />
        {isEditingName ? ( // ⭐ 編集モードの場合は input フィールドを表示
          <input
            ref={inputRef}
            type="text"
            value={editedTaskName}
            onChange={handleInputChange}
            onBlur={handleSaveName} // フォーカスが外れたら保存
            onKeyDown={handleInputKeyDown} // Enterキーで保存、Escapeキーでキャンセル
            className={styles.taskNameInput} // ⭐ 新しいCSSクラス
            disabled={!currentUser} // ログインしていない場合は編集不可
          />
        ) : (
          // ⭐ 通常モードの場合は span を表示
          <span
            className={`${styles.taskName} ${
              task.isCompleted ? styles.completedTaskName : ""
            }`}
            onClick={handleNameClick} // クリックで編集モードに移行
          >
            {task.name}
          </span>
        )}
      </div>
      {task.isCompleted &&
        task.completedBy &&
        task.completedAt && ( // ⭐ completedAt の null チェックを追加
          <small className={styles.taskMetadata}>
            (完了: {userNames[task.completedBy] || "読み込み中..."}{" "}
            {format(task.completedAt.toDate(), "MM/dd HH:mm", { locale: ja })})
          </small>
        )}
      <button
        onClick={() => onDeleteTask(task.id)}
        className={styles.deleteButton}
      >
        削除
      </button>

      {/* コメントセクションを子コンポーネントとして配置 */}
      {groupId && ( // ⭐ groupId が存在する場合のみレンダリング
        <CommentSection
          taskId={task.id}
          groupId={groupId} // ⭐ groupId を CommentSection に渡す
          currentUser={currentUser}
          userNames={userNames}
        />
      )}
    </li>
  );
};

export default TaskItem;
