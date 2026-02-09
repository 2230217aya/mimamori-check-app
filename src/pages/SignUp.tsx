// src/pages/SignUp.tsx (修正)

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

import styles from "./SignUp.module.css";

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        if (isLoginMode) {
          // ログイン処理
          await signInWithEmailAndPassword(auth, email, password);
          console.log("ログイン成功");
          navigate("/groups");
        } else {
          // 新規登録処理
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          if (userCredential.user && username) {
            await updateProfile(userCredential.user, { displayName: username });
            await setDoc(doc(db, "users", userCredential.user.uid), {
              name: username,
              email: email,
              createdAt: new Date(),
            });
          }
          console.log("新規登録成功");
          navigate("/groups");
        }
      } catch (err: any) {
        console.error("認証エラー:", err.code, err.message);
        let errorMessage = "認証に失敗しました。"; // デフォルトのエラーメッセージ

        switch (err.code) {
          case "auth/invalid-email":
            errorMessage = "メールアドレスの形式が正しくありません。";
            break;
          case "auth/user-disabled":
            errorMessage = "このアカウントは無効です。";
            break;
          // ⭐ ここを修正・追加
          case "auth/user-not-found":
            errorMessage = "登録されていないメールアドレスです。";
            break;
          case "auth/wrong-password":
            errorMessage = "パスワードが間違っています。";
            break;
          case "auth/invalid-credential": // Firebase v9.x以降でユーザー名/パスワード間違いに使われる可能性
            errorMessage = "メールアドレスまたはパスワードが間違っています。";
            break;
          // ⭐ 修正終わり

          case "auth/email-already-in-use":
            errorMessage = "このメールアドレスは既に登録されています。";
            break;
          case "auth/weak-password":
            errorMessage = "パスワードは6文字以上で設定してください。";
            break;
          default:
            errorMessage = "エラーが発生しました: " + err.message;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [isLoginMode, email, password, username, navigate]
  );

  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>✔︎</span>
        <span className={styles.logoText}>みまもりチェック</span>
      </div>
      <form onSubmit={handleSubmit}>
        {!isLoginMode && (
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              あなたの表示名
            </label>
            <input
              id="name"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例：山田 太郎"
              required
              className={styles.formInput}
              disabled={loading}
            />
          </div>
        )}
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.formLabel}>
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className={styles.formInput}
            disabled={loading}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.formLabel}>
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上のパスワード"
            required
            className={styles.formInput}
            disabled={loading}
          />
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? "処理中..." : isLoginMode ? "ログイン" : "新規登録"}
        </button>
      </form>
      <div className={styles.toggleLink}>
        {isLoginMode
          ? "アカウントをお持ちでないですか？ " // ⭐ ここに半角スペースを追加
          : "すでにアカウントをお持ちですか？ "}{" "}
        {/* ⭐ ここに半角スペースを追加 */}
        {/* ⭐ aタグで囲む範囲を変更 */}
        <a
          onClick={() => setIsLoginMode((prev) => !prev)}
          className={styles.modeToggleLink}
        >
          {isLoginMode ? "新規登録" : "ログイン"}
        </a>
      </div>
    </div>
  );
};

export default SignUp;
