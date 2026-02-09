// src/components/comments/CommentSection.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Timestamp,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { type User } from "firebase/auth";
import {
  type UserNameMap,
  type Comment,
  type FileAttachment,
} from "../../types";
import {
  uploadFileToFirebaseStorage,
  deleteFileFromFirebaseStorage,
} from "../../utils/firebaseStorage";

import CommentItem from "./CommentItem";
// ⭐ 変更: 親のTaskList.module.cssをインポート
import styles from "../../pages/TaskList.module.css";

interface CommentSectionProps {
  taskId: string;
  groupId: string;
  currentUser: User | null;
  userNames: UserNameMap;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  taskId,
  groupId,
  currentUser,
  userNames,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentListRef = useRef<HTMLUListElement>(null);

  // コメントのリアルタイム取得
  useEffect(() => {
    if (!taskId) return;

    const commentsCollectionRef = collection(db, "tasks", taskId, "comments");
    const q = query(commentsCollectionRef, orderBy("postedAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments: Comment[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || "",
          postedBy: data.postedBy || "",
          postedAt: data.postedAt as Timestamp,
          fileAttachment: data.fileAttachment as FileAttachment | undefined,
        };
      });
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [taskId]);

  // 新規コメント投稿時の自動スクロール
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  // ファイル選択ハンドラ
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        setSelectedFile(event.target.files[0]);
      } else {
        setSelectedFile(null);
      }
    },
    []
  );

  // コメントとファイルの投稿
  const handleAddComment = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!currentUser || (!newCommentText.trim() && !selectedFile)) {
        return;
      }

      setIsPostingComment(true);
      setUploadProgress(0);

      try {
        let fileAttachment: FileAttachment | undefined = undefined;
        let commentId: string;

        const newCommentRef = doc(collection(db, "tasks", taskId, "comments"));
        commentId = newCommentRef.id;

        if (selectedFile) {
          setUploadingFile(true);
          const uploaded = await uploadFileToFirebaseStorage(
            selectedFile,
            groupId,
            taskId,
            commentId,
            (progress) => setUploadProgress(progress)
          );
          fileAttachment = {
            // ⭐ ここにデータがセットされる
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            mimeType: uploaded.mimeType,
          };
          setUploadingFile(false);
        }

        // ⭐ ここを修正: fileAttachmentData が存在する場合のみフィールドを追加する
        const baseCommentData = {
          text: newCommentText.trim(),
          postedBy: currentUser.uid,
          postedAt: Timestamp.now(),
        };

        // 条件付きで fileAttachment フィールドを追加
        const newCommentData = fileAttachment
          ? { ...baseCommentData, fileAttachment: fileAttachment }
          : baseCommentData; // fileAttachmentData がなければ追加しない

        await setDoc(newCommentRef, newCommentData);

        setNewCommentText("");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("コメントまたはファイルアップロードエラー:", error);
        alert("コメントまたはファイルの追加に失敗しました。");
        setUploadingFile(false);
      } finally {
        setIsPostingComment(false);
      }
    },
    [currentUser, newCommentText, selectedFile, taskId, groupId]
  );

  // コメントの削除
  const handleDeleteComment = useCallback(
    async (
      _taskId: string,
      commentId: string,
      postedBy: string,
      fileAttachment?: FileAttachment
    ) => {
      if (currentUser?.uid !== postedBy) {
        alert("自分のコメント以外は削除できません。");
        return;
      }
      if (!window.confirm("このコメントを削除しますか？")) {
        return;
      }

      try {
        await deleteDoc(doc(db, "tasks", taskId, "comments", commentId));

        if (fileAttachment && fileAttachment.fileUrl) {
          await deleteFileFromFirebaseStorage(fileAttachment.fileUrl);
        }
      } catch (error) {
        console.error("コメントまたはファイルの削除エラー:", error);
        alert("コメントの削除に失敗しました。");
      }
    },
    [currentUser?.uid, taskId]
  );

  const isPostButtonDisabled =
    !currentUser ||
    (newCommentText.trim() === "" && !selectedFile) ||
    isPostingComment ||
    uploadingFile;

  return (
    <div className={styles.commentSection}>
      <h4 className={styles.commentTitle}>コメント</h4>
      <ul ref={commentListRef} className={styles.commentList}>
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserUid={currentUser?.uid}
              userNames={userNames}
              onDeleteComment={handleDeleteComment}
              taskId={taskId}
            />
          ))
        ) : (
          <p className={styles.noCommentsText}>まだコメントはありません。</p>
        )}
      </ul>
      <form onSubmit={handleAddComment} className={styles.commentForm}>
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="コメントを追加..."
          className={styles.commentInput}
          rows={3}
          disabled={!currentUser || uploadingFile || isPostingComment}
        />
        <div className={styles.commentActions}>
          <input
            type="file"
            ref={fileInputRef}
            className={styles.fileInput}
            id={`file-upload-${taskId}`}
            onChange={handleFileChange}
            disabled={!currentUser || uploadingFile || isPostingComment}
          />
          <label
            htmlFor={`file-upload-${taskId}`}
            className={styles.fileUploadLabel}
          >
            ファイルを選択
          </label>
          {selectedFile && (
            <span className={styles.selectedFileName}>{selectedFile.name}</span>
          )}
        </div>
        {uploadingFile && (
          <div className={styles.uploadProgress}>
            ファイルアップロード中... ({uploadProgress.toFixed(0)}%)
          </div>
        )}
        <button
          type="submit"
          className={styles.addCommentButton}
          disabled={isPostButtonDisabled}
        >
          {uploadingFile
            ? "アップロード中..."
            : isPostingComment
            ? "投稿中..."
            : "投稿"}
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
