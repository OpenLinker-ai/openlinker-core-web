export const MAX_PROXY_BODY_BYTES = 8 * 1024 * 1024;

// Run attachment uploads go to Core, which accepts up to 30 MB per file. The
// edge allows 31m on this path; the proxy allows the same.
export const ATTACHMENT_UPLOAD_PATH = "/api/v1/attachments";
export const MAX_ATTACHMENT_UPLOAD_BYTES = 31 * 1024 * 1024;

export function requestBodyLimit(method: string, pathname: string): number {
  return method.toUpperCase() === "POST" && pathname === ATTACHMENT_UPLOAD_PATH
    ? MAX_ATTACHMENT_UPLOAD_BYTES
    : MAX_PROXY_BODY_BYTES;
}

// Attachment downloads (/api/v1/attachments/<token>) are streamed through
// instead of buffered, so a file up to Core's limit is not cut at 8 MiB.
export function isAttachmentDownloadPath(pathname: string): boolean {
  return /^\/api\/v1\/attachments\/[0-9a-f]{64}$/.test(pathname);
}

export class BodyTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BodyTooLargeError";
  }
}

function contentLength(headers: Headers): number | null {
  const raw = headers.get("content-length");
  if (!raw) return null;
  const size = Number(raw);
  return Number.isFinite(size) && size >= 0 ? size : null;
}

export function contentLengthExceeds(
  headers: Headers,
  limit = MAX_PROXY_BODY_BYTES,
): boolean {
  const size = contentLength(headers);
  return size !== null && size > limit;
}

export async function readBodyWithLimit(
  stream: ReadableStream<Uint8Array> | null,
  limit = MAX_PROXY_BODY_BYTES,
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array();

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new BodyTooLargeError(`Body exceeds ${limit} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function requestBodyWithLimit(
  request: Request,
  limit = MAX_PROXY_BODY_BYTES,
): Promise<Uint8Array | undefined> {
  if (contentLengthExceeds(request.headers, limit)) {
    throw new BodyTooLargeError("Request body is too large");
  }
  const body = await readBodyWithLimit(request.body, limit);
  return body.byteLength > 0 ? body : undefined;
}

export async function responseBodyWithLimit(
  response: Response,
  emptyBody = false,
): Promise<Uint8Array | null> {
  if (emptyBody) return null;
  if (contentLengthExceeds(response.headers)) {
    throw new BodyTooLargeError("Upstream response body is too large");
  }
  return readBodyWithLimit(response.body);
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

export function bytesToBodyInit(
  body: Uint8Array | undefined,
): BodyInit | undefined {
  return body ? bytesToArrayBuffer(body) : undefined;
}

export function bytesToNullableBodyInit(body: Uint8Array | null): BodyInit | null {
  return body ? bytesToArrayBuffer(body) : null;
}

export function payloadTooLargeResponse(
  path: string,
  limit = MAX_PROXY_BODY_BYTES,
): Response {
  return Response.json(
    {
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large.",
        details: { path, limit_bytes: limit },
      },
    },
    {
      status: 413,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function upstreamResponseTooLargeResponse(path: string): Response {
  return Response.json(
    {
      error: {
        code: "UPSTREAM_RESPONSE_TOO_LARGE",
        message: "Upstream response body is too large.",
        details: { path, limit_bytes: MAX_PROXY_BODY_BYTES },
      },
    },
    {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
