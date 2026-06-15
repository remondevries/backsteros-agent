import { lazy, Suspense, useEffect, useMemo, useState } from "react";

const DocumentPdfViewer = lazy(() =>
  import("./DocumentPdfViewer").then((module) => ({
    default: module.DocumentPdfViewer,
  })),
);

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
}

export function LetterComposeFilePreviewPanel({ file }: { file: File }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const previewKind = useMemo(() => {
    if (isPdfFile(file)) return "pdf";
    if (isImageFile(file)) return "image";
    return "unsupported";
  }, [file]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!objectUrl) {
    return <div className="document-pdf-viewer-status">Loading preview…</div>;
  }

  if (previewKind === "pdf") {
    return (
      <div className="document-pdf-preview-panel-inner">
        <Suspense fallback={<div className="document-pdf-viewer-status">Loading PDF…</div>}>
          <DocumentPdfViewer file={objectUrl} />
        </Suspense>
      </div>
    );
  }

  if (previewKind === "image") {
    return (
      <div className="document-pdf-preview-panel-inner letter-compose-file-preview-inner">
        <img
          src={objectUrl}
          alt={file.name}
          className="letter-compose-file-preview-image"
        />
      </div>
    );
  }

  return (
    <div className="document-pdf-preview-panel-inner">
      <div className="document-pdf-viewer-status">
        Preview is not available for this file type.
      </div>
    </div>
  );
}
