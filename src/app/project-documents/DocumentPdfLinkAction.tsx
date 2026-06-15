import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIosHorizontalSwipe } from "../../hooks/useIosHorizontalSwipe";
import { findFirstPdfLinkInDocumentContent } from "../../lib/documentPdfLink";
import { setDocumentPdfModalOpen } from "../../lib/documentPdfModalOpen";
import { registerContentPanelLocalBack } from "../../lib/contentPanelLocalBack";
import { isIosDevice } from "../../platform/iosStandalone";
import { ResizablePanel } from "../ResizablePanel";

const DocumentPdfPreviewPanel = lazy(() =>
  import("./DocumentPdfPreviewPanel").then((module) => ({
    default: module.DocumentPdfPreviewPanel,
  })),
);

const PDF_PREVIEW_MIN_WIDTH = 280;
const IOS_PDF_PREVIEW_TRANSITION_MS = 360;

export function DocumentPdfLinkAction({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const iosModalRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [iosPreviewMounted, setIosPreviewMounted] = useState(false);
  const pdfLink = useMemo(() => findFirstPdfLinkInDocumentContent(content), [content]);
  const iosDevice = isIosDevice();
  const showPreviewContent = iosDevice ? open || iosPreviewMounted : open;

  const openPreview = useCallback(() => setOpen(true), []);
  const closePreview = useCallback(() => setOpen(false), []);

  useIosHorizontalSwipe({
    targetRef: layoutRef,
    enabled: Boolean(pdfLink) && iosDevice && !open,
    onSwipeLeft: openPreview,
    allowSwipeLeft: true,
    allowSwipeRight: false,
  });

  useIosHorizontalSwipe({
    targetRef: iosModalRef,
    enabled: Boolean(pdfLink) && iosDevice && open,
    onSwipeRight: closePreview,
    allowSwipeLeft: false,
    allowSwipeRight: true,
  });

  useEffect(() => {
    if (!iosDevice || !open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setDocumentPdfModalOpen(true);
    const unregisterLocalBack = registerContentPanelLocalBack(() => {
      closePreview();
      return true;
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      setDocumentPdfModalOpen(false);
      unregisterLocalBack();
    };
  }, [closePreview, iosDevice, open]);

  useEffect(() => {
    if (!iosDevice) return;
    if (open) {
      setIosPreviewMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setIosPreviewMounted(false), IOS_PDF_PREVIEW_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open, iosDevice]);

  useEffect(() => {
    if (!pdfLink) {
      setOpen(false);
      setIosPreviewMounted(false);
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
            aria-controls={iosDevice ? "document-pdf-ios-modal" : "document-pdf-preview-panel"}
          >
            {open ? "Hide PDF" : "View PDF"}
          </button>
        </div>
      </div>
      {!iosDevice ? (
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
          {showPreviewContent ? (
            <Suspense fallback={<div className="document-pdf-viewer-status">Loading PDF…</div>}>
              <DocumentPdfPreviewPanel url={pdfLink.url} />
            </Suspense>
          ) : null}
        </ResizablePanel>
      ) : null}
      {iosDevice && iosPreviewMounted
        ? createPortal(
            <div
              ref={iosModalRef}
              id="document-pdf-ios-modal"
              className={[
                "document-pdf-modal",
                "document-pdf-modal--ios",
                open ? "document-pdf-modal--ios-open" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              role="dialog"
              aria-modal="true"
              aria-label={`PDF preview: ${pdfLink.label}`}
            >
              <Suspense fallback={<div className="document-pdf-viewer-status">Loading PDF…</div>}>
                <DocumentPdfPreviewPanel url={pdfLink.url} iosFullscreen onClose={closePreview} />
              </Suspense>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
