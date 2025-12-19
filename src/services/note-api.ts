/**
 * note.com API Service
 *
 * note.comは公式APIを提供していないため、
 * 現時点ではMarkdownファイルとして保存し、
 * 手動でコピー＆ペーストするワークフローを想定しています。
 *
 * 将来的には以下の方法で自動化可能：
 * 1. Puppeteer/Playwrightでブラウザ自動操作
 * 2. note.comがAPIを提供した場合は直接連携
 */

import { GeneratedArticle, NotePublishResult } from '../types/article.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 記事をMarkdownファイルとして保存
 */
export async function saveArticleAsMarkdown(
  article: GeneratedArticle,
  outputDir: string = 'articles'
): Promise<string> {
  const date = new Date().toISOString().split('T')[0];
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const filename = `${date}-${slug}.md`;
  const filepath = path.join(outputDir, filename);

  // フロントマター付きのMarkdown
  const content = `---
title: "${article.title}"
summary: "${article.summary.replace(/"/g, '\\"')}"
tags: [${article.metadata.suggestedTags.map(t => `"${t}"`).join(', ')}]
issueNumber: ${article.metadata.issueNumber}
generatedAt: "${article.generatedAt.toISOString()}"
wordCount: ${article.wordCount}
tone: "${article.metadata.tone}"
targetAudience: "${article.metadata.targetAudience}"
---

# ${article.title}

${article.content}

---

*この記事はAIによって生成されました。*
`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filepath, content, 'utf-8');

  return filepath;
}

/**
 * note.comへの投稿（プレースホルダー）
 *
 * 現時点では手動投稿を想定
 * 将来的にはブラウザ自動化で実装可能
 */
export async function publishToNote(
  article: GeneratedArticle,
  _options: { draft: boolean } = { draft: true }
): Promise<NotePublishResult> {
  // note.comは公式APIがないため、現時点では手動投稿を案内
  console.log('📝 note.comへの自動投稿は現在未対応です。');
  console.log('');
  console.log('以下の手順で手動投稿してください：');
  console.log('1. https://note.com/new にアクセス');
  console.log('2. 記事タイプを選択（テキスト推奨）');
  console.log('3. 生成された記事をコピー＆ペースト');
  console.log('4. プレビューを確認して投稿');
  console.log('');

  return {
    success: false,
    isDraft: true,
    error: 'note.comへの自動投稿は現在未対応です。生成されたMarkdownファイルを手動で投稿してください。',
  };
}

/**
 * 記事の内容をnote.com用にフォーマット
 */
export function formatForNote(article: GeneratedArticle): string {
  // note.comはMarkdownをサポートしているが、一部の記法は非対応
  let content = article.content;

  // コードブロックの言語指定を調整
  content = content.replace(/```(\w+)\n/g, '```\n');

  // 画像のalt textを調整
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '![$1]($2)');

  return `# ${article.title}\n\n${content}`;
}

/**
 * クリップボードにコピーするためのテキストを生成
 */
export function generateClipboardText(article: GeneratedArticle): string {
  return formatForNote(article);
}
