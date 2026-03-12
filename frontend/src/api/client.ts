import axios from "axios";
import type {
  Review,
  ReviewSummary,
  DashboardStats,
  ScoreOverTime,
  CategoryBreakdown,
  SeverityBreakdown,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ── Reviews ──────────────────────────────────────────────────────────────────

export async function fetchReviews(params?: {
  skip?: number;
  limit?: number;
  repo?: string;
  status?: string;
}): Promise<ReviewSummary[]> {
  const { data } = await api.get<ReviewSummary[]>("/reviews", { params });
  return data;
}

export async function fetchReview(id: number): Promise<Review> {
  const { data } = await api.get<Review>(`/reviews/${id}`);
  return data;
}

export async function deleteReview(id: number): Promise<void> {
  await api.delete(`/reviews/${id}`);
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/reviews/stats/dashboard");
  return data;
}

export async function fetchScoreOverTime(days = 30): Promise<ScoreOverTime[]> {
  const { data } = await api.get<ScoreOverTime[]>("/reviews/stats/score-over-time", {
    params: { days },
  });
  return data;
}

export async function fetchCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const { data } = await api.get<CategoryBreakdown[]>("/reviews/stats/categories");
  return data;
}

export async function fetchSeverityBreakdown(): Promise<SeverityBreakdown[]> {
  const { data } = await api.get<SeverityBreakdown[]>("/reviews/stats/severities");
  return data;
}
