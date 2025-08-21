export class FetchError extends Error {
    info?: any;
    status?: number;
}

export async function fetcher(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("jwt");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers) {
    for (const key in options.headers) {
        headers[key] = (options.headers as Record<string,string>)[key];
    }
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const error = new FetchError("An error occurred while fetching the data.");
    try {
        error.info = await res.json();
    } catch {
        // ignore
    }
    error.status = res.status;
    throw error;
  }

  return res.json();
}
