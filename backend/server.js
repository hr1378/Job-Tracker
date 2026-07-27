const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Job = require("./models/Job");

const app = express();
const router = express.Router();

const port = 5000;
const uri = "mongodb://127.0.0.1:27017/job_tracker";

// MongoDB connection
mongoose.connect(uri)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err);
    });


// Middleware
app.use(cors());
app.use(express.json());


// Add Job route
router.post("/addJob", async (req, res) => {
    try {
        console.log("Request body:", req.body);

        if (!req.body) {
            return res.status(400).json({
                error: "Request body is empty"
            });
        }

        const { Title, Company } = req.body;

        if (!Title || !Company) {
            return res.status(400).json({
                error: "Fill all fields"
            });
        }

        const job = await Job.create({
            Title,
            Company
        });

        res.status(201).json({
            message: "Job created successfully",
            job
        });

    } catch (err) {
        console.log("Error saving job:", err);

        res.status(500).json({
            error: err.message
        });
    }
});


// Get all jobs
router.get("/", async (req, res) => {
    try {
        const jobs = await Job.find();
        res.status(200).json(jobs);
    } catch(err) {
        res.status(500).json({
            error: err.message
        });
    }
});


app.use(router);


// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});