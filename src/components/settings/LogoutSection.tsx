// src/components/settings/LogoutSection.tsx
import React from "react";

// もしくは 'csstype' パッケージをインストールして利用することも可能
// import type { CSSModuleClasses } from "react-app-env";

interface LogoutSectionProps {
  onLogout: () => void;
  isLoading: boolean;
  styles: CSSModuleClasses; // stylesオブジェクトをPropsとして受け取る
}

const LogoutSection: React.FC<LogoutSectionProps> = ({
  onLogout,
  isLoading,
  styles,
}) => {
  return (
    <div className={styles.section}>
      <button
        className={`${styles.button} ${styles.dangerButton}`}
        onClick={onLogout}
        disabled={isLoading}
      >
        ログアウト
      </button>
    </div>
  );
};

export default LogoutSection;
