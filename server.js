require("dotenv").config();
const axios = require("axios");
const pool = require("./config/db");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const supportRoutes = require("./routes/supportRoutes");
const searchRoutes = require("./routes/searchRoutes");
const jobPostingRoutes = require("./routes/jobPostingRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

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

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* Routes */

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/admin/job-postings", jobPostingRoutes);
app.use("/api/settings", settingsRoutes);


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

  console.log("Candidate joined room:", candidateId);

  console.log("Socket Rooms:", [...socket.rooms]);

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
    console.log("📢 Sending admin notification");
    io.to("admins").emit("new_admin_notification", {
    candidateId: data.candidateId,
    message: data.message,
    username: data.username,
    });

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
    console.log("Sending reply to room:", data.room);
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

  console.log("candidate_chat_closed emitted");
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