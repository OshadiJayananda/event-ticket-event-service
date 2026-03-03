require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5003;

// =======================
// Handle uncaught exceptions
// =======================
process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION! Shutting down...");
  console.error("Error:", err.name, err.message);
  console.error("Stack:", err.stack);
  process.exit(1);
});

// =======================
// Connect to MongoDB
// =======================
console.log("🔌 Connecting to MongoDB...");
console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Not found");

connectDB();

// =======================
// Start Server
// =======================
const server = app.listen(PORT, () => {
  console.log("\n=================================");
  console.log(`🚀 Event Service is running!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api/events`);
  console.log("=================================\n");
});

// =======================
// Handle unhandled promise rejections
// =======================
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION! Shutting down...");
  console.error("Error:", err.name, err.message);
  console.error("Stack:", err.stack);
  server.close(() => {
    process.exit(1);
  });
});

// =======================
// Graceful shutdown
// =======================
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("💤 Process terminated!");
  });
});
