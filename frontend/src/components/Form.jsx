import React from "react";
import { useState } from "react";

const Form = () => {
  const [Title, setTitle] = useState("");
  const [Company, setCompany] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const job = { Title, Company };

    try {
      const res = await fetch("http://localhost:5000/addJob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });

      if (!res.ok) {
        throw new Error("Failed to submit job");
      }

      const data = await res.json();
      console.log("saved job", data);

      setTitle("");
      setCompany("");
    } catch (err) {
      console.error("Error submitting job", err);
    }
  };
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company
          </label>
          <input
            id="company"
            type="text"
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Enter company"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default Form;
