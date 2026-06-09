import { type ReactNode } from "react";
import { useMemo, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { linkifyWikilinks } from "../lib/obsidianUri";
import { isOpenableExternalUrl, openExternalUrl } from "../lib/openExternalUrl";
import {
  buildInlineContentParts,
  contentHasInlineTokens,
} from "./inlineContentTokens";
import { LinearIssuesCountLabel } from "./LinearIssuesCountLabel";
import { WhoopSleepScoreLabel } from "./WhoopSleepScoreLabel";
import { WhoopRecoveryScoreLabel } from "./WhoopRecoveryScoreLabel";
import { WhoopStrainScoreLabel } from "./WhoopStrainScoreLabel";
import { useVault } from "./VaultContext";

function MarkdownLink({ href, children, ...props }: ComponentProps<"a">) {
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
}

function renderInlineParts(
  text: string,
  handlers: {
    onOpenLinearDashboard?: () => void;
    onOpenWhoopDashboard?: () => void;
  },
): ReactNode {
  const parts = buildInlineContentParts(text);
  const hasInlineComponents = parts.some((part) => part.type !== "text");

  if (!hasInlineComponents) {
    return text;
  }

  return parts.map((part, index) => {
    if (part.type === "text") {
      return <span key={`text-${index}`}>{part.value}</span>;
    }

    if (part.type === "linear-issues-count") {
      return (
        <LinearIssuesCountLabel
          key={`linear-${index}-${part.count}`}
          count={part.count}
          onClick={() => handlers.onOpenLinearDashboard?.()}
        />
      );
    }

    if (part.type === "whoop-sleep-score") {
      return (
        <WhoopSleepScoreLabel
          key={`whoop-sleep-${index}-${part.score}`}
          score={part.score}
          onClick={() => handlers.onOpenWhoopDashboard?.()}
        />
      );
    }

    if (part.type === "whoop-recovery-score") {
      return (
        <WhoopRecoveryScoreLabel
          key={`whoop-recovery-${index}-${part.score}`}
          score={part.score}
          onClick={() => handlers.onOpenWhoopDashboard?.()}
        />
      );
    }

    return (
      <WhoopStrainScoreLabel
        key={`whoop-strain-${index}-${part.score}`}
        score={part.score}
        onClick={() => handlers.onOpenWhoopDashboard?.()}
      />
    );
  });
}

function InlineParagraph({
  text,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
}: {
  text: string;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
}) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, lineIndex) => {
        if (!line.trim() && lineIndex > 0 && lineIndex < lines.length - 1) {
          return null;
        }

        return (
          <p key={`line-${lineIndex}`} className="assistant-inline-paragraph">
            {renderInlineParts(line, { onOpenLinearDashboard, onOpenWhoopDashboard })}
          </p>
        );
      })}
    </>
  );
}

function ParagraphMarkdown({ content }: { content: string }) {
  const vault = useVault();
  const renderedContent = useMemo(() => {
    if (!vault) {
      return content;
    }
    return linkifyWikilinks(content, vault.vaultName);
  }, [content, vault]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
      {renderedContent}
    </ReactMarkdown>
  );
}

export function AssistantMessageContent({
  content,
  className,
  onOpenLinearDashboard,
  onOpenWhoopDashboard,
}: {
  content: string;
  className?: string;
  onOpenLinearDashboard?: () => void;
  onOpenWhoopDashboard?: () => void;
}) {
  if (contentHasInlineTokens(content)) {
    return (
      <div className={["markdown-content", className].filter(Boolean).join(" ")}>
        <InlineParagraph
          text={content}
          onOpenLinearDashboard={onOpenLinearDashboard}
          onOpenWhoopDashboard={onOpenWhoopDashboard}
        />
      </div>
    );
  }

  const paragraphs = content.split(/\n\n+/);

  return (
    <div className={["markdown-content", className].filter(Boolean).join(" ")}>
      {paragraphs.map((paragraph, index) => {
        const key = `${index}-${paragraph.slice(0, 24)}`;

        if (!paragraph.trim()) {
          return null;
        }

        return <ParagraphMarkdown key={key} content={paragraph} />;
      })}
    </div>
  );
}
