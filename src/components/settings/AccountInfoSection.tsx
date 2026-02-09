// src/components/settings/AccountInfoSection.tsx
import React from "react";
// CSSModuleClassesの型定義が必要な場合は、環境に合わせてインポートする
// 例えば、create-react-appを使用している場合は 'react-app-env.d.ts' に定義があることが多い
// もしくは 'csstype' パッケージをインストールして利用することも可能
// import type { CSSModuleClasses } from "react-app-env"; // 例

// UserProfileの型は、SettingsScreen.tsxからインポートするのがベストプラクティスです。
// もしこのコンポーネントだけで使われる型であればここで定義しても良いですが、
// プロジェクト全体で一貫性を持たせるためにも中央で管理することをお勧めします。
// ここではSettingsScreen.tsxからインポートすることを想定し、ローカルの定義を削除します。
// import type { UserProfile } from "../../pages/SettingsScreen"; // もしSettingsScreenからインポートする場合

interface UserProfile {
  // 現在はこのファイルで定義されているため残します
  email: string;
  role: "admin" | "member";
  name?: string;
}

interface AccountInfoSectionProps {
  userProfile: UserProfile;
  isGroupAdmin: boolean;
  styles: CSSModuleClasses; // stylesオブジェクトをPropsとして受け取る
}

const AccountInfoSection: React.FC<AccountInfoSectionProps> = ({
  userProfile,
  isGroupAdmin,
  styles, // stylesをpropsから取得
}) => {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>アカウント情報</h3>
      <div className={styles.listItem}>
        <span className={styles.label}>表示名:</span>
        <span className={styles.value}>{userProfile.name || "未設定"}</span>
      </div>
      <div className={styles.listItem}>
        <span className={styles.label}>メールアドレス:</span>
        <span className={styles.value}>{userProfile.email}</span>
      </div>
      <div className={styles.listItem}>
        <span className={styles.label}>役割 (全体):</span>
        <span className={styles.value}>
          {userProfile.role === "admin" ? "システム管理者" : "一般ユーザー"}
        </span>
      </div>
      <div className={styles.listItem}>
        <span className={styles.label}>現在のグループでの役割:</span>
        <span className={styles.value}>
          {isGroupAdmin ? "管理者" : "メンバー"}
        </span>
      </div>
    </div>
  );
};

export default AccountInfoSection;
