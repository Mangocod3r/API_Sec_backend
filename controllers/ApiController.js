const { Api, Vulnerability } = require('../models/ApiModel');
const axios = require('axios');
const {sendEmailNotification} = require('../mailer');

// Add a new API to the inventory
exports.addApi = async (req, res) => {
    try {
        console.log('sendEmailNotification:', sendEmailNotification);

        const { name, url, method, description } = req.body;
        const newApi = new Api({ name, url, method, description });

        await newApi.save();
        console.log('New API saved:', newApi);

        console.log('Sending email notification...');
        await sendEmailNotification(newApi); // Ensure this is executed
        console.log('Email notification sent.');

        res.status(201).json({ message: 'API added successfully', api: newApi });
    } catch (error) {
        console.error('Error in addApi:', error);
        res.status(500).json({ message: 'Error adding API', error });
    }
};


// Get all APIs
exports.getAllApis = async (req, res) => {
    try {
        const apis = await Api.find();
        res.status(200).json(apis);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching APIs', error });
    }
};

// Scan an API for OWASP vulnerabilities (placeholder, future implementation with OWASP ZAP)
exports.scanApi = async (req, res) => {
    try {
        const apiId = req.params.id;
        const api = await Api.findById(apiId);

        // Ensure URL includes scheme and is properly encoded
        const urlWithScheme = api.url.startsWith('http://') || api.url.startsWith('https://') ? api.url : `http://${api.url}`;
        const encodedUrl = encodeURIComponent(urlWithScheme);

        // Set your API key
        const apiKey = '5f38kf62s1ns0vq9nvgnov0b13';

        // Spider the URL first
        const spiderUrl = `http://localhost:8081/JSON/spider/action/scan/?url=${encodedUrl}&maxDepth=2`;
        await axios.get(spiderUrl, {
            headers: {
                'X-ZAP-API-Key': apiKey
            }
        });

        // Add a delay to ensure spidering is completed
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

        // Start the scan
        const scanUrl = `http://localhost:8081/JSON/ascan/action/scan/?url=${encodedUrl}`;
        const zapResponse = await axios.get(scanUrl, {
            headers: {
                'X-ZAP-API-Key': apiKey
            }
        });

        console.log('ZAP Response:', zapResponse.data);
        const scanId = zapResponse.data.scan;
        console.log('Scan ID:', scanId);
        let scanProgress = 0;

        // Polling until scan completion
        while (scanProgress < 100) {
            const statusResponse = await axios.get(`http://localhost:8081/JSON/ascan/view/status/?scanId=${scanId}`, {
                headers: {
                    'X-ZAP-API-Key': apiKey
                }
            });
            scanProgress = parseInt(statusResponse.data.status);
            console.log(`Scan progress: ${scanProgress}%`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }

        // Retrieve vulnerabilities
        const vulnerabilitiesResponse = await axios.get(`http://localhost:8081/JSON/alert/view/alerts/?baseurl=${api.url}`, {
            headers: {
                'X-ZAP-API-Key': apiKey
            }
        });
        console.log('Vulnerabilities:', vulnerabilitiesResponse.data);
        const vulnerabilities = vulnerabilitiesResponse.data.alerts.map(alert => alert.alert);
        const uniqueVulnerabilities = Array.from(new Set(vulnerabilities));

        // Save vulnerabilities in database
        api.vulnerabilities = uniqueVulnerabilities;
        api.lastScanned = new Date();
        await api.save();

        res.status(200).json({ message: 'API scanned successfully', api });
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error scanning API', error });
    }
};

exports.getApiDetails = async (req, res) => {
    try {
        const apiKey = '5f38kf62s1ns0vq9nvgnov0b13';
        const decodedUrl = decodeURIComponent(req.params.id);
        console.log('API URL:', decodedUrl);

        // Check if vulnerabilities already exist in the DB
        let vulnerabilityRecord = await Vulnerability.findOne({ apiUrl: decodedUrl });

        // If the vulnerabilities exist and are recent, return them from the DB
        if (vulnerabilityRecord) {
            console.log('Serving from MongoDB');
            return res.status(200).json(vulnerabilityRecord.vulnerabilities);
        }

        // Fetch vulnerabilities from the ZAP API if not in DB
        console.log('Fetching from ZAP');
        const vulnerabilitiesResponse = await axios.get(`http://localhost:8081/JSON/alert/view/alerts/?baseurl=${decodedUrl}`, {
            headers: {
                'X-ZAP-API-Key': apiKey
            }
        });

        if (!vulnerabilitiesResponse.data.alerts) {
            return res.status(404).json({ message: 'No vulnerabilities found' });
        }

        let vulnerabilities = vulnerabilitiesResponse.data.alerts;

        // Use Set to remove duplicate vulnerabilities based on a unique property (like 'name' or 'id')
        const uniqueVulnerabilities = Array.from(new Set(vulnerabilities.map((vuln) => vuln.name))) // Assuming 'name' is the unique property
            .map((name) => vulnerabilities.find((vuln) => vuln.name === name));

        // Save the unique vulnerabilities to MongoDB
        vulnerabilityRecord = new Vulnerability({
            apiUrl: decodedUrl,
            vulnerabilities: uniqueVulnerabilities, // Store the unique vulnerabilities
            lastScanned: new Date()
        });

        await vulnerabilityRecord.save();
        console.log('Saved vulnerabilities to MongoDB');

        return res.status(200).json(uniqueVulnerabilities);
    } catch (error) {
        console.error('Error fetching API details:', error);
        return res.status(500).json({ message: 'Error fetching API details', error });
    }
};
