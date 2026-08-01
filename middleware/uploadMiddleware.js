const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {

  const allowed =
    /pdf|doc|docx/;

  const extension = allowed.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mime =
    allowed.test(file.mimetype);

  if (extension && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC and DOCX files are allowed."));
  }

};

module.exports = multer({
  storage,
  fileFilter,
});