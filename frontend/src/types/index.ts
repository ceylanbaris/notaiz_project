/* ── TypeScript type definitions for Notaiz ── */

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Metrics {
  cosine_similarity: number;
  dtw_distance_normalized: number;
  correlation: number;
  fused_score: number;
}

export interface Analysis {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  file_a_name: string | null;
  file_b_name: string | null;
  duration_a: number | null;
  duration_b: number | null;
  fused_score: number | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  uncertainty: number | null;
  metrics: Metrics | null;
  alignment_map: number[][] | null;
  processing_ms: number | null;
  error_message: string | null;
  disclaimer: string;
}

export interface AnalysisCreateResponse {
  analysis_id: string;
  status: string;
}

export interface AnalysisList {
  total: number;
  items: Analysis[];
}

export interface ProgressEvent {
  analysis_id: string;
  step: 'uploading' | 'preprocessing' | 'feature_extraction' | 'comparison' | 'done' | 'error';
  progress: number;
  message: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Düşük Risk',
  medium: 'Orta Risk',
  high: 'Yüksek Risk',
};

export const STEP_LABELS: Record<string, string> = {
  uploading: 'Yükleniyor',
  preprocessing: 'Ön İşleme',
  feature_extraction: 'Özellik Çıkarımı',
  comparison: 'Benzerlik Hesaplama',
  done: 'Tamamlandı',
  error: 'Hata',
};
