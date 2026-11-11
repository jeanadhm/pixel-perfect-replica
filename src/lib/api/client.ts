export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ error: "Réponse serveur illisible" }));
  if (!response.ok) throw new Error(data.error ?? `Erreur HTTP ${response.status}`);
  return data as T;
}
