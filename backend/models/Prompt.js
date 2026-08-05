const mongoose = require("mongoose");

const promptSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Prompt name is required"],
        trim: true,
        maxlength: [200, "Prompt name cannot exceed 200 characters"]
    },
    category: {
        type: String,
        trim: true,
        maxlength: [100, "Prompt category cannot exceed 100 characters"],
        default: "General"
    },
    content: {
        type: String,
        required: [true, "Prompt content is required"],
        trim: true,
        maxlength: [10000, "Prompt content cannot exceed 10000 characters"]
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// "Top 10" ordering: most-used prompts first, then most recently created
promptSchema.index({ usageCount: -1, createdAt: -1 });

module.exports = mongoose.model("Prompt", promptSchema);
