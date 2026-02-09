// src/pages/LandingPage.tsx

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // AuthContextから認証状態を取得

import styles from "./LandingPage.module.css"; // CSSモジュールをインポート

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth(); // 認証状態とローディング状態を取得

  // 既にログインしている場合は、グループ選択画面にリダイレクト
  useEffect(() => {
    if (!loading && currentUser) {
      navigate("/groups");
    }
  }, [currentUser, loading, navigate]);

  const handleSignUpClick = () => {
    navigate("/auth?mode=signup"); // 登録モードで認証画面へ
  };

  const handleLoginClick = () => {
    navigate("/auth?mode=login"); // ログインモードで認証画面へ
  };

  // 認証状態のロード中は何も表示しないか、シンプルなローディング表示
  if (loading) {
    return <div>Loading...</div>; // または LoadingSpinner コンポーネントなど
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.appName}>みまもりチェック</h1>
        <p className={styles.tagline}>
          在宅介護を、もっと安心に、もっとスムーズに。
        </p>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.featureSection}>
          <h2 className={styles.sectionTitle}>プロジェクトの目的</h2>
          <p className={styles.sectionText}>
            在宅介護における家族・介護者間の情報共有を円滑にし、
            介護負担を軽減することを目的としたアプリケーションです。
            日々のタスク管理から健康記録まで、介護に関わる全ての人をサポートします。
          </p>
        </section>

        <section className={styles.featureSection}>
          <h2 className={styles.sectionTitle}>主な機能</h2>
          <ul className={styles.featureList}>
            <li>今日のタスクのリアルタイム共有と完了チェック</li>
            <li>誰が、いつタスクを完了したかを記録・表示</li>
            <li>週間・月間ビューのタスクカレンダーで計画を把握</li>
            <li>
              要介護者の日々の健康状態や医療記録を家族間で共有（今後追加予定）
            </li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.buttonGroup}>
          <button onClick={handleSignUpClick} className={styles.primaryButton}>
            新規登録
          </button>
          <button onClick={handleLoginClick} className={styles.secondaryButton}>
            ログイン
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
