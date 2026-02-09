// public/firebase-messaging-sw.js

// Firebase SDK のインポート
// messaging-compat は v9 以降で以前のAPIと互換性のあるラッパーを提供します。
// v8以前のAPIを使いたい場合は compat を使用します。
// https://firebase.google.com/docs/web/setup#available-libraries
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// ★重要★: ここにあなたの Firebase プロジェクトの構成情報を記述します。
// 通常、src/firebase.ts にある firebaseConfig オブジェクトの内容をコピーします。
// ただし、サービスワーカーはメインのJavaScriptとは別のスコープで動作するため、
// import や直接の変数参照はできません。ハードコードするか、ビルド時に埋め込む必要があります。
const firebaseConfig = {
  apiKey: "AIzaSyCJrrFj_kjwOpZ8Dnx_b2doePuTGM1SyiE",
  authDomain: "mimamori-check.firebaseapp.com",
  projectId: "mimamori-check",
  storageBucket: "mimamori-check.firebasestorage.app",
  messagingSenderId: "477922222279",
  appId: "1:477922222279:web:8aca18866f307f0ea95ee2",
  measurementId: "G-MVL8LXGNN0",
};

// Firebase の初期化
firebase.initializeApp(firebaseConfig);

// Messaging サービスを取得
const messaging = firebase.messaging();

// バックグラウンドでのメッセージ受信時の処理
// アプリが閉じている、またはバックグラウンドにある場合にここに通知が届きます。
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // 通知のタイトルとオプションを設定
  const notificationTitle = payload.notification.title || "新しい通知";
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logo192.png", // アプリのアイコンのパス (public ディレクトリからの相対パス)
    data: payload.data, // カスタムデータも通知に含めることができる
    // その他のオプション (画像、アクションボタン、tagなど)
    // tag: 'my-notification-tag', // 同じタグの通知を置き換える
    // renotify: true, // 同じタグで新しい通知が来たときに再表示
    // actions: [ // 通知にアクションボタンを追加
    //   { action: 'open_url', title: '開く' },
    //   { action: 'reply', title: '返信' }
    // ]
  };

  // ブラウザのネイティブ通知を表示
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// オプション: サービスワーカーのアクティブ化時のログ
self.addEventListener("activate", (event) => {
  console.log("Service Worker activated!");
});
