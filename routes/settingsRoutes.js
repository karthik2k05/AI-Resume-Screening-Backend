const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    getProfile,
    updateProfile,
    changePassword,
} = require("../controllers/settingsController");

router.get(
    "/profile",
    verifyToken,
    getProfile
);

router.put(
    "/profile",
    verifyToken,
    updateProfile
);

router.put(
    "/change-password",
    verifyToken,
    changePassword
);

module.exports = router;