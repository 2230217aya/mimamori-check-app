// src/hooks/useFCMToken.ts
import { useEffect, useState, useRef } from "react";
import { messaging, db } from "../firebase"; // firebase.ts から messaging と db をインポート
import { getAuth } from "firebase/auth";
import { getToken, onMessage } from "firebase/messaging";
import {
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  setDoc,
  getDoc,
} from "firebase/firestore";

// ★重要★: Firebaseコンソールで生成したVAPIDキーをここに設定してください。
// 環境変数から読み込むのがベストプラクティスです。
// processの型エラーを解決するために、型定義 `@types/node` をインストールし、
// tsconfig.jsonのcompilerOptionsに "types": ["node"] を追加することを推奨します。
const VAPID_KEY = import.meta.env.VITE_APP_VAPID_KEY || "";
console.log(
  "VITE_APP_VAPID_KEY from import.meta.env:",
  import.meta.env.VITE_APP_VAPID_KEY
);
console.log("VAPID_KEY (after fallback):", VAPID_KEY);
// 環境変数設定の例: .env ファイルに REACT_APP_VAPID_KEY=あなたのVAPIDキー を追加

export const useFCMToken = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>("default");
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(false);
  const auth = getAuth();
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const requestNotificationPermissionAndToken = async () => {
    console.log("🟢 requestNotificationPermissionAndToken called.");
    setIsTokenLoading(true);
    if (!VAPID_KEY) {
      console.error(
        "VAPID_KEY is not set. Please configure it in your environment variables."
      );
      alert("通知設定エラー: サーバー設定が不足しています。");
      setIsTokenLoading(false);
      return;
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("Service Worker is not supported in this browser.");
      alert(
        "通知設定エラー: お使いのブラウザはService Workerをサポートしていません。"
      );
      setIsTokenLoading(false);
      return;
    }
    if (!("Notification" in window)) {
      console.warn("Notifications are not supported in this browser.");
      alert(
        "通知設定エラー: お使いのブラウザは通知機能をサポートしていません。"
      );
      setIsTokenLoading(false);
      return;
    }

    try {
      // サービスワーカーの登録
      if (!registrationRef.current) {
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
        registrationRef.current = registration;
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );
      }

      //  Service Worker が ready になるのを待つ
      await navigator.serviceWorker.ready;

      // 通知の許可をユーザーに要求
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission); // ★ここでパーミッションの状態を更新★

      if (permission === "granted") {
        console.log("Notification permission granted.");

        // FCMトークンの取得
        // serviceWorkerRegistrationは必須なので、登録が成功していることを確認
        if (!registrationRef.current) {
          console.error("Service Worker registration is null.");
          alert("通知設定エラー: サービスワーカーの登録に失敗しました。");
          setIsTokenLoading(false);
          return;
        }

        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registrationRef.current, // nullでないことを保証
        });

        if (currentToken) {
          console.log("FCM registration token:", currentToken);
          setFcmToken(currentToken);

          // ユーザーがログインしている場合のみトークンを保存
          const user = auth.currentUser;
          if (user) {
            await saveTokenToFirestore(user.uid, currentToken, true);
          }
        } else {
          console.warn(
            "No registration token available. Request permission to generate one."
          );
          alert(
            "通知トークンの取得に失敗しました。通知が許可されていることを確認してください。"
          );
        }
      } else {
        console.warn(
          "Unable to get permission to notify. Permission:",
          permission
        );
        alert(
          "通知の許可が拒否されました。ブラウザの設定から許可してください。"
        );
        setFcmToken(null);
        // 許可されていない場合、既存のトークンがあれば削除を試みる
        const user = auth.currentUser;
        if (user && fcmToken) {
          console.log("aaaaaaaaaaaaaa");
          await removeTokenFromFirestore(user.uid, fcmToken || null, false); // トークンがなければnullを渡す
        }
        setFcmToken(null);
      }
    } catch (error) {
      console.error(
        "An error occurred while requesting notification permission or retrieving token. ",
        error
      );
      alert("通知設定中にエラーが発生しました。");
      setFcmToken(null);
    } finally {
      console.log("🔵 requestNotificationPermissionAndToken finished.");
      setIsTokenLoading(false);
    }
  };

  const disableNotification = async () => {
    console.log("🟢 disableNotification called.");
    setIsTokenLoading(true);
    try {
      const user = auth.currentUser;
      if (user && fcmToken) {
        // Firestoreからトークンを削除
        await removeTokenFromFirestore(user.uid, fcmToken, false);
        console.log("bbbbbbbbbbb");
        // トークンをローカルでもクリア
        setFcmToken(null);
        alert("通知を無効にしました。");
      } else {
        console.log(
          "FCM token not found or user not logged in. Cannot disable."
        );
        alert("無効にする通知トークンがありません。");
      }
      // ブラウザの通知許可はユーザーが手動で行う必要があります。
      // setPermissionStatus('denied'); はUI上の表示を更新するだけにとどめるべきです。
    } catch (error) {
      console.error("Error disabling notification:", error);
      alert("通知の無効化に失敗しました。");
    } finally {
      console.log("🔵 disableNotification finished.");
      setIsTokenLoading(false);
    }
  };

  // ユーザーのログイン状態が変更された際にトークンを初期化/取得
  // ユーザーのログイン状態が変更された際にトークンを初期化/取得
  useEffect(() => {
    console.log("🟢 useEffect for auth state and onMessage initialized.");
    const unsubscribeOnMessage = onMessage(messaging, (payload) => {
      console.log("✅ Message received in foreground:", payload);
      if (payload.notification) {
        new Notification(payload.notification.title || "新しい通知", {
          body: payload.notification.body || "",
          icon: payload.notification.icon || "/firebase-logo.png",
        });
      }
    });

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      console.log(
        "🟢 onAuthStateChanged triggered. User:",
        user?.uid || "null"
      );

      console.log(
        `🟡 setIsTokenLoading called: true (from onAuthStateChanged start)`
      );
      setIsTokenLoading(true);

      try {
        // try...finally で確実に isTokenLoading を false に戻す
        console.log(
          `onAuthStateChanged start - current isTokenLoading: ${isTokenLoading}`
        ); // ★修正後のログ

        if (user) {
          setPermissionStatus(Notification.permission);

          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef).catch((err) => {
            console.error(
              "❌ Error getting user doc in onAuthStateChanged:",
              err
            );
            return null;
          });
          const userData = userDocSnap?.data();
          const notificationsEnabledInFirestore =
            userData?.notificationsEnabled !== false;

          console.log(
            `User ${user.uid} notificationsEnabledInFirestore: ${notificationsEnabledInFirestore}`
          );
          console.log(
            `Current Notification.permission: ${Notification.permission}`
          );
          console.log(`Current fcmToken state: ${fcmToken}`);

          if (
            Notification.permission === "granted" &&
            notificationsEnabledInFirestore
          ) {
            // ローディングは既に true に設定されているので、この中の if (!fcmToken) 判定は不要になる
            // console.log("🟠 onAuthStateChanged: Notifications enabled, proceeding to get token.");

            if (!registrationRef.current) {
              try {
                console.log("🟠 Registering Service Worker on auth change.");
                const registration = await navigator.serviceWorker.register(
                  "/firebase-messaging-sw.js"
                );
                registrationRef.current = registration;
                console.log("✅ SW registered on auth change.");
              } catch (error) {
                console.error(
                  "❌ SW registration failed on auth change:",
                  error
                );
                return; // エラー発生時はこれ以上進まない
              }
            }
            console.log(
              "🟠 Waiting for Service Worker to be ready on auth change."
            );
            await navigator.serviceWorker.ready;
            console.log("✅ SW is ready on auth change.");

            if (registrationRef.current) {
              if (!fcmToken) {
                // ローカルのfcmTokenがnullの場合のみgetTokenを試みる
                console.log(
                  "🟠 Attempting to get existing token on auth change."
                );
                const existingToken = await getToken(messaging, {
                  vapidKey: VAPID_KEY,
                  serviceWorkerRegistration: registrationRef.current,
                }).catch((err) => {
                  console.warn(
                    "⚠️ Failed to get existing FCM token on auth change:",
                    err
                  );
                  return null;
                });

                if (existingToken) {
                  console.log(
                    "✅ Existing FCM token found on auth change:",
                    existingToken
                  );
                  setFcmToken(existingToken);
                  // Firestore の docSnap の取得は onAuthStateChanged の上部で行うように変更済み
                  // userData が既に取得されているのでそれを使う
                  if (
                    !userData ||
                    !userData?.deviceTokens?.includes(existingToken)
                  ) {
                    console.log(
                      "🟠 Saving new/existing token to Firestore on auth change."
                    );
                    await saveTokenToFirestore(
                      user.uid,
                      existingToken,
                      true
                    ).catch((err) => {
                      console.error(
                        "❌ Error saving token to Firestore in onAuthStateChanged:",
                        err
                      );
                    });
                    console.log("✅ Token saved to Firestore on auth change.");
                  }
                } else {
                  console.log("⚠️ No existing token found on auth change.");
                }
              } else {
                console.log(
                  "ℹ️ Local FCM token already exists. Skipping getToken on auth change."
                );
                // 既存のトークンがFirestoreに存在するかだけ確認
                if (!userData || !userData?.deviceTokens?.includes(fcmToken)) {
                  console.log(
                    "🟠 Existing local token not in Firestore. Saving it."
                  );
                  await saveTokenToFirestore(user.uid, fcmToken, true).catch(
                    (err) => {
                      console.error(
                        "❌ Error saving existing local token to Firestore in onAuthStateChanged:",
                        err
                      );
                    }
                  );
                  console.log("✅ Local token saved to Firestore.");
                }
              }
            }
          } else {
            console.log(
              "⚠️ Notification not enabled (permission denied or disabled in Firestore). Skipping token acquisition."
            );
            // この場合、ローディングを true にするパスは通っていないので、何もしない
          }
        } else {
          console.log("🟠 User logged out. Resetting token and permission.");
          setFcmToken(null);
          setPermissionStatus("default");
        }
      } finally {
        // ★修正箇所: onAuthStateChanged の最後に確実にローディング状態をOFFにする
        console.log(
          `🟡 setIsTokenLoading called: false (from onAuthStateChanged finally)`
        );
        setIsTokenLoading(false);
      }
      console.log(
        `onAuthStateChanged end - current isTokenLoading: ${isTokenLoading}`
      ); // ★修正後のログ
    });

    return () => {
      console.log("🔵 Cleaning up auth state and onMessage listeners.");
      unsubscribeAuth();
      unsubscribeOnMessage();
    };
  }, [auth, fcmToken]); // 依存配列は auth と fcmToken のままでOK

  return {
    fcmToken,
    permissionStatus,
    isTokenLoading,
    requestNotificationPermissionAndToken,
    disableNotification,
  };
};

// Firestore にトークンを保存する関数
const saveTokenToFirestore = async (
  userId: string,
  token: string,
  notificationsEnabled: boolean
) => {
  const userDocRef = doc(db, "users", userId);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      await updateDoc(userDocRef, {
        deviceTokens: arrayUnion(token),
        notificationsEnabled: notificationsEnabled,
      });
      console.log(
        "FCM token added to existing user document and notificationsEnabled updated:",
        userId
      );
    } else {
      // ユーザーのドキュメントがまだない場合は作成
      await setDoc(userDocRef, {
        deviceTokens: [token],
        createdAt: new Date(),
        notificationsEnabled: notificationsEnabled,
        // 必要に応じて他の初期ユーザー情報
      });
      console.log(
        "New user document created and FCM token saved (notificationsEnabled also set):",
        userId
      );
    }
  } catch (error) {
    console.error("Error saving FCM token to Firestore:", error);
  }
};

// Firestore からトークンを削除する関数
const removeTokenFromFirestore = async (
  userId: string,
  token: string | null,
  notificationsEnabled: boolean
) => {
  const userDocRef = doc(db, "users", userId);
  try {
    const updateData: { deviceTokens?: any; notificationsEnabled: boolean } = {
      notificationsEnabled: notificationsEnabled, // ★追加・更新
    };
    if (token) {
      updateData.deviceTokens = arrayRemove(token);
    }

    await updateDoc(userDocRef, updateData);
    console.log(
      "FCM token removed from Firestore and notificationsEnabled updated for user:",
      userId
    );
  } catch (error) {
    console.error("Error removing FCM token from Firestore:", error);
  }
};
