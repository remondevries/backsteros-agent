const MAX_PDF_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;

function assertHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid URL");
  }

  return parsed;
}

/** Linear document attachments live on private storage and require API auth. */
export function isLinearPrivateFileUrl(rawUrl: string): boolean {
  try {
    return assertHttpUrl(rawUrl).hostname === "uploads.linear.app";
  } catch {
    return false;
  }
}

export async function fetchRemotePdf(
  rawUrl: string,
  options?: { authorizationHeader?: string },
): Promise<{ data: ArrayBuffer; contentType: string }> {
  assertHttpUrl(rawUrl);

  const headers: Record<string, string> = {
    Accept: "application/pdf,application/octet-stream,*/*",
    "User-Agent": "BacksterOS/1.0",
  };
  if (options?.authorizationHeader?.trim()) {
    headers.Authorization = options.authorizationHeader.trim();
  }

  const response = await fetch(rawUrl, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Linear file access denied. Connect Linear in Settings or open the PDF in your browser.",
      );
    }
    throw new Error(`Failed to fetch PDF (${response.status})`);
  }

  const data = await response.arrayBuffer();
  if (data.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF too large");
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/pdf";
  return { data, contentType };
}
