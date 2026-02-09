// src/utils/firebaseStorage.ts (新規作成)

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot, // ⭐ 追加: snapshot の型を明示的に指定するため
  deleteObject,
} from "firebase/storage";
import { auth } from "../firebase"; // 認証情報をインポート

const storage = getStorage(); // FirebaseApp を引数に渡すのが一般的ですが、getStorage() でデフォルトのappを使用することも可能

interface UploadResult {
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export const uploadFileToFirebaseStorage = async (
  file: File,
  groupId: string,
  taskId: string,
  commentId: string, // コメントIDに紐付けて保存する場合
  progressCallback?: (progress: number) => void // ⭐ 追加: アップロード進捗を通知するコールバック
): Promise<UploadResult> => {
  if (!auth.currentUser) {
    throw new Error("ユーザーが認証されていません。");
  }

  // 例: attachments/{groupId}/{taskId}/{commentId}/{ファイル名}
  const storageRef = ref(
    storage,
    `attachments/${groupId}/${taskId}/${commentId}/${file.name}`
  );

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        // ⭐ snapshot の型を明示的に指定
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (progressCallback) {
          progressCallback(progress); // 進捗をコールバックで通知
        }
      },
      (error) => {
        console.error("ファイルアップロードエラー:", error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          fileUrl: downloadURL,
          fileName: file.name,
          mimeType: file.type,
        });
      }
    );
  });
};

export const deleteFileFromFirebaseStorage = async (
  fileUrl: string
): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error("ユーザーが認証されていません。");
  }
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
    console.log("Storageからファイルを削除しました:", fileUrl);
  } catch (error) {
    console.error("Storageからのファイル削除エラー:", error);
    // ファイルが存在しない場合もエラーになることがあるので、ここでは警告ログに留めることも検討
  }
};
