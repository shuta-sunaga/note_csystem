/**
 * GitHub API Service
 */

import { ArticleRequest } from '../types/article.js';

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
}

/**
 * Issueの内容から記事リクエストをパース
 */
export function parseIssueToArticleRequest(issue: GitHubIssue): ArticleRequest {
  const body = issue.body || '';

  // Issueボディからセクションを抽出
  const sections = parseIssueSections(body);

  // トーンを判定
  let tone: 'casual' | 'business' | 'technical' = 'casual';
  const toneText = sections['トーン'] || sections['tone'] || '';
  if (toneText.includes('ビジネス') || toneText.includes('business')) {
    tone = 'business';
  } else if (toneText.includes('技術') || toneText.includes('technical')) {
    tone = 'technical';
  }

  // 文字数を抽出
  const lengthText = sections['文字数'] || sections['length'] || '';
  const lengthMatch = lengthText.match(/(\d+)/);
  const targetLength = lengthMatch ? parseInt(lengthMatch[1], 10) : 2000;

  return {
    theme: sections['テーマ'] || sections['theme'] || issue.title.replace(/^記事作成[:：]\s*/, ''),
    targetAudience: sections['ターゲット読者'] || sections['target'] || '',
    tone,
    targetLength,
    additionalInstructions: sections['追加指示'] || sections['参考にしてほしいこと'] || '',
    references: extractReferences(body),
  };
}

/**
 * Issueボディからセクションを抽出
 */
function parseIssueSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = body.split('\n');

  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    // ## セクション名 のパターン
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = sectionMatch[1].trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // 最後のセクションを保存
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * 参考URLを抽出
 */
function extractReferences(body: string): string[] {
  const urlPattern = /https?:\/\/[^\s)>\]]+/g;
  const matches = body.match(urlPattern);
  return matches || [];
}

/**
 * PRを作成するためのブランチ名を生成
 */
export function generateBranchName(issueNumber: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const timestamp = Date.now();
  return `article/issue-${issueNumber}-${slug}-${timestamp}`;
}

/**
 * 記事ファイル名を生成
 */
export function generateArticleFilename(title: string): string {
  const date = new Date().toISOString().split('T')[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  return `articles/${date}-${slug}.md`;
}

/**
 * GitHub API経由でファイルをコミット
 */
export async function commitFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string,
  message: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to commit file: ${JSON.stringify(error)}`);
  }
}

/**
 * PRを作成
 */
export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
  token: string
): Promise<{ number: number; url: string }> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base,
        draft: true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create PR: ${JSON.stringify(error)}`);
  }

  const pr = await response.json();
  return { number: pr.number, url: pr.html_url };
}

/**
 * Issueにラベルを追加
 */
export async function addLabelsToIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[],
  token: string
): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ labels }),
    }
  );

  if (!response.ok) {
    console.warn(`Failed to add labels: ${response.status}`);
  }
}

/**
 * Issueにコメントを追加
 */
export async function addCommentToIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!response.ok) {
    console.warn(`Failed to add comment: ${response.status}`);
  }
}
