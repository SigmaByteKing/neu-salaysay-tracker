
import { FileText, X, Check, AlertCircle, Clock, FileImage } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { FileUpload } from "./types";
import { Button } from "@/components/ui/button";
import { ViolationType } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";

interface FileUploadItemProps {
  upload: FileUpload;
  onRemove: (file: File) => void;
}

export function FileUploadItem({ upload, onRemove }: FileUploadItemProps) {
  const { file, status, progress, extractedInfo } = upload;
  
  const fileName = file.name;
  const fileSize = formatFileSize(file.size);
  
  // Use the violationType directly from upload if available, otherwise show "Analyzing..."
  const violationType = upload.violationType || "Analyzing...";

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Helper function to show a dash when a field is missing
  const showField = (value: string | undefined, label: string) => {
    return (
      <p><span className="font-medium">{label}:</span> {value || "—"}</p>
    );
  };

  // Determine icon based on file type
  const getFileIcon = () => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="h-6 w-6 text-green-500" />;
    }
    return <FileText className="h-6 w-6 text-blue-500" />;
  };

  return (
    <div className="flex items-start p-3 border rounded-md bg-white">
      <div className="flex-shrink-0 mr-3">
        {getFileIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <div className="truncate">
            <p className="text-sm font-medium text-black truncate">{fileName}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">{fileSize}</p>
              {file.type.startsWith('image/') && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Image
                </Badge>
              )}
              {file.type === 'application/pdf' && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  PDF
                </Badge>
              )}
              {extractedInfo?.language && (
                <Badge variant="outline" className={extractedInfo.language === 'Tagalog' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'}>
                  {extractedInfo.language}
                </Badge>
              )}
            </div>
          </div>
          
          {status === 'pending' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full h-6 w-6 p-0 ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onRemove(file)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove</span>
            </Button>
          )}
        </div>
        
        {status === 'pending' && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Detected Information:</div>
            {extractedInfo ? (
              <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
                {showField(extractedInfo.studentNumber, "Student ID")}
                {showField(extractedInfo.senderName, "Sender")}
                {showField(extractedInfo.addressee, "Addressee")}
                {showField(extractedInfo.date, "Date")}
                
                {extractedInfo.natureOfExcuse && (
                  <p>
                    <span className="font-medium">Excuse:</span> 
                    {extractedInfo.natureOfExcuse.length > 60 
                      ? `${extractedInfo.natureOfExcuse.substring(0, 60)}...` 
                      : extractedInfo.natureOfExcuse}
                  </p>
                )}
                
                <p><span className="font-medium">Violation Type:</span> {violationType}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Waiting for analysis...</p>
            )}
          </div>
        )}
        
        {status === 'converting' && (
          <div className="mt-2">
            <div className="flex items-center text-amber-600 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Converting image to PDF...
            </div>
          </div>
        )}
        
        {status === 'analyzing' && (
          <div className="mt-2">
            <div className="flex items-center text-amber-600 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Analyzing document...
            </div>
          </div>
        )}
        
        {status === 'uploading' && (
          <div className="mt-2">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-gray-500 mt-1">Uploading... {progress}%</p>
          </div>
        )}
        
        {status === 'completed' && (
          <div className="mt-2 flex items-center text-green-600 text-xs">
            <Check className="h-3 w-3 mr-1" />
            Upload complete
          </div>
        )}
        
        {status === 'error' && (
          <div className="mt-2 flex items-center text-red-600 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Upload failed. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
