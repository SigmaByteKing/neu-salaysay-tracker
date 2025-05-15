
import { ViolationType } from "@/types/database.types";

export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'analyzing' | 'uploading' | 'converting' | 'ocr-processing' | 'completed' | 'error';
  violationType?: ViolationType;
  extractedInfo?: {
    studentNumber?: string;
    senderName?: string;
    date?: string;
    natureOfExcuse?: string;
    addressee?: string;
    confidence: 'high' | 'medium' | 'low';
    language?: 'English' | 'Tagalog';
  } | null;
}

// Updated to match the exact ViolationType from the database.types.ts
export const VIOLATION_TYPES = [
  "Other",
  "Behavioral Issue",
  "Dress Code Violation",
  "Academic Misconduct",
  "Property Damage",
  "Attendance Issue"
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png'
};

// Helper function to check if a file type is allowed
export const isFileTypeAllowed = (file: File): boolean => {
  return Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
};
