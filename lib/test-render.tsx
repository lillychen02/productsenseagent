import React from 'react';
import { render } from '@react-email/render';

// 1. Define a simple React component
interface MySimpleComponentProps {
  name: string;
}

const MySimpleComponent: React.FC<MySimpleComponentProps> = ({ name }) => {
  const style: React.CSSProperties = {
    padding: '20px',
    backgroundColor: 'lightgray',
    border: '1px solid blue',
  };
  return (
    <div style={style}>
      <h1>Hello, {name}!</h1>
      <p>This is a simple test component rendered with @react-email/render.</p>
    </div>
  );
};

// 2. Export a function that performs the render test
export const performRenderTest = (): string => {
  try {
    // Cast the output of render to 'any' to suppress type errors temporarily
    const html = render(<MySimpleComponent name="Test User from lib/test-render.tsx" />) as any;    
    return html;
  } catch (error) {
    console.error("Error during performRenderTest in lib/test-render.tsx:", error);
    if (error instanceof Error) {
      return `Error rendering component: ${error.message}`;
    }
    return "Error rendering component: Unknown error";
  }
};

// Remove direct execution if not needed or if causing issues with module type
// renderTest(); 