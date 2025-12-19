/**
 * Article types for note_csystem
 */

export interface ArticleRequest {
  /** 記事のテーマ/タイトル */
  theme: string;
  /** ターゲット読者 */
  targetAudience?: string;
  /** トーン (casual, business, technical) */
  tone?: 'casual' | 'business' | 'technical';
  /** 目標文字数 */
  targetLength?: number;
  /** 追加の指示 */
  additionalInstructions?: string;
  /** 参考情報 */
  references?: string[];
}

export interface GeneratedArticle {
  /** 記事タイトル */
  title: string;
  /** 記事本文 (Markdown) */
  content: string;
  /** 要約 */
  summary: string;
  /** 文字数 */
  wordCount: number;
  /** 生成日時 */
  generatedAt: Date;
  /** メタデータ */
  metadata: ArticleMetadata;
}

export interface ArticleMetadata {
  /** 元のIssue番号 */
  issueNumber: number;
  /** トーン */
  tone: string;
  /** ターゲット読者 */
  targetAudience: string;
  /** タグ候補 */
  suggestedTags: string[];
}

export interface FeedbackRequest {
  /** フィードバック内容 */
  feedback: string;
  /** コマンド */
  command?: '/regenerate' | '/shorter' | '/longer' | '/casual' | '/formal' | '/publish';
  /** 元の記事 */
  originalArticle: GeneratedArticle;
}

export interface NotePublishResult {
  /** 成功フラグ */
  success: boolean;
  /** note記事URL */
  url?: string;
  /** 下書きかどうか */
  isDraft: boolean;
  /** エラーメッセージ */
  error?: string;
}
