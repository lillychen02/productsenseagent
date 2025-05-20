import React from 'react';
import { render } from '@react-email/render';
import InterviewResultsEmail from '../../../../emails/InterviewResults'; // Updated path
import { type InterviewData } from '../../../../lib/types/email'; // Updated import path

describe('InterviewResultsEmail Component', () => {
  const mockInterviewData: InterviewData = {
    recommendation: 'Hire',
    date: '2023-10-27',
    interviewType: 'Product Sense Interview',
    skills: [
      { name: 'Problem Identification', score: 3, emoji: '🎯' },
      { name: 'Solution Brainstorming', score: 4, emoji: '💡' },
      { name: 'Presentation', score: null, emoji: '🗣️' }, // Example with null score
    ],
    summary: 'Overall, a strong candidate with excellent brainstorming skills. Needs to work on structuring answers for presentation.',
    sessionLink: 'https://yourapp.com/results/session123',
  };

  it('should render correctly and match snapshot with full data', () => {
    const html = render(
      <InterviewResultsEmail 
        userName="Lilly User"
        interviewData={mockInterviewData} 
      />
    );
    expect(html).toMatchSnapshot();
  });

  it('should render correctly and match snapshot without optional data (userName and sessionLink)', () => {
    const minimalData: InterviewData = {
      ...mockInterviewData,
      sessionLink: undefined,
    };
    const html = render(
      <InterviewResultsEmail 
        interviewData={minimalData} 
      />
    );
    expect(html).toMatchSnapshot();
  });

  it('should render correctly when skills array is empty', () => {
    const noSkillsData: InterviewData = {
      ...mockInterviewData,
      skills: [],
    };
    const html = render(
      <InterviewResultsEmail 
        userName="Test User"
        interviewData={noSkillsData} 
      />
    );
    expect(html).toMatchSnapshot();
  });

  it('should render correctly when summary is empty', () => {
    const noSummaryData: InterviewData = {
      ...mockInterviewData,
      summary: '',
    };
    const html = render(
      <InterviewResultsEmail 
        userName="Test User"
        interviewData={noSummaryData} 
      />
    );
    expect(html).toMatchSnapshot();
  });

}); 