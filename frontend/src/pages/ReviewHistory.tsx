import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, History } from "lucide-react";
import { fetchReviews } from "../api/client";
import ReviewsTable from "../components/ReviewsTable";

const STATUS_OPTIONS = [
  { value: "",           label: "All statuses" },
  { value: "completed",  label: "Completed" },
  { value: "failed",     label: "Failed" },
  { value: "processing", label: "Processing" },
  { value: "pending",    label: "Pending" },
];

export default function ReviewHistory() {
  const [repo,   setRepo]   = useState("");
  const [status, setStatus] = useState("");
  const [page,   setPage]   = useState(0);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", { repo, status, skip: page * limit, limit }],
    queryFn: () => fetchReviews({ repo: repo || undefined, status: status || undefined, skip: page * limit, limit }),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">All pull request code reviews</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            type="text"
            value={repo}
            onChange={(e) => { setRepo(e.target.value); setPage(0); }}
            placeholder="Filter by owner/repo…"
            className="w-full pl-9 pr-4 py-2.5 glass rounded-xl text-sm text-gray-300
                       placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500/50
                       focus:border-violet-500/30 border border-transparent transition-all"
          />
        </div>

        <div className="relative">
          <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="pl-9 pr-8 py-2.5 glass rounded-xl text-sm text-gray-300
                       focus:outline-none focus:ring-1 focus:ring-violet-500/50
                       border border-transparent appearance-none cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#13131a]">{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <ReviewsTable reviews={data ?? []} loading={isLoading} />
      </div>

      {/* Pagination */}
      {data && (data.length === limit || page > 0) && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-700">
            {page * limit + 1}–{page * limit + (data?.length ?? 0)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || data.length < limit}
              className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
