const { SKILL_BANK } = require("./skillBank");

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "our", "with",
  "from", "this", "that", "these", "those", "will", "shall", "can", "could",
  "should", "would", "may", "might", "must", "have", "has", "had", "does",
  "did", "into", "about", "across", "per", "etc", "using", "use", "used",
  "including", "include", "includes", "required", "requirement",
  "requirements", "preferred", "responsibilities", "responsible", "role",
  "roles", "job", "jobs", "description", "years", "year", "experience",
  "experienced", "strong", "excellent", "good", "ability", "abilities",
  "skills", "skill", "knowledge", "working", "work", "works", "team",
  "teams", "environment", "candidate", "candidates", "plus", "such",
  "than", "then", "also", "within", "well", "who", "what", "when",
  "where", "while", "each", "other", "some", "any", "all", "more",
  "most", "part", "time", "full", "looking", "join", "help", "make",
  "ensure", "provide", "including", "based", "level", "high", "new",
]);

function tokenize(text) {
  return text.toLowerCase().match(/[a-z][a-z0-9+.#/-]{2,}/g) || [];
}

/**
 * Pulls two kinds of requirements out of free-text job description:
 * - requiredSkills: anything that also hits the shared SKILL_BANK
 *   (so it lines up 1:1 with what's already detected in resumes)
 * - extraKeywords: other frequently-mentioned, meaningful terms in the
 *   JD that aren't in the fixed bank — keeps filtering from being
 *   limited to a preset list.
 */
function extractJDKeywords(jobDescription) {
  const text = jobDescription || "";

  const requiredSkills = [];
  const seen = new Set();
  for (const skill of SKILL_BANK) {
    if (seen.has(skill.name)) continue;
    const hit = skill.patterns.some((p) =>
      new RegExp(p.source, p.flags.includes("i") ? p.flags : p.flags + "i").test(text)
    );
    if (hit) {
      seen.add(skill.name);
      requiredSkills.push(skill.name);
    }
  }

  const tokens = tokenize(text).filter((t) => !STOPWORDS.has(t) && t.length >= 4);
  const freq = new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);

  const skillNameLower = requiredSkills.map((s) => s.toLowerCase());
  const extraKeywords = [...freq.entries()]
    .filter(([word]) => !skillNameLower.some((s) => s.includes(word) || word.includes(s)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  return { requiredSkills, extraKeywords };
}

/**
 * Scores an already-analyzed resume against a specific job description.
 * `resume` needs { matchedSkills, text, atsScore } — all present on
 * every stored resume record.
 */
function scoreResumeAgainstJD(resume, jobDescription) {
  const { requiredSkills, extraKeywords } = extractJDKeywords(jobDescription);

  const matchedNames = new Set((resume.matchedSkills || []).map((m) => m.skill));
  const matchedRequired = requiredSkills.filter((s) => matchedNames.has(s));
  const missingRequired = requiredSkills.filter((s) => !matchedNames.has(s));

  const resumeTextLower = (resume.text || "").toLowerCase();
  const matchedExtra = extraKeywords.filter((kw) => resumeTextLower.includes(kw.toLowerCase()));
  const missingExtra = extraKeywords.filter((kw) => !resumeTextLower.includes(kw.toLowerCase()));

  const totalTerms = requiredSkills.length + extraKeywords.length;
  const totalMatched = matchedRequired.length + matchedExtra.length;
  const roleMatch = totalTerms > 0 ? Math.round((totalMatched / totalTerms) * 100) : null;
  const combined = roleMatch === null ? resume.atsScore : Math.round(roleMatch * 0.7 + resume.atsScore * 0.3);

  return {
    requiredSkills,
    extraKeywords,
    matchedRequired,
    missingRequired,
    matchedExtra,
    missingExtra,
    roleMatch,
    combined,
  };
}

module.exports = { extractJDKeywords, scoreResumeAgainstJD };
