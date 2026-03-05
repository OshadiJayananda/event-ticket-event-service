//src/middleware/upload.js
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const { AppError } = require("./errorHandler");

// Configure multer for single image upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new AppError("Not an image! Please upload only images.", 400), false);
    }
  },
}).single("images"); // Changed to single() for just one image with field name "images"

// Wrapper with timeout handling
const uploadEventImage = (req, res, next) => {
  // Set a longer timeout for the entire request
  req.setTimeout(120000); // 2 minutes

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("File too large. Maximum size is 5MB", 400));
      }
      return next(new AppError(`Upload failed: ${err.message}`, 500));
    } else if (err) {
      console.error("Upload error:", err);
      return next(new AppError(`Upload failed: ${err.message}`, 500));
    }
    next();
  });
};

module.exports = { uploadEventImage };
