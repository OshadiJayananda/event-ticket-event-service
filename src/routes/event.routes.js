const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");

// Public routes
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);
router.get("/organizer/:organizerId", eventController.getEventsByOrganizer);

// Protected routes (in real app, add auth middleware)
router.post("/", eventController.createEvent);
router.put("/:id", eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

// Internal service route (for booking service)
router.put("/:id/seats", eventController.updateSeats);

module.exports = router;
