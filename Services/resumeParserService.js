const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

export const SKILL_BANK = [
  { name: "JavaScript", patterns: [/\bjavascript\b/i, /\bjs\b/i] },
  { name: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/i] },
  { name: "React", patterns: [/\breact(\.js)?\b/i] },
  { name: "Next.js", patterns: [/\bnext\.?js\b/i] },
  { name: "Node.js", patterns: [/\bnode(\.js)?\b/i, /\bnodejs\b/i] },
  { name: "HTML", patterns: [/\bhtml5?\b/i] },
  { name: "CSS", patterns: [/\bcss3?\b/i, /\btailwind\b/i] },
  { name: "SQL", patterns: [/\bsql\b/i, /\bmysql\b/i, /\bpostgres(ql)?\b/i] },
  { name: "MongoDB", patterns: [/\bmongodb\b/i, /\bmongo\b/i] },
  { name: "Python", patterns: [/\bpython\b/i] },
  { name: "Java", patterns: [/\bjava\b(?!script)/i] },
  { name: "AWS", patterns: [/\baws\b/i, /amazon web services/i] },
  { name: "Docker", patterns: [/\bdocker\b/i] },
  { name: "Kubernetes", patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { name: "Git", patterns: [/\bgit\b/i, /\bgithub\b/i, /\bgitlab\b/i] },
  { name: "REST APIs", patterns: [/\brest(ful)?\s?api/i] },
  { name: "GraphQL", patterns: [/\bgraphql\b/i] },
  { name: "Redux", patterns: [/\bredux\b/i] },
  { name: "CI/CD", patterns: [/\bci\/cd\b/i, /continuous integration/i] },
  { name: "Testing", patterns: [/\bjest\b/i, /\bcypress\b/i, /unit testing/i, /\btesting\b/i] },
  { name: "Agile/Scrum", patterns: [/\bagile\b/i, /\bscrum\b/i] },
  { name: "Communication", patterns: [/\bcommunication\b/i] },
  { name: "Leadership", patterns: [/\bleadership\b/i, /\bteam lead\b/i, /led a team/i] },
  { name: "Problem Solving", patterns: [/problem[- ]solving/i] },
];

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
      const matches = text.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"));
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
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ") || "Unnamed Candidate";
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
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      words.every((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w))
    ) {
      return line;
    }
  }
  return fallback;
}

/**
 * Re-weights a resume's score toward a specific job's required skills —
 * used when HR screens a batch of resumes against one open posting
 * instead of just a generic ATS score.
 */
export function scoreForRole(matchedSkills, requiredSkillNames, atsScore) {
  if (!requiredSkillNames || requiredSkillNames.length === 0) {
    return { roleMatch: null, combined: atsScore, matchedRequired: [], missingRequired: [] };
  }
  const matchedNames = new Set(matchedSkills.map((m) => m.skill));
  const matchedRequired = requiredSkillNames.filter((s) => matchedNames.has(s));
  const missingRequired = requiredSkillNames.filter((s) => !matchedNames.has(s));
  const roleMatch = Math.round((matchedRequired.length / requiredSkillNames.length) * 100);
  const combined = Math.round(roleMatch * 0.65 + atsScore * 0.35);
  return { roleMatch, combined, matchedRequired, missingRequired };
}
async function parsePDF(filePath) {
  const buffer = fs.readFileSync(filePath);

  const data = await pdf(buffer);

  return data.text;
}

async function parseDOCX(filePath) {

  const result = await mammoth.extractRawText({
    path: filePath,
  });

  return result.value;
}
async function parseResume(filePath) {

  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    return await parsePDF(filePath);
  }

  if (
    extension === ".docx" ||
    extension === ".doc"
  ) {
    return await parseDOCX(filePath);
  }

  throw new Error("Unsupported file type.");
}

module.exports = {
    parseResume,
    extractSkills,
    getMissingSkills,
    analyzeFormatting,
    computeScore,
    fileNameToName,
    guessCandidateName,
    scoreForRole,
    normalize,
    SKILL_BANK
}