// src/firebase.ts

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth"; // Userも必要になることが多いので追加
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
// ⭐ Firebase Storage 関連のインポートを修正
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot, // ⭐ UploadTaskSnapshot をインポート
  type FirebaseStorage, // ⭐ getStorage の型もインポートしておくと良い
} from "firebase/storage";

import { connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJrrFj_kjwOpZ8Dnx_b2doePuTGM1SyiE",
  authDomain: "mimamori-check.firebaseapp.com",
  projectId: "mimamori-check",
  storageBucket: "mimamori-check.firebasestorage.app",
  messagingSenderId: "477922222279",
  appId: "1:477922222279:web:8aca18866f307f0ea95ee2",
  measurementId: "G-MVL8LXGNN0",
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const messaging = getMessaging(app);
const storage: FirebaseStorage = getStorage(app); // ⭐ ここで getStorage に app を渡す

// ⭐ ここから追加 ⭐
// 開発環境でのみFirebaseエミュレーターに接続
if (import.meta.env.DEV) {
  // Viteを使用しているため import.meta.env.DEV で開発モードを判定
  console.log("Connecting to Firebase Emulators..."); // ⭐ これで接続確認
  connectFirestoreEmulator(db, "localhost", 8080); // Firestore Emulatorに接続
  // connectAuthEmulator も必要であれば追加
  // import { getAuth, connectAuthEmulator } from "firebase/auth";
  // connectAuthEmulator(auth, "http://localhost:9099");
  // Functionsがcallable functionを使用する場合も追加
  // import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
  // connectFunctionsEmulator(getFunctions(app), "localhost", 5001);
}

interface UploadResult {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  // 必要であれば、thumbnailUrl などもここに追加
}

export const uploadFileToFirebaseStorage = async (
  file: File,
  groupId: string,
  taskId: string,
  commentId: string, // コメントIDに紐付けて保存する場合
  progressCallback?: (progress: number) => void, // ⭐ 進捗コールバックを追加
): Promise<UploadResult> => {
  if (!auth.currentUser) {
    // auth は下の定義を使うため、ここでエラーにならないよう調整
    throw new Error("ユーザーが認証されていません。");
  }

  // 例: attachments/{groupId}/{taskId}/{commentId}/{ファイル名}
  const storageRef = ref(
    storage, // ⭐ ここで上で初期化した storage インスタンスを使用
    `attachments/${groupId}/${taskId}/${commentId}/${file.name}`,
  );

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        // ⭐ snapshot の型を明示的に指定
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // console.log("Upload is " + progress + "% done"); // 不要なログはコメントアウト
        if (progressCallback) {
          // ⭐ コールバックがあれば呼び出す
          progressCallback(progress);
        }
      },
      (error) => {
        console.error("ファイルアップロードエラー:", error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        // console.log("File available at", downloadURL); // 不要なログはコメントアウト
        resolve({
          fileUrl: downloadURL,
          fileName: file.name,
          mimeType: file.type,
        });
      },
    );
  });
};

export { auth, db, messaging, app, storage }; // ⭐ storage もエクスポートリストに追加
