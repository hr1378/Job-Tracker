import React, { useState, useEffect, useMemo } from "react";
import Card from "../components/Card";
import EditModal from "../components/EditModal";

const EXPORT_FIELDS = ["Title", "Company", "Location", "Date", "Count", "Status", "Strategy", "Category", "Website", "URL"];

const Home = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/");
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const json = await res.json();
        setJobs(json);
      } catch {
        setError("Could not load jobs. Make sure the backend is running on port 5000.");
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) =>
      ["Title", "Company", "Location", "Category", "Status", "Strategy", "Website"]
        .some((field) => String(job[field] || "").toLowerCase().includes(query))
    );
  }, [jobs, search]);

  const showNotice = (type, text, duration = 4000) => {
    setNotice({ type, text });
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(null), duration);
  };

  const exportJobs = () => {
    try {
      const rows = jobs.map((job) =>
        EXPORT_FIELDS.map((field) => {
          let value = job[field] ?? "";
          if (field === "Date" && value) {
            const date = new Date(value);
            value = isNaN(date.getTime()) ? "" : date.toISOString();
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(",")
      );
      const csv = "\uFEFF" + [EXPORT_FIELDS.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jobs_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotice("success", `Exported ${jobs.length} job${jobs.length !== 1 ? "s" : ""} to CSV.`);
    } catch {
      showNotice("error", "Export failed.");
    }
  };

  const resetDB = async () => {
    const confirmation = window.prompt('Type "reset db" to confirm deleting ALL jobs:');
    if (confirmation === null) return;
    if (confirmation.trim().toLowerCase() !== "reset db") {
      showNotice("error", "Invalid confirmation. Reset cancelled.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/resetDB", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "reset db" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      setJobs([]);
      setSearch("");
      showNotice("success", `Database reset. Deleted ${data.deletedCount} jobs and reset the counter.`, 5000);
    } catch (err) {
      showNotice("error", `Reset failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (form) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/updateJob/${editingJob._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      setJobs((prev) => prev.map((j) => (j._id === data.job._id ? data.job : j)));
      setEditingJob(null);
      showNotice("success", "Job updated.");
    } catch (err) {
      showNotice("error", `Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.Title}" at ${job.Company}?`)) return;

    try {
      const res = await fetch(`/api/deleteJob/${job._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      setJobs((prev) => prev.filter((j) => j._id !== job._id));
      showNotice("success", `Deleted "${job.Title}".`);
    } catch (err) {
      showNotice("error", `Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Job Tracker</h1>
          <p className="subtitle">
            {jobs.length} job{jobs.length !== 1 && "s"} saved
          </p>
        </div>
        <div className="toolbar">
          <div className="search-bar">
            <svg
              className="search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, company, location, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-search" onClick={() => setSearch("")}>
                ✕
              </button>
            )}
          </div>
          <button className="btn" onClick={exportJobs} disabled={busy}>
            Export CSV
          </button>
          <button className="btn danger" onClick={resetDB} disabled={busy}>
            Reset DB
          </button>
        </div>
      </header>

      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      {loading && <p className="status-message">Loading jobs...</p>}
      {error && <p className="status-message error">{error}</p>}

      {!loading && !error && filteredJobs.length === 0 && (
        <div className="empty-state">
          <p>{jobs.length === 0 ? "No jobs saved yet." : `No jobs match "${search}".`}</p>
        </div>
      )}

      {!loading && !error && filteredJobs.length > 0 && (
        <>
          {search && (
            <p className="result-count">
              {filteredJobs.length} of {jobs.length} jobs
            </p>
          )}
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <Card
                key={job._id}
                job={job}
                onEdit={setEditingJob}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {editingJob && (
        <EditModal
          job={editingJob}
          saving={saving}
          onSave={handleSaveEdit}
          onClose={() => setEditingJob(null)}
        />
      )}
    </div>
  );
};

export default Home;
