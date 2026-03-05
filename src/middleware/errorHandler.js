//src/middleware/errorHandler.js
const ApiResponse = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    return ApiResponse.error(res, message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return ApiResponse.error(res, "Validation Error", 400, errors);
  }

  // Mongoose cast error (invalid ID)
  if (err.name === "CastError") {
    return ApiResponse.error(res, "Resource not found", 404);
  }

  // JWT errors (if you implement auth later)
  if (err.name === "JsonWebTokenError") {
    return ApiResponse.error(res, "Invalid token", 401);
  }

  // Custom application error
  if (err.statusCode) {
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  // Default server error
  return ApiResponse.error(
    res,
    error.message || "Internal Server Error",
    error.statusCode || 500,
  );
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
