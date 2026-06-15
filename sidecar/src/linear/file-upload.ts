import { linearGraphqlRequest } from "./graphql.ts";

const FILE_UPLOAD_MUTATION = `
  mutation BacksterFileUpload($filename: String!, $contentType: String!, $size: Int!) {
    fileUpload(filename: $filename, contentType: $contentType, size: $size) {
      success
      uploadFile {
        uploadUrl
        assetUrl
        headers {
          key
          value
        }
      }
    }
  }
`;

export async function uploadFileBufferToLinear(options: {
  filename: string;
  contentType: string;
  data: ArrayBuffer;
}): Promise<string> {
  const filename = options.filename.trim() || "attachment";
  const contentType = options.contentType.trim() || "application/octet-stream";
  const size = options.data.byteLength;
  if (size <= 0) {
    throw new Error("File is empty");
  }

  const data = await linearGraphqlRequest<{
    fileUpload?: {
      success?: boolean;
      uploadFile?: {
        uploadUrl?: string | null;
        assetUrl?: string | null;
        headers?: Array<{ key?: string | null; value?: string | null }> | null;
      } | null;
    } | null;
  }>(FILE_UPLOAD_MUTATION, {
    filename,
    contentType,
    size,
  });

  const uploadFile = data.fileUpload?.uploadFile;
  const uploadUrl = uploadFile?.uploadUrl?.trim();
  const assetUrl = uploadFile?.assetUrl?.trim();
  if (!data.fileUpload?.success || !uploadUrl || !assetUrl) {
    throw new Error("Linear did not return an upload URL");
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "public, max-age=31536000");
  for (const entry of uploadFile?.headers ?? []) {
    const key = entry?.key?.trim();
    const value = entry?.value?.trim();
    if (key && value) {
      headers.set(key, value);
    }
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: options.data,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file to Linear storage (${uploadResponse.status})`);
  }

  return assetUrl;
}
