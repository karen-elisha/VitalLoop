// ============================================
// VitalLoop — Type Definitions
// ============================================

// --- User Types ---
export type UserRole = 'individual' | 'provider' | 'institution_admin' | 'system';
export type Language = 'en' | 'ar';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  language: Language;
  dateOfBirth?: string;
  gender?: string;
  heightCm?: number;
  timezone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// --- Glucose Types ---
export type ReadingType = 'fasting' | 'pre_meal' | 'post_meal' | 'random' | 'bedtime';
export type GlucoseSource = 'manual' | 'cgm' | 'smbg';

export interface GlucoseReading {
  id: string;
  user_id: string;
  value_mg_dl: number;
  reading_type: ReadingType;
  measured_at: string;
  notes?: string;
  source: GlucoseSource;
  created_at: string;
}

export interface GlucoseStats {
  total_readings: number;
  avg_glucose: number;
  min_glucose: number;
  max_glucose: number;
  std_dev: number;
  estimated_a1c: number;
  time_in_range_pct: number;
}

export interface GlucoseTrend {
  date: string;
  avg_glucose: number;
  min_glucose: number;
  max_glucose: number;
  reading_count: number;
}

// --- Food Types ---
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id?: string;
  foodId?: string;
  foodName: string;
  portionGrams: number;
  calories?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
  fiberG?: number;
  giIndex?: number;
}

export interface Meal {
  id: string;
  user_id: string;
  meal_type: MealType;
  logged_at: string;
  total_calories: number;
  total_carbs_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  photo_url?: string;
  ai_analysis?: MealAnalysis;
  notes?: string;
  items?: FoodItem[];
  created_at: string;
}

export interface MealAnalysis {
  glucoseImpact: 'low' | 'moderate' | 'high';
  glucoseImpactScore: number;
  insights: string[];
  recommendations: string[];
  postMealBreathingRecommended: boolean;
  estimatedGlucoseRise?: string;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  name_ar?: string;
  category: string;
  calories_per_100g: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  gi_index?: number;
  region: string;
}

// --- Breathing Types ---
export type SessionType = 'paced' | 'box' | 'post_meal' | 'sleep_prep';
export type CompletionStatus = 'in_progress' | 'completed' | 'cancelled';

export interface BreathingSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  duration_seconds: number;
  started_at: string;
  completed_at?: string;
  completion_status: CompletionStatus;
  notes?: string;
  created_at: string;
}

export interface BreathingStats {
  totalCompleted: number;
  thisWeek: number;
  thisMonth: number;
  totalMinutes: number;
  streakDays: number;
  typesPracticed: SessionType[];
}

// --- Weight Types ---
export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  measured_at: string;
  notes?: string;
  created_at: string;
}

// --- Prediction Types ---
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  category: string;
  factor: string;
  detail: string;
  severity: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  factors: RiskFactor[];
  actions: string[];
  explanation: string;
  prediction_type: string;
  created_at: string;
}

// --- Alert Types ---
export type AlertType = 'high_risk' | 'trend' | 'medication_reminder' | 'adherence' | 'coaching_nudge' | 'breathing_reminder' | 'weekly_summary';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  action_url?: string;
  read: boolean;
  created_at: string;
}

// --- Coaching Types ---
export interface CoachingConversation {
  id: string;
  user_id: string;
  title: string;
  started_at: string;
  last_message_at: string;
}

export interface CoachingMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// --- Analytics Types ---
export interface DashboardSummary {
  period: string;
  glucose: { readingsCount: number; average: number | null };
  meals: { count: number };
  breathing: { completedSessions: number };
  weight: { latest: number | null };
  alerts: { unread: number };
}
