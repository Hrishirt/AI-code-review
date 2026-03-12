import { useNavigate } from "react-router-dom";
import { ExternalLink, MessageSquare, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ReviewSummary } from "../types";
import StatusBadge from "./StatusBadge";
import ScoreGauge from "./ScoreGauge";

interface Props {
  reviews: ReviewSummary[];
  loading?: boolean;
}

export default function ReviewsTable({ reviews, loading }: Props) {
  const navigate = useNavigate();

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
      ))}
    </div>
  );

  if (!reviews.length) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-gray-600" />
      </div>
      <p className="text-gray-500 font-medium">No reviews yet</p>
      <p className="text-gray-700 text-sm text-center max-w-xs">
        Configure your GitHub webhook and open a pull request to get started
      </p>
    </div>
  );

  return (
    <div className="space-y-1">
      {reviews.map((r) => (
        <div
          key={r.id}
          onClick={() => navigate(`/reviews/${r.id}`)}
          className="group flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer
                     hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]
                     transition-all duration-150"
        >
          {/* Score */}
          <div className="flex-shrink-0">
            <ScoreGauge score={r.overall_score} size="sm" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200 truncate">
                {r.pr_title ?? "Untitled PR"}
              </span>
              {r.pr_url && (
                <a
                  href={r.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-700 hover:text-violet-400 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="mono text-xs text-gray-600">
                {r.repo_owner}/{r.repo_name}
                <span className="text-gray-700 ml-1">#{r.pr_number}</span>
              </span>
              {r.pr_author && (
                <span className="text-gray-700 text-xs">· {r.pr_author}</span>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {r.comment_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MessageSquare className="w-3 h-3" />
                {r.comment_count}
              </div>
            )}
            <StatusBadge status={r.status} />
            <span className="text-xs text-gray-700">
              {format(parseISO(r.created_at), "MMM d, HH:mm")}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}
