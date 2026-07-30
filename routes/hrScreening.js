const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const pool = require('../config/db');
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk-upload requests per hour per IP
  message: { message: 'Too many upload requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const {
  authenticateToken,
  requireHR
} = require('../middleware/authMiddleware');
// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes');
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + '-' + file.originalname
    );
  }
});
// Only allow PDF and Word documents
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed'), false);
  }
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file, same as candidate resume upload
});
const SKILL_KEYWORDS = [
  'React', 'JavaScript', 'CSS', 'Node.js', 'SQL', 'Python', 'Django',
  'PostgreSQL', 'Docker', 'AWS', 'TypeScript', 'MongoDB', 'GraphQL',
  'HTML', 'Java', 'C++', 'Git', 'Express', 'MySQL', 'Redis',
];
function analyzeResumeText(text) {
  const lowerText = text.toLowerCase();
  const foundSkills = [];

  SKILL_KEYWORDS.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase())) {
      const occurrences = lowerText.split(skill.toLowerCase()).length - 1;
      const percentage = Math.min(60 + occurrences * 10, 98);
      foundSkills.push({ skill_name: skill, match_percentage: percentage });
    }
  });
  foundSkills.sort((a, b) => b.match_percentage - a.match_percentage);
  const topSkills = foundSkills.slice(0, 5);
  const overallScore = topSkills.length > 0
    ? Math.round(topSkills.reduce((sum, s) => sum + s.match_percentage, 0) / topSkills.length)
    : 0;

  return { overallScore, topSkills };
}
// Extract text from either PDF or DOCX based on file extension
async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // Old .doc format is not supported by mammoth — skip extraction
  return '';
}
// POST /api/hr/screening/upload
// Upload resumes for screening, extract text, and calculate real ATS scores
router.post(
  '/screening/upload',
  authenticateToken,
  requireHR,
  uploadLimiter,
  upload.array('resumes', 20),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: 'Please upload at least one resume'
        });
      }
      const results = [];
      for (const file of req.files) {
        const filePath = path.join('uploads/resumes', file.filename);
        let overallScore = 0;
        let topSkills = [];
        try {
          const extractedText = await extractTextFromFile(filePath, file.originalname);
          const analysis = analyzeResumeText(extractedText);
          overallScore = analysis.overallScore;
          topSkills = analysis.topSkills;
        } catch (extractErr) {
          console.error('Text extraction failed for', file.originalname, extractErr);
          // Continue with score 0 rather than failing the whole batch
        }
        const result = await pool.query(
          `INSERT INTO screened_resumes
           (
             candidate_name,
             resume_file,
             match_score,
             status
           )
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            path.parse(file.originalname).name,
            file.filename,
            overallScore,
            'Screening'
          ]
        );
        results.push({
          ...result.rows[0],
          top_skills: topSkills
        });
      }
      res.status(201).json({
        message: 'Resumes uploaded and analyzed successfully',
        resumes: results
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);
// GET /api/hr/screening
// Get screened resumes with sorting and filtering
router.get(
  '/screening',
  authenticateToken,
  requireHR,
  async (req, res) => {
    const allowedSortColumns = {
      match_score: 'match_score',
      candidate_name: 'candidate_name',
      status: 'status'
    };
    const sortKey =
      allowedSortColumns[req.query.sort] ||
      allowedSortColumns.match_score;
    const sortOrder =
      req.query.order &&
      req.query.order.toLowerCase() === 'asc'
        ? 'ASC'
        : 'DESC';
    const limit =
      ['5', '10', '20'].includes(req.query.limit)
        ? `LIMIT ${req.query.limit}`
        : '';
    try {
      const result = await pool.query(
        `SELECT
           id,
           candidate_name,
           resume_file,
           match_score,
           status
         FROM screened_resumes
         ORDER BY ${sortKey} ${sortOrder}
         ${limit}`
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);
// PATCH /api/hr/screening/:id/advance
// Advances a screened candidate to the hiring pipeline
router.patch(
  '/screening/:id/advance',
  authenticateToken,
  requireHR,
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `UPDATE screened_resumes
         SET status = 'Screening'
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Screened resume not found'
        });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);
// DELETE /api/hr/screening/:id
// Clear a single screened resume
router.delete(
  '/screening/:id',
  authenticateToken,
  requireHR,
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `DELETE FROM screened_resumes WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Screened resume not found'
        });
      }
      res.json({
        message: 'Screened resume deleted',
        deleted: result.rows[0]
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);
// DELETE /api/hr/screening
// Clear all screened resumes
router.delete(
  '/screening',
  authenticateToken,
  requireHR,
  async (req, res) => {
    try {
      await pool.query(
        `DELETE FROM screened_resumes`
      );

      res.json({
        message: 'All screened resumes cleared'
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);

module.exports = router;