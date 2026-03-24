import { ProviderError, type ProviderResponse } from "./types.js";

interface JsonRequestOptions {
  method?: "POST" | "GET" | "PUT";
  headers?: Record<string, string>;
  body?: unknown;
}

export async function sendJsonRequest(
  url: string,
  options: JsonRequestOptions = {},
): Promise<ProviderResponse> {
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: {
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ProviderError(
      text || `Request failed with ${response.status} ${response.statusText}`,
      {
        status: response.status,
        statusText: response.statusText,
      },
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
  };
}

export async function sendFormRequest(
  url: string,
  body: URLSearchParams,
  headers?: Record<string, string>,
): Promise<ProviderResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ProviderError(
      text || `Request failed with ${response.status} ${response.statusText}`,
      {
        status: response.status,
        statusText: response.statusText,
      },
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
  };
}
