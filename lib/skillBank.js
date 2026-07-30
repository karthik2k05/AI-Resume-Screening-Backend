// Canonical skill bank an ATS-style scanner checks resumes against.
// Each entry has one or more regexes so common variants ("Node.js",
// "NodeJS", "node") all resolve to a single canonical skill name —
// this is what keeps the matched-skill list deduplicated.
const SKILL_BANK = [
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

module.exports = { SKILL_BANK };
