import { useQuery } from "@tanstack/react-query";
import {
  GitPullRequest, Star, AlertTriangle, GitBranch,
  CheckCircle, TrendingUp, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { fetchDashboardStats, fetchReviews } from "../api/client";
import StatCard from "../components/StatCard";
import QualityChart from "../components/QualityChart";
import CategoryChart from "../components/CategoryChart";
import ReviewsTable from "../components/ReviewsTable";

export default function Dashboard() {
  const { data: stats, isLoading: sl } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 30_000,
  });

  const { data: reviews, isLoading: rl } = useQuery({
    queryKey: ["reviews", { limit: 8 }],
    queryFn: () => fetchReviews({ limit: 8 }),
    refetchInterval: 30_000,
  });

  const v = (val: number | string | null | undefined, fallback = "—") =>
    val != null ? String(val) : fallback;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">AI-powered code review analytics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          title="Total Reviews"
          value={sl ? "…" : v(stats?.total_reviews, "0")}
          icon={GitPullRequest}
          accent="violet"
        />
        <StatCard
          title="Avg Score"
          value={sl ? "…" : stats?.avg_score != null ? `${stats.avg_score.toFixed(1)}` : "—"}
          subtitle="out of 10"
          icon={Star}
          accent="amber"
        />
        <StatCard
          title="Repos"
          value={sl ? "…" : v(stats?.repos_reviewed, "0")}
          icon={GitBranch}
          accent="blue"
        />
        <StatCard
          title="Issues Found"
          value={sl ? "…" : v(stats?.total_issues, "0")}
          icon={AlertTriangle}
          accent="rose"
        />
        <StatCard
          title="Completed"
          value={sl ? "…" : v(stats?.completed_reviews, "0")}
          icon={CheckCircle}
          accent="emerald"
        />
        <StatCard
          title="Issues / PR"
          value={
            sl ? "…"
              : stats && stats.completed_reviews > 0
              ? (stats.total_issues / stats.completed_reviews).toFixed(1)
              : "—"
          }
          icon={TrendingUp}
          accent="violet"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Quality Score</h2>
              <p className="text-xs text-gray-600 mt-0.5">30-day average per day</p>
            </div>
            <span className="text-[10px] text-gray-700 mono">avg ≥ 7 = green line</span>
          </div>
          <QualityChart days={30} />
        </div>

        <div className="card">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white">Issues by Category</h2>
            <p className="text-xs text-gray-600 mt-0.5">All time</p>
          </div>
          <CategoryChart />
        </div>
      </div>

      {/* Recent reviews */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Reviews</h2>
            <p className="text-xs text-gray-600 mt-0.5">Latest 8 pull requests</p>
          </div>
          <Link
            to="/reviews"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <ReviewsTable reviews={reviews ?? []} loading={rl} />
      </div>
    </div>
  );
}
