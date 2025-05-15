
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { DropZone } from "./upload/DropZone";
import { FileUploadItem } from "./upload/FileUploadItem";
import { useFileUpload } from "./upload/useFileUpload";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUploadComplete?: () => void;
}

export function UploadDialog({ isOpen, onClose, userId, onUploadComplete }: UploadDialogProps) {
  const { toast } = useToast();
  const { uploads, addFiles, removeFile, uploadToSupabase, resetUploads } = useFileUpload(userId);

  // Add the missing variable definition
  const allUploadsCompleted = uploads.length > 0 && 
    uploads.every(upload => upload.status === 'completed');

  const handleUpload = async () => {
    const pendingUploads = uploads.filter(upload => upload.status === 'pending');
    
    if (pendingUploads.length === 0) {
      toast({
        title: "No files to upload",
        description: "Please select files to upload."
      });
      return;
    }

    // Upload each pending file - violation type will be determined automatically
    for (const upload of pendingUploads) {
      try {
        await uploadToSupabase(upload.file);
      } catch (error) {
        console.error("Failed to upload file:", upload.file.name, error);
      }
    }
    
    // Trigger refresh of file explorer after upload completes
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleClose = () => {
    // Reset the state before closing
    if (allUploadsCompleted) {
      resetUploads();
    }
    onClose();
  };

  // Reset uploads when the dialog is closed
  useEffect(() => {
    if (!isOpen) {
      resetUploads();
    }
  }, [isOpen, resetUploads]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-black">
            Upload Salaysay
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {uploads.length === 0 ? (
            <DropZone onFilesSelected={addFiles} />
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <FileUploadItem
                  key={upload.file.name}
                  upload={upload}
                  onRemove={removeFile}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              Cancel
            </Button>
            {allUploadsCompleted ? (
              <Button
                onClick={handleClose}
                className="px-6"
              >
                Done
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                className="px-6"
                disabled={uploads.length === 0 || uploads.some(upload => ['converting', 'ocr-processing', 'uploading', 'analyzing'].includes(upload.status))}
              >
                Upload files
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
