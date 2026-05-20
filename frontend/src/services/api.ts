/* ── API service layer ── */

import axios from 'axios';
import type { Analysis, AnalysisCreateResponse, AnalysisList, TokenResponse, User } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
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
  return `${BASE_URL}/api/v1/analysis/analyze/${id}/pdf?token=${token}`;
}

/* ── SSE helper ── */

export function subscribeToProgress(
  analysisId: string,
  onProgress: (data: any) => void,
  onDone: () => void,
  onError: (err: any) => void,
): () => void {
  let cancelled = false;

  // Polling fallback: used when SSE disconnects unexpectedly
  const startPolling = () => {
    const syntheticSteps = [
      { step: 'preprocessing', progress: 20, message: 'Ses dosyaları ön işleniyor...' },
      { step: 'feature_extraction', progress: 50, message: 'Özellikler çıkarılıyor...' },
      { step: 'comparison', progress: 80, message: 'Benzerlik hesaplanıyor...' },
    ];
    let stepIdx = 0;
    let attempt = 0;

    const poll = async () => {
      if (cancelled) return;
      if (attempt % 6 === 0 && stepIdx < syntheticSteps.length) {
        onProgress({ ...syntheticSteps[stepIdx], analysis_id: analysisId });
        stepIdx++;
      }
      attempt++;
      if (attempt > 180) { onError('Analiz zaman aşımına uğradı'); return; }

      try {
        const analysis = await getAnalysis(analysisId);
        if (analysis.status === 'completed') { onDone(); return; }
        if (analysis.status === 'failed') { onError(analysis.error_message || 'Analiz başarısız'); return; }
      } catch { /* keep polling */ }

      setTimeout(poll, 2000);
    };

    setTimeout(poll, 2000);
  };

  const url = `${BASE_URL}/api/v1/analysis/analyze/${analysisId}/progress`;
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
    if (!cancelled) startPolling();
  };

  return () => {
    cancelled = true;
    eventSource.close();
  };
}

export default api;
