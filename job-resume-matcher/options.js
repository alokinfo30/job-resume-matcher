// options.js

document.addEventListener('DOMContentLoaded', loadSettings);

// Load saved settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get(null);
  
  document.getElementById('searchEnabled').checked = settings.searchEnabled || false;
  document.getElementById('searchTime').value = settings.searchTime || '08:00';
  
  // Load job sources
  const sourceCheckboxes = document.querySelectorAll('#jobSources input');
  sourceCheckboxes.forEach(cb => {
    cb.checked = settings.jobSources?.includes(cb.value) || false;
  });
  
  // Load skills
  displaySkills(settings.skills || []);
  
  document.getElementById('experience').value = settings.experience || 'mid';
  document.getElementById('locations').value = (settings.preferredLocations || []).join(', ');
  document.getElementById('apiKey').value = settings.openaiApiKey || '';
  
  // Display resume filename if exists
  if (settings.resumePath) {
    document.getElementById('fileName').textContent = settings.resumePath.split('/').pop();
  }
}

// Display skills as tags
function displaySkills(skills) {
  const skillsList = document.getElementById('skillsList');
  skillsList.innerHTML = skills.map(skill => `
    <span class="skill-tag">
      ${skill}
      <button onclick="removeSkill('${skill}')">×</button>
    </span>
  `).join('');
}

// Add skill
document.getElementById('addSkill').addEventListener('click', async () => {
  const input = document.getElementById('skillInput');
  const skill = input.value.trim();
  
  if (skill) {
    const settings = await chrome.storage.sync.get('skills');
    const skills = settings.skills || [];
    
    if (!skills.includes(skill)) {
      skills.push(skill);
      await chrome.storage.sync.set({ skills });
      displaySkills(skills);
      input.value = '';
    }
  }
});

// Remove skill (global function)
window.removeSkill = async (skill) => {
  const settings = await chrome.storage.sync.get('skills');
  const skills = (settings.skills || []).filter(s => s !== skill);
  await chrome.storage.sync.set({ skills });
  displaySkills(skills);
};

// Resume upload
document.getElementById('resumeUpload').addEventListener('click', () => {
  document.getElementById('resumeFile').click();
});

document.getElementById('resumeFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('fileName').textContent = file.name;
    
    // Convert to base64 and store
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      await chrome.storage.sync.set({ 
        resumePath: file.name,
        resumeData: base64 
      });
    };
    reader.readAsDataURL(file);
  }
});

// Save settings
document.getElementById('save').addEventListener('click', async () => {
  const jobSources = [];
  document.querySelectorAll('#jobSources input:checked').forEach(cb => {
    jobSources.push(cb.value);
  });
  
  const locations = document.getElementById('locations').value
    .split(',')
    .map(l => l.trim())
    .filter(l => l);
  
  const settings = {
    searchEnabled: document.getElementById('searchEnabled').checked,
    searchTime: document.getElementById('searchTime').value,
    jobSources: jobSources,
    experience: document.getElementById('experience').value,
    preferredLocations: locations,
    openaiApiKey: document.getElementById('apiKey').value
  };
  
  await chrome.storage.sync.set(settings);
  
  // Show success message
  const saveBtn = document.getElementById('save');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved!';
  saveBtn.style.background = '#4caf50';
  
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = '';
  }, 2000);
});

// Reset to defaults
document.getElementById('reset').addEventListener('click', async () => {
  await chrome.storage.sync.clear();
  await loadSettings();
});

// Enter key for skill input
document.getElementById('skillInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('addSkill').click();
  }
});