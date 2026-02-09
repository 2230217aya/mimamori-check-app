# mimamori-check-app

在宅介護における家族・介護者間の情報共有を円滑にし、負担を軽減するアプリ【2025冬～20262月】

『みまもりチェック』 - 在宅介護を支える情報共有アプリ

![alt text](https://github.com/2230217aya/mimamori-check-app/blob/main/docs/screenshot_main_dashboard.png?raw=true)

(ここに、アプリのメイン画面や特徴的な画面のスクリーンショットを貼り付けます。docsフォルダを作成し、その中に画像を保存してパスを調整してください。)

概要 (What is Mimamori Check?)

『みまもりチェック』は、在宅介護における家族や介護者間の情報共有を円滑にし、介護負担を軽減することを目的としたアプリケーションです。今日のタスクのリアルタイム共有、完了状況の記録、そしてAIによる健康リスク予測を通じて、より質の高い見守りをサポートします。

このアプリでできること

今日のタスク管理: リアルタイムでタスクを共有し、誰がいつ完了したかを瞬時に把握できます。

健康記録の共有: バイタルサイン、食事、排泄、服薬などの健康記録を簡単に登録・共有できます。

AIによる健康リスク予測: 記録された健康データからAIが健康リスクの予兆を分析し、早期の注意喚起を促します（例: 血圧上昇傾向、便秘の兆候など）。

週間・月間カレンダービュー: 将来の予定や過去のタスク履歴をカレンダー形式で確認し、計画的な介護をサポートします。

ターゲットユーザー (Who is this for?)

このアプリケーションは、以下のような方々を対象としています。

遠隔地で介護を行っているご家族

複数の介護者が関わる在宅介護環境

介護負担を軽減し、効率的に情報共有を行いたい方々

被介護者の健康状態の変化にいち早く気づきたい方々

プロジェクトの背景 (Background)

近年、高齢化社会の進展に伴い在宅介護のニーズが高まっています。しかし、複数の家族や介護者が関わる中で、情報共有の不足による二重介護、連絡ミス、そして個々の介護者の負担増大といった課題が顕在化しています。本プロジェクトは、これらの課題に対し、デジタル技術を活用した解決策を提案します。

開発目的 (Goal)

情報共有の効率化: 介護者間のタスクや被介護者の状態をリアルタイムで共有し、コミュニケーションコストを削減する。

介護負担の軽減: タスクの見える化と記録の自動化により、介護者の精神的・時間的負担を軽減する。

早期の異変察知: 収集された健康データをAIで分析し、被介護者の健康リスクの予兆を早期に発見・通知することで、安心感を提供する。

システム構成 (System Architecture)

フロントエンド:

技術: React (TypeScript)

UIライブラリ: Material-UI (MUI) など

バックエンド/データベース:

技術: Firebase (Firestore, Authentication, Cloud Functions)

役割: ユーザー認証、データ保存、リアルタイム同期、AI分析ロジックの実行

AI分析:

技術: Firebase Cloud Functions (Node.js/TypeScript) 内での統計的分析、簡易機械学習モデル

役割: 健康記録データからのリスク予兆検知

主要機能一覧 (Features)

認証機能: メールアドレスとパスワードによるユーザー登録・ログイン。

グループ管理機能: 介護グループの作成、参加、選択。

タスク管理:

今日のタスクのリアルタイム表示と完了チェック。

誰がいつタスクを完了したかの記録と表示。

管理者によるタスクの追加・編集・削除。

週間・月間タスクカレンダービュー。

健康記録機能:

バイタルサイン（体温、血圧、SPO2）の記録。

食事・水分摂取量の記録。

排泄（尿、便）の記録と詳細情報。

服薬状況の記録と予定管理。

AI健康インサイト:

記録されたデータに基づいた健康リスクの予測とアラート表示（例: 高血圧予兆、便秘リスク、脱水リスク、服薬忘れ）。

画面イメージ (Screenshots)

1. メインダッシュボード (今日のタスク)

![alt text](https://github.com/2230217aya/mimamori-check-app/blob/main/docs/screenshot_main2_dashboard.png?raw=true)

2. 健康記録ダッシュボード

![alt text](https://github.com/YOUR_GITHUB_USERNAME/mimamori-check-app/blob/main/docs/screenshot_health_dashboard.png?raw=true)

3. 健康記録入力画面 (例: バイタルサイン)

![alt text](https://github.com/YOUR_GITHUB_USERNAME/mimamori-check-app/blob/main/docs/screenshot_vitalsign_input.png?raw=true)

4. カレンダービュー

![alt text](https://github.com/YOUR_GITHUB_USERNAME/mimamori-check-app/blob/main/docs/screenshot_calendar_view.png?raw=true)

5. AI健康インサイト表示例
まだ完成しきってない
<!-- ![alt text](https://github.com/YOUR_GITHUB_USERNAME/mimamori-check-app/blob/main/docs/screenshot_ai_insights.png?raw=true) -->

実行方法 (How to Run)

このプロジェクトをローカルで実行するには、以下の手順に従ってください。

前提条件

Node.js (v18.x 以上を推奨)

npm (v9.x 以上を推奨) または Yarn

Firebase CLI (v11.x 以上を推奨)

FirebaseプロジェクトのセットアップとFirestore, Authentication, Cloud Functionsの有効化

Firebaseプロジェクト設定ファイル（src/firebase.ts 用）

セットアップ

リポジトリをクローンします:

code
Bash
download
content_copy
expand_less
git clone https://github.com/YOUR_GITHUB_USERNAME/mimamori-check-app.git
cd mimamori-check-app

依存関係をインストールします:
ルートディレクトリでフロントエンドの依存関係をインストールします。

code
Bash
download
content_copy
expand_less
npm install

# または yarn install

Functionsの依存関係もインストールします。

code
Bash
download
content_copy
expand_less
cd functions
npm install

# または yarn install

cd .. # ルートディレクトリに戻る

Firebaseプロジェクトを設定します:

src/firebase.ts ファイルを編集し、あなたのFirebaseプロジェクトの設定を記述してください。

functions ディレクトリに .env ファイルを作成し、Functionsで使用する環境変数（もしあれば）を設定してください。（例: VITE_FIREBASE_API_KEY=...）

Functionsをビルドします:

code
Bash
download
content_copy
expand_less
cd functions
npm run build
cd ..
ローカル開発サーバーとエミュレーターの起動

Firebase Emulators を使用して、Functions と Firestore をローカルでシミュレートしながらフロントエンドを開発できます。

エミュレーターを起動します:
プロジェクトのルートディレクトリで新しいターミナルを開き、以下を実行します。

code
Bash
download
content_copy
expand_less
firebase emulators:start --only firestore,functions,auth --import=./firebase-emulator-data --export-on-exit

ブラウザで http://localhost:4000 にアクセスすると、Emulator UIが表示されます。

フロントエンド開発サーバーを起動します:
別のターミナルを開き、プロジェクトのルートディレクトリで以下を実行します。

code
Bash
download
content_copy
expand_less
npm run dev

# または yarn dev

通常 http://localhost:5173 （またはViteが表示するURL）でアプリにアクセスできます。

本番環境へのデプロイ

ローカルでのテストが完了したら、Firebaseにデプロイできます。

Functionsをデプロイします:

code
Bash
download
content_copy
expand_less
cd functions
firebase deploy --only functions
cd ..

フロントエンドをデプロイします:
Firebase Hostingを使用する場合。

code
Bash
download
content_copy
expand_less
npm run build # フロントエンドをビルド
firebase deploy --only hosting
今後の課題 (Future Work)

UI/UXの改善: より直感的で使いやすいインターフェースの追求。

AI分析の高度化:

より複雑な時系列データ分析や機械学習モデルの導入。

複数の記録タイプを組み合わせた複合的なリスク予測。

予測結果の根拠の可視化（説明可能性）。

通知機能の強化: アラートレベルに応じたプッシュ通知やメール通知の実装。

グラフ・レポート機能: 記録データの傾向を可視化するグラフ表示や、日次/週次レポートの生成。

多言語対応: より多くのユーザーに利用してもらうための多言語化。

アクセス権限の細分化: グループ内での役割に応じた詳細なアクセス権限設定。
