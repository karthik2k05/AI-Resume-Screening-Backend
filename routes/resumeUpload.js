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
  max: 10, // 10 uploads per hour per IP
  message: { message: 'Too many resume uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const { authenticateToken } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedTypes.includes(file.mimetype) ||
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const SKILL_KEYWORDS = [
  'React',
  'JavaScript',
  'CSS',
  'Node.js',
  'SQL',
  'Python',
  'Django',
  'PostgreSQL',
  'Docker',
  'AWS',
  'TypeScript',
  'MongoDB',
  'GraphQL',
  'HTML',
  'Java',
  'C++',
  'Git',
  'Express',
  'MySQL',
  'Redis'
];

function analyzeResumeText(text) {
  const lowerText = text.toLowerCase();
  const foundSkills = [];

  SKILL_KEYWORDS.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase())) {
      const occurrences =
        lowerText.split(skill.toLowerCase()).length - 1;

      const percentage = Math.min(
        60 + occurrences * 10,
        98
      );

      foundSkills.push({
        skill_name: skill,
        match_percentage: percentage
      });
    }
  });

  foundSkills.sort(
    (a, b) =>
      b.match_percentage - a.match_percentage
  );

  const topSkills = foundSkills.slice(0, 5);

  const overallScore =
    topSkills.length > 0
      ? Math.round(
          topSkills.reduce(
            (sum, skill) =>
              sum + skill.match_percentage,
            0
          ) / topSkills.length
        )
      : 0;

  let summary;

  if (overallScore >= 80) {
    summary =
      'Strong match for Frontend & Full Stack roles';
  } else if (overallScore >= 60) {
    summary =
      'Good match for several open roles';
  } else if (overallScore > 0) {
    summary =
      'Partial match — consider adding more relevant skills';
  } else {
    summary =
      'No matching skills detected — resume may need review';
  }

  return {
    overallScore,
    summary,
    topSkills
  };
}

async function extractTextFromFile(
  filePath,
  originalName
) {
  const ext =
    path.extname(originalName).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer =
      fs.readFileSync(filePath);

    const pdfData =
      await pdfParse(dataBuffer);

    return pdfData.text;
  }

  if (ext === '.docx') {
    const result =
      await mammoth.extractRawText({
        path: filePath
      });

    return result.value;
  }

  return '';
}

// POST /api/candidate/:id/resume
router.post('/:id/resume', authenticateToken, uploadLimiter, upload.single('resume'), async (req, res) => {
    const { id } = req.params;

    // Candidate can upload only for themselves
    if (String(req.user.id) !== String(id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded'
      });
    }

    try {

      // Check candidate
      const candidateCheck =
        await pool.query(
          `SELECT id
           FROM candidates
           WHERE id = $1`,
          [id]
        );

      if (candidateCheck.rows.length === 0) {
        return res.status(404).json({
          message: 'Candidate not found'
        });
      }


      // Extract resume text
      const filePath =
        path.join(
          __dirname,
          '..',
          'uploads',
          req.file.filename
        );

      const extractedText =
        await extractTextFromFile(
          filePath,
          req.file.originalname
        );


      // Analyze resume
      const {
        overallScore,
        summary,
        topSkills
      } = analyzeResumeText(
        extractedText
      );


      // Save resume
      const resumeResult =
        await pool.query(
          `INSERT INTO resumes
           (
             candidate_id,
             file_name,
             match_score,
             match_summary
           )
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            id,
            req.file.filename,
            overallScore,
            summary
          ]
        );

      const newResume =
        resumeResult.rows[0];
        await pool.query(
  `INSERT INTO notifications
   (
     user_id,
     user_role,
     title,
     message,
     type
   )
   VALUES ($1, $2, $3, $4, $5)`,
  [
    id,
    'candidate',
    'Resume Analysis Complete',
    `Your resume has been analyzed. ATS Score: ${overallScore}%`,
    'resume_analysis'
  ]
);
      // Save extracted skills
      for (const skill of topSkills) {

        await pool.query(
          `INSERT INTO skill_matches
           (
             resume_id,
             skill_name,
             match_percentage
           )
           VALUES ($1, $2, $3)`,
          [
            newResume.id,
            skill.skill_name,
            skill.match_percentage
          ]
        );

      }


      // Get all open jobs
      const jobsResult =
        await pool.query(
          `SELECT
             id,
             required_skills
           FROM job_postings
           WHERE status = 'open'`
        );


      // Candidate skill names
      const candidateSkills =
        topSkills.map(
          skill =>
            skill.skill_name.toLowerCase()
        );


      //  Compare candidate with jobs
      for (const job of jobsResult.rows) {

        const requiredSkills =
          job.required_skills || [];

        // Skip jobs without required skills
        if (requiredSkills.length === 0) {
          continue;
        }
        const matchedSkills =
          requiredSkills.filter(
            requiredSkill =>
              candidateSkills.includes(
                requiredSkill.toLowerCase()
              )
          );
        const matchScore =
          Math.round(
            (
              matchedSkills.length /
              requiredSkills.length
            ) * 100
          );
        const recommended =
          matchScore >= 60;

        //  Save or update job match
        await pool.query(
          `INSERT INTO job_matches
           (
             candidate_id,
             job_id,
             match_score,
             recommended
           )
           VALUES ($1, $2, $3, $4)
           ON CONFLICT
           (candidate_id, job_id)
           DO UPDATE SET
             match_score = EXCLUDED.match_score,
             recommended = EXCLUDED.recommended`,
          [
            id,
            job.id,
            matchScore,
            recommended
          ]
        );

      }

      // Send response
      res.status(201).json({

        message:
          'Resume uploaded and analyzed successfully',

        resume: newResume,

        skills: topSkills,

        filePath:
          `/uploads/${req.file.filename}`

      });
    } catch (err) {

      console.error(
        'Resume upload error:',
        err
      );

      res.status(500).json({
        message: 'Server error'
      });

    }
  }
);

module.exports = router;