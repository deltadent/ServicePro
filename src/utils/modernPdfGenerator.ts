import jsPDF from 'jspdf';

export interface ReportData {
  job: {
    job_number: string;
    status: 'completed' | 'in_progress' | 'scheduled' | 'cancelled';
    service_type: string;
    priority: string;
    scheduled_date?: string;
    started_at?: string;
    completed_at?: string;
    actual_duration?: number;
    description?: string;
    labor_cost?: number;
    parts_cost?: number;
    total_cost?: number;
    customer_feedback?: string;
    customer_rating?: number;
    work_summary?: string;
    customers?: {
      name: string;
      phone: string;
      email: string;
      address: string;
      city: string;
      state: string;
    };
  };
  photos?: Array<{
    description?: string;
    photo_type?: string;
    created_at: string;
    photo_url?: string;
  }>;
  partsUsed?: Array<{
    parts_inventory?: {
      part_number: string;
      name: string;
    };
    quantity_used: number;
    unit_price: number;
    total_cost?: number;
  }>;
  workNotes?: string;
}

// Define a type for font weight
export type FontWeight = 'normal' | 'bold' | 'italic';
export type FontConfig = { size: number; weight: FontWeight };

export const generateMinimalistJobReport = async (reportData: ReportData) => {
  const { job, photos, partsUsed, workNotes } = reportData;

  console.log('PDF Generator received data:', { job, photos, workNotes });

  // A4 dimensions in points (72 DPI)
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Minimalist color palette
  const colors = {
    primary: [33, 37, 41] as const,
    secondary: [108, 117, 125] as const,
    accent: [13, 110, 253] as const,
    success: [25, 135, 84] as const,
    warning: [255, 193, 7] as const,
    danger: [220, 53, 69] as const,
    light: [248, 249, 250] as const,
    border: [222, 226, 230] as const
  };

  const fonts = {
    title: { size: 24, weight: 'bold' as const },
    heading: { size: 14, weight: 'bold' as const },
    subheading: { size: 12, weight: 'bold' as const },
    body: { size: 10, weight: 'normal' as const },
    small: { size: 8, weight: 'normal' as const },
    caption: { size: 7, weight: 'normal' as const }
  };

  const setFont = (fontConfig: FontConfig) => {
    doc.setFontSize(fontConfig.size);
    doc.setFont('helvetica', fontConfig.weight);
  };

  const checkPageBreak = (requiredSpace: number): boolean => {
    if (yPosition + requiredSpace > pageHeight - margin - 30) {
      addNewPage();
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
    if (doc.getNumberOfPages() > 1) {
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      setFont(fonts.small);
      doc.text(`Service Report - Job #${job.job_number}`, margin, margin - 20);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 50, margin - 20);

      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, margin - 10, pageWidth - margin, margin - 10);
      yPosition = margin + 10;
    }
  };

  const addPageFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    setFont(fonts.caption);
    doc.text(
      'Professional Field Service Management System',
      margin,
      pageHeight - 30
    );
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      pageWidth - margin - 120,
      pageHeight - 30
    );

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);
  };

  const drawSection = (title: string, addSpace: boolean = true) => {
    if (addSpace && yPosition > margin + 20) {
      yPosition += 25;
    }

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
    const labelWidth = 120;

    data.forEach(([label, value]) => {
      checkPageBreak(rowHeight + 5);
      
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      setFont(fonts.body);
      doc.text(label + ':', margin, yPosition);
      
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      const valueLines = doc.splitTextToSize(value, contentWidth - labelWidth - 20);
      doc.text(valueLines, margin + labelWidth, yPosition);
      
      yPosition += Math.max(rowHeight, valueLines.length * 12);
    });
  };

  const drawTable = (headers: string[], rows: string[][], options: {
    headerBg?: boolean;
    alternateRows?: boolean;
    boldTotal?: boolean;
  } = {}) => {
    const colCount = headers.length;
    const colWidth = contentWidth / colCount;
    const rowHeight = 20;
    const headerHeight = 25;

    checkPageBreak(headerHeight + (rows.length * rowHeight) + 10);

    if (options.headerBg) {
      doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
      doc.rect(margin, yPosition, contentWidth, headerHeight, 'F');
    }

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, contentWidth, headerHeight);

    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    setFont(fonts.subheading);

    headers.forEach((header, index) => {
      const xPos = margin + (index * colWidth) + 8;
      doc.text(header, xPos, yPosition + 15);
    });

    yPosition += headerHeight;

    rows.forEach((row, rowIndex) => {
      const isLastRow = rowIndex === rows.length - 1;
      const shouldBold = options.boldTotal && (
        row[0]?.toLowerCase().includes('total') || 
        isLastRow
      );
      
      if (options.alternateRows && rowIndex % 2 === 1) {
        doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
        doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      }
      
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.rect(margin, yPosition, contentWidth, rowHeight);
      
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      setFont(shouldBold ? fonts.subheading : fonts.body);
      
      row.forEach((cell, cellIndex) => {
        const xPos = margin + (cellIndex * colWidth) + 8;
        const cellText = cell || '';
        const maxWidth = colWidth - 16;
        const splitText = doc.splitTextToSize(cellText, maxWidth);
        doc.text(splitText[0] || '', xPos, yPosition + 13);
      });
      
      yPosition += rowHeight;
    });

    yPosition += 10;
  };

  const drawTextBlock = (text: string, options: {
    background?: boolean;
    italic?: boolean;
  } = {}) => {
    const lineHeight = 12;
    const padding = options.background ? 15 : 0;

    const lines = doc.splitTextToSize(text, contentWidth - (padding * 2));
    const blockHeight = (lines.length * lineHeight) + (padding * 2);

    checkPageBreak(blockHeight + 10);

    if (options.background) {
      doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
      doc.rect(margin, yPosition - 5, contentWidth, blockHeight, 'F');
      
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition - 5, contentWidth, blockHeight);
    }

    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    setFont(fonts.body);
    if (options.italic) {
      doc.setFont('helvetica', 'italic');
    }

    doc.text(lines, margin + padding, yPosition + padding + 8);
    yPosition += blockHeight + 15;
  };

  const getStatusColor = (status: string): readonly [number, number, number] => {
    switch (status.toLowerCase()) {
      case 'completed': return colors.success;
      case 'in_progress': return colors.warning;
      case 'scheduled': return colors.accent;
      case 'cancelled': return colors.danger;
      default: return colors.secondary;
    }
  };

  // Format duration properly
  const formatDuration = (durationMinutes: number): string => {
    if (!durationMinutes || durationMinutes <= 0) return 'N/A';
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  // START DOCUMENT GENERATION

  // Title and header
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  setFont(fonts.title);
  doc.text('SERVICE COMPLETION REPORT', margin, yPosition);
  yPosition += 15;

  // Job number and date
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  setFont(fonts.body);
  doc.text(`Job #${job.job_number}`, margin, yPosition);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - margin - 150,
    yPosition
  );
  yPosition += 20;

  // Status badge
  const statusColor = getStatusColor(job.status);
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(margin, yPosition, 80, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  setFont(fonts.body);
  doc.text(
    job.status.toUpperCase().replace('_', ' '),
    margin + 8,
    yPosition + 13
  );
  yPosition += 35;

  // Customer Information
  drawSection('Customer Information');
  if (job.customers) {
    const customerInfo: Array<[string, string]> = [
      ['Name', job.customers.name || 'N/A'],
      ['Phone', job.customers.phone || 'N/A'],
      ['Email', job.customers.email || 'N/A'],
      ['Address', `${job.customers.address || 'N/A'}, ${job.customers.city || ''}, ${job.customers.state || ''}`]
    ];
    drawInfoTable(customerInfo);
  }

  // Job Details
  drawSection('Job Details');
  const jobDetails: Array<[string, string]> = [
    ['Service Type', job.service_type?.replace('_', ' ').toUpperCase() || 'N/A'],
    ['Priority', job.priority?.toUpperCase() || 'MEDIUM'],
    ['Scheduled', job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : 'Not scheduled'],
    ['Started', job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'],
    ['Completed', job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'],
    ['Duration', job.actual_duration ? formatDuration(job.actual_duration) : 'N/A']
  ];
  
  console.log('Job details for PDF:', {
    actual_duration: job.actual_duration,
    formatted: job.actual_duration ? formatDuration(job.actual_duration) : 'N/A'
  });
  
  drawInfoTable(jobDetails);

  // Work Description
  if (job.description) {
    drawSection('Work Description');
    drawTextBlock(job.description, { background: true });
  }

  // Work Summary - Fixed to properly display work_summary
  const workSummaryText = job.work_summary || job.customer_feedback || workNotes || '';
  if (workSummaryText.trim()) {
    drawSection('Work Summary & Completion Notes');
    console.log('Including work summary in PDF:', workSummaryText);
    drawTextBlock(workSummaryText, { background: true });
  }

  // Parts and Materials
  if (partsUsed && partsUsed.length > 0) {
    drawSection('Parts & Materials Used');

    const partsHeaders = ['Part Number', 'Description', 'Qty', 'Unit Price', 'Total'];
    const partsRows = partsUsed.map(part => [
      part.parts_inventory?.part_number || 'N/A',
      part.parts_inventory?.name || 'N/A',
      part.quantity_used.toString(),
      `$${part.unit_price.toFixed(2)}`,
      `$${(part.total_cost || 0).toFixed(2)}`
    ]);

    drawTable(partsHeaders, partsRows, { 
      headerBg: true, 
      alternateRows: true 
    });

    const totalPartsValue = partsUsed.reduce((sum, part) => sum + (part.total_cost || 0), 0);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    setFont(fonts.subheading);
    doc.text(`Parts Total: $${totalPartsValue.toFixed(2)}`, pageWidth - margin - 100, yPosition - 5);
  }

  // Cost Summary
  drawSection('Cost Summary');
  const costHeaders = ['Description', 'Amount'];
  const costRows = [
    ['Labor Cost', `$${(job.labor_cost || 0).toFixed(2)}`],
    ['Parts Cost', `$${(job.parts_cost || 0).toFixed(2)}`],
    ['Total Amount', `$${(job.total_cost || 0).toFixed(2)}`]
  ];

  drawTable(costHeaders, costRows, {
    headerBg: true,
    boldTotal: true
  });


  // Documentation Photos - Enhanced to show all photo details
  if (photos && photos.length > 0) {
    drawSection('Documentation Photos');

    console.log('Including photos in PDF:', photos);

    // Group photos by type
    const photoTypes = ['before', 'during', 'after'];
    const photosByType = photoTypes.reduce((acc, type) => {
      acc[type] = photos.filter(photo => {
        if (!photo.photo_type) {
          return type === 'during';
        }
        return photo.photo_type === type;
      });
      return acc;
    }, {} as Record<string, typeof photos>);

    // Display each photo type section
    Object.entries(photosByType).forEach(([type, typePhotos]) => {
      if (typePhotos.length > 0) {
        checkPageBreak(50);
        
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        setFont(fonts.subheading);
        const typeTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} Work Photos (${typePhotos.length})`;
        doc.text(typeTitle, margin, yPosition);
        yPosition += 20;

        typePhotos.forEach((photo, index) => {
          checkPageBreak(45);
          
          doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          setFont(fonts.body);
          doc.text(`${index + 1}.`, margin + 10, yPosition);
          
          const description = photo.description || `${type} work documentation`;
          const descriptionLines = doc.splitTextToSize(description, contentWidth - 120);
          doc.text(descriptionLines, margin + 25, yPosition);
          
          doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
          setFont(fonts.small);
          const timestamp = new Date(photo.created_at).toLocaleString();
          doc.text(`Captured: ${timestamp}`, margin + 25, yPosition + 12);
          
          // Add photo URL if available
          if (photo.photo_url) {
            doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
            setFont(fonts.caption);
            const urlText = `Photo URL: ${photo.photo_url}`;
            const urlLines = doc.splitTextToSize(urlText, contentWidth - 50);
            doc.text(urlLines, margin + 25, yPosition + 22);
            yPosition += Math.max(35, descriptionLines.length * 12 + urlLines.length * 8 + 25);
          } else {
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            setFont(fonts.caption);
            doc.text('[Photo stored in system database]', margin + 350, yPosition + 6);
            yPosition += Math.max(35, descriptionLines.length * 12 + 25);
          }
        });
        
        yPosition += 10;
      }
    });

    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    setFont(fonts.body);
    doc.text(`Total documentation photos: ${photos.length}`, margin, yPosition);
    yPosition += 20;

    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    setFont(fonts.small);
    doc.text('Note: Photos are accessible through the provided URLs or service management system.', margin, yPosition);
    yPosition += 15;
  } else {
    drawSection('Documentation Photos');
    drawTextBlock('No photos were taken for this job.', { background: true, italic: true });
  }

  // Add final page footer
  addPageFooter();

  // Save the PDF
  const fileName = `Service_Report_${job.job_number}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};
