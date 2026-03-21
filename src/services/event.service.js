const Event = require("../models/event.model");
const { AppError } = require("../middleware/errorHandler");
const { sendNotificationEvent } = require("./notification.service");

function buildEventMetadata(event, extra = {}) {
  return {
    eventId: event._id.toString(),
    eventTitle: event.name,
    venue: event.venue,
    eventDate: event.date,
    totalSeats: event.totalSeats,
    availableSeats: event.availableSeats,
    ticketPrice: event.ticketPrice,
    status: event.status,
    ...extra,
  };
}

async function dispatchNotification(payload, token) {
  if (!token) {
    return;
  }

  try {
    await sendNotificationEvent(payload, token);
  } catch (error) {
    console.error("Failed to dispatch event notification:", error.message);
  }
}

class EventService {
  // Create new event
  async createEvent(eventData, context = {}) {
    try {
      const event = await Event.create(eventData);

      await dispatchNotification(
        {
          eventType: "EVENT_CREATED",
          source: "EVENT_SERVICE",
          entityId: event._id.toString(),
          entityType: "EVENT",
          actorUserId: context.actorUserId || event.createdBy,
          recipients: {
            roles: ["ADMIN"],
          },
          metadata: buildEventMetadata(event),
        },
        context.token,
      );

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
        limit = 9,
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

      // First, update all events that need status change
      const now = new Date();

      // Update events that are past their date to "Completed"
      await Event.updateMany(
        {
          date: { $lt: now },
          status: { $in: ["Active", "Sold Out"] },
        },
        { status: "Completed" },
      );

      // Update events with no seats available to "Sold Out" (if not already completed)
      await Event.updateMany(
        {
          availableSeats: 0,
          date: { $gte: now },
          status: "Active",
        },
        { status: "Sold Out" },
      );

      // Update events with seats available to "Active" (if not completed)
      await Event.updateMany(
        {
          availableSeats: { $gt: 0 },
          date: { $gte: now },
          status: "Sold Out",
        },
        { status: "Active" },
      );

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
          pages: Math.ceil(total / parseInt(limit)),
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

      // Check and update status
      const now = new Date();
      let needsUpdate = false;

      if (new Date(event.date) < now && event.status !== "Completed") {
        event.status = "Completed";
        needsUpdate = true;
      } else if (
        event.availableSeats === 0 &&
        event.status !== "Sold Out" &&
        event.status !== "Completed"
      ) {
        event.status = "Sold Out";
        needsUpdate = true;
      }

      if (needsUpdate) {
        await event.save();
      }

      return event;
    } catch (error) {
      throw error;
    }
  }

  // Update event
  async updateEvent(eventId, updateData, context = {}) {
    try {
      // Prevent updating certain fields
      delete updateData.availableSeats;
      delete updateData._id;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError("Event not found", 404);
      }

      // Update fields
      Object.assign(event, updateData);

      // Update status automatically
      const now = new Date();
      if (new Date(event.date) < now) {
        event.status = "Completed";
      } else if (event.availableSeats === 0) {
        event.status = "Sold Out";
      } else {
        event.status = "Active";
      }

      await event.save();
      await dispatchNotification(
        {
          eventType: "EVENT_UPDATED",
          source: "EVENT_SERVICE",
          entityId: event._id.toString(),
          entityType: "EVENT",
          actorUserId: context.actorUserId || event.createdBy,
          recipients: {
            roles: ["ADMIN"],
          },
          metadata: buildEventMetadata(event),
        },
        context.token,
      );

      return event;
    } catch (error) {
      throw error;
    }
  }

  // Delete event (soft delete - just change status)
  async deleteEvent(eventId, context = {}) {
    try {
      const event = await Event.findByIdAndUpdate(
        eventId,
        { status: "Cancelled" },
        { new: true },
      );

      if (!event) {
        throw new AppError("Event not found", 404);
      }

      await dispatchNotification(
        {
          eventType: "EVENT_DELETED",
          source: "EVENT_SERVICE",
          entityId: event._id.toString(),
          entityType: "EVENT",
          actorUserId: context.actorUserId || event.createdBy,
          recipients: {
            roles: ["ADMIN"],
          },
          metadata: buildEventMetadata(event),
        },
        context.token,
      );

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

      // Check if event is still bookable
      if (event.status === "Completed") {
        throw new AppError("Cannot book seats for completed events", 400);
      }

      if (event.status === "Cancelled") {
        throw new AppError("Event has been cancelled", 400);
      }

      // Update seats using the model method
      await event.updateSeats(quantity, operation);

      // Update status based on new seat availability
      if (event.availableSeats === 0 && event.status !== "Completed") {
        event.status = "Sold Out";
        await event.save();
      }

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
