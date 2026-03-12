import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ExternalLink, GitPullRequest, User,
  GitMerge, ChevronDown, ChevronRight, Trash2,
  FileCode2, Shield, Zap, Palette, Brain, BookOpen, Tag,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fetchReview, deleteReview } from "../api/client";
import type { ReviewComment } from "../types";
import ScoreGauge from "../components/ScoreGauge";
import StatusBadge from "../components/StatusBadge";
import SeverityBadge from "../components/SeverityBadge";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  security:      Shield,
  performance:   Zap,
  style:         Palette,
  logic:         Brain,
  documentation: BookOpen,
  other:         Tag,
};

function groupByFile(comments: ReviewComment[]): Record<string, ReviewComment[]> {
  return comments.reduce<Record<string, ReviewComment[]>>((acc, c) => {
    (acc[c.file_path] ??= []).push(c);
    return acc;
  }, {});
}

function FileGroup({ filePath, comments }: { filePath: string; comments: ReviewComment[] }) {
  const [open, setOpen] = useState(true);
  const errors   = comments.filter((c) => c.severity === "error").length;
  const warnings = comments.filter((c) => c.severity === "warning").length;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5
                   hover:bg-white/[0.03] transition-colors text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FileCode2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="mono text-sm text-gray-300 truncate">{filePath}</span>
          <span className="text-gray-700 text-xs flex-shrink-0">({comments.length})</span>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {errors   > 0 && <span className="badge-error">{errors}e</span>}
          {warnings > 0 && <span className="badge-warning">{warnings}w</span>}
          {open
            ? <ChevronDown  className="w-3.5 h-3.5 text-gray-600" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          }
        </div>
      </button>

      {open && (
        <div className="divide-y divide-white/[0.04]">
          {comments.map((c) => {
            const CatIcon = CATEGORY_ICONS[c.category ?? "other"] ?? Tag;
            return (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <CatIcon className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <SeverityBadge severity={c.severity} />
                      {c.category && (
                        <span className="badge-neutral">{c.category}</span>
                      )}
                      {c.line_number && (
                        <span className="mono text-[11px] text-gray-700">line {c.line_number}</span>
                      )}
                      {c.posted_to_github === 1 && (
                        <span className="badge-success text-[10px]">✓ GitHub</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{c.comment}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: review, isLoading } = useQuery({
    queryKey: ["review", id],
    queryFn: () => fetchReview(Number(id)),
    enabled: !!id,
  });

  const del = useMutation({
    mutationFn: () => deleteReview(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      navigate("/reviews");
    },
  });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse max-w-4xl">
      <div className="h-8 bg-white/[0.03] rounded-xl w-32" />
      <div className="h-56 bg-white/[0.03] rounded-2xl" />
      <div className="h-40 bg-white/[0.03] rounded-2xl" />
    </div>
  );

  if (!review) return (
    <div className="text-center py-24">
      <p className="text-red-400">Review not found</p>
      <button onClick={() => navigate(-1)} className="btn-ghost mt-4">← Go back</button>
    </div>
  );

  const groups    = groupByFile(review.comments);
  const fileCount = Object.keys(groups).length;
  const errors    = review.comments.filter((c) => c.severity === "error").length;
  const warnings  = review.comments.filter((c) => c.severity === "warning").length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero card */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Score */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <ScoreGauge score={review.overall_score} size="lg" />
            <p className="text-[10px] text-gray-700 uppercase tracking-wider font-medium">Score</p>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-lg font-semibold text-white leading-snug">
                {review.pr_title ?? "Untitled PR"}
              </h1>
              <StatusBadge status={review.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <GitPullRequest className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="mono text-xs">
                  {review.repo_owner}/{review.repo_name} <span className="text-gray-700">#{review.pr_number}</span>
                </span>
                {review.pr_url && (
                  <a href={review.pr_url} target="_blank" rel="noopener noreferrer"
                    className="text-gray-700 hover:text-violet-400 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {review.pr_author && (
                <div className="flex items-center gap-2 text-gray-500">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs">{review.pr_author}</span>
                </div>
              )}

              {(review.base_branch || review.head_branch) && (
                <div className="flex items-center gap-2 text-gray-500">
                  <GitMerge className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="mono text-xs">{review.head_branch} → {review.base_branch}</span>
                </div>
              )}

              <div className="text-gray-700 text-xs">
                {format(parseISO(review.created_at), "MMM d, yyyy 'at' HH:mm")}
              </div>
            </div>

            {/* Summary */}
            {review.summary && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary</p>
                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{review.summary}</p>
              </div>
            )}

            {/* Error */}
            {review.error_message && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-xs font-semibold text-red-400 mb-1">Review Error</p>
                <p className="mono text-xs text-red-400/60">{review.error_message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 pt-5 border-t border-white/[0.04] flex items-center gap-6 text-xs">
          <div className="text-gray-500">
            <span className="text-white font-semibold">{review.comments.length}</span> issue{review.comments.length !== 1 ? "s" : ""}
          </div>
          <div className="text-gray-500">
            <span className="text-white font-semibold">{fileCount}</span> file{fileCount !== 1 ? "s" : ""}
          </div>
          {errors > 0 && (
            <span className="badge-error">{errors} error{errors !== 1 ? "s" : ""}</span>
          )}
          {warnings > 0 && (
            <span className="badge-warning">{warnings} warning{warnings !== 1 ? "s" : ""}</span>
          )}
          {review.github_review_id && (
            <span className="badge-success">✓ Posted to GitHub</span>
          )}
        </div>
      </div>

      {/* Comments by file */}
      {fileCount > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-1">
            Inline Comments
          </p>
          {Object.entries(groups).map(([fp, comments]) => (
            <FileGroup key={fp} filePath={fp} comments={comments} />
          ))}
        </div>
      )}

      {/* Delete */}
      <div className="pt-2 pb-8">
        <button
          onClick={() => confirm("Delete this review?") && del.mutate()}
          disabled={del.isPending}
          className="flex items-center gap-2 text-xs text-gray-700 hover:text-red-400
                     transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete review
        </button>
      </div>
    </div>
  );
}
