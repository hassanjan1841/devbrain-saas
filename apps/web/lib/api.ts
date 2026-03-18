const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { message: string; details?: unknown };
};

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  return response.json() as Promise<ApiResponse<T>>;
}
