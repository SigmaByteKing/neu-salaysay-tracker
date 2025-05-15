
import { ViolationType } from "../../types/database.types";
import { DocumentInfo } from "./extractDocumentInfo";

/**
 * Translate text from Tagalog to English using an alternative translation service
 * Since LibreTranslate is giving 400 errors, we'll use MyMemory translation API
 * which is free and doesn't require authentication for limited usage
 */
export async function translateTagalogToEnglish(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";
  
  try {
    console.log("Translating Tagalog text to English...");
    
    // Use MyMemory Translation API instead of LibreTranslate
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=tl|en`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Translation API error:", response.status, response.statusText);
      // Return original text if translation fails
      return text;
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData) {
      console.log("Translation successful");
      return data.responseData.translatedText || text;
    } else {
      console.warn("Translation response incomplete:", data);
      return text; // Return original text if response is unexpected
    }
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Return original text if translation fails
  }
}

/**
 * Determine the violation type from the extracted document text and context
 * Enhanced with more comprehensive keyword mapping and prioritized context analysis
 */
export async function determineViolationType(documentInfo: DocumentInfo): Promise<ViolationType> {
  const { extractedText, pdfTitle, natureOfExcuse, language } = documentInfo;
  
  // Default to "Other" if we can't determine
  let violationType: ViolationType = "Other";
  
  // For Tagalog documents, we'll only translate the nature of excuse
  // instead of the entire document to avoid hitting API limits
  let excuseToAnalyze = natureOfExcuse || "";
  
  if (language === "Tagalog" && natureOfExcuse) {
    console.log("Detected Tagalog document, translating nature of excuse");
    excuseToAnalyze = await translateTagalogToEnglish(natureOfExcuse);
    console.log("Translated nature of excuse:", excuseToAnalyze);
  }
  
  // Convert to lowercase for case-insensitive matching
  const textLower = extractedText?.toLowerCase() || "";
  const titleLower = pdfTitle?.toLowerCase() || "";
  const excuseLower = excuseToAnalyze.toLowerCase();
  
  // Define keyword sets for each violation type with improved specificity
  // Added more contextual keywords to better differentiate between categories
  const propertyDamageKeywords = [
    "damage", "damaged", "broke", "breaking", "broken", 
    "destroy", "destroyed", "vandal", "graffiti", 
    "spill", "spilled", "stain", "property", 
    "equipment", "chair", "table", "desk", "window", "computer",
    "laboratory", "accidentally breaking", "broke the", "damaged the",
    "cracked", "shattered", "tore", "ripped", "scratched"
  ];
  
  const attendanceKeywords = [
    "absent", "absence", "attendance", "missed class", 
    "not present", "couldn't attend", "couldn't make it", 
    "failed to attend", "unable to join", "skipped class", "skip class",
    "late", "tardy", "didn't show up", "no show", 
    "not in class", "missing from class", "wasn't in class"
  ];
  
  const academicMisconductKeywords = [
    "plagiarism", "plagiarize", "plagiarized", "copied",
    "cheat", "cheating", "cheated", "academic dishonesty", 
    "academic misconduct", "test", "exam", "quiz",
    "academic integrity", "answers", "assignment", "homework",
    "paper", "thesis", "dissertation", "unauthorized help",
    "unauthorized source", "unauthorized material"
  ];
  
  const behavioralKeywords = [
    "behavior", "behaviour", "misbehave", "misbehavior", 
    "disrupt", "disruption", "inappropriate", 
    "disrespect", "disrespectful", "conduct", "misconduct", 
    "disturbing class", "talking", "noise", "outburst",
    "rude", "impolite", "disorderly", "unruly", "aggressive",
    "argument", "shouting", "disruptive", "phone use", "using phone"
  ];
  
  const dressCodeKeywords = [
    "uniform", "dress code", "attire", "clothing", 
    "dress policy", "improper dress", "inappropriate clothing", 
    "not wearing", "shoes", "shirt", "pants", "id",
    "identification", "badge", "required attire",
    "inappropriate outfit", "dress requirement", "improper uniform"
  ];
  
  // Prioritize checking the nature of excuse first as it's more focused
  if (excuseLower) {
    // Property damage detection - improved to catch the specific case mentioned
    // and similar cases with clear damage to property indicators
    if (propertyDamageKeywords.some(keyword => excuseLower.includes(keyword))) {
      // Extra check to ensure it's actually property damage and not just mentioning equipment
      if (
        excuseLower.includes("breaking") || 
        excuseLower.includes("broke") || 
        excuseLower.includes("damage") ||
        excuseLower.includes("destroy") ||
        (excuseLower.includes("chair") && (
          excuseLower.includes("accident") || 
          excuseLower.includes("broke") ||
          excuseLower.includes("damage")
        )) ||
        (excuseLower.includes("laboratory") && (
          excuseLower.includes("accident") ||
          excuseLower.includes("broke") ||
          excuseLower.includes("damage")
        ))
      ) {
        console.log("Classified as Property Damage based on nature of excuse");
        return "Property Damage";
      }
    }
    
    // Check for attendance related keywords in the excuse
    if (attendanceKeywords.some(keyword => excuseLower.includes(keyword))) {
      console.log("Classified as Attendance Issue based on nature of excuse");
      return "Attendance Issue";
    }
    
    // Check for academic misconduct in the excuse
    if (academicMisconductKeywords.some(keyword => excuseLower.includes(keyword))) {
      console.log("Classified as Academic Misconduct based on nature of excuse");
      return "Academic Misconduct";
    }
    
    // Check for behavioral issues in class in the excuse
    // This check is now more specific to avoid misclassifying property damage
    if (behavioralKeywords.some(keyword => excuseLower.includes(keyword)) &&
        !propertyDamageKeywords.some(keyword => excuseLower.includes(keyword))) {
      console.log("Classified as Behavioral Issue based on nature of excuse");
      return "Behavioral Issue";
    }
    
    // Check for dress code violations
    if (dressCodeKeywords.some(keyword => excuseLower.includes(keyword))) {
      console.log("Classified as Dress Code Violation based on nature of excuse");
      return "Dress Code Violation";
    }
  }
  
  // If we couldn't determine from the excuse, check the full text
  // Using the original text without translation
  
  // Property damage detection in full text
  if (propertyDamageKeywords.some(keyword => textLower.includes(keyword))) {
    // More specific context check for property damage
    if (
      textLower.includes("break") && textLower.includes("chair") ||
      textLower.includes("damage") && textLower.includes("property") ||
      textLower.includes("broke") && (
        textLower.includes("window") ||
        textLower.includes("chair") ||
        textLower.includes("desk") ||
        textLower.includes("equipment")
      )
    ) {
      violationType = "Property Damage";
    }
  }
  
  // Check for attendance related keywords if not already classified
  else if (attendanceKeywords.some(keyword => textLower.includes(keyword))) {
    violationType = "Attendance Issue";
  }
  
  // Check for academic misconduct - more detailed patterns
  else if (academicMisconductKeywords.some(keyword => textLower.includes(keyword))) {
    violationType = "Academic Misconduct";
  }
  
  // Check for behavioral issues
  else if (behavioralKeywords.some(keyword => textLower.includes(keyword))) {
    // Make sure it's not actually about property damage
    if (!propertyDamageKeywords.some(keyword => textLower.includes(keyword))) {
      violationType = "Behavioral Issue";
    }
  }
  
  // Check for dress code violations
  else if (dressCodeKeywords.some(keyword => textLower.includes(keyword))) {
    violationType = "Dress Code Violation";
  }
  
  console.log("Final classification:", violationType);
  return violationType;
}

/**
 * Extract the nature of excuse from the document text - simplified to return the result of extractFirstSentences
 * function from the main extraction module
 */
export function extractNatureOfExcuse(documentInfo: DocumentInfo): string {
  // Safety check - if no document info or text, return empty string
  if (!documentInfo || !documentInfo.extractedText) {
    console.log("No document info or extracted text");
    return "";
  }
  
  // This function now relies on the new extractFirstSentences function used in the main module
  // This simplifies this function significantly and maintains consistency
  
  return "";  // Intentionally return empty string as the main module now handles this
}

/**
 * Update the document info with the violation type and nature of excuse
 */
export async function enhanceDocumentInfo(documentInfo: DocumentInfo): Promise<DocumentInfo> {
  try {
    // Always make sure we have a valid document info object
    const safeDocumentInfo = documentInfo || { extractedText: "" };
    
    // Determine the violation type - we now use async/await for translation
    const violationType = await determineViolationType(safeDocumentInfo);
    console.log("Violation type determined:", violationType);
    
    // Return the enhanced document info
    return {
      ...safeDocumentInfo,
      violationType
    };
  } catch (error) {
    console.error("Error enhancing document info:", error);
    // Even if an error occurs, return the document info
    return documentInfo;
  }
}

export default enhanceDocumentInfo;
