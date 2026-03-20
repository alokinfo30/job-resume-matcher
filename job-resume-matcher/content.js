// content.js - For job page interaction

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'extractJobDetails':
      sendResponse(extractJobDetails());
      break;
    case 'fillApplication':
      fillApplication(request.resumeData);
      sendResponse({ success: true });
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Extract job details from current page
function extractJobDetails() {
  const url = window.location.href;
  let jobData = {
    url: url,
    source: detectSource(url)
  };

  if (url.includes('linkedin.com')) {
    jobData = { ...jobData, ...extractLinkedInJob() };
  } else if (url.includes('indeed.com')) {
    jobData = { ...jobData, ...extractIndeedJob() };
  } else if (url.includes('glassdoor.com')) {
    jobData = { ...jobData, ...extractGlassdoorJob() };
  }

  return jobData;
}

// Detect job source
function detectSource(url) {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('indeed.com')) return 'indeed';
  if (url.includes('glassdoor.com')) return 'glassdoor';
  return 'other';
}

// Extract LinkedIn job details
function extractLinkedInJob() {
  return {
    title: document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() || '',
    company: document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim() || '',
    location: document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim() || '',
    description: document.querySelector('.jobs-description__content')?.textContent?.trim() || ''
  };
}

// Extract Indeed job details
function extractIndeedJob() {
  return {
    title: document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent?.trim() || '',
    company: document.querySelector('.jobsearch-InlineCompanyRating-companyName')?.textContent?.trim() || '',
    location: document.querySelector('.jobsearch-JobInfoHeader-subtitle')?.textContent?.trim() || '',
    description: document.querySelector('#jobDescriptionText')?.textContent?.trim() || ''
  };
}

// Extract Glassdoor job details
function extractGlassdoorJob() {
  return {
    title: document.querySelector('.job-title')?.textContent?.trim() || '',
    company: document.querySelector('.employer-name')?.textContent?.trim() || '',
    location: document.querySelector('.location')?.textContent?.trim() || '',
    description: document.querySelector('.jobDescriptionContent')?.textContent?.trim() || ''
  };
}

// Auto-fill job application
async function fillApplication(resumeData) {
  // Common form fields
  const fields = {
    'name': resumeData.personalInfo.name,
    'email': resumeData.personalInfo.email,
    'phone': resumeData.personalInfo.phone,
    'linkedin': resumeData.personalInfo.linkedin
  };

  // Try to fill each field
  for (const [fieldName, value] of Object.entries(fields)) {
    const inputs = document.querySelectorAll(`input[type="text"], input[type="email"], input[type="tel"]`);
    inputs.forEach(input => {
      const inputName = (input.name + ' ' + input.id + ' ' + input.placeholder).toLowerCase();
      if (inputName.includes(fieldName) && !input.value) {
        input.value = value || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
}

// Monitor for job applications
function monitorApplications() {
  const applyButtons = document.querySelectorAll('button:contains("Apply"), a:contains("Apply")');
  applyButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const jobData = extractJobDetails();
      chrome.runtime.sendMessage({
        action: 'applicationStarted',
        jobData: jobData
      });
    });
  });
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorApplications);
} else {
  monitorApplications();
}