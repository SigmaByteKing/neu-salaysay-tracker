
import { jsPDF } from 'jspdf';
import { createWorker } from 'tesseract.js';

/**
 * Converts an image file to a PDF with OCR text layer
 * @param imageFile - The image file to convert
 * @returns Promise resolving to a File object containing the PDF
 */
export async function convertImageToPdf(imageFile: File): Promise<File> {
  try {
    // First, create a promise to read the file
    const imageDataUrl = await readFileAsDataURL(imageFile);
    
    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
    });
    
    // Create an image element to get dimensions
    const imgDimensions = await getImageDimensions(imageDataUrl);
    
    // Calculate dimensions to fit the image properly on the PDF page
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Calculate scaling to fit image on page while maintaining aspect ratio
    const imgRatio = imgDimensions.height / imgDimensions.width;
    let imgWidth = pageWidth - 40; // Add margins
    let imgHeight = imgWidth * imgRatio;
    
    // If image height exceeds page height, scale down further
    if (imgHeight > pageHeight - 40) {
      imgHeight = pageHeight - 40;
      imgWidth = imgHeight / imgRatio;
    }
    
    // Calculate position to center the image
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    
    console.log(`Starting OCR processing on ${imageFile.name}`);
    
    // Run OCR on the image using Tesseract.js
    const ocrResult = await performOCR(imageFile);
    console.log("OCR completed with text:", ocrResult.text.substring(0, 100) + "...");
    
    // IMPORTANT CHANGE: First add the text layer (which will be behind other elements)
    // If we have OCR text, add it as an invisible text layer for searchability
    if (ocrResult.text.trim()) {
      // Add invisible text layer that makes the PDF searchable
      addInvisibleTextLayerToPdf(doc, ocrResult.text, x, y, imgWidth, imgHeight);
    }
    
    // THEN add the image on top of the text layer
    doc.addImage(
      imageDataUrl,
      imageFile.type === 'image/png' ? 'PNG' : 'JPEG',
      x,
      y,
      imgWidth,
      imgHeight
    );
    
    // Generate the PDF as a blob
    const pdfBlob = doc.output('blob');
    
    // Create a new file from the blob
    const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '.pdf';
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    return pdfFile;
  } catch (error) {
    console.error('Error in convertImageToPdf:', error);
    throw error;
  }
}

/**
 * Performs OCR on the given image file using Tesseract.js
 * @param imageFile The image file to process
 * @returns Promise resolving to the OCR result
 */
async function performOCR(imageFile: File): Promise<{ text: string }> {
  try {
    // Create and initialize a Tesseract worker with proper options
    const worker = await createWorker({
      logger: progress => {
        if (progress.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(progress.progress * 100)}%`);
        }
      }
    });
    
    // Initialize worker with English language
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    // Convert the image file to a format Tesseract can use
    const imageBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });
    
    // Recognize text in the image
    console.log("Starting OCR text recognition");
    const result = await worker.recognize(imageBlob);
    console.log(`OCR recognized ${result.data.text.length} characters`);
    
    // Terminate the worker to free resources
    await worker.terminate();
    
    return { text: result.data.text };
  } catch (error) {
    console.error("OCR processing error:", error);
    return { text: '' };
  }
}

/**
 * Adds an invisible text layer to the PDF for searchability
 * @param doc The jsPDF document
 * @param text The OCR text to add
 * @param x The x position (same as image)
 * @param y The y position (same as image)
 * @param width The width of the text area (same as image)
 * @param height The height of the text area (same as image)
 */
function addInvisibleTextLayerToPdf(doc: jsPDF, text: string, x: number, y: number, width: number, height: number) {
  // Set text color to white with 0 opacity (completely invisible)
  doc.setTextColor(255, 255, 255, 0);

  // Use a reasonable font size that won't affect layout
  const fontSize = 12;
  doc.setFontSize(fontSize);
  
  // Split text into words and then lines
  const words = text.split(/\s+/);
  
  // Calculate approximate characters per line based on image width
  const avgCharWidth = doc.getStringUnitWidth('a') * fontSize / doc.internal.scaleFactor;
  const charsPerLine = Math.floor(width / avgCharWidth);
  
  // Set up line tracking
  let currentLine = '';
  let currentLineLength = 0;
  const lineHeight = fontSize * 1.2 / doc.internal.scaleFactor;
  let currentY = y + fontSize; // Start at the top of the image area
  
  // Maximum Y position (don't go beyond image height)
  const maxY = y + height;
  
  // Process each word
  words.forEach(word => {
    const wordLength = word.length;
    
    // If adding this word would exceed the line width, add the current line to the PDF
    if (currentLineLength + wordLength > charsPerLine) {
      // Only add the line if within the image area
      if (currentY < maxY) {
        doc.text(currentLine, x, currentY);
        currentY += lineHeight;
      }
      
      currentLine = word + ' ';
      currentLineLength = wordLength + 1;
    } else {
      currentLine += word + ' ';
      currentLineLength += wordLength + 1;
    }
  });
  
  // Add the last line if not empty and within image area
  if (currentLine.trim() !== '' && currentY < maxY) {
    doc.text(currentLine, x, currentY);
  }
}

/**
 * Reads a file as a Data URL
 * @param file The file to read
 * @returns Promise resolving to the Data URL
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      if (!event.target?.result) {
        reject(new Error('Failed to load image data'));
        return;
      }
      resolve(event.target.result as string);
    };
    
    reader.onerror = function(error) {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Gets the dimensions of an image from its data URL
 * @param dataUrl The image data URL
 * @returns Promise resolving to the image dimensions
 */
function getImageDimensions(dataUrl: string): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function() {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.onerror = function() {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    img.src = dataUrl;
  });
}
