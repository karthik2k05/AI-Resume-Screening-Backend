require("dotenv").config();
const axios = require("axios");
const pool = require("./config/db");

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");

const app = express();

/* Middleware */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ai-resume-screening-frontend.onrender.com",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* Routes - existing clone routes */
//const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");
const searchRoutes = require("./routes/searchRoutes");

/* Routes - your added routes */
const overviewRoutes = require("./routes/candidateOverview");
const applicationsRoutes = require("./routes/candidateApplications");
const jobMatchesRoutes = require("./routes/candidateJobMatches");
const adminCandidatesRoutes = require("./routes/adminCandidates");
const adminOverviewRoutes = require("./routes/adminOverview");
const adminJobPostingsRoutes = require("./routes/adminJobPostings");
const adminAnalyticsRoutes = require("./routes/adminAnalytics");
const resumeUploadRoutes = require("./routes/resumeUpload");
const adminSettingsRoutes = require("./routes/adminSettings");
const candidateSettingsRoutes = require("./routes/candidateSettings");
const hrOverviewRoutes = require("./routes/hrOverview");
const hrCandidatesRoutes = require("./routes/hrCandidates");
const hrScreeningRoutes = require("./routes/hrScreening");
const hrJobPostingsRoutes = require("./routes/hrJobPostings");
const hrAnalyticsRoutes = require("./routes/hrAnalytics");
const hrSettingsRoutes = require("./routes/hrSettings");
const notificationRoutes = require("./routes/notificationRoutes");

app.get("/", (req, res) => {
  res.send("AI Resume Screening Backend Running...");
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

/* Mount clone's original routes */
//app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/search", searchRoutes);

/* Mount your added routes */
app.use("/api/hr", hrOverviewRoutes);
app.use("/api/hr", hrCandidatesRoutes);
app.use("/api/hr", hrScreeningRoutes);
app.use("/api/hr", hrJobPostingsRoutes);
app.use("/api/hr", hrAnalyticsRoutes);
app.use("/api/hr", hrSettingsRoutes);

app.use("/api/candidate", overviewRoutes);
app.use("/api/candidate", applicationsRoutes);
app.use("/api/candidate", jobMatchesRoutes);
app.use("/api/candidate", resumeUploadRoutes);
app.use("/api/candidate", candidateSettingsRoutes);

app.use("/api/admin", adminCandidatesRoutes);
app.use("/api/admin", adminOverviewRoutes);
app.use("/api/admin", adminJobPostingsRoutes);
app.use("/api/admin", adminAnalyticsRoutes);
app.use("/api/admin", adminSettingsRoutes);

app.use("/api/notifications", notificationRoutes);

/* HTTP Server */
const server = http.createServer(app);

/* Socket.IO */
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://ai-resume-screening-frontend.onrender.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join_candidate_room", (candidateId) => {
    socket.join(candidateId);
    console.log("Candidate joined room:", candidateId);
    console.log("Socket Rooms:", [...socket.rooms]);
  });

  socket.on("join_admin", () => {
    socket.join("admins");
    console.log("🛡️ Admin Joined");
  });

  socket.on("candidate_message", async (data) => {
    console.log("Candidate:", data);
    try {
      await pool.query(
        `INSERT INTO support_messages(candidate_id, sender, message)
         VALUES($1, $2, $3)`,
        [data.candidateId, "candidate", data.message]
      );
      io.to("admins").emit("admin_receive_message", data);
      io.to("admins").emit("new_admin_notification", {
        candidateId: data.candidateId,
        message: data.message,
        username: data.username,
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("admin_message", async (data) => {
    console.log("Admin:", data);
    try {
      await pool.query(
        `INSERT INTO support_messages(candidate_id, sender, message)
         VALUES($1, $2, $3)`,
        [data.candidateId, "admin", data.message]
      );
      io.to(data.room).emit("candidate_receive_message", data);
      io.to(data.room).emit("new_candidate_notification", {
        candidateId: data.candidateId,
        message: data.message,
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("end_chat", (data) => {
    console.log("Ending chat for:", data.candidateId);
    io.to(data.candidateId.toString()).emit("candidate_chat_closed");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
  });
});

/* Start Server */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});