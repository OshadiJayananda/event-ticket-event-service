//src\app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// Import routes - NOTE THE CORRECT FILENAME WITH DOT
const eventRoutes = require("./routes/event.routes"); // Make sure this is event.routes, not eventRoutes

// Import middleware
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// =======================
// CORS Configuration
// =======================
function normalizeOrigin(value) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `http://localhost:${trimmedValue}`;
}

const allowedOrigins = [
  normalizeOrigin(process.env.API_GATEWAY_URL),
  ...String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

// Security middleware
app.use(helmet());

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"), false);
    },
    credentials: true,
  }),
);

// =======================
// Body Parser Middleware
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// Request Logging Middleware
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

// =======================
// API Routes
// =======================
app.use("/api/events", eventRoutes);



// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Event Service Running",
    docs: "/health for status",
    api: "/api/events for event endpoints",
  });
});

// =======================
// 404 Handler
// =======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`,
    timestamp: new Date().toISOString(),
  });
});

// =======================
// Error Handler
// =======================
app.use(errorHandler);

module.exports = app;
