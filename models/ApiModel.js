const mongoose = require('mongoose');

// Schema for storing API details
const apiSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, index: true }, // Create an index on `url`
    method: { type: String, required: true },
    description: { type: String },
    lastScanned: { type: Date, default: null },
    vulnerabilities: [{ type: String }]
});

// Schema for storing vulnerability details
const VulnerabilitySchema = new mongoose.Schema({
    apiUrl: { type: String, index: true }, // Create an index on `apiUrl`
    vulnerabilities: [
        {
            name: { type: String, required: true },
            description: { type: String },
            risk: { type: String },
            url: { type: String },
            reference: { type: String },
            solution: { type: String }
        }
    ],
    lastScanned: { type: Date, default: Date.now }
});

// Creating models from schemas
const Api = mongoose.model('Api', apiSchema);
const Vulnerability = mongoose.model('Vulnerability', VulnerabilitySchema);

module.exports = {
    Api,
    Vulnerability
};

