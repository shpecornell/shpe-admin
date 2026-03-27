export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}
