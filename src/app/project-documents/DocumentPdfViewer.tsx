import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { registerContentPanelLocalBack } from "../../lib/contentPanelLocalBack";
import { setDocumentPdfModalOpen } from "../../lib/documentPdfModalOpen";
import PdfJsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerPort = new PdfJsWorker();
}

function DocumentPdfExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M1.75 10a.75.75 0 0 1 .75.75v2.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 1 13.25v-2.5a.75.75 0 0 1 .75-.75Zm12.5 0a.75.75 0 0 1 .75.75v2.5A1.75 1.75 0 0 1 13.25 15h-2.5a.75.75 0 0 1 0-1.5h2.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 .75-.75ZM2.75 2.5a.25.25 0 0 0-.25.25v2.5a.75.75 0 0 1-1.5 0v-2.5C1 1.784 1.784 1 2.75 1h2.5a.75.75 0 0 1 0 1.5ZM10 1.75a.75.75 0 0 1 .75-.75h2.5c.966 0 1.75.784 1.75 1.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.25.25 0 0 0-.25-.25h-2.5a.75.75 0 0 1-.75-.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DocumentPdfCloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M15.75 3a.75.75 0 0 1 .75.75v3.5c0 .138.112.25.25.25h3.5a.75.75 0 0 1 0 1.5h-3.5A1.75 1.75 0 0 1 15 7.25v-3.5a.75.75 0 0 1 .75-.75Zm-7.5 0a.75.75 0 0 1 .75.75v3.5A1.75 1.75 0 0 1 7.25 9h-3.5a.75.75 0 0 1 0-1.5h3.5a.25.25 0 0 0 .25-.25v-3.5A.75.75 0 0 1 8.25 3ZM3 15.75a.75.75 0 0 1 .75-.75h3.5c.966 0 1.75.784 1.75 1.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.25.25 0 0 0-.25-.25h-3.5a.75.75 0 0 1-.75-.75Zm12 1c0-.966.784-1.75 1.75-1.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v3.5a.75.75 0 0 1-1.5 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function usePdfContainerWidth(containerRef: RefObject<HTMLDivElement | null>) {
  const [pageWidth, setPageWidth] = useState(720);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setPageWidth(Math.max(280, element.clientWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  return pageWidth;
}

function DocumentPdfPages({
  file,
  pageWidth,
}: {
  file: string | Blob | ArrayBuffer;
  pageWidth: number;
}) {
  const [numPages, setNumPages] = useState(0);

  return (
    <Document
      file={file}
      loading={<div className="document-pdf-viewer-status">Loading PDF…</div>}
      error={
        <div className="document-pdf-viewer-status document-pdf-viewer-status--error">
          Could not render PDF.
        </div>
      }
      onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
    >
      {Array.from({ length: numPages }, (_, index) => (
        <Page
          key={`page-${index + 1}`}
          pageNumber={index + 1}
          width={pageWidth}
          className="document-pdf-viewer-page"
          loading={<div className="document-pdf-viewer-status">Loading page…</div>}
        />
      ))}
    </Document>
  );
}

function DocumentPdfExpandButton({
  mode,
  onClick,
}: {
  mode: "expand" | "close";
  onClick: () => void;
}) {
  const isClose = mode === "close";

  return (
    <div className="document-pdf-viewer-toolbar">
      <button
        type="button"
        className="document-pdf-viewer-expand-button"
        aria-label={isClose ? "Close expanded PDF" : "Expand PDF"}
        title={isClose ? "Close (Esc)" : "Expand PDF"}
        onClick={onClick}
      >
        {isClose ? <DocumentPdfCloseIcon /> : <DocumentPdfExpandIcon />}
      </button>
    </div>
  );
}

function DocumentPdfViewerSurface({
  file,
  containerRef,
  shellClassName,
  buttonMode,
  onButtonClick,
}: {
  file: string | Blob | ArrayBuffer;
  containerRef: RefObject<HTMLDivElement | null>;
  shellClassName?: string;
  buttonMode: "expand" | "close";
  onButtonClick: () => void;
}) {
  const pageWidth = usePdfContainerWidth(containerRef);

  return (
    <div className={["document-pdf-viewer-shell", shellClassName].filter(Boolean).join(" ")}>
      <div ref={containerRef} className="document-pdf-viewer">
        <DocumentPdfPages file={file} pageWidth={pageWidth} />
      </div>
      <DocumentPdfExpandButton mode={buttonMode} onClick={onButtonClick} />
    </div>
  );
}

export function DocumentPdfViewer({ file }: { file: string | Blob | ArrayBuffer }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useLayoutEffect(() => {
    if (!modalOpen) return undefined;
    setDocumentPdfModalOpen(true);
    const unregisterLocalBack = registerContentPanelLocalBack(() => {
      setModalOpen(false);
      return true;
    });
    return () => {
      setDocumentPdfModalOpen(false);
      unregisterLocalBack();
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setModalOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [modalOpen]);

  return (
    <>
      <DocumentPdfViewerSurface
        file={file}
        containerRef={containerRef}
        buttonMode="expand"
        onButtonClick={() => setModalOpen(true)}
      />
      {modalOpen
        ? createPortal(
            <div
              className="document-pdf-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Expanded PDF preview"
            >
              <DocumentPdfViewerSurface
                file={file}
                containerRef={modalContainerRef}
                shellClassName="document-pdf-viewer-shell--modal"
                buttonMode="close"
                onButtonClick={() => setModalOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
