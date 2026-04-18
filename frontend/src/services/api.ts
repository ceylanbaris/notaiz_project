/* ── API service layer ── */

import axios from 'axios';
import type { Analysis, AnalysisCreateResponse, AnalysisList, TokenResponse, User } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT and strip Content-Type for FormData (browser sets it with boundary)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('notaiz_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('notaiz_token');
      localStorage.removeItem('notaiz_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

/* ── Auth ── */

export async function loginWithGoogle(idToken: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/google', { id_token: idToken });
  localStorage.setItem('notaiz_token', data.access_token);
  localStorage.setItem('notaiz_user', JSON.stringify(data.user));
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export function logout() {
  localStorage.removeItem('notaiz_token');
  localStorage.removeItem('notaiz_user');
  window.location.href = '/';
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('notaiz_user');
  return raw ? JSON.parse(raw) : null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem('notaiz_token');
}

/* ── Analysis ── */

export async function createAnalysis(fileA: File, fileB: File): Promise<AnalysisCreateResponse> {
  const form = new FormData();
  form.append('file_a', fileA);
  form.append('file_b', fileB);
  const { data } = await api.post<AnalysisCreateResponse>('/analysis/analyze', form);
  return data;
}

export async function getAnalysis(id: string): Promise<Analysis> {
  const { data } = await api.get<Analysis>(`/analysis/analyze/${id}`);
  return data;
}

export async function getHistory(skip = 0, limit = 20): Promise<AnalysisList> {
  const { data } = await api.get<AnalysisList>('/analysis/history', {
    params: { skip, limit },
  });
  return data;
}

export function getAnalysisPdfUrl(id: string): string {
  const token = getStoredToken();
  return `/api/v1/analysis/analyze/${id}/pdf?token=${token}`;
}

/* ── SSE helper ── */

export function subscribeToProgress(
  analysisId: string,
  onProgress: (data: any) => void,
  onDone: () => void,
  onError: (err: any) => void,
): () => void {
  const url = `/api/v1/analysis/analyze/${analysisId}/progress`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('progress', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onProgress(data);
      if (data.step === 'done' || data.step === 'error') {
        eventSource.close();
        if (data.step === 'done') onDone();
        else onError(data.message);
      }
    } catch {
      // ignore parse errors
    }
  });

  eventSource.onerror = () => {
    eventSource.close();
    onError('Bağlantı kesildi');
  };

  return () => eventSource.close();
}

export default api;
