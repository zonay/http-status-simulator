const express = require("express");
const path = require("path");
const app = express();
const port = 8000;

app.use(express.json());

let currentStatus = 200;
let globalDelay = 0;

// Valid status codes grouped by category
const VALID_CODES = {
    success: [200, 201, 202, 204],
    redirect: [301, 302, 307, 308],
    clientError: [400, 401, 403, 404, 409, 429],
    serverError: [500, 501, 502, 503, 504]
};

// Flatten valid codes for quick lookup
const ALL_VALID_CODES = Object.values(VALID_CODES).flat();

// Add UI routes array for exclusion
const UI_ROUTES = ['/ui', '/config/delay', '/config'];

// Improved delay middleware with proper Promise handling
const handleDelay = () => {
    return new Promise(resolve => setTimeout(resolve, globalDelay));
};

// Apply delay middleware to all API routes except UI
app.use(async (req, res, next) => {
    // Skip delay for UI routes and static files
    if (UI_ROUTES.includes(req.path) || req.path.startsWith('/ui/')) {
        return next();
    }

    try {
        await handleDelay();
        next();
    } catch (error) {
        next(error);
    }
});

app.get("/ui", (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'ui', 'index.html'));
});

app.post("/setStatus", async (req, res) => {
    const { status } = req.body;
    if (!status || !ALL_VALID_CODES.includes(Number(status))) {
        return res.status(400).json({ 
            error: "Invalid status code",
            validCodes: VALID_CODES
        });
    }
    currentStatus = Number(status);
    res.json({ status: currentStatus });
});

// Update delay configuration endpoint
app.post("/config/delay", (req, res) => {
    const delay = parseInt(req.body.delay) || 0;
    globalDelay = Math.min(Math.max(delay, 0), 50000); // Limit between 0-50 seconds
    console.log(`Global delay set to ${globalDelay}ms`); // Debug log
    res.json({ delay: globalDelay });
});

app.get("/", async (req, res) => {
    res.status(currentStatus).json({
        currentStatus,
        message: getStatusMessage(currentStatus),
        timestamp: new Date().toISOString(),
        delay: globalDelay
    });
});

// Add config endpoint
app.get("/config", (req, res) => {
    res.json({
        apiRoot: req.protocol + '://' + req.get('host'),
        version: "1.0.0"
    });
});

// Helper function to get status messages
function getStatusMessage(code) {
    const messages = {
        200: "OK",
        201: "Created",
        202: "Accepted",
        204: "No Content",
        301: "Moved Permanently",
        302: "Found",
        307: "Temporary Redirect",
        308: "Permanent Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        429: "Too Many Requests",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout"
    };
    return messages[code] || "Unknown Status";
}

// Status code routes
const statusRoutes = {
    // 2XX Success
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    // 3XX Redirection
    301: "Moved Permanently",
    302: "Found",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    // 4XX Client Errors
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    409: "Conflict",
    418: "I'm a teapot",
    429: "Too Many Requests",
    // 5XX Server Errors
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout"
};

// Generate routes for all status codes
Object.entries(statusRoutes).forEach(([code, message]) => {
    app.get(`/${code}`, async (req, res) => {
        res.status(Number(code)).json({
            status: Number(code),
            message,
            timestamp: new Date().toISOString(),
            delay: globalDelay
        });
    });
});

// Serve static files last
app.use(express.static("public"));

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});