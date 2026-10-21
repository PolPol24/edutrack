const API_URL =
  process.env.NEXT_PUBLIC_EDUTRACK_API_URL ??
  "http://localhost/edutrack-api/api.php";

type ApiOptions = Omit<RequestInit, "credentials">;

export async function apiRequest<T>(
  action: string,
  options: ApiOptions = {},
  query: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url.toString(), {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `EduTrack API request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}
