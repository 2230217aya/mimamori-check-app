// src/components/settings/GroupSettingsSection.tsx
import React, { useState, useEffect, useCallback } from "react";
// CSSModuleClassesの型定義が必要な場合は、環境に合わせてインポートする
// import type { CSSModuleClasses } from "react-app-env"; // 例

interface GroupSettingsSectionProps {
  currentGroupId: string;
  groupName: string;
  inviteCode: string;
  isGroupAdmin: boolean;
  isLoading: boolean;
  onUpdateGroupName: (newName: string) => Promise<boolean>;
  onRegenerateInviteCode: () => Promise<boolean>;
  onDeleteGroup: () => Promise<boolean>;
  styles: CSSModuleClasses; // stylesオブジェクトをPropsとして受け取る
}

const GroupSettingsSection: React.FC<GroupSettingsSectionProps> = ({
  groupName: initialGroupName,
  inviteCode,
  isGroupAdmin,
  isLoading,
  onUpdateGroupName,
  onRegenerateInviteCode,
  onDeleteGroup,
  styles, // stylesをpropsから取得
}) => {
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] =
    useState<boolean>(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>(initialGroupName);

  useEffect(() => {
    setNewGroupName(initialGroupName);
  }, [initialGroupName]);

  const handleGroupNameSave = useCallback(async () => {
    const success = await onUpdateGroupName(newGroupName);
    if (success) {
      setIsEditingGroupName(false);
    }
  }, [newGroupName, onUpdateGroupName]);

  const handleGroupNameCancel = useCallback(() => {
    setNewGroupName(initialGroupName);
    setIsEditingGroupName(false);
  }, [initialGroupName]);

  const handleRegenerate = useCallback(async () => {
    await onRegenerateInviteCode();
  }, [onRegenerateInviteCode]);

  const handleDelete = useCallback(async () => {
    await onDeleteGroup();
  }, [onDeleteGroup]);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <span className={styles.sectionTitleText}>グループ設定</span>
        <button
          className={`${styles.button} ${styles.sectionToggleButton}`}
          onClick={() => setIsGroupSettingsOpen(!isGroupSettingsOpen)}
          disabled={isLoading}
        >
          <span className={styles.toggleIcon}>
            {isGroupSettingsOpen ? "▲" : "▼"}
          </span>
        </button>
      </h3>

      {isGroupSettingsOpen && isGroupAdmin && (
        <>
          {/* グループ名の変更 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>グループ名:</label>
            {!isEditingGroupName ? (
              <div className={styles.listItem}>
                <span className={styles.value}>{initialGroupName}</span>
                <button
                  className={`${styles.button} ${styles.linkButton}`}
                  onClick={() => setIsEditingGroupName(true)}
                  disabled={isLoading}
                  style={{
                    width: "auto",
                    padding: "5px 10px",
                    marginTop: 0,
                  }}
                >
                  変更
                </button>
              </div>
            ) : (
              <div className={styles.inputWithButton}>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  onClick={handleGroupNameSave}
                  disabled={isLoading || !newGroupName.trim()}
                  style={{
                    width: "auto",
                    marginLeft: "10px",
                    padding: "8px 15px",
                    marginTop: 0,
                  }}
                >
                  保存
                </button>
                <button
                  className={`${styles.button} ${styles.linkButton}`}
                  onClick={handleGroupNameCancel}
                  disabled={isLoading}
                  style={{
                    width: "auto",
                    padding: "5px 10px",
                    marginTop: 0,
                    color: "var(--color-gray-dark)",
                  }}
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>

          {/* 招待コード */}
          <div className={styles.listItem}>
            <span className={styles.label}>招待コード:</span>
            <span className={styles.value}>{inviteCode}</span>
            <button
              className={`${styles.button} ${styles.linkButton}`}
              onClick={handleRegenerate}
              disabled={isLoading}
              style={{ width: "auto", padding: "5px 10px", marginTop: 0 }}
            >
              再生成
            </button>
          </div>

          {/* グループ削除 (管理者のみ) */}
          <button
            className={`${styles.button} ${styles.dangerButton}`}
            onClick={handleDelete}
            disabled={isLoading}
            style={{ marginTop: "30px" }}
          >
            グループを削除
          </button>
        </>
      )}

      {isGroupSettingsOpen && !isGroupAdmin && (
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "var(--color-text-medium)",
            marginTop: "10px",
          }}
        >
          グループの管理機能は管理者のみ利用可能です。
        </p>
      )}
    </div>
  );
};

export default GroupSettingsSection;
