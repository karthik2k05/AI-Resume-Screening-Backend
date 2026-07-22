require("dotenv").config();
const axios = require("axios");
const pool = require("./config/db");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const hrRoutes = require("./routes/hrRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");
const searchRoutes = require("./routes/searchRoutes");

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

/* Routes */

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/search", searchRoutes);

app.get("/", (req, res) => {
  res.send("AI Resume Screening Backend Running...");
});

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

  // Candidate joins private room
 socket.on("join_candidate_room", (candidateId) => {
  socket.join(candidateId);

  console.log(`${candidateId} joined`);

  console.log("Rooms:", [...socket.rooms]);
});

  // Admin joins admin room
  socket.on("join_admin", () => {
    socket.join("admins");
    console.log("🛡️ Admin Joined");
  });

  // Candidate → Admin
  socket.on("candidate_message", async (data) => {
  console.log("Candidate:", data);

  try {
    await pool.query(
      `INSERT INTO support_messages(candidate_id, sender, message)
       VALUES($1, $2, $3)`,
      [data.candidateId, "candidate", data.message]
    );

    io.to("admins").emit("admin_receive_message", data);

  } catch (err) {
    console.error(err);
  }
});

  // Admin → Candidate
socket.on("admin_message", async (data) => {
  console.log("Admin:", data);

  try {
    await pool.query(
      `INSERT INTO support_messages(candidate_id, sender, message)
       VALUES($1, $2, $3)`,
      [data.candidateId, "admin", data.message]
    );

    io.to(data.room).emit("candidate_receive_message", data);

  } catch (err) {
    console.error(err);
  }
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