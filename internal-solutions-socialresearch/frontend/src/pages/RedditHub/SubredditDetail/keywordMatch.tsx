import { DatabaseComment, DatabasePost } from '../../../types/reddit';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word, case-insensitive: "AI" matches "AI" and "ai", never "said", "wait" or "email".
const wordPattern = (term: string) => `(?<![A-Za-z0-9])${escapeRegExp(term.trim())}(?![A-Za-z0-9])`;

export const keywordRegex = (term: string): RegExp | null =>
  term.trim() ? new RegExp(wordPattern(term), 'i') : null;

const commentsMatch = (comments: DatabaseComment[] | undefined, re: RegExp): boolean =>
  (comments || []).some(c => (!!c.body && re.test(c.body)) || commentsMatch(c.replies, re));

/** Where a post matches the keyword: its own text, only its stored comments, or not at all. */
export const keywordMatchLocation = (post: DatabasePost, re: RegExp): 'post' | 'comments' | null => {
  if (re.test(post.title) || (!!post.content && re.test(post.content)) || (!!post.author && re.test(post.author))) {
    return 'post';
  }
  return commentsMatch(post.comments, re) ? 'comments' : null;
};

/** Renders text with every whole-word match of `term` wrapped in <mark>. */
export function Highlight({ text, term }: { text: string; term?: string }) {
  if (!term || !term.trim() || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${wordPattern(term)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-[#fde68a] text-[#141414] rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}
