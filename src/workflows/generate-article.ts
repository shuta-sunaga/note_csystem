/**
 * 記事生成ワークフロー
 *
 * Issueの内容を解析して記事を生成し、PRを作成する
 *
 * 使用方法:
 *   ISSUE_NUMBER=1 GITHUB_TOKEN=xxx npm run generate
 */

import { generateArticle } from '../agents/article-generator.js';
import {
  parseIssueToArticleRequest,
  generateBranchName,
  generateArticleFilename,
} from '../services/github.js';
import { saveArticleAsMarkdown } from '../services/note-api.js';
import { execSync } from 'child_process';

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
}

async function main() {
  const issueNumber = parseInt(process.env.ISSUE_NUMBER || '0', 10);
  const githubToken = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || '';

  if (!issueNumber) {
    console.error('❌ ISSUE_NUMBER is required');
    process.exit(1);
  }

  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN is required');
    process.exit(1);
  }

  const [owner, repo] = repository.split('/');

  console.log(`📝 Issue #${issueNumber} から記事を生成します...`);

  // Issue情報を取得
  const issue = await fetchIssue(owner, repo, issueNumber, githubToken);
  console.log(`📋 タイトル: ${issue.title}`);

  // Issueから記事リクエストを解析
  const request = parseIssueToArticleRequest(issue);
  console.log(`🎯 テーマ: ${request.theme}`);
  console.log(`📊 トーン: ${request.tone}`);
  console.log(`📏 目標文字数: ${request.targetLength}`);

  // Issueにラベルを追加
  await addLabel(owner, repo, issueNumber, '📝 draft', githubToken);

  // 記事を生成
  console.log('\n🤖 記事を生成中...');
  const article = await generateArticle(request);
  article.metadata.issueNumber = issueNumber;

  console.log(`✅ 生成完了!`);
  console.log(`📊 タイトル: ${article.title}`);
  console.log(`📊 文字数: ${article.wordCount}文字`);

  // ブランチを作成
  const branchName = generateBranchName(issueNumber, article.title);
  console.log(`\n🌿 ブランチを作成: ${branchName}`);

  execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

  // Markdownファイルとして保存
  const filepath = await saveArticleAsMarkdown(article);
  console.log(`📁 ファイルを保存: ${filepath}`);

  // コミット＆プッシュ
  execSync(`git add ${filepath}`, { stdio: 'inherit' });
  execSync(
    `git commit -m "feat: 記事生成 - ${article.title}\n\nCloses #${issueNumber}\n\n🤖 Generated with Claude"`,
    { stdio: 'inherit' }
  );
  execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });

  // PRを作成
  console.log('\n📬 PRを作成中...');
  const prBody = generatePRBody(article, issueNumber);
  const prResult = execSync(
    `gh pr create --title "📝 記事: ${article.title}" --body "${prBody.replace(/"/g, '\\"')}" --draft`,
    { encoding: 'utf-8' }
  );
  console.log(`✅ PR作成完了: ${prResult.trim()}`);

  // Issueにラベルを更新
  await removeLabel(owner, repo, issueNumber, '📝 draft', githubToken);
  await addLabel(owner, repo, issueNumber, '👀 needs-review', githubToken);

  // Issueにコメント
  await addComment(
    owner,
    repo,
    issueNumber,
    `## 🤖 記事を生成しました！

**タイトル**: ${article.title}
**文字数**: ${article.wordCount}文字

PRをレビューしてください。フィードバックがあればPRにコメントしてください。

### 使えるコマンド
- \`/regenerate\` - フィードバックを反映して再生成
- \`/shorter\` - 文字数を減らす
- \`/longer\` - 文字数を増やす
- \`/casual\` - トーンをカジュアルに
- \`/publish\` - 承認してnote用にエクスポート

[PRを確認する](${prResult.trim()})`,
    githubToken
  );

  console.log('\n✨ 完了！PRをレビューしてください。');
}

async function fetchIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  token: string
): Promise<GitHubIssue> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch issue: ${response.status}`);
  }

  return response.json();
}

async function addLabel(
  owner: string,
  repo: string,
  issueNumber: number,
  label: string,
  token: string
): Promise<void> {
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ labels: [label] }),
    }
  );
}

async function removeLabel(
  owner: string,
  repo: string,
  issueNumber: number,
  label: string,
  token: string
): Promise<void> {
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

async function addComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  token: string
): Promise<void> {
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    }
  );
}

function generatePRBody(article: any, issueNumber: number): string {
  return `## 📝 生成された記事

**タイトル**: ${article.title}
**文字数**: ${article.wordCount}文字
**トーン**: ${article.metadata.tone}
**ターゲット読者**: ${article.metadata.targetAudience}

### 要約
${article.summary}

### タグ候補
${article.metadata.suggestedTags.map((t: string) => `\`${t}\``).join(' ')}

---

### レビュー方法

1. 記事の内容を確認してください
2. 修正が必要な場合はコメントでフィードバックしてください
3. 問題なければApproveしてマージしてください

### 使えるコマンド
| コマンド | 説明 |
|----------|------|
| \`/regenerate\` | フィードバックを反映して再生成 |
| \`/shorter\` | 文字数を減らす |
| \`/longer\` | 文字数を増やす |
| \`/casual\` | トーンをカジュアルに |
| \`/publish\` | 承認してnote用にエクスポート |

---

Closes #${issueNumber}

🤖 Generated with [Claude](https://claude.ai)`;
}

main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
