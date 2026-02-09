import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore"; // setDoc と doc をインポート
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

interface Group {
  name: string;
  members: string[];
  createdBy: string;
  createdAt: any;
  inviteCode: string;
}

const createGroup = async (
  groupName: string
): Promise<{ id: string; inviteCode: string } | null> => {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    console.error("ユーザーがログインしていません。");
    return null;
  }

  try {
    const generateInviteCode = (length = 6) => {
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
      return result;
    };

    const newInviteCode = generateInviteCode();

    // 1. 新しいグループドキュメントを作成
    const docRef = await addDoc(collection(db, "groups"), {
      name: groupName,
      members: [currentUser.uid],
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      inviteCode: newInviteCode,
    } as Omit<Group, "createdAt">);

    console.log(
      "新しいグループを作成しました ID:",
      docRef.id,
      "招待コード:",
      newInviteCode
    );

    // 2. グループ作成者のユーザープロファイルに currentGroupId を設定
    // `users` コレクションの現在のユーザーのドキュメントを更新
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(
      userDocRef,
      {
        currentGroupId: docRef.id, // 作成したグループのIDを currentGroupId として保存
      },
      { merge: true }
    ); // `merge: true` は、既存のフィールドを上書きせずに、指定したフィールドのみを更新するために重要です。

    console.log(
      `ユーザー ${currentUser.uid} の currentGroupId を ${docRef.id} に設定しました。`
    );

    return { id: docRef.id, inviteCode: newInviteCode };
  } catch (e) {
    console.error("グループ作成エラー: ", e);
    return null;
  }
};

export { createGroup };
