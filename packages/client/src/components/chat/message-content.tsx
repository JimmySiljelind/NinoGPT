import { useMemo } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

type MessageContentProps = {
   content: string;
};

export function MessageContent({ content }: MessageContentProps) {
   const normalized = useMemo(() => normalizeMath(content), [content]);

   return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
         <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
               p: ({ children }: { children?: ReactNode }) => (
                  <p className="whitespace-pre-wrap leading-relaxed">
                     {children}
                  </p>
               ),
               ul: ({ children }: { children?: ReactNode }) => (
                  <ul className="my-2 list-disc space-y-1 pl-5 leading-relaxed">
                     {children}
                  </ul>
               ),
               ol: ({ children }: { children?: ReactNode }) => (
                  <ol className="my-2 list-decimal space-y-1 pl-5 leading-relaxed">
                     {children}
                  </ol>
               ),
               li: ({ children }: { children?: ReactNode }) => (
                  <li>{children}</li>
               ),
               strong: ({ children }: { children?: ReactNode }) => (
                  <strong>{children}</strong>
               ),
               em: ({ children }: { children?: ReactNode }) => (
                  <em>{children}</em>
               ),
               a: ({
                  href,
                  children,
               }: {
                  href?: string;
                  children?: ReactNode;
               }) => (
                  <a
                     href={href}
                     className="text-primary underline underline-offset-2"
                     rel="noreferrer"
                  >
                     {children}
                  </a>
               ),
            }}
         >
            {normalized}
         </ReactMarkdown>
      </div>
   );
}

function normalizeMath(input: string): string {
   let output = input.trim();

   if (
      (output.startsWith('"') && output.endsWith('"')) ||
      (output.startsWith('“') && output.endsWith('”'))
   ) {
      output = output.slice(1, -1);
   }

   output = output.replace(/\r\n/g, '\n');

   output = output.replace(
      /\$\s*\n([\s\S]*?)\n\s*\$/g,
      (_match: string, inner: string) => {
         const trimmed = inner.trim();
         return trimmed ? `$$\n${trimmed}\n$$` : '$$';
      }
   );

   output = output
      .replace(/\\\[/g, '$$\n')
      .replace(/\\\]/g, '\n$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');

   output = output
      .replace(/^\[\s*$/gm, '$$')
      .replace(/^\]\s*$/gm, '$$')
      .replace(/^\$\s*$/gm, '$$');

   output = output.replace(
      /\$\s*([^\n]+?)\s*\$/g,
      (_match: string, expr: string) => {
         const trimmed = expr.trim();
         if (
            trimmed.includes('\\frac') ||
            trimmed.includes('\\text') ||
            trimmed.length > 40
         ) {
            return `$$\n${trimmed}\n$$`;
         }
         return `$${trimmed}$`;
      }
   );

   output = output.replace(/^\s{2,}([^\s].*)$/gm, '- $1');

   return output.trim();
}
