const unavailableHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export function upstreamUnavailableResponse(path: string): Response {
  return Response.json(
    {
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "Upstream service is temporarily unavailable. Check service status or try again later.",
        details: { path },
      },
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function upstreamUnavailableHeadResponse(): Response {
  return new Response(null, {
    status: 503,
    headers: unavailableHeaders,
  });
}
