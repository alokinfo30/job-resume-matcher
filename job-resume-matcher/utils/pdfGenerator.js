// utils/pdfGenerator.js

class PDFGenerator {
  constructor() {
    this.fontSize = 11;
    this.fontFamily = 'Arial, Helvetica, sans-serif';
    this.margin = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    };
  }

  async generateResumePDF(resumeData, jobData = null) {
    const html = this.generateHTML(resumeData, jobData);
    return this.convertToPDF(html);
  }

  generateHTML(resumeData, jobData) {
    const styles = this.generateStyles();
    
    // Add job-specific header if provided
    const jobHeader = jobData ? this.generateJobHeader(jobData) : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${resumeData.personalInfo.name} - Resume</title>
        ${styles}
      </head>
      <body>
        <div class="resume-container">
          ${jobHeader}
          
          <!-- Header -->
          <div class="header">
            <h1>${this.escapeHtml(resumeData.personalInfo.name)}</h1>
            <div class="contact-info">
              ${this.formatContactInfo(resumeData.personalInfo)}
            </div>
          </div>

          <!-- Summary -->
          ${this.generateSection('Professional Summary', resumeData.summary)}

          <!-- Skills -->
          ${this.generateSkillsSection(resumeData.skills)}

          <!-- Experience -->
          ${this.generateExperienceSection(resumeData.experience)}

          <!-- Education -->
          ${this.generateEducationSection(resumeData.education)}

          <!-- Projects -->
          ${this.generateProjectsSection(resumeData.projects)}

          <!-- Certifications -->
          ${this.generateCertificationsSection(resumeData.certifications)}
        </div>
      </body>
      </html>
    `;
  }

  generateStyles() {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${this.fontFamily};
          font-size: ${this.fontSize}px;
          line-height: 1.4;
          color: #333;
          margin: ${this.margin.top}px ${this.margin.right}px ${this.margin.bottom}px ${this.margin.left}px;
        }
        
        .resume-container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .job-header {
          background: #f8f9fa;
          padding: 8px 12px;
          margin-bottom: 15px;
          border-left: 4px solid #2196f3;
          font-size: ${this.fontSize - 1}px;
        }
        
        .job-header strong {
          color: #2196f3;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #333;
        }
        
        h1 {
          font-size: ${this.fontSize + 7}px;
          margin-bottom: 5px;
          color: #000;
        }
        
        .contact-info {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          font-size: ${this.fontSize - 1}px;
        }
        
        .contact-info span {
          color: #555;
        }
        
        .section {
          margin-bottom: 15px;
        }
        
        .section-title {
          font-size: ${this.fontSize + 2}px;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid #666;
          margin-bottom: 8px;
          padding-bottom: 3px;
          color: #000;
        }
        
        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px 8px;
        }
        
        .skill-item {
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: ${this.fontSize - 1}px;
        }
        
        .experience-item {
          margin-bottom: 12px;
        }
        
        .experience-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }
        
        .company {
          color: #2196f3;
        }
        
        .duration {
          font-weight: normal;
          color: #666;
        }
        
        .position {
          font-style: italic;
          margin: 2px 0;
        }
        
        .description {
          margin-top: 4px;
          padding-left: 15px;
        }
        
        .description ul {
          list-style-type: disc;
          padding-left: 20px;
        }
        
        .education-item {
          display: flex;
          justify-content: space-between;
        }
        
        .project-item {
          margin-bottom: 8px;
        }
        
        .project-name {
          font-weight: bold;
        }
        
        .certifications-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        
        .cert-item {
          background: #e3f2fd;
          padding: 2px 6px;
          border-radius: 3px;
        }
        
        hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 10px 0;
        }
        
        @media print {
          body {
            margin: 0.5in;
          }
        }
      </style>
    `;
  }

  generateJobHeader(jobData) {
    return `
      <div class="job-header">
        <strong>Customized for:</strong> ${this.escapeHtml(jobData.title)} at ${this.escapeHtml(jobData.company)}<br>
        <strong>Match Score:</strong> ${Math.round(jobData.matchScore * 100)}%<br>
        <strong>Date:</strong> ${new Date().toLocaleDateString()}
      </div>
    `;
  }

  formatContactInfo(info) {
    const parts = [];
    if (info.email) parts.push(`📧 ${info.email}`);
    if (info.phone) parts.push(`📱 ${info.phone}`);
    if (info.linkedin) parts.push(`🔗 ${info.linkedin}`);
    if (info.github) parts.push(`💻 ${info.github}`);
    if (info.portfolio) parts.push(`🌐 ${info.portfolio}`);
    
    return parts.map(p => `<span>${p}</span>`).join(' | ');
  }

  generateSection(title, content) {
    if (!content) return '';
    
    return `
      <div class="section">
        <div class="section-title">${title}</div>
        <p>${this.escapeHtml(content)}</p>
      </div>
    `;
  }

  generateSkillsSection(skills) {
    if (!skills || skills.length === 0) return '';
    
    return `
      <div class="section">
        <div class="section-title">Skills</div>
        <div class="skills-list">
          ${skills.map(skill => `
            <span class="skill-item">${this.escapeHtml(skill)}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateExperienceSection(experience) {
    if (!experience || experience.length === 0) return '';
    
    return `
      <div class="section">
        <div class="section-title">Professional Experience</div>
        ${experience.map(exp => `
          <div class="experience-item">
            <div class="experience-header">
              <span class="company">${this.escapeHtml(exp.company)}</span>
              <span class="duration">${this.escapeHtml(exp.duration)}</span>
            </div>
            <div class="position">${this.escapeHtml(exp.position)}</div>
            <div class="description">
              <ul>
                ${exp.description.split('.')
                  .filter(s => s.trim())
                  .map(s => `<li>${this.escapeHtml(s.trim())}.</li>`)
                  .join('')}
              </ul>
            </div>
          </div>
        `).join('<hr>')}
      </div>
    `;
  }

  generateEducationSection(education) {
    if (!education.degree && !education.school) return '';
    
    return `
      <div class="section">
        <div class="section-title">Education</div>
        <div class="education-item">
          <span><strong>${this.escapeHtml(education.degree)}</strong> from ${this.escapeHtml(education.school)}</span>
          <span class="duration">${this.escapeHtml(education.year)}</span>
        </div>
      </div>
    `;
  }

  generateProjectsSection(projects) {
    if (!projects || projects.length === 0) return '';
    
    return `
      <div class="section">
        <div class="section-title">Projects</div>
        ${projects.map(project => `
          <div class="project-item">
            <div class="project-name">${this.escapeHtml(project.name)}</div>
            <div class="description">${this.escapeHtml(project.description)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  generateCertificationsSection(certifications) {
    if (!certifications || certifications.length === 0) return '';
    
    return `
      <div class="section">
        <div class="section-title">Certifications</div>
        <div class="certifications-list">
          ${certifications.map(cert => `
            <span class="cert-item">${this.escapeHtml(cert)}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async convertToPDF(html) {
    return new Promise((resolve) => {
      // Create a blob with the HTML content
      const blob = new Blob([html], { type: 'text/html' });
      
      // Create an iframe to print
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        iframe.contentDocument.body.innerHTML = html;
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Use the browser's print dialog to save as PDF
        // This will trigger the system's print dialog where user can choose "Save as PDF"
        
        setTimeout(() => {
          document.body.removeChild(iframe);
          resolve(blob);
        }, 1000);
      };
      
      iframe.src = 'about:blank';
    });
  }

  async generateAndDownload(resumeData, jobData = null, filename = 'resume.pdf') {
    const html = this.generateHTML(resumeData, jobData);
    
    // Create a blob and trigger download
    const blob = new Blob([html], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFGenerator;
}