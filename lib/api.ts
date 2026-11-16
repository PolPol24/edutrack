import { ApiClient, ApiError } from "./api-client";
import { browserFetchTransport } from "./http-transport";

const API_URL = process.env.NEXT_PUBLIC_EDUTRACK_API_URL ?? "http://localhost/edutrack-api/api.php";

/** Adapter from the app's action/query API to the PHP HTTP endpoint. */
export const apiClient = new ApiClient(API_URL, browserFetchTransport);
export { ApiError };
export const apiUrl = (action: string, query: Record<string, string | number> = {}) => apiClient.url(action, query);
export const apiRequest = <T>(action: string, options: Omit<RequestInit, "credentials"> = {}, query: Record<string, string | number> = {}) =>
  apiClient.request<T>(action, options, query);
export const apiDownload = (action: string, query: Record<string, string | number> = {}) => apiClient.download(action, query);
