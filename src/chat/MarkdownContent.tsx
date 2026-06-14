import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { linkifyWikilinks } from "../lib/obsidianUri";
import { isOpenableExternalUrl, openExternalUrl } from "../lib/openExternalUrl";
import { useVault } from "./VaultContext";
import { MARKDOWN_BODY_CLASS } from "../markdown/markdownBodyClass";

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const vault = useVault();
  const renderedContent = useMemo(() => {
    if (!vault) {
      return content;
    }
    return linkifyWikilinks(content, vault.vaultName);
  }, [content, vault]);

  return (
    <div className={[MARKDOWN_BODY_CLASS, "markdown-content", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children, ...props }) => {
            if (href && isOpenableExternalUrl(href)) {
              return (
                <a
                  {...props}
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    void openExternalUrl(href);
                  }}
                >
                  {children}
                </a>
              );
            }

            return (
              <a {...props} href={href}>
                {children}
              </a>
            );
          },
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
}
