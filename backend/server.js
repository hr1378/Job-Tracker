const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Job = require("./models/Job");
const Counter = require("./models/Counter");
const Prompt = require("./models/Prompt");

const app = express();
const router = express.Router();

const port = 5000;
const uri = "mongodb://127.0.0.1:27017/job_tracker";

// MongoDB connection with better error handling
mongoose.connect(uri)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// Middleware
app.use(cors({
    origin: ["http://localhost:5000", "chrome-extension://*"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Get the next application count (increments the shared counter)
async function getNextCount() {
    const existing = await Counter.findOne({ name: "jobs" });

    if (existing) {
        const updated = await Counter.findOneAndUpdate(
            { name: "jobs" },
            { $inc: { value: 1 } },
            { new: true }
        );
        return updated.value;
    }

    // First use: continue from the highest count already stored
    const maxJob = await Job.findOne().sort({ Count: -1 }).select("Count");
    const start = maxJob && Number.isFinite(maxJob.Count) ? maxJob.Count : 0;

    try {
        const created = await Counter.create({ name: "jobs", value: start + 1 });
        return created.value;
    } catch (err) {
        // Race condition: another request created it first
        if (err.code === 11000) {
            const updated = await Counter.findOneAndUpdate(
                { name: "jobs" },
                { $inc: { value: 1 } },
                { new: true }
            );
            return updated.value;
        }
        throw err;
    }
}

// Add Job route
router.post("/addJob", async (req, res) => {
    try {
        console.log("Request body:", req.body);

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                error: "Request body is empty"
            });
        }

        const { Title, Company, Location, Date: dateString, Website, URL, Status, Strategy, Category } = req.body;

        if (!Title || !Company) {
            return res.status(400).json({
                error: "Title and Company are required fields"
            });
        }

        const jobData = {
            Title: String(Title).trim(),
            Company: String(Company).trim()
        };

        if (Location) jobData.Location = String(Location).trim();
        if (Website) jobData.Website = String(Website).trim();
        if (URL) jobData.URL = String(URL).trim();
        if (Status) jobData.Status = String(Status).trim();
        if (Strategy) jobData.Strategy = String(Strategy).trim();
        if (Category) jobData.Category = String(Category).trim();

        // The application counter is owned by the backend so it stays in sync
        // across all clients (extension + web frontend) and resets with the DB.
        jobData.Count = await getNextCount();

        // Convert date from DD/MM/YYYY format to Date object
        if (dateString) {
            const [day, month, year] = dateString.split('/');
            const formattedDate = new Date(`${year}-${month}-${day}`);
            if (!isNaN(formattedDate.getTime())) {
                jobData.Date = formattedDate;
            } else {
                jobData.Date = new Date();
            }
        } else {
            // Default to current date if no date provided
            jobData.Date = new Date();
        }

        const job = await Job.create(jobData);

        res.status(201).json({
            message: "Job created successfully",
            job
        });

    } catch (err) {
        console.error("Error saving job:", err);
        res.status(500).json({
            error: "Failed to save job",
            details: err.message
        });
    }
});

// Get all jobs
router.get("/", async (req, res) => {
    try {
        const jobs = await Job.find().sort({ Date: -1 });
        res.status(200).json(jobs);
    } catch(err) {
        console.error("Error fetching jobs:", err);
        res.status(500).json({
            error: "Failed to fetch jobs",
            details: err.message
        });
    }
});

// Update a job
router.put("/updateJob/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid job ID" });
        }

        const { Title, Company, Location, Date: dateString, Website, URL, Count, Status, Strategy, Category } = req.body;

        if (Title !== undefined && !String(Title).trim()) {
            return res.status(400).json({ error: "Title cannot be empty" });
        }
        if (Company !== undefined && !String(Company).trim()) {
            return res.status(400).json({ error: "Company cannot be empty" });
        }

        const updates = {};
        if (Title !== undefined) updates.Title = String(Title).trim();
        if (Company !== undefined) updates.Company = String(Company).trim();
        if (Location !== undefined) updates.Location = String(Location).trim();
        if (Website !== undefined) updates.Website = String(Website).trim();
        if (URL !== undefined) updates.URL = String(URL).trim();
        if (Count !== undefined) updates.Count = Number(Count) || 0;
        if (Status !== undefined) updates.Status = String(Status).trim();
        if (Strategy !== undefined) updates.Strategy = String(Strategy).trim();
        if (Category !== undefined) updates.Category = String(Category).trim();
        if (dateString !== undefined && dateString !== "") {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) updates.Date = date;
        }

        const job = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.status(200).json({
            message: "Job updated successfully",
            job
        });

    } catch (err) {
        console.error("Error updating job:", err);
        res.status(500).json({
            error: "Failed to update job",
            details: err.message
        });
    }
});

// Delete a job
router.delete("/deleteJob/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid job ID" });
        }

        const job = await Job.findByIdAndDelete(id);

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.status(200).json({
            message: "Job deleted successfully",
            deletedCount: 1
        });

    } catch (err) {
        console.error("Error deleting job:", err);
        res.status(500).json({
            error: "Failed to delete job",
            details: err.message
        });
    }
});

// Export to sheet
router.get("/exportToSheet", async (req, res) => {
    try {
        const jobs = await Job.find().sort({ Date: -1 });

        const headers = ["Title", "Company", "Location", "Date", "Count", "Status", "Strategy", "Category", "Website", "URL"];
        const rows = jobs.map(job => [
            `"${(job.Title || "").replace(/"/g, '""')}"`,
            `"${(job.Company || "").replace(/"/g, '""')}"`,
            `"${(job.Location || "").replace(/"/g, '""')}"`,
            `"${job.Date ? new Date(job.Date).toISOString() : ""}"`,
            `"${job.Count || 0}"`,
            `"${(job.Status || "").replace(/"/g, '""')}"`,
            `"${(job.Strategy || "").replace(/"/g, '""')}"`,
            `"${(job.Category || "").replace(/"/g, '""')}"`,
            `"${(job.Website || "").replace(/"/g, '""')}"`,
            `"${(job.URL || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // UTF-8 BOM so Excel/Sheets render special characters correctly
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=jobs_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send("\uFEFF" + csvContent);

    } catch(err) {
        console.error("Error exporting to sheet:", err);
        res.status(500).json({
            error: "Failed to export jobs",
            details: err.message
        });
    }
});

// Reset DB
router.post("/resetDB", async (req, res) => {
    try {
        const { confirmation } = req.body;

        if (!confirmation || confirmation !== "reset db") {
            return res.status(400).json({
                error: "Invalid confirmation. Type 'reset db' to confirm."
            });
        }

        const result = await Job.deleteMany({});

        // Reset the application counter so the next job starts at 1
        await Counter.findOneAndUpdate(
            { name: "jobs" },
            { $set: { value: 0 } },
            { upsert: true }
        );

        res.status(200).json({
            message: "Database reset successfully",
            deletedCount: result.deletedCount,
            counterReset: true
        });

    } catch(err) {
        console.error("Error resetting database:", err);
        res.status(500).json({
            error: "Failed to reset database",
            details: err.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        error: "Internal server error",
        details: err.message
    });
});

// Prompt CRUD Routes

// Get the top 10 prompts (most used first, then most recently created)
router.get("/prompts", async (req, res) => {
    try {
        const prompts = await Prompt.find().sort({ usageCount: -1, createdAt: -1 }).limit(10);
        res.status(200).json(prompts);
    } catch (err) {
        console.error("Error fetching prompts:", err);
        res.status(500).json({
            error: "Failed to fetch prompts",
            details: err.message
        });
    }
});

// Get a single prompt by ID
router.get("/prompts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid prompt ID" });
        }

        const prompt = await Prompt.findById(id);
        if (!prompt) {
            return res.status(404).json({ error: "Prompt not found" });
        }

        res.status(200).json(prompt);
    } catch (err) {
        console.error("Error fetching prompt:", err);
        res.status(500).json({
            error: "Failed to fetch prompt",
            details: err.message
        });
    }
});

// Mark a prompt as used (called when a prompt is copied to the clipboard).
// Bumps the usage counter so the "top 10" list reflects the most-used prompts.
router.post("/prompts/:id/use", async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid prompt ID" });
        }

        const prompt = await Prompt.findByIdAndUpdate(
            id,
            { $inc: { usageCount: 1 } },
            { new: true }
        );

        if (!prompt) {
            return res.status(404).json({ error: "Prompt not found" });
        }

        res.status(200).json(prompt);
    } catch (err) {
        console.error("Error marking prompt as used:", err);
        res.status(500).json({
            error: "Failed to mark prompt as used",
            details: err.message
        });
    }
});

// Create a new prompt
router.post("/prompts", async (req, res) => {
    try {
        console.log("POST /prompts request received");
        console.log("Request body:", req.body);

        const { name, content, category } = req.body;

        if (!name || !content) {
            console.log("Validation failed: missing name or content");
            return res.status(400).json({
                error: "Name and content are required fields"
            });
        }

        const promptData = {
            name: String(name).trim(),
            content: String(content).trim(),
            category: category ? String(category).trim() : "General"
        };

        console.log("Creating prompt with data:", promptData);

        const prompt = await Prompt.create(promptData);

        console.log("Prompt created successfully:", prompt);

        res.status(201).json({
            message: "Prompt created successfully",
            prompt
        });
    } catch (err) {
        console.error("Error creating prompt:", err);
        res.status(500).json({
            error: "Failed to create prompt",
            details: err.message
        });
    }
});

// Update a prompt
router.put("/prompts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid prompt ID" });
        }

        const { name, content, category } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = String(name).trim();
        if (content !== undefined) updates.content = String(content).trim();
        if (category !== undefined) updates.category = String(category).trim();

        const prompt = await Prompt.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        if (!prompt) {
            return res.status(404).json({ error: "Prompt not found" });
        }

        res.status(200).json({
            message: "Prompt updated successfully",
            prompt
        });
    } catch (err) {
        console.error("Error updating prompt:", err);
        res.status(500).json({
            error: "Failed to update prompt",
            details: err.message
        });
    }
});

// Delete a prompt
router.delete("/prompts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid prompt ID" });
        }

        const prompt = await Prompt.findByIdAndDelete(id);

        if (!prompt) {
            return res.status(404).json({ error: "Prompt not found" });
        }

        res.status(200).json({
            message: "Prompt deleted successfully",
            prompt
        });
    } catch (err) {
        console.error("Error deleting prompt:", err);
        res.status(500).json({
            error: "Failed to delete prompt",
            details: err.message
        });
    }
});

// 404 handler
router.use((req, res) => {
    res.status(404).json({
        error: "Route not found"
    });
});

app.use(router);

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});