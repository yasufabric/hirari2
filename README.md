# マッスルひらり (hirari2)

スマホブラウザでそのまま遊べる、タップで避ける筋肉育成アクションゲーム。

レーンをタップして3本のレーンを移動し、上から落ちてくる添加物を
ひらりとかわしながら、タンパク質を集めてどんどんムキムキになろう。

## 遊ぶ

**https://yasufabric.github.io/hirari2/** （スマホブラウザ推奨）

## 遊び方

- **はじめる** をタップ（PCなら Enter / Space）してスタート。
- 画面の左・中・右、または下の **左 / 中 / 右** をタップしてレーン移動。PCは ← → または A / D。
- 隣のレーンの添加物をかわすと **ひらり!** ボーナス。
- 赤いダイヤ（添加物）に当たるとゲームオーバー。**もういちど** で再開。
- 缶（プロテイン）を取るとスコアが増え、キャラがムキムキになる。連続で取るとコンボ。
- ムキムキが増えるほどスコア倍率が上がる。ゲームオーバーでからだランクが出る。
- 生存時間に応じてスコアが増加。時間が経つほど落下物の速度とスポーン頻度が上がる。
- いちばんのスコアは端末に保存される。右上の **おと** でミュート。その下の **ポーズ** で一時停止。
- BGMと効果音はWeb Audio APIのオリジナル。

## 技術スタック

- [Vite](https://vitejs.dev/) + TypeScript（開発サーバー・ビルドのみ、フレームワークなし）
- HTML5 Canvas 2D（ゲームエンジンなしの素の描画・当たり判定）
- 開始・終了・HUD は HTML。プレイ面だけ Canvas。
- 依存パッケージはビルドツールのみ（`vite`, `typescript`）で、実行時ライブラリはゼロ

## 開発

```bash
npm install
npm run dev
```

`npm run dev` は `--host` 付きで起動するため、ターミナルに表示されるLAN URLを
スマホの同一Wi-Fiで開けば実機で確認できる。PCではChrome DevToolsの
デバイスツールバー（Ctrl/Cmd+Shift+M）でモバイル表示を再現するのが手軽。

## ビルド

```bash
npm run build   # tsc --noEmit で型チェック後、vite build で dist/ を生成
npm run preview # dist/ をローカルで確認
```

## itch.io への自動デプロイ

`main` への push（または Actions の手動実行）で
`.github/workflows/itch.yml` が `npm run build:itch`（相対パス `--base=./` で
`dist-itch/` に出力）を実行し、itch 公式 CLI [butler](https://itch.io/docs/butler/) で
[yasufabric/muscle-hirari](https://yasufabric.itch.io/muscle-hirari) の `html5` チャンネルにアップロードする。
GitHub Pages 用の `npm run build`（`base: '/hirari2/'`）とは別ビルド。

### 初回セットアップ（一度だけ）

1. itch.io → アカウント設定（Settings）→ **API keys** で API キーを作成する。
2. GitHub のリポジトリ → Settings → Secrets and variables → Actions に、
   名前 **`BUTLER_API_KEY`** でそのキーを登録する。
   （未登録の間はワークフローが notice を出してスキップし、成功扱いで終わる）
3. 最初の自動アップロード後、itch のゲーム編集ページ（Edit game）の Uploads で、
   新しい `html5` アップロードの **「This file will be played in the browser」** にチェックを入れて保存する。
   古い手動 zip のアップロードはチェックを外すか削除する。
