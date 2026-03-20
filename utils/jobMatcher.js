// utils/jobMatcher.js

class JobMatcher {
  constructor(resumeParser) {
    this.resumeParser = resumeParser;
    this.matchThreshold = 0.6;
  }

  async calculateMatchScore(job, resumeData) {
    const scores = {
      title: this.matchJobTitle(job.title, resumeData),
      skills: this.matchSkills(job.description, resumeData.skills),
      experience: this.matchExperience(job.description, resumeData.experience),
      education: this.matchEducation(job.description, resumeData.education),
      keywords: this.matchKeywords(job.description, resumeData)
    };

    const weights = {
      title: 0.2,
      skills: 0.4,
      experience: 0.25,
      education: 0.1,
      keywords: 0.05
    };

    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      totalScore += scores[key] * weight;
    }

    return {
      overall: totalScore,
      breakdown: scores
    };
  }

  matchJobTitle(jobTitle, resumeData) {
    const title_lower = jobTitle.toLowerCase();
    const relevantTerms = [
      ...resumeData.skills.map(s => s.toLowerCase()),
      ...(resumeData.experience.map(e => e.position?.toLowerCase() || ''))
    ];

    let matches = 0;
    relevantTerms.forEach(term => {
      if (title_lower.includes(term)) matches++;
    });

    return relevantTerms.length > 0 ? matches / relevantTerms.length : 0;
  }

  matchSkills(jobDescription, skills) {
    const jobDesc_lower = jobDescription.toLowerCase();
    let matchedSkills = 0;

    skills.forEach(skill => {
      if (jobDesc_lower.includes(skill.toLowerCase())) {
        matchedSkills++;
      }
    });

    return skills.length > 0 ? matchedSkills / skills.length : 0;
  }

  matchExperience(jobDescription, experience) {
    const jobDesc_lower = jobDescription.toLowerCase();
    let relevanceScore = 0;

    // Check for experience level indicators
    const expLevels = {
      'entry': ['entry level', 'junior', 'graduate', '0-2 years'],
      'mid': ['mid-level', 'intermediate', '2-5 years', '3-5 years'],
      'senior': ['senior', 'lead', '5+ years', '7+ years']
    };

    const yearsRequired = this.extractYearsRequired(jobDescription);
    const resumeYears = this.resumeParser.calculateYearsOfExperience(experience);

    // Calculate experience match
    if (yearsRequired > 0) {
      const ratio = Math.min(resumeYears / yearsRequired, 2) / 2;
      relevanceScore += ratio * 0.5;
    }

    // Check for relevant experience keywords
    const experienceKeywords = [
      'developed', 'built', 'designed', 'implemented', 'managed',
      'led', 'created', 'maintained', 'improved', 'optimized'
    ];

    experienceKeywords.forEach(keyword => {
      if (jobDesc_lower.includes(keyword)) {
        relevanceScore += 0.05;
      }
    });

    return Math.min(relevanceScore, 1);
  }

  matchEducation(jobDescription, education) {
    const jobDesc_lower = jobDescription.toLowerCase();
    let score = 0;

    const degreeRequirements = [
      { keyword: 'bachelor', weight: 0.5 },
      { keyword: 'master', weight: 0.7 },
      { keyword: 'phd', weight: 0.9 },
      { keyword: 'computer science', weight: 0.6 },
      { keyword: 'engineering', weight: 0.5 }
    ];

    degreeRequirements.forEach(req => {
      if (jobDesc_lower.includes(req.keyword)) {
        // Check if resume has matching education
        const edu_lower = (education.degree + ' ' + education.school).toLowerCase();
        if (edu_lower.includes(req.keyword)) {
          score += req.weight;
        }
      }
    });

    return Math.min(score, 1);
  }

  matchKeywords(jobDescription, resumeData) {
    const jobDesc_lower = jobDescription.toLowerCase();
    const resumeText = this.generateResumeText(resumeData).toLowerCase();

    // Extract important keywords from job description
    const keywords = this.extractImportantKeywords(jobDescription);
    
    let matches = 0;
    keywords.forEach(keyword => {
      if (resumeText.includes(keyword.toLowerCase())) {
        matches++;
      }
    });

    return keywords.length > 0 ? matches / keywords.length : 0;
  }

  extractImportantKeywords(text) {
    // Remove common words
    const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'are', 'have', 'will']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  extractYearsRequired(jobDescription) {
    const patterns = [
      /(\d+)[\+]?\s*years?/i,
      /(\d+)-(\d+)\s*years?/i,
      /at\s*least\s*(\d+)\s*years?/i,
      /minimum\s*(\d+)\s*years?/i
    ];

    for (const pattern of patterns) {
      const match = jobDescription.match(pattern);
      if (match) {
        if (match[2]) {
          return (parseInt(match[1]) + parseInt(match[2])) / 2;
        }
        return parseInt(match[1]);
      }
    }

    return 0;
  }

  generateResumeText(resumeData) {
    const parts = [
      resumeData.summary,
      ...resumeData.skills,
      ...resumeData.experience.map(e => `${e.position} ${e.company} ${e.description}`),
      resumeData.education.degree + ' ' + resumeData.education.school,
      ...resumeData.projects.map(p => `${p.name} ${p.description}`),
      ...resumeData.certifications
    ];

    return parts.join(' ');
  }

  async findBestMatches(jobs, resumeData, limit = 10) {
    const matches = [];

    for (const job of jobs) {
      const score = await this.calculateMatchScore(job, resumeData);
      if (score.overall >= this.matchThreshold) {
        matches.push({
          ...job,
          matchScore: score.overall,
          matchBreakdown: score.breakdown
        });
      }
    }

    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JobMatcher;
}