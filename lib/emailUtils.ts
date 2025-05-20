import { type InterviewData, type SkillFeedback } from './types/email'; // Ensure SkillFeedback is also imported if needed, or defined alongside InterviewData

// NOTE: This HTML is manually constructed due to JSX/TSX render issues in server routes.
// When JSX support is resolved, switch to rendering the InterviewResultsEmail React component 
// (e.g., from emails/InterviewResults.tsx using react-dom/server or @react-email/render).
export const createSimpleEmailHtml = (userName: string | undefined, data: InterviewData): string => {
  let skillsDetailsHtml = '';
  if (data.skills && data.skills.length > 0) {
    skillsDetailsHtml = data.skills.map(skill => {
      let detailHtml = `<div style="margin-bottom: 25px;">`; 
      detailHtml += `<h4 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #2D3748; font-weight: bold;">${skill.emoji} ${skill.name}: ${skill.score !== null ? `${skill.score}/4` : 'N/A'}</h4>`;
      
      const actualFeedback = skill.feedback;

      if (actualFeedback && actualFeedback.strengths && actualFeedback.strengths.length > 0 && actualFeedback.strengths[0] !== "Not reached.") {
        detailHtml += `<p style="margin-bottom: 5px; font-size: 14px; color: #4A5568;"><strong>What went well:</strong></p>`;
        detailHtml += `<ul style="margin-top: 0; padding-left: 20px; font-size: 14px; color: #4A5568; margin-bottom: 10px;">`;
        actualFeedback.strengths.forEach(s => { detailHtml += `<li style="margin-bottom: 4px;">${s}</li>`; });
        detailHtml += `</ul>`;
      }

      if (actualFeedback && actualFeedback.weaknesses && actualFeedback.weaknesses.length > 0 && actualFeedback.weaknesses[0] !== "Not reached.") {
        detailHtml += `<p style="margin-top: 10px; margin-bottom: 5px; font-size: 14px; color: #4A5568;"><strong>Areas for improvement:</strong></p>`;
        detailHtml += `<ul style="margin-top: 0; padding-left: 20px; font-size: 14px; color: #4A5568; margin-bottom: 10px;">`;
        actualFeedback.weaknesses.forEach(w => { detailHtml += `<li style="margin-bottom: 4px;">${w}</li>`; });
        detailHtml += `</ul>`;
      }

      if (actualFeedback && actualFeedback.exemplar_response_suggestion) {
        detailHtml += `<p style="margin-top: 10px; margin-bottom: 5px; font-size: 14px; color: #4A5568;"><strong>Suggestion for next time:</strong></p>`;
        detailHtml += `<p style="font-size: 14px; color: #4A5568; font-style: italic;">${actualFeedback.exemplar_response_suggestion}</p>`;
      }
      detailHtml += `</div>`;
      return detailHtml;
    }).join('');
  } else {
    skillsDetailsHtml = '<p style="font-size: 14px; color: #4A5568;">No detailed skill feedback available.</p>';
  }

  // New: Generate HTML for the skills-at-a-glance table
  let skillsAtAGlanceTableHtml = '';
  if (data.skills && data.skills.length > 0) {
    skillsAtAGlanceTableHtml = `
      <table style="width: 100%; margin-top: 15px; margin-bottom: 20px; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd; color: #4A5568;">Skill</th>
            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd; color: #4A5568;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${data.skills.map(skill => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${skill.name}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${skill.emoji} ${skill.score !== null ? `${skill.score}/4` : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    skillsAtAGlanceTableHtml = '<p style="font-size: 14px; color: #4A5568; margin-top: 15px;">No skill scores available.</p>';
  }

  return `
    <html>
      <head>
        <style type="text/css">
          body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6; /* Increased from 1.5 for better readability based on common practice */
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f9f9fb; /* Soft off-white background */
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff; /* White card container */
            border-radius: 8px; /* Rounded corners for the card */
            /* Consider a subtle box-shadow, but test extensively as support varies e.g., box-shadow: 0 4px 10px rgba(0,0,0,0.05); */
          }
          .email-header {
            background-color: transparent; 
            padding: 25px 25px 15px 25px; /* Increased top padding */
            border-bottom: 1px solid #eeeeee; 
            text-align: left;
          }
          .email-header h1 {
            margin: 0;
            display: inline;
            font-size: 26px;
            font-weight: bold;
            color: #4f46e5; /* Indigo */
            vertical-align: baseline;
          }
          .email-header .tagline {
            margin-left: 12px;
            font-size: 13px;
            color: #6B7280; /* Gray-500 equivalent */
            vertical-align: baseline;
          }
          .email-content {
            padding: 25px; /* Increased padding */
          }
          .email-content p {
            margin-top: 0;
            margin-bottom: 16px; /* Default paragraph spacing */
            font-size: 15px; /* Slightly larger base body font */
            color: #333333;
          }
          .section-title {
            font-size: 20px; 
            color: #4f46e5; /* Indigo-600 equivalent */
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 8px;
            margin-top: 30px; 
            margin-bottom: 20px;
            font-weight: bold;
          }
          .button-link {
            display: inline-block;
            background-color: #4299E1;
            color: #ffffff !important; 
            padding: 12px 25px;
            text-decoration: none !important;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
          }
          .email-footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #718096;
            border-top: 1px solid #eeeeee;
            margin-top: 20px;
          }
          .skills-glance-table table {
            /* Styles for table if needed, though inline is used above for simplicity */
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Loopie</h1><span class="tagline">AI coach for product manager interviews</span>
          </div>
          <div class="email-content">
            <p>Hey 👋,</p>
            <p>You did great making time to practice. Here's how you did, and a few tips on what to focus on next…</p>
            
            <h2 class="section-title">💡 Summary Feedback</h2>
            <div style="margin-bottom: 30px;">
              <p>${data.summary || 'No overall summary feedback provided.'}</p>
            </div>

            <h2 class="section-title">📊 Your Skills at a Glance</h2>
            ${skillsAtAGlanceTableHtml}
            
            <h2 class="section-title">🧠 Detailed Skills Breakdown</h2>
            ${skillsDetailsHtml}
            
            ${data.sessionLink ? 
              `<div style="text-align: center; margin-top: 30px;">
                <a href="${data.sessionLink}" target="_blank" rel="noopener noreferrer" class="button-link">
                  View Full Results Online (Interactive)
                </a>
              </div>` : ''}
            
            <p style="margin-top: 30px;">We know this stuff isn't easy. But clarity, curiosity, and consistent practice go a long way — and you're already on your way. You got this 💪</p>
            <p>— The Loopie Team 💜</p>
          </div>
          <div class="email-footer">
            <p>&copy; ${new Date().getFullYear()} Loopie. All rights reserved.</p>
            <p>If you have any questions, please contact support.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}; 