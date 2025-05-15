
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set the worker source path (necessary for PDF.js to work in the browser)
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text content from a PDF file with improved layout preservation
 * @param file - PDF file to extract text from
 * @returns The extracted text content
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    console.log("Starting PDF text extraction for:", file.name);
    
    // Convert the File to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF using PDF.js
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
    
    // Extract text from all pages
    let fullText = '';
    
    // Loop through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i} of ${pdf.numPages}`);
      const page = await pdf.getPage(i);
      
      // Get text content with compatible options
      const textContent = await page.getTextContent();
      
      console.log(`Text content extracted from page ${i}, items:`, textContent.items.length);
      
      // Process text with better layout preservation
      let lastY;
      let text = '';
      
      for (const item of textContent.items) {
        // Use type assertion instead of relying on TextItem type
        // Check if the item has the expected structure
        if ('str' in item && 'transform' in item) {
          // Add newlines when Y position changes significantly (new paragraph)
          if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
            text += '\n';
          } else if (lastY !== undefined && item.transform[5] !== lastY) {
            // Small Y change might indicate line break
            text += ' ';
          }
          
          // Add the text content
          text += item.str;
          lastY = item.transform[5];
        }
      }
      
      fullText += text + '\n\n'; // Add extra newlines between pages
    }
    
    // Clean up the text - remove excessive whitespace while preserving paragraphs
    fullText = fullText
      .replace(/\n{3,}/g, '\n\n')      // Replace 3+ newlines with 2
      .replace(/\s{2,}/g, ' ')         // Replace 2+ spaces with 1
      .trim();                         // Trim leading/trailing whitespace
    
    console.log('Extraction complete. Text length:', fullText.length);
    
    // If text was extracted, log a sample
    if (fullText.length > 0) {
      console.log('Extracted text sample:', fullText.substring(0, 200) + '...');
    } else {
      console.log('No text was extracted from the PDF');
    }
    
    // Return the text content or a message if empty
    if (!fullText || fullText.trim() === '') {
      console.log('No text extracted from PDF, returning empty message');
      return "No text content could be extracted from this PDF.";
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Use same name for both exports for consistency
export const extractTextFromPdf = extractPdfText;
