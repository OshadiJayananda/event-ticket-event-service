const Event = require("../models/event.model");
const { AppError } = require("../middleware/errorHandler");

class EventService {
  // Create new event
  async createEvent(eventData) {
    try {
      const event = await Event.create(eventData);
      return event;
    } catch (error) {
      throw error;
    }
  }

  // Get all events with filtering and pagination
  async getAllEvents(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        status,
        minPrice,
        maxPrice,
        startDate,
        endDate,
        search,
      } = queryParams;

      // Build filter object
      const filter = {};

      if (category) filter.category = category;
      if (status) filter.status = status;
      if (minPrice || maxPrice) {
        filter.ticketPrice = {};
        if (minPrice) filter.ticketPrice.$gte = minPrice;
        if (maxPrice) filter.ticketPrice.$lte = maxPrice;
      }
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { venue: { $regex: search, $options: "i" } },
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const events = await Event.find(filter)
        .sort({ date: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Event.countDocuments(filter);

      return {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get single event by ID
  async getEventById(eventId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError("Event not found", 404);
      }
      return event;
    } catch (error) {
      throw error;
    }
  }

  // Update event
  async updateEvent(eventId, updateData) {
    try {
      // Prevent updating certain fields
      delete updateData.availableSeats;
      delete updateData._id;

      const event = await Event.findByIdAndUpdate(eventId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      return event;
    } catch (error) {
      throw error;
    }
  }

  // Delete event (soft delete - just change status)
  async deleteEvent(eventId) {
    try {
      const event = await Event.findByIdAndUpdate(
        eventId,
        { status: "Cancelled" },
        { new: true },
      );

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      return event;
    } catch (error) {
      throw error;
    }
  }

  // Update seats (called by booking service)
  async updateSeats(eventId, quantity, operation = "decrease") {
    try {
      const event = await Event.findById(eventId);

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      await event.updateSeats(quantity, operation);

      return event;
    } catch (error) {
      throw error;
    }
  }

  // Get events by organizer
  async getEventsByOrganizer(organizerId) {
    try {
      const events = await Event.find({ createdBy: organizerId }).sort({
        date: -1,
      });

      return events;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new EventService();
