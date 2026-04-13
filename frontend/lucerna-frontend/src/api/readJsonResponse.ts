import { LUCERNA_ENDPOINT } from "../constants";

/**
 * Parse a fetch Response body as JSON. If the server returned HTML (common when
 * the URL hits the SPA or a proxy misroutes), throw a clear error instead of
 * SyntaxError from res.json().
 */
export async function readJsonResponse(
  res: Response,
): Promise<Record<string, unknown>> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (!trimmed) {
    return {};
  }
  if (trimmed.startsWith("<")) {
    throw new Error(
      `The server returned a web page instead of JSON (HTTP ${res.status}). ` +
        `Confirm the Django API is running and set VITE_LUCERNA_ENDPOINT in .env ` +
        `(currently ${LUCERNA_ENDPOINT}).`,
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `The server response was not valid JSON (HTTP ${res.status}).`,
    );
  }
}
