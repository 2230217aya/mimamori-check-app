// src/components/tasks/TaskForm.tsx (想定される内容)
import React, { useState } from "react";
import styles from "../../pages/TaskList.module.css";

interface TaskFormProps {
  onAddTask: (taskName: string) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onAddTask }) => {
  const [taskName, setTaskName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskName.trim()) {
      onAddTask(taskName);
      setTaskName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.taskForm}>
      <input
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="新しいタスクを入力"
        className={styles.taskInput}
      />
      <button
        type="submit"
        className={styles.addTaskButton}
        disabled={!taskName.trim()}
      >
        追加
      </button>
    </form>
  );
};

export default TaskForm;
