require("dotenv").config();
require("./config/db");

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const hrRoutes = require("./routes/hrRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/resume",resumeRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
    res.send("AI Resume Screening Backend Running..");});
    const PORT=process.env.port || 5000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });