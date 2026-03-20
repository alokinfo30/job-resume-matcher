// background.js - Main service worker

importScripts('utils/resumeParser.js', 'utils/jobMatcher.js', 'utils/pdfGenerator.js');

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  initializeDefaultSettings();
  setupDailyAlarm();
});

// Setup daily alarm for job search
function setupDailyAlarm() {
  chrome.alarms.create('dailyJobSearch', {
    periodInMinutes: 1440 // 24 hours
  });
}

// Default settings
async function initializeDefaultSettings() {
  const defaultSettings = {
    searchEnabled: true,
    searchTime: '08:00',
    jobSources: ['linkedin', 'indeed', 'glassdoor'],
    resumePath: '',
    skills: [],
    experience: '',
    preferredLocations: [],
    openaiApiKey: ''
  };
  
  const data = await chrome.storage.sync.get(defaultSettings);
  if (!data.resumePath) {
    await chrome.storage.sync.set(defaultSettings);
  }
}

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyJobSearch') {
    performDailyJobSearch();
  }
});

// Main job search function
async function performDailyJobSearch() {
  try {
    const settings = await chrome.storage.sync.get(null);
    if (!settings.searchEnabled) return;
    
    const jobs = await searchJobs(settings);
    const matchedJobs = await matchJobsToResume(jobs, settings);
    
    for (const job of matchedJobs) {
      await processJobWithResume(job, settings);
    }
    
    showNotification(`Found ${matchedJobs.length} matching jobs!`);
    await saveSearchResults(matchedJobs);
  } catch (error) {
    console.error('Daily job search failed:', error);
    showNotification('Job search failed. Check settings.', true);
  }
}

// Search jobs from various platforms
async function searchJobs(settings) {
  const jobs = [];
  const searchPromises = [];
  
  if (settings.jobSources.includes('linkedin')) {
    searchPromises.push(searchLinkedInJobs(settings));
  }
  if (settings.jobSources.includes('indeed')) {
    searchPromises.push(searchIndeedJobs(settings));
  }
  if (settings.jobSources.includes('glassdoor')) {
    searchPromises.push(searchGlassdoorJobs(settings));
  }
  
  const results = await Promise.allSettled(searchPromises);
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      jobs.push(...result.value);
    }
  });
  
  return jobs;
}

// LinkedIn job search
async function searchLinkedInJobs(settings) {
  // Implementation using LinkedIn's public RSS feed or API
  const skills = settings.skills.join(' ');
  const location = settings.preferredLocations.join(' ');
  
  // Note: In production, you'd use LinkedIn's API or web scraping
  // This is a simplified example
  const response = await fetch(
    `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(skills)}&location=${encodeURIComponent(location)}`
  );
  
  // Parse HTML response
  const html = await response.text();
  return parseLinkedInJobs(html);
}

// Indeed job search
async function searchIndeedJobs(settings) {
  const skills = settings.skills.join(' ');
  const response = await fetch(
    `https://www.indeed.com/jobs?q=${encodeURIComponent(skills)}&l=${encodeURIComponent(settings.preferredLocations[0] || '')}`
  );
  
  const html = await response.text();
  return parseIndeedJobs(html);
}

// Glassdoor job search
async function searchGlassdoorJobs(settings) {
  const skills = settings.skills.join(' ');
  const response = await fetch(
    `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(skills)}`
  );
  
  const html = await response.text();
  return parseGlassdoorJobs(html);
}

// Parse LinkedIn jobs HTML
function parseLinkedInJobs(html) {
  const jobs = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const jobCards = doc.querySelectorAll('.job-search-card');
  jobCards.forEach(card => {
    jobs.push({
      title: card.querySelector('.job-title')?.textContent?.trim() || '',
      company: card.querySelector('.job-company')?.textContent?.trim() || '',
      location: card.querySelector('.job-location')?.textContent?.trim() || '',
      description: card.querySelector('.job-description')?.textContent?.trim() || '',
      url: card.querySelector('a')?.href || '',
      source: 'linkedin',
      date: new Date().toISOString()
    });
  });
  
  return jobs;
}

// Parse Indeed jobs HTML
function parseIndeedJobs(html) {
  const jobs = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const jobCards = doc.querySelectorAll('.jobsearch-SerpJobCard');
  jobCards.forEach(card => {
    jobs.push({
      title: card.querySelector('.jobtitle')?.textContent?.trim() || '',
      company: card.querySelector('.company')?.textContent?.trim() || '',
      location: card.querySelector('.location')?.textContent?.trim() || '',
      description: card.querySelector('.summary')?.textContent?.trim() || '',
      url: 'https://indeed.com' + (card.querySelector('.jobtitle')?.getAttribute('href') || ''),
      source: 'indeed',
      date: new Date().toISOString()
    });
  });
  
  return jobs;
}

// Parse Glassdoor jobs HTML
function parseGlassdoorJobs(html) {
  const jobs = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const jobCards = doc.querySelectorAll('.jobListing');
  jobCards.forEach(card => {
    jobs.push({
      title: card.querySelector('.jobTitle')?.textContent?.trim() || '',
      company: card.querySelector('.employerName')?.textContent?.trim() || '',
      location: card.querySelector('.location')?.textContent?.trim() || '',
      description: card.querySelector('.jobDescription')?.textContent?.trim() || '',
      url: card.querySelector('a')?.href || '',
      source: 'glassdoor',
      date: new Date().toISOString()
    });
  });
  
  return jobs;
}

// Match jobs to resume using AI
async function matchJobsToResume(jobs, settings) {
  const matches = [];
  
  for (const job of jobs) {
    const matchScore = calculateMatchScore(job, settings);
    if (matchScore > 0.6) { // 60% match threshold
      matches.push({
        ...job,
        matchScore,
        customizedResumePath: null
      });
    }
  }
  
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// Calculate match score between job and skills
function calculateMatchScore(job, settings) {
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  const skills = settings.skills.map(s => s.toLowerCase());
  
  let matchedSkills = 0;
  skills.forEach(skill => {
    if (jobText.includes(skill)) {
      matchedSkills++;
    }
  });
  
  return skills.length > 0 ? matchedSkills / skills.length : 0;
}

// Process each job with customized resume
async function processJobWithResume(job, settings) {
  try {
    const resumeData = await loadResumeData(settings.resumePath);
    const customizedResume = await customizeResumeForJob(resumeData, job, settings);
    const pdfBlob = await generatePDF(customizedResume);
    
    const fileName = `${job.company}_${job.title}_Resume.pdf`.replace(/[^a-z0-9]/gi, '_');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    
    await chrome.downloads.download({
      url: downloadUrl,
      filename: `job_resumes/${fileName}`,
      conflictAction: 'uniquify'
    });
    
    await saveJobWithResume(job, fileName);
    
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Failed to process job:', job.title, error);
  }
}

// Load resume data
async function loadResumeData(resumePath) {
  // In production, this would load from storage or file system
  const defaultResume = {
    personalInfo: {
      name: 'Your Name',
      email: 'your.email@example.com',
      phone: '123-456-7890',
      linkedin: 'linkedin.com/in/yourprofile'
    },
    summary: 'Experienced software developer...',
    skills: ['JavaScript', 'React', 'Node.js'],
    experience: [
      {
        company: 'Previous Company',
        position: 'Software Developer',
        duration: '2020-Present',
        description: 'Developed web applications...'
      }
    ],
    education: {
      degree: 'B.S. Computer Science',
      school: 'University Name',
      year: '2020'
    }
  };
  
  return defaultResume;
}

// Customize resume for specific job
async function customizeResumeForJob(resumeData, job, settings) {
  const customized = JSON.parse(JSON.stringify(resumeData));
  
  // Add job-specific keywords to summary
  const jobKeywords = extractKeywords(job.description);
  customized.summary = enhanceSummaryWithKeywords(customized.summary, jobKeywords);
  
  // Reorder skills based on job relevance
  customized.skills = reorderSkillsByRelevance(customized.skills, jobKeywords);
  
  // Highlight relevant experience
  customized.experience = customizeExperience(customized.experience, jobKeywords);
  
  // Add job-specific projects if available
  if (jobKeywords.includes('react')) {
    customized.projects = customized.projects || [];
    customized.projects.push({
      name: 'React Project',
      description: 'Built with React...'
    });
  }
  
  return customized;
}

// Extract keywords from job description
function extractKeywords(description) {
  const commonTechTerms = [
    'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node',
    'aws', 'azure', 'docker', 'kubernetes', 'sql', 'nosql', 'mongodb',
    'git', 'ci/cd', 'agile', 'scrum', 'rest', 'graphql'
  ];
  
  const description_lower = description.toLowerCase();
  return commonTechTerms.filter(term => description_lower.includes(term));
}

// Enhance summary with keywords
function enhanceSummaryWithKeywords(summary, keywords) {
  if (keywords.length > 0) {
    const keywordStr = keywords.slice(0, 3).join(', ');
    return `${summary} Experienced with ${keywordStr}.`;
  }
  return summary;
}

// Reorder skills by relevance
function reorderSkillsByRelevance(skills, keywords) {
  return skills.sort((a, b) => {
    const aRelevant = keywords.some(k => a.toLowerCase().includes(k));
    const bRelevant = keywords.some(k => b.toLowerCase().includes(k));
    if (aRelevant && !bRelevant) return -1;
    if (!aRelevant && bRelevant) return 1;
    return 0;
  });
}

// Customize experience descriptions
function customizeExperience(experience, keywords) {
  return experience.map(exp => {
    const exp_lower = exp.description.toLowerCase();
    const relevantKeywords = keywords.filter(k => !exp_lower.includes(k));
    
    if (relevantKeywords.length > 0) {
      exp.description += ` Experience with ${relevantKeywords.slice(0, 2).join(' and ')}.`;
    }
    
    return exp;
  });
}

// Generate PDF from resume data
async function generatePDF(resumeData) {
  return new Promise((resolve) => {
    // PDF generation logic
    // Using browser's built-in PDF generation capabilities
    const style = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; }
        h1 { font-size: 18px; margin-bottom: 5px; }
        h2 { font-size: 14px; margin: 10px 0 5px; }
        .contact { margin-bottom: 15px; }
        .section { margin-bottom: 15px; }
      </style>
    `;
    
    const html = `
      ${style}
      <body>
        <h1>${resumeData.personalInfo.name}</h1>
        <div class="contact">
          ${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.linkedin}
        </div>
        
        <div class="section">
          <h2>Professional Summary</h2>
          <p>${resumeData.summary}</p>
        </div>
        
        <div class="section">
          <h2>Skills</h2>
          <p>${resumeData.skills.join(' • ')}</p>
        </div>
        
        <div class="section">
          <h2>Experience</h2>
          ${resumeData.experience.map(exp => `
            <div style="margin-bottom: 10px;">
              <strong>${exp.position}</strong> at ${exp.company}<br>
              <em>${exp.duration}</em>
              <p>${exp.description}</p>
            </div>
          `).join('')}
        </div>
        
        <div class="section">
          <h2>Education</h2>
          <p><strong>${resumeData.education.degree}</strong><br>
          ${resumeData.education.school}, ${resumeData.education.year}</p>
        </div>
      </body>
    `;
    
    // Use browser's print to PDF functionality
    const blob = new Blob([html], { type: 'application/pdf' });
    resolve(blob);
  });
}

// Save job with associated resume
async function saveJobWithResume(job, resumeFileName) {
  const key = `job_${Date.now()}`;
  const jobData = {
    ...job,
    resumeFileName,
    timestamp: new Date().toISOString()
  };
  
  await chrome.storage.local.set({ [key]: jobData });
  
  // Update recent jobs list
  const { recentJobs = [] } = await chrome.storage.local.get('recentJobs');
  recentJobs.unshift(key);
  await chrome.storage.local.set({ recentJobs: recentJobs.slice(0, 50) });
}

// Save search results
async function saveSearchResults(jobs) {
  await chrome.storage.local.set({
    lastSearch: new Date().toISOString(),
    lastSearchResults: jobs.slice(0, 20)
  });
}

// Show notification
function showNotification(message, isError = false) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: isError ? 'Job Matcher Error' : 'Job Matcher',
    message: message
  });
}