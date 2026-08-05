const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    Title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
        maxlength: [200, "Title cannot exceed 200 characters"]
    },
    Company: {
        type: String,
        required: [true, "Company is required"],
        trim: true,
        maxlength: [200, "Company cannot exceed 200 characters"]
    },
    Location: {
        type: String,
        trim: true,
        maxlength: [200, "Location cannot exceed 200 characters"],
        default: "Unknown"
    },
    Date: {
        type: Date,
        default: Date.now
    },
    Website: {
        type: String,
        trim: true,
        maxlength: [500, "Website cannot exceed 500 characters"]
    },
    URL: {
        type: String,
        trim: true,
        maxlength: [1000, "URL cannot exceed 1000 characters"]
    },
    Count: {
        type: Number,
        default: 0
    },
    Status: {
        type: String,
        trim: true,
        maxlength: [100, "Status cannot exceed 100 characters"],
        default: "Applied"
    },
    Strategy: {
        type: String,
        trim: true,
        maxlength: [100, "Strategy cannot exceed 100 characters"],
        default: "Unknown"
    },
    Category: {
        type: String,
        trim: true,
        maxlength: [100, "Category cannot exceed 100 characters"],
        default: "Unknown"
    }
}, {
    timestamps: true
});

schema.index({ Title: 1, Company: 1 });
schema.index({ Date: -1 });
schema.index({ Status: 1 });

module.exports = mongoose.model("Job", schema);