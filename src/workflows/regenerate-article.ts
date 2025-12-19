/**
 * 記事再生成ワークフロー
 *
 * PRコメントのフィードバックを反映して記事を再生成する
 *
 * 使用方法:
 *   PR_NUMBER=1 COMMENT_BODY="..." GITHUB_TOKEN=xxx npm run regenerate
 */

import { regenerateWithFeedback } from '../agents/article-generator.js';
import { saveArticleAsMarkdown } from '../services/note-api.js';
import { GeneratedArticle, FeedbackRequest } from '../types/article.js';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const prNumber = parseInt(process.env.PR_NUMBER || '0', 10);
  const commentBody = process.env.COMMENT_BODY || '';
  const githubToken = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || '';

  if (!prNumber) {
    console.error('❌ PR_NUMBER is required');
    process.exit(1);
  }

  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN is required');
    process.exit(1);
  }

  const [owner, repo] = repository.split('/');

  console.log(`🔄 PR #${prNumber} のフィードバックを反映します...`);

  // コマンドを解析
  const command = parseCommand(commentBody);
  const feedback = extractFeedback(commentBody);

  console.log(`📝 コマンド: ${command || 'なし'}`);
  console.log(`📝 フィードバック: ${feedback.slice(0, 100)}...`);

  // PRに関連するブランチをチェックアウト
  const prInfo = await fetchPR(owner, repo, prNumber, githubToken);
  const branchName = prInfo.head.ref;

  console.log(`🌿 ブランチ: ${branchName}`);
  execSync(`git fetch origin ${branchName}`, { stdio: 'inherit' });
  execSync(`git checkout ${branchName}`, { stdio: 'inherit' });

  // 既存の記事ファイルを探す
  const articleFiles = await findArticleFiles();
  if (articleFiles.length === 0) {
    console.error('❌ 記事ファイルが見つかりません');
    process.exit(1);
  }

  const articlePath = articleFiles[0];
  console.log(`📁 既存の記事: ${articlePath}`);

  // 既存の記事を読み込み
  const originalArticle = await loadArticle(articlePath);

  // 再生成リクエストを作成
  const request: FeedbackRequest = {
    feedback,
    command: command as FeedbackRequest['command'],
    originalArticle,
  };

  // 記事を再生成
  console.log('\n🤖 記事を再生成中...');
  const newArticle = await regenerateWithFeedback(request);
  newArticle.metadata.issueNumber = originalArticle.metadata.issueNumber;

  console.log(`✅ 再生成完了!`);
  console.log(`📊 文字数: ${newArticle.wordCount}文字`);

  // ファイルを更新
  await saveArticleAsMarkdown(newArticle);
  console.log(`📁 ファイルを更新: ${articlePath}`);

  // コミット＆プッシュ
  execSync(`git add articles/`, { stdio: 'inherit' });
  execSync(
    `git commit -m "refactor: フィードバック反映 - ${command || 'update'}\n\n${feedback.slice(0, 100)}"`,
    { stdio: 'inherit' }
  );
  execSync(`git push`, { stdio: 'inherit' });

  // PRにコメント
  await addComment(
    owner,
    repo,
    prNumber,
    `## 🔄 フィードバックを反映しました！

**変更点**:
${command === '/shorter' ? '- 文字数を減らしました' : ''}
${command === '/longer' ? '- 文字数を増やしました' : ''}
${command === '/casual' ? '- トーンをカジュアルに変更しました' : ''}
${command === '/formal' ? '- トーンをフォーマルに変更しました' : ''}
${!command || command === '/regenerate' ? '- フィードバック内容を反映しました' : ''}

**新しい文字数**: ${newArticle.wordCount}文字

ご確認ください。`,
    githubToken
  );

  console.log('\n✨ 完了！PRを再確認してください。');
}

function parseCommand(body: string): string | undefined {
  const commands = ['/regenerate', '/shorter', '/longer', '/casual', '/formal', '/publish'];
  for (const cmd of commands) {
    if (body.includes(cmd)) {
      return cmd;
    }
  }
  return undefined;
}

function extractFeedback(body: string): string {
  // コマンドを除去してフィードバック部分を抽出
  let feedback = body
    .replace(/\/regenerate/g, '')
    .replace(/\/shorter/g, '')
    .replace(/\/longer/g, '')
    .replace(/\/casual/g, '')
    .replace(/\/formal/g, '')
    .replace(/\/publish/g, '')
    .trim();

  // フィードバックセクションがあれば抽出
  const fbMatch = feedback.match(/## フィードバック\n([\s\S]*?)(?=\n##|$)/);
  if (fbMatch) {
    feedback = fbMatch[1].trim();
  }

  return feedback;
}

async function fetchPR(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
): Promise<any> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch PR: ${response.status}`);
  }

  return response.json();
}

async function findArticleFiles(): Promise<string[]> {
  const articlesDir = 'articles';
  try {
    const files = await fs.readdir(articlesDir);
    return files
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(articlesDir, f));
  } catch {
    return [];
  }
}

async function loadArticle(filepath: string): Promise<GeneratedArticle> {
  const content = await fs.readFile(filepath, 'utf-8');

  // フロントマターをパース
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new Error('Invalid article format');
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // 簡易的なフロントマターパース
  const title = frontmatter.match(/title: "(.*)"/)?.[1] || '';
  const summary = frontmatter.match(/summary: "(.*)"/)?.[1] || '';
  const issueNumber = parseInt(frontmatter.match(/issueNumber: (\d+)/)?.[1] || '0', 10);
  const tone = frontmatter.match(/tone: "(.*)"/)?.[1] || 'casual';
  const targetAudience = frontmatter.match(/targetAudience: "(.*)"/)?.[1] || '';

  // タイトル行を除去した本文
  const contentBody = body.replace(/^# .*\n\n/, '').replace(/\n---\n\n\*この記事は.*$/, '');

  return {
    title,
    content: contentBody.trim(),
    summary,
    wordCount: contentBody.replace(/\s/g, '').length,
    generatedAt: new Date(),
    metadata: {
      issueNumber,
      tone,
      targetAudience,
      suggestedTags: [],
    },
  };
}

async function addComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  token: string
): Promise<void> {
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
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

main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
