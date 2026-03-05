const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");
const { uploadEventImage } = require("../middleware/upload"); // Changed import

// Public routes
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);
router.get("/organizer/:organizerId", eventController.getEventsByOrganizer);

// Protected routes (in real app, add auth middleware)
router.post("/", uploadEventImage, eventController.createEvent); // Changed to uploadEventImage
router.put("/:id", uploadEventImage, eventController.updateEvent); // Changed to uploadEventImage
router.delete("/:id", eventController.deleteEvent);

// Internal service route (for booking service)
router.put("/:id/seats", eventController.updateSeats);

module.exports = router;
