
import { Json } from "@/integrations/supabase/types";

type Metadata = {
  student_number?: string;
  sender_name?: string;
  incident_date?: string;
  excuse_description?: string;
  addressee?: string;
} | Json | null;

/**
 * Checks if the provided metadata contains the search keyword
 * 
 * @param metadata The metadata object to search in
 * @param keyword The keyword to search for
 * @returns boolean indicating if the keyword was found
 */
export const metadataContainsKeyword = (metadata: Metadata, keyword: string): boolean => {
  if (!metadata || !keyword.trim()) return false;
  
  const searchTerm = keyword.toLowerCase();
  
  // If metadata is a string (JSON), try to parse it
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return metadataContainsKeyword(parsed, keyword);
    } catch (e) {
      console.error("Error parsing metadata string:", e);
      return false;
    }
  }
  
  // If metadata is an object, check all fields
  if (typeof metadata === 'object') {
    const metadataObj = metadata as any;
    
    // Check each possible field
    if (metadataObj.student_number && 
        metadataObj.student_number.toString().toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    if (metadataObj.sender_name && 
        metadataObj.sender_name.toString().toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    if (metadataObj.incident_date && 
        metadataObj.incident_date.toString().toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    if (metadataObj.excuse_description && 
        metadataObj.excuse_description.toString().toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    if (metadataObj.addressee && 
        metadataObj.addressee.toString().toLowerCase().includes(searchTerm)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Highlights occurrences of a keyword in text
 * 
 * @param text The text to search in
 * @param keyword The keyword to highlight
 * @returns Text with highlighted keyword or original text if no matches
 */
export const highlightKeyword = (text: string, keyword: string): string => {
  if (!text || !keyword.trim()) return text;
  
  const searchTerm = keyword.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (!textLower.includes(searchTerm)) return text;
  
  // Split on the keyword to create array of parts
  const parts = [];
  let lastIndex = 0;
  let index = textLower.indexOf(searchTerm);
  
  while (index !== -1) {
    // Add the part before the keyword
    parts.push(text.substring(lastIndex, index));
    
    // Add the keyword itself (from the original text to maintain case)
    parts.push(`<mark>${text.substring(index, index + keyword.length)}</mark>`);
    
    // Move lastIndex to after the keyword
    lastIndex = index + keyword.length;
    
    // Find the next occurrence
    index = textLower.indexOf(searchTerm, lastIndex);
  }
  
  // Add the remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.join('');
};
