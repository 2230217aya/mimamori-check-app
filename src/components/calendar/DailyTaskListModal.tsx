// src/components/calendar/DailyTaskListModal.tsx
import React, { useMemo, useState } from "react"; // useState を追加
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";

import TaskItem from "../tasks/TaskItem";
import { type Task, type UserNameMap } from "../../types/index";
import { type User } from "firebase/auth";

import styles from "./DailyTaskListModal.module.css";

interface DailyTaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  tasks: Task[];
  groupId: string | null;
  currentUser: User | null;
  userNames: UserNameMap;
  onToggleComplete: (taskId: string, isCompleted: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  // ⭐ 追加: タスク追加ハンドラー
  onAddTaskForDate: (taskName: string, dueDate: Date) => Promise<void>;
}

const DailyTaskListModal: React.FC<DailyTaskListModalProps> = ({
  isOpen,
  onClose,
  date,
  tasks,
  groupId,
  currentUser,
  userNames,
  onToggleComplete,
  onDeleteTask,
  onAddTaskForDate, // 新しいハンドラーを受け取る
}) => {
  const [newTaskName, setNewTaskName] = useState("");

  const formattedDate = useMemo(() => {
    if (!date) return "";
    return format(date, "yyyy年MM月dd日 (eee)", { locale: ja });
  }, [date]);

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim() && date && groupId) {
      // ⭐ date と groupId が null でないか確認
      await onAddTaskForDate(newTaskName, date);
      setNewTaskName("");
    } else {
      console.warn("タスク名、日付、またはグループIDが不足しています。", {
        newTaskName,
        date,
        groupId,
      }); // ⭐ デバッグログを追加
    }
  };

  const hasTasks = tasks.length > 0;

  return (
    <Dialog open={isOpen} onClose={onClose} className={styles.dialog}>
      <div className={styles.dialogOverlay} aria-hidden="true" />
      <div className={styles.dialogWrapper}>
        <div className={styles.dialogPanel}>
          <div className={styles.modalHeader}>
            <Dialog.Title className={styles.modalTitle}>
              {formattedDate} のタスク
            </Dialog.Title>
            <button onClick={onClose} className={styles.closeButton}>
              ×
            </button>
          </div>

          <div className={styles.modalBody}>
            {/* ⭐ 追加: その日のタスク追加フォーム */}
            <form onSubmit={handleAddTaskSubmit} className={styles.taskForm}>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder={`${formattedDate} の新しいタスク`}
                className={styles.taskInput}
              />
              <button
                type="submit"
                className={styles.addTaskButton}
                disabled={!newTaskName.trim()}
              >
                追加
              </button>
            </form>

            {hasTasks ? (
              <ul className={styles.taskList}>
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    userNames={userNames}
                    onToggleComplete={onToggleComplete}
                    onDeleteTask={onDeleteTask}
                    groupId={groupId}
                  />
                ))}
              </ul>
            ) : (
              <p className={styles.noTasksMessage}>
                この日にはタスクがありません。
              </p>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default DailyTaskListModal;
