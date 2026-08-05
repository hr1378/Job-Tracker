import React from "react";

const CATEGORY_COLORS = {
  "FullStack": "#6366f1",
  "AI / ML": "#a855f7",
  "AI/ML": "#a855f7",
  "Data Analytics": "#10b981",
  "Data": "#10b981",
  "Backend": "#ef4444",
  "Frontend": "#f97316",
  "DevOps": "#06b6d4",
  "Mobile": "#ec4899",
  "Internship": "#14b8a6",
  "Unknown": "#9ca3af",
};

const PALETTE = [
  "#6366f1", "#a855f7", "#10b981", "#ef4444",
  "#f97316", "#06b6d4", "#ec4899", "#14b8a6",
  "#8b5cf6", "#f59e0b",
];

const STATUS_COLORS = {
  "Applied": "#2563eb",
  "OA": "#d97706",
  "Rejected": "#dc2626",
  "Round1": "#7c3aed",
  "Round2": "#0d9488",
  "Offer": "#16a34a",
  "Unknown": "#6b7280",
};

const fallbackColor = (value) => {
  const normalized = String(value || "Unknown").toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};

const categoryColor = (category) => CATEGORY_COLORS[category] || fallbackColor(category);
const statusColor = (status) => STATUS_COLORS[status] || fallbackColor(status);

const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const relativeDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

const Card = ({ job, onEdit, onDelete }) => {
  const color = categoryColor(job.Category);

  return (
    <article className="job-card">
      <div className="category-strip" style={{ backgroundColor: color }} />

      <div className="card-body">
        <div className="card-topline">
          <span className="category-label" style={{ color }}>
            {job.Category || "Unknown"}
          </span>
          {job.Count ? <span className="count-badge">×{job.Count}</span> : null}
        </div>

        <h2 className="job-title" title={job.Title}>
          {job.Title}
        </h2>

        <p className="job-company">{job.Company}</p>

        <p className="job-meta">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {job.Location || "Unknown"}
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(job.Date)}
            {relativeDate(job.Date) && ` (${relativeDate(job.Date)})`}
          </span>
        </p>

        <div className="badges">
          {job.Status && (
            <span className="badge" style={{ backgroundColor: `${statusColor(job.Status)}1a`, color: statusColor(job.Status) }}>
              {job.Status}
            </span>
          )}
          {job.Strategy && (
            <span className="badge neutral">{job.Strategy}</span>
          )}
          {job.Website && (
            <span className="badge neutral">{job.Website}</span>
          )}
        </div>

        {job.URL && (
          <a
            className="job-link"
            href={job.URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            View posting →
          </a>
        )}

        <div className="card-actions">
          <button className="btn small" onClick={() => onEdit(job)}>
            Edit
          </button>
          <button className="btn small danger" onClick={() => onDelete(job)}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
};

export default Card;
