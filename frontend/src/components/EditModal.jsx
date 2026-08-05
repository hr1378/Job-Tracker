import React, { useState } from "react";

const FIELDS = [
  { key: "Title", label: "Title", type: "text", required: true },
  { key: "Company", label: "Company", type: "text", required: true },
  { key: "Location", label: "Location", type: "text" },
  { key: "Date", label: "Date", type: "date" },
  { key: "Website", label: "Website", type: "text" },
  { key: "URL", label: "URL", type: "text" },
  { key: "Count", label: "Count", type: "number" },
  { key: "Status", label: "Status", type: "text" },
  { key: "Strategy", label: "Strategy", type: "text" },
  { key: "Category", label: "Category", type: "text" },
];

const EditModal = ({ job, saving, onSave, onClose }) => {
  const [form, setForm] = useState(() => {
    const initial = {};
    for (const f of FIELDS) {
      let value = job[f.key] ?? "";
      if (f.key === "Date" && value) {
        const date = new Date(value);
        value = isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
      }
      initial[f.key] = value;
    }
    return initial;
  });

  const handleChange = (e, key) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.Title.trim() || !form.Company.trim()) return;
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Job</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-fields">
            {FIELDS.map((f) => (
              <div className="form-field" key={f.key}>
                <label htmlFor={`edit-${f.key}`}>{f.label}</label>
                <input
                  id={`edit-${f.key}`}
                  type={f.type}
                  value={form[f.key]}
                  onChange={(e) => handleChange(e, f.key)}
                  required={f.required}
                />
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
