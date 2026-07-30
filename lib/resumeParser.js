const crypto = require("crypto");
const pdfParse = require("pdf-parse");

const mammoth = require("mammoth");
const { SKILL_BANK } = require("./skillBank");

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function extractTextFromPdf(buffer) {
  const result = await pdfParse(buffer);
  return result.text || "";
}

async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

async function extractResumeText(originalName, buffer) {
  const name = originalName.toLowerCase();
  const hash = hashBuffer(buffer);

  let text = "";
  if (name.endsWith(".pdf")) {
    text = await extractTextFromPdf(buffer);
  } else if (name.endsWith(".docx")) {
    text = await extractTextFromDocx(buffer);
  } else if (name.endsWith(".doc")) {
    const err = new Error(
      "Legacy .doc files aren't supported for parsing — please save your resume as .pdf or .docx and try again."
    );
    err.status = 400;
    throw err;
  } else {
    const err = new Error("Unsupported file type. Please upload a .pdf or .docx resume.");
    err.status = 400;
    throw err;
  }

  return { text: text.trim(), hash };
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Dedupes by canonical skill name: each skill can only appear once in
// the result, no matter how many raw variants/occurrences matched.
function extractSkills(text) {
  const found = [];
  const seen = new Set();

  for (const skill of SKILL_BANK) {
    if (seen.has(skill.name)) continue;

    let occurrences = 0;
    for (const pattern of skill.patterns) {
      const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
      const matches = text.match(new RegExp(pattern.source, flags));
      if (matches) occurrences += matches.length;
    }

    if (occurrences > 0) {
      seen.add(skill.name);
      const strength = occurrences >= 3 ? 95 : occurrences === 2 ? 82 : 68;
      found.push({ skill: skill.name, value: strength, occurrences });
    }
  }

  return found.sort((a, b) => b.value - a.value);
}

// Whatever wasn't matched, also deduplicated and capped for display.
function getMissingSkills(matchedSkills) {
  const matchedNames = new Set(matchedSkills.map((m) => m.skill));
  const missing = SKILL_BANK.filter((s) => !matchedNames.has(s.name)).map((s) => s.name);
  return [...new Set(missing)].slice(0, 8);
}

function analyzeFormatting(rawText) {
  const text = normalize(rawText);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(text);
  const sectionHeaders = ["experience", "education", "skills", "projects", "summary", "objective"];
  const sectionsFound = sectionHeaders.filter((h) => new RegExp(`\\b${h}\\b`, "i").test(text));
  const hasBullets = /[•▪‣·]|(^|\n)\s*-\s/.test(rawText);
  const looksScanned = wordCount < 40;

  const checks = [
    { label: "Contains a contact email", passed: hasEmail },
    { label: "Contains a phone number", passed: hasPhone },
    { label: "Has recognizable section headers", passed: sectionsFound.length >= 2 },
    { label: "Uses bullet points for readability", passed: hasBullets },
    { label: "Text is machine-readable, not a scanned image", passed: !looksScanned },
  ];

  const passedCount = checks.filter((c) => c.passed).length;

  return {
    wordCount,
    sectionsFound,
    checks,
    warnings: checks.filter((c) => !c.passed).map((c) => c.label),
    passedCount,
    totalChecks: checks.length,
    looksScanned,
  };
}

function computeScore({ matchedSkills, formatting }) {
  const keywordScore = Math.min(100, (matchedSkills.length / SKILL_BANK.length) * 100);
  const formattingScore = (formatting.passedCount / formatting.totalChecks) * 100;
  const overall = Math.round(keywordScore * 0.65 + formattingScore * 0.35);
  return {
    overall: Math.max(0, Math.min(100, overall)),
    keywordScore: Math.round(keywordScore),
    formattingScore: Math.round(formattingScore),
  };
}

function fileNameToName(fileName) {
  const base = fileName.replace(/\.(pdf|docx|doc)$/i, "");
  return (
    base
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ") || "Unnamed Candidate"
  );
}

// Looks at the first few non-empty lines for something shaped like a
// person's name (2-4 capitalized words, no digits/@) before falling
// back to a prettified version of the file name.
function guessCandidateName(rawText, fallback) {
  const headerWords = /^(resume|curriculum vitae|cv|contact|profile|summary|objective|address)$/i;
  const lines = rawText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of lines) {
    if (headerWords.test(line)) continue;
    if (/[@\d]/.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w))) {
      return line;
    }
  }
  return fallback;
}

/**
 * Full pipeline: extract real text from the uploaded file buffer, dedupe
 * and score matched skills, run ATS-style formatting checks, and return
 * a single result object. Throws (with .status = 400) on anything
 * unparseable (wrong format, scanned/image-only PDF, empty file).
 */
async function analyzeResume(originalName, buffer) {
  const { text, hash } = await extractResumeText(originalName, buffer);

  if (!text || text.replace(/\s+/g, "").length < 20) {
    const err = new Error(
      "Couldn't read any text from this file — it may be a scanned image rather than real text. Please upload a text-based PDF or DOCX."
    );
    err.status = 400;
    throw err;
  }

  const matchedSkills = extractSkills(text);
  const missingSkills = getMissingSkills(matchedSkills);
  const formatting = analyzeFormatting(text);
  const score = computeScore({ matchedSkills, formatting });
  const candidateName = guessCandidateName(text, fileNameToName(originalName));

  return {
    hash,
    fileName: originalName,
    candidateName,
    analyzedAt: new Date().toISOString(),
    wordCount: formatting.wordCount,
    // Kept (capped) so a job description pasted in later can be
    // matched against the resume's actual content, not just the
    // fixed skill bank.
    text: normalize(text).slice(0, 10000),
    matchedSkills,
    missingSkills,
    formatting,
    score,
  };
}

module.exports = {
  analyzeResume,
  extractSkills,
  getMissingSkills,
  analyzeFormatting,
  computeScore,
  normalize,
};
