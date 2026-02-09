// src/components/settings/NotificationSettingsSection.tsx
import React, { useCallback } from "react";
import { useFCMToken } from "../../hooks/useFCMToken";
//import type { CSSModuleClasses } from "react-app-env";

interface NotificationSettingsSectionProps {
  styles: CSSModuleClasses;
}

const NotificationSettingsSection: React.FC<
  NotificationSettingsSectionProps
> = ({ styles }) => {
  const {
    fcmToken,
    permissionStatus,
    isTokenLoading,
    requestNotificationPermissionAndToken,
    disableNotification,
  } = useFCMToken();

  const handleEnableNotifications = useCallback(async () => {
    await requestNotificationPermissionAndToken();
  }, [requestNotificationPermissionAndToken]);

  const handleDisableNotifications = useCallback(async () => {
    await disableNotification();
  }, [disableNotification]);

  let statusText = "";
  let actionButton;

  if (isTokenLoading) {
    statusText = "通知設定を読み込み中...";
    actionButton = (
      <button className={styles.button} disabled>
        処理中...
      </button>
    );
  } else {
    switch (permissionStatus) {
      case "granted":
        // ★ここを修正します★
        if (fcmToken) {
          statusText = "通知は有効です。";
          actionButton = (
            <button
              className={`${styles.button} ${styles.dangerButton}`}
              onClick={handleDisableNotifications}
            >
              通知を無効にする
            </button>
          );
        } else {
          // permissionStatusは"granted"だが、fcmTokenがnullの場合
          statusText = "通知は無効です。";
          actionButton = (
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={handleEnableNotifications} // ここで有効化ボタンを表示
            >
              通知を有効にする
            </button>
          );
        }
        break;
      case "denied":
        statusText =
          "通知はブロックされています。ブラウザ設定から変更してください。";
        actionButton = (
          <button className={styles.button} onClick={handleEnableNotifications}>
            通知を許可する（ブラウザ設定へ）
          </button>
        );
        break;
      case "default":
      default:
        statusText = "通知は設定されていません。";
        actionButton = (
          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={handleEnableNotifications}
          >
            通知を有効にする
          </button>
        );
        break;
    }
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>通知設定</h3>
      <div className={styles.listItem}>
        <span className={styles.label}>現在の状態:</span>
        <span className={`${styles.value} ${styles.notificationStatusText}`}>
          {statusText}
        </span>{" "}
      </div>
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        {actionButton}
      </div>
      {permissionStatus === "granted" && fcmToken && (
        <div className={`${styles.listItem} ${styles.fcmTokenDisplay}`}>
          <span className={`${styles.label} ${styles.fcmTokenLabel}`}>
            FCMトークン:
          </span>{" "}
          <span
            className={`${styles.value} ${styles.fcmTokenValue}`}
            style={{ wordBreak: "break-all" }}
          >
            {fcmToken.substring(0, 20)}...
          </span>{" "}
        </div>
      )}
    </div>
  );
};

export default NotificationSettingsSection;
