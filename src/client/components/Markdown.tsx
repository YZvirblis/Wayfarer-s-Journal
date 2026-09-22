import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/cn';

/** Read-only markdown, styled by the .wj-prose rules in styles/index.css. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('wj-prose', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
