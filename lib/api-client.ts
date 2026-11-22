import type { HttpTransport } from "./http-transport";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = Omit<RequestInit, "credentials">;
type Query = Record<string, string | number>;

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly transport: HttpTransport,
  ) {}

  url(action: string, query: Query = {}): string {
    const url = new URL(this.baseUrl);
    url.searchParams.set("action", action);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    return url.toString();
  }

  async request<T>(action: string, options: ApiOptions = {}, query: Query = {}): Promise<T> {
    const response = await this.send(this.url(action, query), {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body && !(typeof FormData !== "undefined" && options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
    const responseBody = await response.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(responseBody);
    } catch {
      if (response.ok) {
        throw new ApiError(responseBody.trim() ? "EduTrack API returned an invalid response." : "EduTrack API returned an empty response.", response.status);
      }
    }
    if (!response.ok) throw this.responseError(payload, response.status);
    if (payload === null) throw new ApiError("EduTrack API returned an empty response.", response.status);
    return payload as T;
  }

  async download(action: string, query: Query = {}): Promise<Blob> {
    const response = await this.send(this.url(action, query), { credentials: "include" });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      throw this.responseError(payload, response.status);
    }
    return response.blob();
  }

  private responseError(payload: unknown, status: number): ApiError {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `EduTrack API request failed (${status}).`;
    return new ApiError(message, status);
  }

  private async send(url: string, options: RequestInit): Promise<Response> {
    try {
      return await this.transport.send(url, options);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") throw cause;
      const apiOrigin = new URL(this.baseUrl).origin;
      throw new ApiError(
        `Cannot reach the EduTrack API at ${apiOrigin}. Check that XAMPP Apache is running and the API URL is correct. If the API is running, allow this frontend origin in local_config.php.`,
        0,
      );
    }
  }
}
