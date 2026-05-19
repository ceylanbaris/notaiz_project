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
  melodic_similarity: number;
  harmonic_similarity: number;
  rhythmic_similarity: number;
  structural_similarity: number;
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
  // LLM interpretation fields
  category: string;
  category_label_tr: string;
  confidence: number;
  explanation_tr: string;
  key_observation: string;
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

export type CategoryType = 'low_similarity' | 'moderate_similarity' | 'high_similarity' | 'cover_or_same';

export const CATEGORY_COLORS: Record<CategoryType, string> = {
  low_similarity:      '#22c55e',
  moderate_similarity: '#f59e0b',
  high_similarity:     '#f97316',
  cover_or_same:       '#ef4444',
};

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  low_similarity:      'Düşük Benzerlik',
  moderate_similarity: 'Orta Benzerlik',
  high_similarity:     'Yüksek Benzerlik',
  cover_or_same:       'Cover veya Birebir Alıntı',
};

export const STEP_LABELS: Record<string, string> = {
  uploading: 'Yükleniyor',
  preprocessing: 'Ön İşleme',
  feature_extraction: 'Özellik Çıkarımı',
  comparison: 'Benzerlik Hesaplama',
  done: 'Tamamlandı',
  error: 'Hata',
};
