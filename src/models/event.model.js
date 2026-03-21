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
      enum: ["Active", "Sold Out", "Completed", "Cancelled"],
      default: "Active",
    },
    createdBy: {
      type: String,
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
    timestamps: true,
  },
);

// Method to update status based on date and availability
eventSchema.methods.updateStatusAutomatically = function () {
  const now = new Date();
  const eventDate = new Date(this.date);

  if (this.status === "Cancelled") {
    return;
  }

  if (eventDate < now) {
    this.status = "Completed";
  } else if (this.availableSeats === 0) {
    this.status = "Sold Out";
  } else {
    this.status = "Active";
  }
};

// Pre-save middleware to update status
eventSchema.pre("save", function () {
  this.updateStatusAutomatically();
});

// Pre-validate middleware to set availableSeats equal to totalSeats for new events
eventSchema.pre("validate", function () {
  if (this.isNew) {
    this.availableSeats = this.totalSeats;
  }
});

// Method to check whether enough seats remain for the requested booking.
eventSchema.methods.hasAvailableSeats = function (quantity) {
  return this.availableSeats >= quantity;
};

// Method to update seats
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

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
