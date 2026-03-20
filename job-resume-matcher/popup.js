// popup.js

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  await updateStatus();
  await loadJobs();
  
  document.getElementById('refresh').addEventListener('click', loadJobs);
  document.getElementById('searchNow').addEventListener('click', triggerSearch);
  document.getElementById('settings').addEventListener('click', openSettings);  
  document.getElementById('manualBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'manual.html' });
});
}

async function updateStatus() {
  const statusEl = document.getElementById('status');
  const { lastSearch } = await chrome.storage.local.get('lastSearch');
  
  if (lastSearch) {
    const lastSearchDate = new Date(lastSearch);
    const today = new Date();
    const isToday = lastSearchDate.toDateString() === today.toDateString();
    
    statusEl.textContent = isToday ? 'Active' : 'Last run: ' + lastSearchDate.toLocaleDateString();
    statusEl.className = 'status' + (isToday ? ' active' : '');
  } else {
    statusEl.textContent = 'Not run yet';
  }
}

async function loadJobs() {
  const jobsList = document.getElementById('jobs-list');
  const { lastSearchResults = [] } = await chrome.storage.local.get('lastSearchResults');
  
  if (lastSearchResults.length === 0) {
    jobsList.innerHTML = `
      <div class="empty-state">
        <p>No jobs found yet.</p>
        <p>Click "Search Now" to find matching jobs.</p>
      </div>
    `;
    return;
  }
  
  jobsList.innerHTML = lastSearchResults.map(job => `
    <div class="job-card">
      <div class="job-title">${escapeHtml(job.title)}</div>
      <div class="job-company">${escapeHtml(job.company)} • ${escapeHtml(job.location)}</div>
      <div class="job-match">Match: ${Math.round(job.matchScore * 100)}%</div>
      <div class="job-actions">
        <button class="btn-primary" onclick="applyToJob('${escapeHtml(job.url)}')">Apply</button>
        <button class="btn-secondary" onclick="downloadResume('${job.id}')">Download Resume</button>
        <button class="btn-secondary" onclick="viewDetails('${job.id}')">Details</button>
      </div>
      <div class="timestamp">${new Date(job.date).toLocaleString()}</div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function triggerSearch() {
  document.getElementById('status').textContent = 'Searching...';
  
  chrome.runtime.sendMessage({ action: 'triggerSearch' }, async (response) => {
    await updateStatus();
    await loadJobs();
  });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Global functions for button clicks
window.applyToJob = (url) => {
  chrome.tabs.create({ url });
};

window.downloadResume = async (jobId) => {
  const { recentJobs = [] } = await chrome.storage.local.get('recentJobs');
  const jobKey = recentJobs.find(key => key.includes(jobId));
  
  if (jobKey) {
    const job = await chrome.storage.local.get(jobKey);
    // Trigger download through background script
    chrome.runtime.sendMessage({ 
      action: 'downloadResume', 
      fileName: job[jobKey].resumeFileName 
    });
  }
};

window.viewDetails = async (jobId) => {
  // Store selected job and open details view
  await chrome.storage.local.set({ selectedJob: jobId });
  // Could open a details page or expand card
};