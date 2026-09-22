import type { ComponentProps } from 'react';
import ReactMarkdown, { type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/cn';
import { decodeWikiHref, remarkWikiLinks } from '../lib/remarkWikiLinks';
import { WikiLink } from './WikiLink';

const REMARK_PLUGINS = [remarkGfm, remarkWikiLinks];

/** `[[links]]` become chips; anything else opens in a new tab so the journal stays put. */
function Anchor({ href, children, node: _node, ...rest }: ComponentProps<'a'> & ExtraProps) {
  const wiki = href ? decodeWikiHref(href) : null;
  if (wiki) return <WikiLink title={wiki.title} typeName={wiki.typeName} />;
  return (
    <a href={href} target="_blank" rel="noreferrer" {...rest}>
      {children}
    </a>
  );
}

const COMPONENTS = { a: Anchor };

/** Read-only markdown, styled by the .wj-prose rules in styles/index.css. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('wj-prose', className)}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
