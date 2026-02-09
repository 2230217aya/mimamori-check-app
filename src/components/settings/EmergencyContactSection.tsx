// src/components/settings/EmergencyContactSection.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { type EmergencyContact, type EmergencyGuide } from "../../types/index"; // 新しい型をインポート

// CSSモジュールをpropsで受け取るのではなく、このコンポーネント専用のCSSを使う

interface EmergencyContactSectionProps {
  groupId: string;
  styles: any; // 親からstylesオブジェクトを受け取る代わりに、このコンポーネント専用のCSSを使用
}

const EmergencyContactSection: React.FC<EmergencyContactSectionProps> = ({
  groupId,
  styles,
}) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [guides, setGuides] = useState<EmergencyGuide[]>([]);

  // フォームの状態
  const [newContactName, setNewContactName] = useState("");
  const [newContactRelationship, setNewContactRelationship] = useState("");
  const [newContactPhoneNumber, setNewContactPhoneNumber] = useState("");
  const [newContactNotes, setNewContactNotes] = useState("");

  const [newGuideTitle, setNewGuideTitle] = useState("");
  const [newGuideContent, setNewGuideContent] = useState("");

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);

  // 緊急連絡先のリアルタイム取得
  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, "groups", groupId, "emergencyContacts"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedContacts: EmergencyContact[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<EmergencyContact, "id">),
        createdAt: doc.data().createdAt as Timestamp,
      }));
      setContacts(fetchedContacts);
    });

    return () => unsubscribe();
  }, [groupId]);

  // 緊急時対応ガイドのリアルタイム取得
  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, "groups", groupId, "emergencyGuides"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGuides: EmergencyGuide[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<EmergencyGuide, "id">),
        createdAt: doc.data().createdAt as Timestamp,
      }));
      setGuides(fetchedGuides);
    });

    return () => unsubscribe();
  }, [groupId]);

  // 緊急連絡先の追加/更新ハンドラー
  const handleSaveContact = useCallback(async () => {
    if (!groupId || !newContactName.trim() || !newContactPhoneNumber.trim()) {
      alert("氏名と電話番号は必須です。");
      return;
    }

    try {
      if (editingContactId) {
        // 更新
        const contactRef = doc(
          db,
          "groups",
          groupId,
          "emergencyContacts",
          editingContactId
        );
        await updateDoc(contactRef, {
          name: newContactName.trim(),
          relationship: newContactRelationship.trim(),
          phoneNumber: newContactPhoneNumber.trim(),
          notes: newContactNotes.trim(),
        });
        alert("連絡先を更新しました。");
      } else {
        // 追加
        await addDoc(collection(db, "groups", groupId, "emergencyContacts"), {
          name: newContactName.trim(),
          relationship: newContactRelationship.trim(),
          phoneNumber: newContactPhoneNumber.trim(),
          notes: newContactNotes.trim(),
          createdAt: Timestamp.now(),
        });
        alert("新しい連絡先を追加しました。");
      }
      // フォームをリセット
      setNewContactName("");
      setNewContactRelationship("");
      setNewContactPhoneNumber("");
      setNewContactNotes("");
      setEditingContactId(null);
    } catch (error) {
      console.error("連絡先の保存エラー:", error);
      alert("連絡先の保存に失敗しました。");
    }
  }, [
    groupId,
    editingContactId,
    newContactName,
    newContactRelationship,
    newContactPhoneNumber,
    newContactNotes,
  ]);

  // 緊急連絡先の編集開始
  const handleEditContact = useCallback((contact: EmergencyContact) => {
    setNewContactName(contact.name);
    setNewContactRelationship(contact.relationship || "");
    setNewContactPhoneNumber(contact.phoneNumber);
    setNewContactNotes(contact.notes || "");
    setEditingContactId(contact.id);
  }, []);

  // 緊急連絡先の削除
  const handleDeleteContact = useCallback(
    async (contactId: string) => {
      if (!window.confirm("この連絡先を削除しますか？")) return;
      try {
        await deleteDoc(
          doc(db, "groups", groupId, "emergencyContacts", contactId)
        );
        alert("連絡先を削除しました。");
      } catch (error) {
        console.error("連絡先の削除エラー:", error);
        alert("連絡先の削除に失敗しました。");
      }
    },
    [groupId]
  );

  // 緊急時対応ガイドの追加/更新ハンドラー
  const handleSaveGuide = useCallback(async () => {
    if (!groupId || !newGuideTitle.trim() || !newGuideContent.trim()) {
      alert("タイトルと内容は必須です。");
      return;
    }

    try {
      if (editingGuideId) {
        // 更新
        const guideRef = doc(
          db,
          "groups",
          groupId,
          "emergencyGuides",
          editingGuideId
        );
        await updateDoc(guideRef, {
          title: newGuideTitle.trim(),
          content: newGuideContent.trim(),
        });
        alert("ガイドを更新しました。");
      } else {
        // 追加
        await addDoc(collection(db, "groups", groupId, "emergencyGuides"), {
          title: newGuideTitle.trim(),
          content: newGuideContent.trim(),
          createdAt: Timestamp.now(),
        });
        alert("新しいガイドを追加しました。");
      }
      // フォームをリセット
      setNewGuideTitle("");
      setNewGuideContent("");
      setEditingGuideId(null);
    } catch (error) {
      console.error("ガイドの保存エラー:", error);
      alert("ガイドの保存に失敗しました。");
    }
  }, [groupId, editingGuideId, newGuideTitle, newGuideContent]);

  // 緊急時対応ガイドの編集開始
  const handleEditGuide = useCallback((guide: EmergencyGuide) => {
    setNewGuideTitle(guide.title);
    setNewGuideContent(guide.content);
    setEditingGuideId(guide.id);
  }, []);

  // 緊急時対応ガイドの削除
  const handleDeleteGuide = useCallback(
    async (guideId: string) => {
      if (!window.confirm("このガイドを削除しますか？")) return;
      try {
        await deleteDoc(doc(db, "groups", groupId, "emergencyGuides", guideId));
        alert("ガイドを削除しました。");
      } catch (error) {
        console.error("ガイドの削除エラー:", error);
        alert("ガイドの削除に失敗しました。");
      }
    },
    [groupId]
  );

  return (
    <section className={styles.settingsSection}>
      <h3 className={styles.sectionTitle}>緊急連絡先・対応ガイド</h3>

      {/* 緊急連絡先リスト */}
      <div className={styles.subsection}>
        <h4 className={styles.subsectionTitle}>緊急連絡先リスト</h4>
        {contacts.length === 0 ? (
          <p className={styles.noDataText}>登録された連絡先はありません。</p>
        ) : (
          <ul className={styles.list}>
            {contacts.map((contact) => (
              <li key={contact.id} className={styles.listItem}>
                <div className={styles.contactInfo}>
                  <strong>{contact.name}</strong>
                  {contact.relationship && (
                    <span className={styles.relationship}>
                      ({contact.relationship})
                    </span>
                  )}
                  <a
                    href={`tel:${contact.phoneNumber}`}
                    className={styles.phoneNumber}
                  >
                    {contact.phoneNumber}
                  </a>
                  {contact.notes && (
                    <p className={styles.notes}>{contact.notes}</p>
                  )}
                </div>
                <div className={styles.actions}>
                  <button
                    onClick={() => handleEditContact(contact)}
                    className={styles.editButton}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className={styles.deleteButton}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 緊急連絡先 追加/編集フォーム */}
        <div className={styles.formContainer}>
          <h5 className={styles.formTitle}>
            {editingContactId ? "連絡先を編集" : "新しい連絡先を追加"}
          </h5>
          <input
            type="text"
            placeholder="氏名・機関名 (必須)"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            className={styles.inputField}
          />
          <input
            type="text"
            placeholder="関係性 (例: かかりつけ医, 家族)"
            value={newContactRelationship}
            onChange={(e) => setNewContactRelationship(e.target.value)}
            className={styles.inputField}
          />
          <input
            type="tel"
            placeholder="電話番号 (必須)"
            value={newContactPhoneNumber}
            onChange={(e) => setNewContactPhoneNumber(e.target.value)}
            className={styles.inputField}
          />
          <textarea
            placeholder="備考 (アレルギー情報など)"
            value={newContactNotes}
            onChange={(e) => setNewContactNotes(e.target.value)}
            className={styles.textareaField}
            rows={3}
          ></textarea>
          <div className={styles.formActions}>
            <button onClick={handleSaveContact} className={styles.saveButton}>
              {editingContactId ? "更新" : "追加"}
            </button>
            {editingContactId && (
              <button
                onClick={() => {
                  setEditingContactId(null);
                  setNewContactName("");
                  setNewContactRelationship("");
                  setNewContactPhoneNumber("");
                  setNewContactNotes("");
                }}
                className={styles.cancelButton}
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 緊急時対応ガイドリスト */}
      <div className={styles.subsection}>
        <h4 className={styles.subsectionTitle}>緊急時対応ガイド</h4>
        {guides.length === 0 ? (
          <p className={styles.noDataText}>登録されたガイドはありません。</p>
        ) : (
          <ul className={styles.list}>
            {guides.map((guide) => (
              <li key={guide.id} className={styles.listItem}>
                <div className={styles.guideInfo}>
                  <strong>{guide.title}</strong>
                  <p className={styles.guideContent}>{guide.content}</p>
                </div>
                <div className={styles.actions}>
                  <button
                    onClick={() => handleEditGuide(guide)}
                    className={styles.editButton}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteGuide(guide.id)}
                    className={styles.deleteButton}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 緊急時対応ガイド 追加/編集フォーム */}
        <div className={styles.formContainer}>
          <h5 className={styles.formTitle}>
            {editingGuideId ? "ガイドを編集" : "新しいガイドを追加"}
          </h5>
          <input
            type="text"
            placeholder="ガイドのタイトル (例: 発熱時の対応フロー) (必須)"
            value={newGuideTitle}
            onChange={(e) => setNewGuideTitle(e.target.value)}
            className={styles.inputField}
          />
          <textarea
            placeholder="ガイドの内容 (具体的な手順など) (必須)"
            value={newGuideContent}
            onChange={(e) => setNewGuideContent(e.target.value)}
            className={styles.textareaField}
            rows={5}
          ></textarea>
          <div className={styles.formActions}>
            <button onClick={handleSaveGuide} className={styles.saveButton}>
              {editingGuideId ? "更新" : "追加"}
            </button>
            {editingGuideId && (
              <button
                onClick={() => {
                  setEditingGuideId(null);
                  setNewGuideTitle("");
                  setNewGuideContent("");
                }}
                className={styles.cancelButton}
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmergencyContactSection;
