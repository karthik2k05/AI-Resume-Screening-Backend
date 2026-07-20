require("dotenv").config();
require("./config/db");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const hrRoutes = require("./routes/hrRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");

const app = express();

/* Middleware */

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ai-resume-screening-frontend.onrender.com/",
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
      "https://ai-resume-screening-frontend.onrender.com/",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Client Connected:", socket.id);

  socket.on("candidate_message", (data) => {
    console.log("Candidate:", data);

    io.emit("admin_receive_message", data);
  });

  socket.on("admin_message", (data) => {
    console.log("Admin:", data);

    io.emit("candidate_receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client Disconnected:", socket.id);
  });
});

/* Start Server */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});