const express = require("express");
const router = express.Router();

const {
  register,
  login,
  firebaseLogin,
  googleLogin,
  forgotPassword,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/firebase-login", firebaseLogin);
router.post("/google-login", googleLogin);
router.post("/forgot-password", forgotPassword);

module.exports = router;