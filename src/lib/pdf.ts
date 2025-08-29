/**
 * PDF generation utilities for ServicePro
 * Uses jsPDF for client-side PDF generation
 */

export interface JobCompletionData {
  job: {
    id: string;
    job_number?: string;
    title?: string;
    description?: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    work_summary?: string;
    customers?: {
      name: string;
      phone_mobile?: string;
      phone_work?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
    };
  };
  checklist: {
    id: string;
    template_name?: string;
    items: Array<{
      id: string;
      text: string;
      required?: boolean;
      photoRequired?: boolean;
      noteRequired?: boolean;
      completed?: boolean;
      completed_at?: string;
      note?: string;
      photos?: Array<any>;
    }>;
    completed_count: number;
    total_count: number;
  };
  technician: {
    name: string;
    id: string;
  };
  companyInfo?: {
    name: string;
    logo?: string;
  };
  signature?: {
    image: string; // Base64 data URL
    signed_at: string;
    signed_by: string;
  };
}

/**
 * Generate completion PDF for a job
 */
export async function buildCompletionPdf(data: JobCompletionData): Promise<Blob> {
  // Dynamically import jsPDF to avoid runtime errors
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Colors and fonts
  const colors = {
    primary: [33, 37, 41],
    secondary: [108, 117, 125],
    accent: [13, 110, 253],
    success: [25, 135, 84],
    danger: [220, 53, 69],
    light: [248, 249, 250],
    border: [222, 226, 230]
  };

  const fonts = {
    title: { size: 18, weight: 'bold' as const },
    heading: { size: 14, weight: 'bold' as const },
    subheading: { size: 12, weight: 'bold' as const },
    body: { size: 10, weight: 'normal' as const },
    small: { size: 8, weight: 'normal' as const }
  };

  const setFont = (fontConfig: { size: number; weight: string }) => {
    doc.setFontSize(fontConfig.size);
    doc.setFont('helvetica', fontConfig.weight);
  };

  const checkPageBreak = (requiredSpace: number): boolean => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      addPageHeader();
      return true;
    }
    return false;
  };

  const addNewPage = () => {
    addPageFooter();
    doc.addPage();
    yPosition = margin;
    addPageHeader();
  };

  const addPageHeader = () => {
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    setFont(fonts.small);
    doc.text(`Job Completion Report - ${data.job.job_number || data.job.id}`, margin, margin - 15);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 120, margin - 15);
  };

  const addPageFooter = () => {
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    setFont(fonts.small);
    doc.text(
      'ServicePro - Professional Field Service Management',
      margin,
      pageHeight - 30
    );
    doc.text(
      `Completed by: ${data.technician.name}`,
      pageWidth - margin - 150,
      pageHeight - 30
    );
  };

  const drawSection = (title: string) => {
    yPosition += 15;
    checkPageBreak(40);

    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    setFont(fonts.heading);
    doc.text(title, margin, yPosition);

    doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.setLineWidth(1);
    doc.line(margin, yPosition + 5, margin + 100, yPosition + 5);

    yPosition += 25;
  };

  const drawInfoTable = (data: Array<[string, string]>) => {
    const rowHeight = 18;

    data.forEach(([label, value]) => {
      checkPageBreak(rowHeight);

      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      setFont(fonts.body);
      doc.text(label + ':', margin, yPosition);

      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      const valueLines = doc.splitTextToSize(value, contentWidth - 120);
      doc.text(valueLines, margin + 120, yPosition);

      yPosition += Math.max(rowHeight, valueLines.length * 12);
    });
  };

  // Title
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  setFont(fonts.title);
  doc.text('JOB COMPLETION REPORT', margin, yPosition);
  yPosition += 25;

  // Job Information
  drawSection('Job Information');
  const jobInfo: Array<[string, string]> = [
    ['Job ID', data.job.job_number || data.job.id],
    ['Title', data.job.title || 'N/A'],
    ['Status', data.job.status.toUpperCase()],
    ['Started', data.job.started_at ? new Date(data.job.started_at).toLocaleString() : 'N/A'],
    ['Completed', data.job.completed_at ? new Date(data.job.completed_at).toLocaleString() : 'N/A']
  ];
  drawInfoTable(jobInfo);

  // Customer Information
  if (data.job.customers) {
    drawSection('Customer Information');
    const customerInfo: Array<[string, string]> = [
      ['Name', data.job.customers.name],
      ['Phone', data.job.customers.phone_mobile || data.job.customers.phone_work || 'N/A'],
      ['Email', data.job.customers.email || 'N/A'],
      ['Address', `${data.job.customers.address || ''} ${data.job.customers.city || ''} ${data.job.customers.state || ''}`.trim() || 'N/A']
    ];
    drawInfoTable(customerInfo);
  }

  // Checklist Summary
  drawSection('Checklist Completion');
  const checklistInfo: Array<[string, string]> = [
    ['Template', data.checklist.template_name || 'Custom Checklist'],
    ['Items Completed', `${data.checklist.completed_count} of ${data.checklist.total_count}`],
    ['Completion Rate', `${Math.round((data.checklist.completed_count / data.checklist.total_count) * 100)}%`]
  ];
  drawInfoTable(checklistInfo);

  // Checklist Items Details
  drawSection('Checklist Items');
  const itemHeight = 20;

  data.checklist.items.forEach((item, index) => {
    checkPageBreak(itemHeight * 2);

    // Item status icon and text
    const statusIcon = item.completed ? '✓' : '○';
    const statusColor = item.completed ? colors.success : colors.danger;

    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    setFont(fonts.body);
    doc.text(statusIcon, margin + 10, yPosition);

    // Item text
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    const itemLines = doc.splitTextToSize(item.text, contentWidth - 40);
    doc.text(itemLines, margin + 30, yPosition);
    yPosition += itemLines.length * 12 + 5;

    // Requirements indicators
    if (item.photoRequired || item.noteRequired) {
      let requirementText = '';
      if (item.photoRequired) {
        const photoCount = item.photos?.length || 0;
        requirementText += `Photos: ${photoCount} `;
      }
      if (item.noteRequired) {
        const hasNote = item.note?.trim() ? '✓' : '✗';
        requirementText += `Note: ${hasNote}`;
      }

      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      setFont(fonts.small);
      doc.text(`Required: ${requirementText}`, margin + 40, yPosition);
      yPosition += 15;
    }

    // Note if present
    if (item.note?.trim()) {
      checkPageBreak(20);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      setFont(fonts.subheading);
      doc.text('Note:', margin + 30, yPosition);
      yPosition += 15;

      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      setFont(fonts.small);
      const noteLines = doc.splitTextToSize(item.note.trim(), contentWidth - 60);
      doc.text(noteLines, margin + 30, yPosition);
      yPosition += noteLines.length * 10 + 10;
    }

    // Photos count if present
    if (item.photos && item.photos.length > 0) {
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      setFont(fonts.small);
      doc.text(`${item.photos.length} photo(s) attached`, margin + 30, yPosition);
      yPosition += 15;
    }

    yPosition += 10; // Space between items
  });

  // Work Summary
  if (data.job.work_summary?.trim()) {
    drawSection('Work Summary');
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    setFont(fonts.body);
    const summaryLines = doc.splitTextToSize(data.job.work_summary.trim(), contentWidth);
    doc.text(summaryLines, margin, yPosition);
    yPosition += summaryLines.length * 12 + 15;
  }

  // Signature Section
  if (data.signature) {
    drawSection('Customer Signature');
    yPosition += 20;

    // Signature information
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    setFont(fonts.small);
    doc.text(`Signed by: ${data.signature.signed_by}`, margin, yPosition);
    doc.text(`Date: ${new Date(data.signature.signed_at).toLocaleString()}`, margin, yPosition + 15);
    yPosition += 40;

    // Add signature image if present (simplified - in real implementation you'd need to handle the base64 image)
    try {
      if (data.signature.image && data.signature.image.startsWith('data:image')) {
        checkPageBreak(100);
        // Note: In a real implementation, you'd process the base64 image data
        // For now, we'll just show a placeholder
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        setFont(fonts.body);
        doc.text('[Customer Signature Image]', margin + 50, yPosition);
      }
    } catch (error) {
      console.warn('Could not add signature image to PDF:', error);
      doc.text('[Signature captured]', margin + 50, yPosition);
    }
  }

  // Add final footer
  addPageFooter();

  // Convert to blob and return
  return doc.output('blob');
}

/**
 * Preview function - returns canvas element for offline-first preview
 */
export async function generateCompletionPdfPreview(data: JobCompletionData): Promise<HTMLCanvasElement> {
  const pdfBlob = await buildCompletionPdf(data);

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // In a real implementation, you'd use PDF.js to render the PDF to canvas
    // For now, return a placeholder
    canvas.width = 595;
    canvas.height = 842;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333';
    ctx.font = '24px Arial';
    ctx.fillText('JOB COMPLETION PREVIEW', 50, 100);
    ctx.font = '16px Arial';
    ctx.fillText(`Job: ${data.job.job_number || data.job.id}`, 50, 150);
    ctx.fillText(`Customer: ${data.job.customers?.name || 'N/A'}`, 50, 200);
    ctx.fillText(`Checklist: ${data.checklist.completed_count}/${data.checklist.total_count} items`, 50, 250);

    resolve(canvas);
  });
}