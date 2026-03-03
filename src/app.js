const express = require("express");
const cors = require("cors");
const helmet = require("helmet"); // You need to install this: npm install helmet

// Import routes (you'll create this next)
const eventRoutes = require("./routes/event.routes");

// Import middleware
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// =======================
// CORS Configuration
// =======================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security

// CORS middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// =======================
// Body Parser Middleware
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// Request Logging Middleware (for development)
// =======================
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// =======================
// Health Check Route
// =======================
app.get("/health", (req, res) => {
  res.json({
    message: "Event Service Running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root route (for backward compatibility)
app.get("/", (req, res) => {
  res.json({
    message: "Event Service Running",
    docs: "/health for status",
    api: "/api/events for event endpoints",
  });
});

// =======================
// API Routes
// =======================
app.use("/api/events", eventRoutes);

// =======================
// 404 Handler for undefined routes
// =======================
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`,
    timestamp: new Date().toISOString(),
  });
});

// =======================
// Error Handler Middleware
// =======================
app.use(errorHandler);

module.exports = app;
