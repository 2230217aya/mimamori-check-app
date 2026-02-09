import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event,
  type View,
  type DayPropGetter,
  type SlotInfo,
  type ToolbarProps,
} from "react-big-calendar";

import {
  format,
  parse,
  startOfWeek,
  getDay,
  isSameDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ja } from "date-fns/locale/ja";
import type { Locale } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { type User } from "firebase/auth";

import styles from "./TaskCalendarModal.module.css";
import DailyTaskListModal from "./DailyTaskListModal";
import { type Task, type UserNameMap } from "../../types/index";

const locales: Record<string, Locale> = {
  ja: ja,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface TaskCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string | null;
  currentUser: User | null;
  userNames: UserNameMap;
  onToggleComplete: (taskId: string, isCompleted: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

interface CalendarTaskEvent extends Event {
  isCompleted: boolean;
  task: Task;
}

interface DayCellWrapperProps {
  children: React.ReactNode;
  value: Date;
}

// ⭐ CustomDayCellWrapper をシンプルなラッパーに戻し、onCellClick を削除
const CustomDayCellWrapper: React.FC<
  DayCellWrapperProps & { events: CalendarTaskEvent[] }
> = ({ children, value, events }) => {
  const dayTasks = events.filter((event) => {
    if (event.start instanceof Date) {
      return isSameDay(event.start, value);
    }
    return false;
  });

  const completedCount = dayTasks.filter((e) => e.isCompleted).length;
  const totalCount = dayTasks.length;
  const hasUncompleted = dayTasks.some((e) => !e.isCompleted);

  return (
    <div className={styles.customDayCell}>
      {children}
      {totalCount > 0 && (
        <div className={styles.taskSummary}>
          <span
            className={`${styles.taskCount} ${
              hasUncompleted ? styles.uncompletedTasks : styles.allCompleted
            }`}
          >
            {completedCount}/{totalCount}
          </span>
          {hasUncompleted && (
            <span className={styles.uncompletedIndicator}>!</span>
          )}
          {!hasUncompleted && totalCount > 0 && (
            <span className={styles.completedIndicator}>✓</span>
          )}
        </div>
      )}
    </div>
  );
};

const TaskCalendarModal: React.FC<TaskCalendarModalProps> = ({
  isOpen,
  onClose,
  groupId,
  currentUser,
  userNames,
  onToggleComplete,
  onDeleteTask,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  const [selectedDateForDailyView, setSelectedDateForDailyView] =
    useState<Date | null>(null);
  const [showDailyTasksModal, setShowDailyTasksModal] =
    useState<boolean>(false);

  useEffect(() => {
    if (!groupId) {
      setTasks([]);
      return;
    }

    // ⭐ カレンダー表示範囲より少し広めにデータを取得
    const queryStartDate = startOfMonth(
      new Date(date.getFullYear(), date.getMonth() - 1, 1)
    ); // 前月1日
    const queryEndDate = endOfMonth(
      new Date(date.getFullYear(), date.getMonth() + 1, 1)
    ); // 次月最終日

    const queryStartTimestamp = Timestamp.fromDate(queryStartDate);
    const queryEndTimestamp = Timestamp.fromDate(queryEndDate);

    const q = query(
      collection(db, "tasks"),
      where("groupId", "==", groupId),
      where("dueDate", ">=", queryStartTimestamp),
      where("dueDate", "<=", queryEndTimestamp)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [groupId, date]);

  const events = useMemo<CalendarTaskEvent[]>(() => {
    return tasks.map((task) => ({
      id: task.id,
      title: task.name,
      start: task.dueDate?.toDate() || new Date(),
      end: task.dueDate?.toDate() || new Date(),
      allDay: true,
      isCompleted: task.isCompleted,
      task: task,
    }));
  }, [tasks]);

  const eventPropGetter = useCallback((event: CalendarTaskEvent) => {
    const style = {
      backgroundColor: event.isCompleted ? "#d4edda" : "#f8d7da",
      color: event.isCompleted ? "#155724" : "#721c24",
      borderRadius: "0px",
      border: "none",
      fontSize: "12px",
      padding: "2px 5px",
      margin: "1px 0",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    };
    return { style };
  }, []);

  const dayPropGetter: DayPropGetter = useCallback(
    (currentDate: Date) => {
      const dayTasks = events.filter((event) => {
        if (event.start instanceof Date) {
          return isSameDay(event.start, currentDate);
        }
        return false;
      });

      const totalCount = dayTasks.length;

      if (totalCount === 0) {
        return {};
      }

      const hasUncompleted = dayTasks.some((e) => !e.isCompleted);

      return {
        className: hasUncompleted
          ? styles.dayWithUncompletedTasks
          : styles.dayWithAllCompletedTasks,
        // style: {
        //   // ⭐ pointer-events: none を追加して、下にある onSelectSlot が機能するようにする
        //   pointerEvents: "none",
        // },
      };
    },
    [events]
  );

  const CustomToolbar: React.FC<ToolbarProps<CalendarTaskEvent>> = ({
    label,
    onNavigate,
  }) => {
    const goToToday = useCallback(() => onNavigate("TODAY"), [onNavigate]);
    const goToBack = useCallback(() => onNavigate("PREV"), [onNavigate]);
    const goToNext = useCallback(() => onNavigate("NEXT"), [onNavigate]);

    return (
      <div className={styles.rbcToolbar}>
        <span className={styles.rbcBtnGroup}>
          <button type="button" onClick={goToBack}>
            前月
          </button>
          <button type="button" onClick={goToToday}>
            今月
          </button>
          <button type="button" onClick={goToNext}>
            次月
          </button>
        </span>
        <span className={styles.rbcToolbarLabel}>{label}</span>
      </div>
    );
  };

  const handleSelectEvent = useCallback((event: CalendarTaskEvent) => {
    // イベントクリック時の動作を定義
    console.log("タスクが選択されました:", event.title);
    setSelectedDateForDailyView(event.start as Date);
    setShowDailyTasksModal(true);
  }, []);

  const handleDayClick = useCallback((slotInfo: SlotInfo) => {
    // 日付スロットクリック時の動作を定義 (onSelectSlotがトリガー)
    console.log("さわった:", slotInfo.start);
    setSelectedDateForDailyView(slotInfo.start);
    setShowDailyTasksModal(true);
  }, []);

  const handleCloseDailyTasksModal = useCallback(() => {
    setShowDailyTasksModal(false);
    setSelectedDateForDailyView(null);
  }, []);

  const filteredDailyTasks = useMemo(() => {
    if (!selectedDateForDailyView) return [];
    return tasks.filter((task) => {
      if (task.dueDate?.toDate() instanceof Date) {
        return isSameDay(task.dueDate.toDate(), selectedDateForDailyView);
      }
      return false;
    });
  }, [tasks, selectedDateForDailyView]);

  const handleAddTaskForDate = async (taskName: string, dueDate: Date) => {
    if (!groupId || !taskName.trim()) return;
    try {
      await addDoc(collection(db, "tasks"), {
        name: taskName,
        groupId: groupId,
        isCompleted: false,
        createdAt: serverTimestamp(),
        dueDate: Timestamp.fromDate(dueDate),
        createdBy: currentUser?.uid,
      });
      console.log(
        "タスクがFirestoreに追加されました:",
        taskName,
        "期限:",
        dueDate
      );
    } catch (e) {
      console.error("タスク追加エラー (TaskCalendarModal): ", e);
      alert("タスクの追加に失敗しました。");
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className={styles.dialog}>
      <div className={styles.dialogOverlay} aria-hidden="true" />
      <div className={styles.dialogWrapper}>
        <Dialog.Panel className={styles.dialogPanel}>
          <div className={styles.modalHeader}>
            <Dialog.Title className={styles.modalTitle}>
              月間タスクカレンダー
            </Dialog.Title>
            <button onClick={onClose} className={styles.closeButton}>
              ×
            </button>
          </div>
          <div className={styles.calendarContainer}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              culture="ja"
              messages={{
                next: "次月",
                previous: "前月",
                today: "今月",
                month: "月",
                week: "週",
                day: "日",
                agenda: "予定",
                noEventsInRange: "この期間にイベントはありません。",
                date: "日付",
                time: "時間",
                event: "イベント",
              }}
              view={view}
              date={date}
              onNavigate={useCallback((newDate: Date) => setDate(newDate), [])}
              eventPropGetter={eventPropGetter}
              dayPropGetter={dayPropGetter}
              onSelectEvent={handleSelectEvent} // イベントクリック
              onSelectSlot={handleDayClick} // スロットクリック (日付セル背景クリック)
              selectable // onSelectSlot を有効にする
              components={{
                toolbar: CustomToolbar,
                dateCellWrapper: (props) => (
                  <CustomDayCellWrapper {...props} events={events}>
                    {props.children}
                  </CustomDayCellWrapper>
                ),
              }}
            />
          </div>
        </Dialog.Panel>
      </div>

      {showDailyTasksModal && (
        <DailyTaskListModal
          isOpen={showDailyTasksModal}
          onClose={handleCloseDailyTasksModal}
          date={selectedDateForDailyView}
          tasks={filteredDailyTasks}
          groupId={groupId}
          currentUser={currentUser}
          userNames={userNames}
          onToggleComplete={onToggleComplete}
          onDeleteTask={onDeleteTask}
          onAddTaskForDate={handleAddTaskForDate}
        />
      )}
    </Dialog>
  );
};

export default TaskCalendarModal;
