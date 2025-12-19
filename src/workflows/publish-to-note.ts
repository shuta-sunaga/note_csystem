/**
 * note.com公開準備ワークフロー
 *
 * PRがマージされたら、記事をnote.com用にエクスポートする
 *
 * 使用方法:
 *   ARTICLE_PATH=articles/xxx.md npm run publish:note
 */

import { formatForNote } from '../services/note-api.js';
import { GeneratedArticle } from '../types/article.js';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const articlePath = process.env.ARTICLE_PATH;

  if (!articlePath) {
    // 最新の記事を探す
    const articles = await findLatestArticle();
    if (!articles) {
      console.error('❌ 記事ファイルが見つかりません');
      process.exit(1);
    }
    await processArticle(articles);
  } else {
    await processArticle(articlePath);
  }
}

async function processArticle(filepath: string): Promise<void> {
  console.log(`📝 記事をエクスポート: ${filepath}`);

  const article = await loadArticle(filepath);
  const noteContent = formatForNote(article);

  // エクスポートディレクトリに保存
  const exportDir = 'exports';
  await fs.mkdir(exportDir, { recursive: true });

  const exportFilename = path.basename(filepath).replace('.md', '-note.txt');
  const exportPath = path.join(exportDir, exportFilename);

  await fs.writeFile(exportPath, noteContent, 'utf-8');

  console.log(`\n✅ エクスポート完了!`);
  console.log(`📁 ファイル: ${exportPath}`);
  console.log(`📊 文字数: ${article.wordCount}文字`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 note.comへの投稿手順:');
  console.log('');
  console.log('1. https://note.com/new にアクセス');
  console.log('2. 「テキスト」を選択');
  console.log(`3. 以下のファイルの内容をコピー＆ペースト:`);
  console.log(`   ${exportPath}`);
  console.log('4. プレビューを確認');
  console.log('5. 「公開」または「下書き保存」をクリック');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📎 推奨タグ:');
  article.metadata.suggestedTags.forEach((tag) => {
    console.log(`   #${tag}`);
  });
  console.log('');

  // コンソールに記事内容をプレビュー表示
  console.log('━━━━━━━━━━━━━━ プレビュー (最初の500文字) ━━━━━━━━━━━━━━');
  console.log('');
  console.log(noteContent.slice(0, 500) + '...');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function findLatestArticle(): Promise<string | null> {
  const articlesDir = 'articles';
  try {
    const files = await fs.readdir(articlesDir);
    const mdFiles = files
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse();

    if (mdFiles.length === 0) {
      return null;
    }

    return path.join(articlesDir, mdFiles[0]);
  } catch {
    return null;
  }
}

async function loadArticle(filepath: string): Promise<GeneratedArticle> {
  const content = await fs.readFile(filepath, 'utf-8');

  // フロントマターをパース
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    // フロントマターがない場合はそのまま返す
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s*/, '');
    return {
      title,
      content: content,
      summary: '',
      wordCount: content.replace(/\s/g, '').length,
      generatedAt: new Date(),
      metadata: {
        issueNumber: 0,
        tone: 'casual',
        targetAudience: '',
        suggestedTags: [],
      },
    };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // フロントマターをパース
  const title = frontmatter.match(/title: "(.*)"/)?.[1] || '';
  const summary = frontmatter.match(/summary: "(.*)"/)?.[1] || '';
  const issueNumber = parseInt(frontmatter.match(/issueNumber: (\d+)/)?.[1] || '0', 10);
  const tone = frontmatter.match(/tone: "(.*)"/)?.[1] || 'casual';
  const targetAudience = frontmatter.match(/targetAudience: "(.*)"/)?.[1] || '';

  // タグをパース
  const tagsMatch = frontmatter.match(/tags: \[(.*)\]/);
  const suggestedTags = tagsMatch
    ? tagsMatch[1].split(',').map((t) => t.trim().replace(/"/g, ''))
    : [];

  // タイトル行を含む本文
  const contentBody = body.trim();

  return {
    title,
    content: contentBody,
    summary,
    wordCount: contentBody.replace(/\s/g, '').length,
    generatedAt: new Date(),
    metadata: {
      issueNumber,
      tone,
      targetAudience,
      suggestedTags,
    },
  };
}

main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
