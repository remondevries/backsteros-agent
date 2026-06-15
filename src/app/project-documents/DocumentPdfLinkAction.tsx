import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { findFirstPdfLinkInDocumentContent } from "../../lib/documentPdfLink";
import { ResizablePanel } from "../ResizablePanel";

const DocumentPdfPreviewPanel = lazy(() =>
  import("./DocumentPdfPreviewPanel").then((module) => ({
    default: module.DocumentPdfPreviewPanel,
  })),
);

const PDF_PREVIEW_MIN_WIDTH = 280;

export function DocumentPdfLinkAction({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const pdfLink = useMemo(() => findFirstPdfLinkInDocumentContent(content), [content]);

  useEffect(() => {
    if (!pdfLink) {
      setOpen(false);
    }
  }, [pdfLink]);

  if (!pdfLink) {
    return children;
  }

  return (
    <div ref={layoutRef} className="document-pdf-layout">
      <div className="document-pdf-main">
        {children}
        <div className="vault-document-pdf-action">
          <button
            type="button"
            className={`vault-document-pdf-button${open ? " vault-document-pdf-button--active" : ""}`}
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="document-pdf-preview-panel"
          >
            {open ? "Hide PDF" : "View PDF"}
          </button>
        </div>
      </div>
      <ResizablePanel
        id="document-pdf-preview-panel"
        side="right"
        className="document-pdf-preview-panel app-resizable-panel-inset"
        storageKey="backsteros.documentPdfPreviewWidth"
        defaultWidth={PDF_PREVIEW_MIN_WIDTH}
        minWidth={PDF_PREVIEW_MIN_WIDTH}
        maxWidth={99999}
        containerRef={layoutRef}
        defaultWidthRatio={0.5}
        maxWidthRatio={0.9}
        resetWidthOnExpand
        collapsed={!open}
        ariaLabel={`PDF preview: ${pdfLink.label}`}
      >
        {open ? (
          <Suspense fallback={<div className="document-pdf-viewer-status">Loading PDF…</div>}>
            <DocumentPdfPreviewPanel url={pdfLink.url} />
          </Suspense>
        ) : null}
      </ResizablePanel>
    </div>
  );
}
