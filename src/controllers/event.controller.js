const eventService = require("../services/event.service");
const ApiResponse = require("../utils/response");
const { AppError } = require("../middleware/errorHandler");

class EventController {
  // Create new event
  async createEvent(req, res, next) {
    try {
      // In a real app, you'd get user ID from auth middleware
      // req.body.createdBy = req.user.id;
      req.body.createdBy = req.body.createdBy || "default-user-id";

      const event = await eventService.createEvent(req.body);

      return ApiResponse.success(res, event, "Event created successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  // Get all events
  async getAllEvents(req, res, next) {
    try {
      const { events, pagination } = await eventService.getAllEvents(req.query);

      return ApiResponse.paginate(
        res,
        events,
        pagination.page,
        pagination.limit,
        pagination.total,
        "Events retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // Get event by ID
  async getEventById(req, res, next) {
    try {
      const event = await eventService.getEventById(req.params.id);

      return ApiResponse.success(res, event, "Event retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update event
  async updateEvent(req, res, next) {
    try {
      const event = await eventService.updateEvent(req.params.id, req.body);

      return ApiResponse.success(res, event, "Event updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Delete event
  async deleteEvent(req, res, next) {
    try {
      const event = await eventService.deleteEvent(req.params.id);

      return ApiResponse.success(res, event, "Event cancelled successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update seats (endpoint for booking service)
  async updateSeats(req, res, next) {
    try {
      const { quantity, operation } = req.body;

      if (!quantity) {
        throw new AppError("Quantity is required", 400);
      }

      const event = await eventService.updateSeats(
        req.params.id,
        quantity,
        operation,
      );

      return ApiResponse.success(
        res,
        {
          availableSeats: event.availableSeats,
          isSoldOut: event.isSoldOut,
        },
        "Seats updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // Get events by organizer
  async getEventsByOrganizer(req, res, next) {
    try {
      const events = await eventService.getEventsByOrganizer(
        req.params.organizerId,
      );

      return ApiResponse.success(
        res,
        events,
        "Organizer events retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventController();
