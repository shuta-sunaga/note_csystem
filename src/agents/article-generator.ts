/**
 * Article Generator Agent
 * Claude APIを使用して記事を生成
 */

import Anthropic from '@anthropic-ai/sdk';
import { ArticleRequest, GeneratedArticle, FeedbackRequest } from '../types/article.js';

const anthropic = new Anthropic();

/**
 * 記事生成のシステムプロンプト
 */
const SYSTEM_PROMPT = `あなたはプロのライター兼コンテンツクリエイターです。
note.comに投稿する記事を生成します。

以下のガイドラインに従ってください：
1. 読者を引き込む魅力的な導入を書く
2. 見出しを効果的に使用して構造化する
3. 具体例や事例を含める
4. 読みやすい文章を心がける
5. 最後に読者へのアクションを促す締めくくりを入れる

出力形式：
- Markdown形式で出力
- 最初の行は # で始まるタイトル
- 適切な見出し(##, ###)を使用
- 箇条書きや強調を効果的に使用`;

/**
 * 記事を生成
 */
export async function generateArticle(request: ArticleRequest): Promise<GeneratedArticle> {
  const toneInstructions = getToneInstructions(request.tone || 'casual');
  const lengthInstructions = `目標文字数は${request.targetLength || 2000}文字程度です。`;

  const userPrompt = buildUserPrompt(request, toneInstructions, lengthInstructions);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = extractTextContent(response);
  const { title, body } = parseArticleContent(content);

  return {
    title,
    content: body,
    summary: await generateSummary(body),
    wordCount: countCharacters(body),
    generatedAt: new Date(),
    metadata: {
      issueNumber: 0, // 呼び出し側で設定
      tone: request.tone || 'casual',
      targetAudience: request.targetAudience || '一般読者',
      suggestedTags: await suggestTags(title, body),
    },
  };
}

/**
 * フィードバックを反映して記事を再生成
 */
export async function regenerateWithFeedback(
  request: FeedbackRequest
): Promise<GeneratedArticle> {
  const userPrompt = `
以下の記事に対してフィードバックがありました。フィードバックを反映して記事を改善してください。

## 元の記事
${request.originalArticle.content}

## フィードバック
${request.feedback}

${request.command === '/shorter' ? '文字数を減らしてより簡潔にしてください。' : ''}
${request.command === '/longer' ? '内容を充実させて文字数を増やしてください。' : ''}
${request.command === '/casual' ? 'トーンをよりカジュアルに、親しみやすくしてください。' : ''}
${request.command === '/formal' ? 'トーンをよりフォーマルに、ビジネス向けにしてください。' : ''}

改善した記事全文をMarkdown形式で出力してください。`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = extractTextContent(response);
  const { title, body } = parseArticleContent(content);

  return {
    title,
    content: body,
    summary: await generateSummary(body),
    wordCount: countCharacters(body),
    generatedAt: new Date(),
    metadata: {
      ...request.originalArticle.metadata,
    },
  };
}

/**
 * トーンに応じた指示を取得
 */
function getToneInstructions(tone: 'casual' | 'business' | 'technical'): string {
  switch (tone) {
    case 'casual':
      return '親しみやすく、カジュアルなトーンで書いてください。「〜ですよね」「〜しましょう！」などの表現を使ってOKです。';
    case 'business':
      return 'ビジネスパーソン向けの落ち着いたトーンで書いてください。専門用語は適度に使いつつ、わかりやすさを重視してください。';
    case 'technical':
      return '技術者向けの正確なトーンで書いてください。専門用語を適切に使用し、具体的なコード例や技術的な詳細を含めてください。';
  }
}

/**
 * ユーザープロンプトを構築
 */
function buildUserPrompt(
  request: ArticleRequest,
  toneInstructions: string,
  lengthInstructions: string
): string {
  let prompt = `以下のテーマで記事を書いてください。

## テーマ
${request.theme}

## トーン
${toneInstructions}

## 文字数
${lengthInstructions}
`;

  if (request.targetAudience) {
    prompt += `
## ターゲット読者
${request.targetAudience}
`;
  }

  if (request.additionalInstructions) {
    prompt += `
## 追加の指示
${request.additionalInstructions}
`;
  }

  if (request.references && request.references.length > 0) {
    prompt += `
## 参考URL
${request.references.join('\n')}
`;
  }

  prompt += `
記事全文をMarkdown形式で出力してください。`;

  return prompt;
}

/**
 * レスポンスからテキストを抽出
 */
function extractTextContent(response: Anthropic.Message): string {
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in response');
  }
  return textBlock.text;
}

/**
 * 記事コンテンツをタイトルと本文に分離
 */
function parseArticleContent(content: string): { title: string; body: string } {
  const lines = content.trim().split('\n');
  let title = '';
  let bodyStartIndex = 0;

  // 最初の # で始まる行をタイトルとして扱う
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '');
      bodyStartIndex = i + 1;
      break;
    }
  }

  // タイトルが見つからない場合は最初の行をタイトルとする
  if (!title && lines.length > 0) {
    title = lines[0].replace(/^#+\s*/, '');
    bodyStartIndex = 1;
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim();

  return { title, body };
}

/**
 * 文字数をカウント
 */
function countCharacters(text: string): number {
  return text.replace(/\s/g, '').length;
}

/**
 * 記事の要約を生成
 */
async function generateSummary(content: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `以下の記事を2-3文で要約してください:\n\n${content}`,
      },
    ],
  });

  return extractTextContent(response);
}

/**
 * タグを提案
 */
async function suggestTags(title: string, content: string): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `以下の記事に適したタグを5つ提案してください。カンマ区切りで出力してください。

タイトル: ${title}

${content.slice(0, 500)}...`,
      },
    ],
  });

  const text = extractTextContent(response);
  return text.split(',').map((tag) => tag.trim()).filter(Boolean);
}
