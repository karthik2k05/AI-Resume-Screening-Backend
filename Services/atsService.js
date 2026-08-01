const {
  extractSkills,
  getMissingSkills,
  analyzeFormatting,
  computeScore,
} = require("../services/resumeParserService");

const {
  scoreResumeAgainstJD,
} = require("../services/jobMatchService");

const calculateATSScore = (resumeText, jobDescription = "") => {

  const matchedSkills = extractSkills(resumeText);

  const missingSkills = getMissingSkills(matchedSkills);

  const formatting = analyzeFormatting(resumeText);

  const score = computeScore({
    matchedSkills,
    formatting,
  });

  const resume = {
    matchedSkills,
    text: resumeText,
    atsScore: score.overall,
  };

  const jobMatch = scoreResumeAgainstJD(
    resume,
    jobDescription
  );

  return {
    matchedSkills,
    missingSkills,
    formatting,
    score,
    jobMatch,
  };
};

module.exports = {
  calculateATSScore,
};