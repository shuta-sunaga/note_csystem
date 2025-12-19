# note_csystem 使い方ガイド

note記事自動生成システムの使い方をまとめます。

---

## 🚀 クイックスタート

### 1. Claude Code を起動

```bash
cd C:\Users\shuta\Documents\dev\note_csystem
claude
```

### 2. 記事生成を依頼

Claude Code に以下のように依頼：

```
記事を書いて

テーマ: AIエージェントの未来
ターゲット: ビジネスパーソン
トーン: カジュアル
文字数: 2000文字
```

### 3. レビュー → 公開

生成された記事を確認し、OKならnote.comにコピペして公開。

---

## 📋 詳細な手順

### Step 1: プロジェクトディレクトリに移動

```bash
cd C:\Users\shuta\Documents\dev\note_csystem
```

### Step 2: Claude Code を起動

```bash
claude
```

> **Tips**: 既にClaude Codeが起動している場合はそのまま使えます

### Step 3: 記事生成を依頼

#### シンプルな依頼

```
「AIの未来」について記事を書いて
```

#### 詳細な依頼（推奨）

```
以下の内容で記事を書いてください：

## テーマ
AIエージェントが変える働き方の未来

## ターゲット読者
- IT企業の経営者・マネージャー
- 新技術に興味があるビジネスパーソン

## トーン
ビジネス寄りだが堅すぎない

## 文字数
2000文字程度

## 含めてほしい内容
- 具体的な事例を2-3個
- 導入のポイント
- 読者へのアクションを促す締めくくり
```

### Step 4: フィードバック

生成された記事を確認し、修正が必要なら：

```
もう少しカジュアルなトーンに変えて
```

```
事例を1つ追加して、カスタマーサポート系の話を入れて
```

```
文字数を1500文字に減らして
```

### Step 5: 記事をファイルに保存

OKなら：

```
articles/ フォルダに保存して
```

### Step 6: note.com に投稿

1. https://note.com/new にアクセス
2. 「テキスト」を選択
3. 生成された記事をコピー＆ペースト
4. プレビューを確認
5. 公開！

---

## 🔄 GitHub Issue 連携（自動化フロー）

### Issue を作成して自動生成

```bash
gh issue create --title "記事作成: AIの未来" --body "テーマや詳細をここに書く"
```

タイトルを「記事作成:」で始めると、GitHub Actions が起動します。

> **注意**: この方法は Anthropic API のクレジットが必要です

---

## 📁 Miyabi コマンド

### プロジェクト状態を確認

```bash
npx miyabi status
```

### ドクター（診断）

```bash
npx miyabi doctor
```

### Issue 一覧

```bash
npx miyabi todos
```

---

## 💡 便利なプロンプト例

### ニュース記事風

```
以下のテーマでニュース記事風に書いてください。
客観的なトーンで、5W1Hを意識して。

テーマ: OpenAIが新しいモデルを発表
```

### How-to 記事

```
「GitHub Copilot の始め方」というHow-to記事を書いてください。
初心者向けに、ステップバイステップで説明してください。
```

### 比較記事

```
「ChatGPT vs Claude 比較」という記事を書いてください。
それぞれの特徴、得意な用途、料金を比較表にまとめて。
```

### エッセイ風

```
「リモートワーク2年目で気づいたこと」というエッセイを書いてください。
個人的な体験談風に、読者に共感してもらえるトーンで。
```

---

## 📂 プロジェクト構成

```
note_csystem/
├── articles/          # 生成した記事を保存
├── exports/           # note.com用にエクスポートしたファイル
├── src/
│   ├── agents/        # 記事生成エージェント
│   ├── services/      # GitHub/note.com連携
│   └── workflows/     # 自動化ワークフロー
├── .github/workflows/ # GitHub Actions
├── CLAUDE.md          # Claude Code用コンテキスト
└── docs/
    └── GUIDE.md       # このファイル
```

---

## ❓ トラブルシューティング

### Claude Code が起動しない

```bash
# Claude Code をインストール
npm install -g @anthropic-ai/claude-code

# または
npx claude
```

### API エラーが出る

Anthropic API のクレジットが不足している可能性があります。
Claude Code を使って手動で記事を生成する方法を使ってください。

### 記事が長すぎる/短すぎる

```
文字数を1500文字に調整して
```

---

## 📞 サポート

- **GitHub Issues**: https://github.com/shuta-sunaga/note_csystem/issues
- **Miyabi ドキュメント**: `npx miyabi --help`

---

*最終更新: 2025-12-19*
