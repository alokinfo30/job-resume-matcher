// utils/resumeParser.js

class ResumeParser {
  constructor() {
    this.skillsDatabase = [
      'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift',
      'react', 'angular', 'vue', 'node', 'express', 'django', 'flask',
      'spring', 'hibernate', 'asp.net', 'laravel', 'rails',
      'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind',
      'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
      'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
      'agile', 'scrum', 'kanban', 'tdd', 'ci/cd', 'devops'
    ];
  }

  async parseResume(resumeText) {
    return {
      personalInfo: this.extractPersonalInfo(resumeText),
      summary: this.extractSummary(resumeText),
      skills: this.extractSkills(resumeText),
      experience: this.extractExperience(resumeText),
      education: this.extractEducation(resumeText),
      projects: this.extractProjects(resumeText),
      certifications: this.extractCertifications(resumeText)
    };
  }

  extractPersonalInfo(text) {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const phoneRegex = /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const linkedinRegex = /linkedin\.com\/in\/[\w-]+/gi;

    return {
      email: text.match(emailRegex)?.[0] || '',
      phone: text.match(phoneRegex)?.[0] || '',
      linkedin: text.match(linkedinRegex)?.[0] || ''
    };
  }

  extractSummary(text) {
    const summaryPatterns = [
      /summary[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is,
      /profile[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is,
      /about[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is
    ];

    for (const pattern of summaryPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return '';
  }

  extractSkills(text) {
    const skills = [];
    const text_lower = text.toLowerCase();

    this.skillsDatabase.forEach(skill => {
      if (text_lower.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    });

    // Look for skills section
    const skillsSection = text.match(/skills[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (skillsSection) {
      const additionalSkills = skillsSection[1]
        .split(/[,•\n]/)
        .map(s => s.trim())
        .filter(s => s && !skills.includes(s.toLowerCase()));
      
      skills.push(...additionalSkills);
    }

    return [...new Set(skills)];
  }

  extractExperience(text) {
    const experience = [];
    const experienceSection = text.match(/(?:experience|work history|employment)[\s:]+(.*?)(?=\n\s*\n\s*[A-Z]|$)/is);

    if (experienceSection) {
      const jobs = experienceSection[1].split(/\n\s*\n/);
      
      jobs.forEach(job => {
        const lines = job.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
          const position = lines[0].trim();
          const company = lines[1].trim();
          const duration = lines.find(l => l.includes('20')) || '';
          const description = lines.slice(2).join(' ').trim();

          experience.push({
            position,
            company,
            duration,
            description
          });
        }
      });
    }

    return experience;
  }

  extractEducation(text) {
    const educationPattern = /(?:education|academic|qualifications)[\s:]+(.*?)(?=\n\s*\n\s*[A-Z]|$)/is;
    const match = text.match(educationPattern);

    if (match) {
      const lines = match[1].split('\n').filter(l => l.trim());
      return {
        degree: lines[0] || '',
        school: lines[1] || '',
        year: lines.find(l => l.includes('20')) || ''
      };
    }

    return { degree: '', school: '', year: '' };
  }

  extractProjects(text) {
    const projects = [];
    const projectsSection = text.match(/(?:projects|portfolio)[\s:]+(.*?)(?=\n\s*\n\s*[A-Z]|$)/is);

    if (projectsSection) {
      const projectItems = projectsSection[1].split(/\n\s*\n/);
      
      projectItems.forEach(item => {
        const lines = item.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          projects.push({
            name: lines[0],
            description: lines.slice(1).join(' ').trim()
          });
        }
      });
    }

    return projects;
  }

  extractCertifications(text) {
    const certs = [];
    const certsSection = text.match(/(?:certifications|certificates)[\s:]+(.*?)(?=\n\s*\n\s*[A-Z]|$)/is);

    if (certsSection) {
      const certItems = certsSection[1].split(/[,•\n]/);
      certItems.forEach(cert => {
        const trimmed = cert.trim();
        if (trimmed) certs.push(trimmed);
      });
    }

    return certs;
  }

  calculateYearsOfExperience(experience) {
    let totalYears = 0;
    
    experience.forEach(job => {
      const duration = job.duration;
      const years = duration.match(/\d+/g);
      if (years && years.length >= 2) {
        totalYears += Math.abs(parseInt(years[1]) - parseInt(years[0]));
      }
    });

    return totalYears;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResumeParser;
}