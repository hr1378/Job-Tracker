const express = require('express');
const mongoose = require("mongoose")


const schema = new mongoose.Schema({
    Title: {
        type: String,
        required: true,
    },
    Company:{
        type: String,
        required: true,
    },
    Date: {
        type: Date,
        required: true,
        default: Date.now
    },
    Status: {
        required: false,
        type: String,
        default: "Applied"
    }
    
})

module.exports = mongoose.model("Job", schema)