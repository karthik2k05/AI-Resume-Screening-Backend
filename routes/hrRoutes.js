const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getHROverview,
} = require("../controllers/hrController");

//status
const {
  updateApplicationStatus,
} = require("../controllers/candidateController");

router.get(
  "/overview",
  verifyToken,
  getHROverview
);

//status
router.patch(
  "/applications/:applicationId/status",
  verifyToken,
  updateApplicationStatus
);


module.exports = router;


