export interface ReviewComment {
  id: number;
  review_id: number;
  file_path: string;
  line_number: number | null;
  comment: string;
  severity: "error" | "warning" | "info" | null;
  category: string | null;
  github_comment_id: number | null;
  posted_to_github: number;
  created_at: string;
}

export interface Review {
  id: number;
  pr_number: number;
  repo_owner: string;
  repo_name: string;
  pr_title: string | null;
  pr_author: string | null;
  pr_url: string | null;
  commit_sha: string | null;
  base_branch: string | null;
  head_branch: string | null;
  overall_score: number | null;
  summary: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  github_review_id: number | null;
  created_at: string;
  updated_at: string;
  comments: ReviewComment[];
}

export interface ReviewSummary {
  id: number;
  pr_number: number;
  repo_owner: string;
  repo_name: string;
  pr_title: string | null;
  pr_author: string | null;
  pr_url: string | null;
  overall_score: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  comment_count: number;
  created_at: string;
}

export interface DashboardStats {
  total_reviews: number;
  avg_score: number | null;
  repos_reviewed: number;
  total_issues: number;
  completed_reviews: number;
  failed_reviews: number;
}

export interface ScoreOverTime {
  date: string;
  avg_score: number;
  review_count: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface SeverityBreakdown {
  severity: string;
  count: number;
}
