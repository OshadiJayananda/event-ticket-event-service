//src/services/event.service.js
const Event = require("../models/event.model");
const { AppError } = require("../middleware/errorHandler");

class EventService {
  getApiGatewayUrl() {
    const rawValue = process.env.API_GATEWAY_URL;

    if (/^https?:\/\//i.test(rawValue)) {
      return rawValue;
    }

    return `http://localhost:${rawValue}`;
  }

  async resolveOrganizer(authorizationHeader) {
    if (!authorizationHeader) {
      throw new AppError("Authorization header is required", 401);
    }

    const apiGatewayUrl = this.getApiGatewayUrl();

    let response;

    try {
      response = await fetch(`${apiGatewayUrl}/api/users/me`, {
        headers: {
          Authorization: authorizationHeader,
        },
      });
    } catch (error) {
      throw new AppError(
        "Failed to reach API gateway while resolving the event organizer",
        502,
      );
    }

    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      throw new AppError(
        payload?.message || "Unable to resolve organizer from user service",
        response.status || 502,
      );
    }

    const organizerId = payload?._id || payload?.id;

    if (!organizerId) {
      throw new AppError("Organizer ID was not returned by user service", 502);
    }

    return organizerId;
  }

  // Create new event
  async createEvent(eventData, authorizationHeader) {
    try {
      const organizerId = await this.resolveOrganizer(authorizationHeader);
      const event = await Event.create({
        ...eventData,
        createdBy: organizerId,
      });
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
