// manual.js - Manual resume customization

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    // File upload areas
    setupFileUpload('resumeUploadArea', 'resumeFile', handleResumeFile);
    setupFileUpload('jobUploadArea', 'jobFile', handleJobFile);
    
    // Buttons
    document.getElementById('processBtn').addEventListener('click', processResume);
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('loadSampleBtn').addEventListener('click', loadSample);
    document.getElementById('downloadPDF').addEventListener('click', downloadPDF);
    document.getElementById('copyText').addEventListener('click', copyToClipboard);
    
    // Text areas
    document.getElementById('resumeText').addEventListener('input', updateResumeFileName);
    document.getElementById('jobDescription').addEventListener('input', updateJobFileName);
}

function setupFileUpload(areaId, inputId, fileHandler) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    
    area.addEventListener('click', () => input.click());
    
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    
    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });
    
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            fileHandler(files[0]);
        }
    });
    
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileHandler(e.target.files[0]);
        }
    });
}

async function handleResumeFile(file) {
    document.getElementById('resumeFileName').textContent = `📄 ${file.name}`;
    
    const text = await readFileAsText(file);
    document.getElementById('resumeText').value = text;
}

async function handleJobFile(file) {
    document.getElementById('jobFileName').textContent = `📄 ${file.name}`;
    
    const text = await readFileAsText(file);
    document.getElementById('jobDescription').value = text;
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function updateResumeFileName() {
    const text = document.getElementById('resumeText').value;
    if (text) {
        document.getElementById('resumeFileName').textContent = '📝 Text input provided';
    }
}

function updateJobFileName() {
    const text = document.getElementById('jobDescription').value;
    if (text) {
        document.getElementById('jobFileName').textContent = '📝 Text input provided';
    }
}

async function processResume() {
    // Get inputs
    const resumeText = document.getElementById('resumeText').value;
    const jobDesc = document.getElementById('jobDescription').value;
    const jobTitle = document.getElementById('jobTitle').value;
    const jobCompany = document.getElementById('jobCompany').value;
    
    // Validate
    if (!resumeText || !jobDesc) {
        alert('Please provide both resume and job description');
        return;
    }
    
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    
    try {
        // Parse resume
        const parser = new ResumeParser();
        const resumeData = await parser.parseResume(resumeText);
        
        // Create job object
        const job = {
            title: jobTitle || 'Position',
            company: jobCompany || 'Company',
            description: jobDesc,
            matchScore: 0
        };
        
        // Calculate match score
        const matcher = new JobMatcher(parser);
        const matchResult = await matcher.calculateMatchScore(job, resumeData);
        job.matchScore = matchResult.overall;
        
        // Customize resume
        const customizedResume = await customizeResumeForJob(resumeData, job);
        
        // Store for download
        window.currentCustomizedResume = {
            data: customizedResume,
            job: job
        };
        
        // Display results
        displayResults(customizedResume, matchResult);
        
    } catch (error) {
        console.error('Processing error:', error);
        alert('Error processing resume: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

async function customizeResumeForJob(resumeData, job) {
    const customized = JSON.parse(JSON.stringify(resumeData));
    
    // Extract keywords from job description
    const keywords = extractKeywords(job.description);
    
    // Enhance summary
    if (customized.summary) {
        const keywordStr = keywords.slice(0, 3).join(', ');
        customized.summary = `${customized.summary} Experienced with ${keywordStr}.`;
    }
    
    // Reorder skills
    if (customized.skills) {
        customized.skills = customized.skills.sort((a, b) => {
            const aRelevant = keywords.some(k => a.toLowerCase().includes(k));
            const bRelevant = keywords.some(k => b.toLowerCase().includes(k));
            if (aRelevant && !bRelevant) return -1;
            if (!aRelevant && bRelevant) return 1;
            return 0;
        });
    }
    
    // Enhance experience
    if (customized.experience) {
        customized.experience = customized.experience.map(exp => {
            const relevantKeywords = keywords.filter(k => 
                !exp.description.toLowerCase().includes(k)
            );
            
            if (relevantKeywords.length > 0) {
                exp.description += ` Experience with ${relevantKeywords.slice(0, 2).join(' and ')}.`;
            }
            
            return exp;
        });
    }
    
    // Add job-specific project if relevant
    if (keywords.includes('react') && !hasProjectWithKeyword(customized.projects, 'react')) {
        customized.projects = customized.projects || [];
        customized.projects.push({
            name: `React Development Project`,
            description: `Built responsive web applications using React, demonstrating skills relevant to ${job.title} position.`
        });
    }
    
    return customized;
}

function hasProjectWithKeyword(projects, keyword) {
    if (!projects) return false;
    return projects.some(p => 
        p.description.toLowerCase().includes(keyword) || 
        p.name.toLowerCase().includes(keyword)
    );
}

function extractKeywords(text) {
    const commonTechTerms = [
        'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node',
        'aws', 'azure', 'docker', 'kubernetes', 'sql', 'nosql', 'mongodb',
        'git', 'ci/cd', 'agile', 'scrum', 'rest', 'graphql', 'typescript',
        'html', 'css', 'sass', 'less', 'webpack', 'babel', 'redux', 'jest'
    ];
    
    const text_lower = text.toLowerCase();
    return commonTechTerms.filter(term => text_lower.includes(term));
}

function displayResults(resumeData, matchResult) {
    // Show results section
    document.getElementById('results').style.display = 'block';
    
    // Display match score
    const scoreEl = document.getElementById('matchScore');
    const percentage = Math.round(matchResult.overall * 100);
    scoreEl.textContent = `Match Score: ${percentage}%`;
    scoreEl.className = 'match-score ' + 
        (percentage >= 80 ? 'score-high' : 
         percentage >= 60 ? 'score-medium' : 'score-low');
    
    // Generate preview
    const preview = generatePreviewHTML(resumeData);
    document.getElementById('resumePreview').innerHTML = preview;
}

function generatePreviewHTML(resumeData) {
    const sections = [];
    
    // Header
    sections.push(`
        <div style="text-align: center; margin-bottom: 15px;">
            <h1 style="font-size: 18px; margin: 0;">${escapeHtml(resumeData.personalInfo.name || 'Your Name')}</h1>
            <div style="font-size: 11px;">
                ${escapeHtml(resumeData.personalInfo.email || 'email@example.com')} | 
                ${escapeHtml(resumeData.personalInfo.phone || 'phone')} | 
                ${escapeHtml(resumeData.personalInfo.linkedin || 'linkedin')}
            </div>
        </div>
    `);
    
    // Summary
    if (resumeData.summary) {
        sections.push(`
            <div style="margin-bottom: 12px;">
                <h2 style="font-size: 14px; margin: 0 0 5px;">Professional Summary</h2>
                <p style="margin: 0; font-size: 11px;">${escapeHtml(resumeData.summary)}</p>
            </div>
        `);
    }
    
    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
        sections.push(`
            <div style="margin-bottom: 12px;">
                <h2 style="font-size: 14px; margin: 0 0 5px;">Skills</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    ${resumeData.skills.map(s => `
                        <span style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
                            ${escapeHtml(s)}
                        </span>
                    `).join('')}
                </div>
            </div>
        `);
    }
    
    // Experience
    if (resumeData.experience && resumeData.experience.length > 0) {
        sections.push(`
            <div style="margin-bottom: 12px;">
                <h2 style="font-size: 14px; margin: 0 0 5px;">Experience</h2>
                ${resumeData.experience.map(exp => `
                    <div style="margin-bottom: 10px;">
                        <div style="font-weight: bold; font-size: 12px;">${escapeHtml(exp.position)}</div>
                        <div style="font-size: 11px; color: #2196F3;">${escapeHtml(exp.company)} | ${escapeHtml(exp.duration)}</div>
                        <p style="margin: 3px 0 0; font-size: 11px;">${escapeHtml(exp.description)}</p>
                    </div>
                `).join('')}
            </div>
        `);
    }
    
    // Education
    if (resumeData.education && (resumeData.education.degree || resumeData.education.school)) {
        sections.push(`
            <div style="margin-bottom: 12px;">
                <h2 style="font-size: 14px; margin: 0 0 5px;">Education</h2>
                <div style="font-size: 11px;">
                    <strong>${escapeHtml(resumeData.education.degree || 'Degree')}</strong> from 
                    ${escapeHtml(resumeData.education.school || 'School')}
                    ${resumeData.education.year ? ` (${escapeHtml(resumeData.education.year)})` : ''}
                </div>
            </div>
        `);
    }
    
    // Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
        sections.push(`
            <div style="margin-bottom: 12px;">
                <h2 style="font-size: 14px; margin: 0 0 5px;">Projects</h2>
                ${resumeData.projects.map(p => `
                    <div style="margin-bottom: 5px;">
                        <div style="font-weight: bold; font-size: 11px;">${escapeHtml(p.name)}</div>
                        <p style="margin: 2px 0 0; font-size: 11px;">${escapeHtml(p.description)}</p>
                    </div>
                `).join('')}
            </div>
        `);
    }
    
    return sections.join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function downloadPDF() {
    if (!window.currentCustomizedResume) {
        alert('No customized resume to download');
        return;
    }
    
    const { data: resumeData, job } = window.currentCustomizedResume;
    
    // Create filename
    const fileName = `${job.company}_${job.title}_Customized_Resume.pdf`
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
    
    // Generate PDF
    const pdfGen = new PDFGenerator();
    await pdfGen.generateAndDownload(resumeData, job, fileName);
}

function copyToClipboard() {
    const preview = document.getElementById('resumePreview').innerText;
    navigator.clipboard.writeText(preview).then(() => {
        alert('Resume text copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy to clipboard');
    });
}

function resetAll() {
    document.getElementById('resumeFile').value = '';
    document.getElementById('jobFile').value = '';
    document.getElementById('resumeText').value = '';
    document.getElementById('jobDescription').value = '';
    document.getElementById('jobTitle').value = '';
    document.getElementById('jobCompany').value = '';
    document.getElementById('resumeFileName').textContent = 'No file selected';
    document.getElementById('jobFileName').textContent = 'No file selected';
    document.getElementById('results').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    window.currentCustomizedResume = null;
}

function loadSample() {
    // Sample resume
    document.getElementById('resumeText').value = `John Doe
Email: john.doe@example.com | Phone: (555) 123-4567 | LinkedIn: linkedin.com/in/johndoe

Professional Summary
Experienced software developer with 5 years of experience in full-stack web development. Passionate about creating efficient, scalable applications and solving complex problems.

Skills
JavaScript, TypeScript, React, Node.js, Python, SQL, MongoDB, Git, Docker, AWS

Experience
Senior Software Developer | Tech Solutions Inc. | 2021-Present
- Developed and maintained multiple React-based web applications
- Implemented RESTful APIs using Node.js and Express
- Optimized database queries resulting in 40% performance improvement
- Led team of 3 junior developers in agile environment

Software Developer | Digital Innovations | 2019-2021
- Built responsive web interfaces using HTML, CSS, and JavaScript
- Collaborated with design team to implement UI/UX improvements
- Participated in code reviews and maintained code quality

Education
B.S. Computer Science | State University | 2019

Projects
E-commerce Platform | Built full-stack application using MERN stack
Task Management App | Created React application with Redux state management`;

    // Sample job description
    document.getElementById('jobDescription').value = `Senior React Developer Needed

We are looking for an experienced React Developer to join our growing team. The ideal candidate will have strong experience with modern JavaScript, React, and related technologies.

Requirements:
- 3+ years of experience with React and JavaScript
- Strong knowledge of HTML, CSS, and responsive design
- Experience with state management (Redux, Context API)
- Familiarity with RESTful APIs and GraphQL
- Understanding of modern build tools (Webpack, Babel)
- Experience with version control (Git)
- Good communication and teamwork skills

Nice to have:
- TypeScript experience
- Node.js background
- Testing experience (Jest, React Testing Library)
- AWS knowledge

We offer competitive salary and great benefits!`;

    document.getElementById('jobTitle').value = 'Senior React Developer';
    document.getElementById('jobCompany').value = 'Tech Corp';
    
    updateResumeFileName();
    updateJobFileName();
}

// Include necessary classes
class ResumeParser {
    async parseResume(text) {
        // Simple parsing logic
        const lines = text.split('\n').filter(l => l.trim());
        
        return {
            personalInfo: this.extractPersonalInfo(text),
            summary: this.extractSummary(text),
            skills: this.extractSkills(text),
            experience: this.extractExperience(text),
            education: this.extractEducation(text),
            projects: this.extractProjects(text)
        };
    }
    
    extractPersonalInfo(text) {
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        const phoneMatch = text.match(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
        const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
        
        return {
            name: text.split('\n')[0]?.trim() || '',
            email: emailMatch ? emailMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            linkedin: linkedinMatch ? linkedinMatch[0] : ''
        };
    }
    
    extractSummary(text) {
        const match = text.match(/Professional Summary[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
        return match ? match[1].trim() : '';
    }
    
    extractSkills(text) {
        const match = text.match(/Skills[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
        if (match) {
            return match[1].split(/[,\n]/).map(s => s.trim()).filter(s => s);
        }
        return [];
    }
    
    extractExperience(text) {
        const experience = [];
        const section = text.match(/Experience(.*?)(?=\n\n\s*[A-Z]|$)/is);
        
        if (section) {
            const jobs = section[1].split(/\n\n/);
            jobs.forEach(job => {
                const lines = job.split('\n').filter(l => l.trim());
                if (lines.length >= 2) {
                    experience.push({
                        position: lines[0]?.trim() || '',
                        company: lines[1]?.trim() || '',
                        duration: lines.find(l => l.includes('20')) || '',
                        description: lines.slice(2).join(' ').trim()
                    });
                }
            });
        }
        
        return experience;
    }
    
    extractEducation(text) {
        const match = text.match(/Education[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
        if (match) {
            const lines = match[1].split('\n').filter(l => l.trim());
            return {
                degree: lines[0] || '',
                school: lines[1] || '',
                year: lines.find(l => l.includes('20')) || ''
            };
        }
        return {};
    }
    
    extractProjects(text) {
        const projects = [];
        const match = text.match(/Projects[\s:]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
        
        if (match) {
            const items = match[1].split(/\n\n/);
            items.forEach(item => {
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
}

class JobMatcher {
    constructor(parser) {
        this.parser = parser;
    }
    
    async calculateMatchScore(job, resumeData) {
        const jobDesc = job.description.toLowerCase();
        const skills = resumeData.skills || [];
        
        // Simple match calculation
        let matchedSkills = 0;
        skills.forEach(skill => {
            if (jobDesc.includes(skill.toLowerCase())) {
                matchedSkills++;
            }
        });
        
        const skillScore = skills.length > 0 ? matchedSkills / skills.length : 0;
        
        return {
            overall: skillScore,
            breakdown: { skills: skillScore }
        };
    }
}

class PDFGenerator {
    async generateAndDownload(resumeData, job, fileName) {
        // Create HTML content
        const html = this.generateHTML(resumeData, job);
        
        // Create blob and download
        const blob = new Blob([html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('.pdf', '.html'); // Save as HTML for now
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('Resume generated! You can print to PDF from your browser (Ctrl+P → Save as PDF)');
    }
    
    generateHTML(resumeData, job) {
        const styles = `
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11px; 
                    line-height: 1.4;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 { font-size: 18px; margin: 0 0 5px; }
                h2 { font-size: 14px; margin: 15px 0 5px; border-bottom: 1px solid #333; }
                .contact { margin-bottom: 15px; font-size: 11px; }
                .job-header { 
                    background: #f0f0f0; 
                    padding: 8px; 
                    margin-bottom: 15px; 
                    border-left: 4px solid #2196F3;
                }
                .skills { display: flex; flex-wrap: wrap; gap: 5px; }
                .skill { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
                .experience { margin-bottom: 10px; }
                .company { font-weight: bold; color: #2196F3; }
            </style>
        `;
        
        const jobHeader = job ? `
            <div class="job-header">
                <strong>Customized for:</strong> ${job.title} at ${job.company}<br>
                <strong>Match Score:</strong> ${Math.round(job.matchScore * 100)}%
            </div>
        ` : '';
        
        return `
            <html>
            <head>${styles}</head>
            <body>
                ${jobHeader}
                <h1>${resumeData.personalInfo.name || 'Your Name'}</h1>
                <div class="contact">
                    ${resumeData.personalInfo.email || ''} | 
                    ${resumeData.personalInfo.phone || ''} | 
                    ${resumeData.personalInfo.linkedin || ''}
                </div>
                
                <h2>Professional Summary</h2>
                <p>${resumeData.summary || ''}</p>
                
                <h2>Skills</h2>
                <div class="skills">
                    ${(resumeData.skills || []).map(s => `<span class="skill">${s}</span>`).join('')}
                </div>
                
                <h2>Experience</h2>
                ${(resumeData.experience || []).map(exp => `
                    <div class="experience">
                        <div><span class="company">${exp.company}</span> - ${exp.position}</div>
                        <div>${exp.duration}</div>
                        <p>${exp.description}</p>
                    </div>
                `).join('')}
                
                <h2>Education</h2>
                <p>${resumeData.education?.degree || ''} from ${resumeData.education?.school || ''}</p>
            </body>
            </html>
        `;
    }
}