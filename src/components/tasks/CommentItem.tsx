// src/components/comments/CommentItem.tsx

import React, { useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";
import {
  type Comment,
  type UserNameMap,
  type FileAttachment,
} from "../../types";

// ⭐ 変更: 親のTaskList.module.cssをインポート
import styles from "../../pages/TaskList.module.css";

interface CommentItemProps {
  comment: Comment;
  currentUserUid: string | undefined;
  userNames: UserNameMap;
  onDeleteComment: (
    taskId: string,
    commentId: string,
    postedBy: string,
    fileAttachment?: FileAttachment
  ) => void;
  taskId: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserUid,
  userNames,
  onDeleteComment,
  taskId,
}) => {
  const isMyComment = useMemo(
    () => currentUserUid === comment.postedBy,
    [currentUserUid, comment.postedBy]
  );

  const handleDeleteClick = useCallback(() => {
    onDeleteComment(
      taskId,
      comment.id,
      comment.postedBy,
      comment.fileAttachment
    );
  }, [
    onDeleteComment,
    taskId,
    comment.id,
    comment.postedBy,
    comment.fileAttachment,
  ]);

  return (
    <li className={styles.commentItem}>
      <div className={styles.commentHeader}>
        <span className={styles.commentAuthor}>
          {userNames[comment.postedBy] || "読み込み中..."}
        </span>
        <span className={styles.commentTimestamp}>
          {comment.postedAt // Timestampが存在するかチェック
            ? format(comment.postedAt.toDate(), "MM/dd HH:mm", { locale: ja })
            : "日時不明"}
        </span>
        {isMyComment && (
          <button
            onClick={handleDeleteClick}
            className={styles.deleteCommentButton}
          >
            ✕
          </button>
        )}
      </div>
      {comment.text && <p className={styles.commentText}>{comment.text}</p>}

      {comment.fileAttachment && ( // ファイル添付がある場合
        <div className={styles.fileAttachment}>
          {comment.fileAttachment.mimeType?.startsWith("image/") ? (
            <a
              href={comment.fileAttachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.attachedFileLink}
            >
              <img
                src={comment.fileAttachment.fileUrl}
                alt={comment.fileAttachment.fileName}
                className={styles.attachedImage}
              />
            </a>
          ) : (
            <a
              href={comment.fileAttachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.attachedFileLink}
            >
              <span className={styles.fileIcon}>📁</span>{" "}
              {comment.fileAttachment.fileName}
            </a>
          )}
        </div>
      )}
    </li>
  );
};

export default CommentItem;
