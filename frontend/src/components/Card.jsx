import React from "react";
import { useState, useEffect } from "react";

const Card = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("http://localhost:5000/");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.log("No data found on database", err);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div>
      <div className="grid gap-4 mt-6">
        {data.map((job, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-bold text-gray-800">{job.Title}</h2>

            <p className="mt-2 text-gray-600">
              <span className="font-medium">Company:</span> {job.Company}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">Applied:</span> {job.Date}
            </p>

            <div className="mt-4">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  job.Status === "Applied"
                    ? "bg-blue-100 text-blue-700"
                    : job.Status === "Interview"
                      ? "bg-yellow-100 text-yellow-700"
                      : job.Status === "Offer"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {job.Status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Card;
