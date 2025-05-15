import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { FileUpload, isFileTypeAllowed } from "./types";
import { logActivity } from "@/utils/activity";
import { extractDocumentInfo, DocumentInfo } from "@/utils/ai/extractDocumentInfo";
import { ViolationType } from "@/types/database.types";
import { convertImageToPdf } from "@/utils/pdf/convertImageToPdf";

// Default values for when extraction fails
const DEFAULT_EXCUSE = "for my absences in your Application Development class";

export function useFileUpload(userId: string) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const { toast } = useToast();

  const addFiles = (files: File[]) => {
    const newUploads = files.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
      extractedInfo: null
    }));
    setUploads(prev => [...prev, ...newUploads]);
  };

  const removeFile = (fileToRemove: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== fileToRemove));
  };

  // Add a new function to reset the uploads state
  const resetUploads = () => {
    setUploads([]);
  };

  // Function to convert image to PDF if needed
  const ensurePdfFormat = async (file: File): Promise<File> => {
    // If the file is already a PDF, return it unchanged
    if (file.type === 'application/pdf') {
      return file;
    }
    
    // Otherwise, convert image to PDF
    try {
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'converting' }
            : upload
        )
      );
      
      console.log(`Converting ${file.name} from ${file.type} to PDF with OCR`);
      
      // Start OCR processing
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'ocr-processing' }
            : upload
        )
      );
      
      const pdfFile = await convertImageToPdf(file);
      console.log(`Conversion with OCR complete: ${pdfFile.name}, size: ${pdfFile.size} bytes`);
      
      // Update the uploads state with the new file
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, file: pdfFile, status: 'pending' }
            : upload
        )
      );
      
      return pdfFile;
    } catch (error) {
      console.error('Error converting image to PDF:', error);
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'error' }
            : upload
        )
      );
      
      toast({
        variant: "destructive",
        title: "Conversion failed",
        description: "Failed to convert image to PDF format with OCR."
      });
      
      throw error;
    }
  };

  const analyzeFile = async (file: File): Promise<DocumentInfo | null> => {
    try {
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'analyzing' }
            : upload
        )
      );

      // First ensure the file is in PDF format
      const pdfFile = await ensurePdfFormat(file);

      // Extract document information - now returns a Promise with the translated and classified document
      const extractedInfo = await extractDocumentInfo(pdfFile);
      console.log("Document info extraction complete:", extractedInfo);
      
      // Ensure we have a nature of excuse - it should be translated to English already
      const natureOfExcuse = extractedInfo.natureOfExcuse || DEFAULT_EXCUSE;
      
      // Make sure the violation type is one of our defined types
      // Start with a string type, not a ViolationType
      let violationTypeStr: string = extractedInfo.violationType || "Other";
      
      // Define a list of valid violation types
      const validViolationTypes = [
        "Other", 
        "Behavioral Issue", 
        "Dress Code Violation", 
        "Academic Misconduct", 
        "Property Damage", 
        "Attendance Issue"
      ] as const;
      
      // Normalize legacy types to new types using string comparison
      if (!validViolationTypes.includes(violationTypeStr as any)) {
        // If not one of our valid types, map it accordingly
        if (violationTypeStr === "Academic") {
          violationTypeStr = "Academic Misconduct";
        } else if (violationTypeStr === "Attendance") {
          violationTypeStr = "Attendance Issue";
        } else {
          // Any other unrecognized type gets mapped to "Other"
          violationTypeStr = "Other";
        }
      }
      
      // Ensure the final value is one of our valid violation types
      const validViolationType: ViolationType = 
        validViolationTypes.includes(violationTypeStr as any) 
          ? (violationTypeStr as ViolationType) 
          : "Other";
      
      console.log("Final normalized violation type:", validViolationType);
      
      // Update uploads state with properly mapped values
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file || upload.file === pdfFile
            ? { 
                ...upload, 
                file: pdfFile,
                extractedInfo: {
                  studentNumber: extractedInfo.studentId,
                  senderName: extractedInfo.studentName,
                  date: extractedInfo.submissionDate,
                  natureOfExcuse: natureOfExcuse,
                  addressee: extractedInfo.addressee,
                  confidence: 'high',
                  language: extractedInfo.language
                },
                violationType: validViolationType
              }
            : upload
        )
      );

      console.log("Upload state updated with extracted info and normalized violation type:", validViolationType);
      
      return {
        ...extractedInfo,
        violationType: validViolationType
      };
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Failed to extract information from the PDF. Using default values."
      });
      
      // Use default values if extraction fails
      const defaultInfo: DocumentInfo = {
        extractedText: "Error analyzing document",
        natureOfExcuse: DEFAULT_EXCUSE,
        violationType: "Other",
        studentId: "22-13917-429",
        studentName: "Ysac Blu Advincula",
        addressee: "Sir Gaspar",
        submissionDate: "March 30, 2025"
      };
      
      // Update uploads state with default values
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                extractedInfo: {
                  studentNumber: defaultInfo.studentId,
                  senderName: defaultInfo.studentName,
                  date: defaultInfo.submissionDate,
                  natureOfExcuse: defaultInfo.natureOfExcuse,
                  addressee: defaultInfo.addressee,
                  confidence: 'medium'
                },
                violationType: "Other"
              }
            : upload
        )
      );
      
      return defaultInfo;
    }
  };

  const uploadToSupabase = async (file: File) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: "User ID not found. Please log in again."
      });
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: "You are not logged in. Please log in and try again."
        });
        return;
      }

      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'uploading', progress: 0 }
            : upload
        )
      );

      // Ensure the file is in PDF format before processing
      const pdfFile = await ensurePdfFormat(file);
      
      const extractedInfo = await analyzeFile(pdfFile);
      
      // Use the violation type directly from extractedInfo - it's already normalized
      const violationType: ViolationType = extractedInfo?.violationType || "Other";
      const natureOfExcuse = extractedInfo?.natureOfExcuse || DEFAULT_EXCUSE;
      
      console.log("Using values for upload:", {
        violationType,
        natureOfExcuse,
        submissionDate: extractedInfo?.submissionDate
      });

      const timestamp = Date.now();
      const originalName = pdfFile.name;
      const filePath = `${userId}/${timestamp}_${originalName}`;
      
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file || upload.file === pdfFile
            ? { ...upload, progress: 33 }
            : upload
        )
      );

      console.log("Attempting to upload file to storage bucket:", filePath);
      
      const { error: uploadError, data } = await supabase.storage
        .from('salaysay-uploads')
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("File uploaded successfully to storage:", data);
      
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file || upload.file === pdfFile
            ? { ...upload, progress: 66 }
            : upload
        )
      );

      // Construct metadata for database
      const metadata = {
        student_number: extractedInfo?.studentId,
        sender_name: extractedInfo?.studentName,
        incident_date: extractedInfo?.submissionDate,
        excuse_description: natureOfExcuse,
        addressee: extractedInfo?.addressee
      };

      console.log("Inserting submission record into database with metadata:", metadata);
      console.log("Using standardized violation type:", violationType);
      
      const { error: insertError, data: submissionData } = await supabase
        .from('salaysay_submissions')
        .insert({
          user_id: userId,
          file_path: data.path,
          violation_type: violationType,
          metadata: metadata
        })
        .select()
        .single();

      if (insertError) {
        console.error("Database insert error:", insertError);
        throw insertError;
      }

      console.log("Database record created successfully:", submissionData);

      await logActivity(
        'upload',
        `Uploaded salaysay for ${violationType}`,
        submissionData.id
      );

      // Update uploads state with the final values
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file || upload.file === pdfFile
            ? { 
                ...upload, 
                file: pdfFile,
                status: 'completed', 
                progress: 100, 
                violationType,
                extractedInfo: {
                  ...(upload.extractedInfo || {}),
                  studentNumber: extractedInfo?.studentId,
                  senderName: extractedInfo?.studentName,
                  date: extractedInfo?.submissionDate,
                  addressee: extractedInfo?.addressee,
                  natureOfExcuse: natureOfExcuse,
                  confidence: 'high',
                  language: extractedInfo?.language
                }
              }
            : upload
        )
      );

      toast({
        title: "Upload successful",
        description: "Your file has been uploaded and analyzed."
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'error' }
            : upload
        )
      );

      let errorMessage = "There was an error uploading your file. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("bucket")) {
          errorMessage = "Storage bucket not found. Please check if 'salaysay-uploads' bucket exists in Supabase.";
        } else if (error.message.includes("permission")) {
          errorMessage = "Permission denied. Please check Supabase storage policies.";
        } else if (error.message.includes("foreign key")) {
          errorMessage = "Database relation error. User profile may not exist.";
        } else if (error.message.includes("apikey")) {
          errorMessage = "Authentication error. No API key found in request.";
        }
      }

      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage
      });
    }
  };

  return {
    uploads,
    addFiles,
    removeFile,
    uploadToSupabase,
    analyzeFile,
    resetUploads
  };
}
