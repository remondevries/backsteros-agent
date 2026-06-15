import { useEffect, useState } from "react";
import { fetchDocumentPdfBlob } from "../../lib/api";
import { DocumentPdfViewer } from "./DocumentPdfViewer";

export function DocumentPdfPreviewPanel({
  url,
  iosFullscreen = false,
  onClose,
}: {
  url: string;
  iosFullscreen?: boolean;
  onClose?: () => void;
}) {
  const [file, setFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    setLoading(true);
    setError(null);
    setFile(null);

    void fetchDocumentPdfBlob(url)
      .then((blob) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setFile(blobUrl);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load PDF");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url]);

  return (
    <div className="document-pdf-preview-panel-inner">
      {loading ? <div className="document-pdf-viewer-status">Loading PDF…</div> : null}
      {!loading && error ? (
        <div className="document-pdf-viewer-status document-pdf-viewer-status--error">{error}</div>
      ) : null}
      {!loading && file ? (
        <DocumentPdfViewer file={file} iosFullscreen={iosFullscreen} onClose={onClose} />
      ) : null}
    </div>
  );
}
