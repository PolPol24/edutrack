/** Network boundary used by ApiClient; alternate transports can be supplied without changing API behavior. */
export interface HttpTransport {
  send(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export const browserFetchTransport: HttpTransport = {
  send: (input, init) => fetch(input, init),
};
