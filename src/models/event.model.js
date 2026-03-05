//src/models/event.model.js
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
      maxlength: [100, "Event name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Event date must be in the future",
      },
    },
    venue: {
      type: String,
      required: [true, "Venue is required"],
      trim: true,
    },
    totalSeats: {
      type: Number,
      required: [true, "Total seats is required"],
      min: [1, "Total seats must be at least 1"],
    },
    availableSeats: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value <= this.totalSeats;
        },
        message: "Available seats cannot exceed total seats",
      },
    },
    ticketPrice: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: [0, "Ticket price cannot be negative"],
    },
    category: {
      type: String,
      enum: ["Concert", "Conference", "Sports", "Theater", "Workshop", "Other"],
      default: "Other",
    },
    status: {
      type: String,
      enum: ["Active", "Cancelled", "Completed"],
      default: "Active",
    },
    createdBy: {
      type: String, // Will store user ID from User Service
      required: true,
    },
    images: [
      {
        url: String,
        caption: String,
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

// Index for better query performance
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ category: 1 });

// Virtual for checking if event is sold out
eventSchema.virtual("isSoldOut").get(function () {
  return this.availableSeats === 0;
});

// Virtual for percentage of seats sold
eventSchema.virtual("soldPercentage").get(function () {
  return (
    ((this.totalSeats - this.availableSeats) / this.totalSeats) *
    100
  ).toFixed(2);
});

// Method to check if seats are available
eventSchema.methods.hasAvailableSeats = function (quantity) {
  return this.availableSeats >= quantity;
};

// Method to update seats (will be used by booking service)
eventSchema.methods.updateSeats = async function (
  quantity,
  operation = "decrease",
) {
  if (operation === "decrease") {
    if (!this.hasAvailableSeats(quantity)) {
      throw new Error("Insufficient seats available");
    }
    this.availableSeats -= quantity;
  } else if (operation === "increase") {
    this.availableSeats += quantity;
    if (this.availableSeats > this.totalSeats) {
      this.availableSeats = this.totalSeats;
    }
  }
  return this.save();
};

// Pre-save middleware to set availableSeats equal to totalSeats for new events
// Pre-save middleware to set availableSeats equal to totalSeats for new events
eventSchema.pre("validate", function (next) {
  if (this.isNew) {
    this.availableSeats = this.totalSeats;
  }
  // next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
