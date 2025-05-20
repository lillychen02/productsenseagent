import React from 'react';
import { type InterviewData } from '../lib/types/email'; // Updated import path

// Define the new InterviewData interface
// ... (InterviewData interface was here)

interface InterviewResultsEmailProps {
  userName?: string;
  interviewData: InterviewData;
}

const InterviewResultsEmail: React.FC<InterviewResultsEmailProps> = ({ 
  userName,
  interviewData 
}) => {
  const containerStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
    color: '#333333',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    border: '1px solid #dddddd',
    backgroundColor: '#ffffff',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#4A5568', // Darker header, e.g., Tailwind gray-700
    color: '#ffffff',
    padding: '20px',
    textAlign: 'center',
    borderBottom: '1px solid #dddddd',
  };

  const contentStyle: React.CSSProperties = {
    padding: '20px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    marginTop: '20px',
    marginBottom: '10px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2D3748', // e.g., Tailwind gray-800
    borderBottom: '2px solid #E2E8F0', // e.g., Tailwind gray-300
    paddingBottom: '5px',
  };

  const skillItemStyle: React.CSSProperties = {
    marginBottom: '8px',
    padding: '10px',
    backgroundColor: '#F7FAFC', // e.g., Tailwind gray-100
    borderRadius: '4px',
    border: '1px solid #E2E8F0', // e.g., Tailwind gray-300
  };

  const summaryStyle: React.CSSProperties = {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#EDF2F7', // e.g., Tailwind gray-200
    borderRadius: '4px',
    borderLeft: '4px solid #4299E1', // e.g., Tailwind blue-500
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '15px',
    fontSize: '12px',
    color: '#718096', // e.g., Tailwind gray-600
    borderTop: '1px solid #dddddd',
    marginTop: '30px',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#4299E1', // e.g., Tailwind blue-500
    color: '#ffffff',
    padding: '10px 20px',
    textDecoration: 'none',
    borderRadius: '5px',
    fontWeight: 'bold',
    marginTop: '20px',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1>Your Loopie Interview Results</h1>
      </div>
      <div style={contentStyle}>
        <p>Hi {userName || 'Loopie User'},</p>
        <p>Thank you for completing your interview. Here&apos;s a summary of your performance:</p>

        <h2 style={sectionTitleStyle}>Overall Recommendation</h2>
        <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2B6CB0' /* e.g., Tailwind blue-600 */ }}>{interviewData.recommendation}</p>

        <div style={{ marginTop: '15px', marginBottom: '15px', fontSize: '14px', color: '#4A5568' }}>
          <p><strong>Date:</strong> {interviewData.date}</p>
          <p><strong>Interview Type:</strong> {interviewData.interviewType}</p>
        </div>

        <h2 style={sectionTitleStyle}>Skills Breakdown</h2>
        {interviewData.skills && interviewData.skills.length > 0 ? (
          <div>
            {interviewData.skills.map((skill, index) => (
              <div key={index} style={skillItemStyle}>
                <strong>{skill.emoji} {skill.name}:</strong> {skill.score !== null ? `${skill.score}/4` : 'N/A'}
              </div>
            ))}
          </div>
        ) : (
          <p>No detailed skill scores available.</p>
        )}

        <h2 style={sectionTitleStyle}>Summary Feedback</h2>
        <div style={summaryStyle}>
          <p>{interviewData.summary || 'No summary feedback provided.'}</p>
        </div>

        {interviewData.sessionLink && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <a href={interviewData.sessionLink} style={buttonStyle} target="_blank" rel="noopener noreferrer">
              View Full Results Online
            </a>
          </div>
        )}

        <p style={{ marginTop: '30px' }}>We hope this feedback is helpful. Good luck with your preparation!</p>
        <p>Best regards,</p>
        <p>The Loopie Team</p>
      </div>
      <div style={footerStyle}>
        <p>&copy; {new Date().getFullYear()} Loopie. All rights reserved.</p>
        <p>If you have any questions, please contact support.</p>
      </div>
    </div>
  );
};

export default InterviewResultsEmail; 