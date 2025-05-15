
import { Upload } from "lucide-react";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function DropZone({ onFilesSelected }: DropZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);

  // Prevent the browser from opening files when dropped outside the drop zone
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', preventDefaults);

    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload only PDF or image files (JPG, JPEG, PNG)."
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 5MB."
        });
        return;
      }
    }
    onFilesSelected(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  // Build the list of accepted file extensions
  const acceptedFileTypes = Object.values(ALLOWED_FILE_TYPES).join(',');

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-3">
        <Upload className={`h-8 w-8 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
        <label className="w-full cursor-pointer text-center">
          <input
            type="file"
            className="hidden"
            accept={acceptedFileTypes}
            onChange={handleFileInput}
            multiple
          />
          <span className="text-sm text-gray-500">
            Drop PDF or image files here or{" "}
            <span className="text-blue-600 hover:text-blue-700 underline">
              browse
            </span>
          </span>
          <p className="text-xs text-gray-400 mt-1">
            Supported formats: PDF, JPG, PNG • Maximum file size: 5MB
          </p>
        </label>
      </div>
    </div>
  );
}
