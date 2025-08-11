import jsPDF from 'jspdf';

export const generateJobReport = async (reportData: any) => {
  // Import and use the modern PDF generator
  const { generateMinimalistJobReport } = await import('./modernPdfGenerator');
  return generateMinimalistJobReport(reportData);
};
