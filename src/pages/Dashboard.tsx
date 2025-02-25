
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Loader2, Upload, File } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string, url: string }>>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
      } else {
        // Fetch existing files when component mounts
        fetchUploadedFiles();
      }
    };
    checkUser();
  }, [navigate]);

  const fetchUploadedFiles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .storage
      .from('salaysay-documents')
      .list(session.user.id + '/');

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching files",
        description: error.message
      });
      return;
    }

    if (data) {
      const filesWithUrls = await Promise.all(data.map(async (file) => {
        const { data: { publicUrl } } = supabase
          .storage
          .from('salaysay-documents')
          .getPublicUrl(`${session.user.id}/${file.name}`);
        
        return {
          name: file.name,
          url: publicUrl
        };
      }));
      setUploadedFiles(filesWithUrls);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setShowConfirmDialog(true);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select a PDF file"
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setShowConfirmDialog(false);
    setUploading(true);
    setUploadProgress(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUploading(false);
      return;
    }

    try {
      const filePath = `${session.user.id}/${selectedFile.name}`;
      
      const { error } = await supabase.storage
        .from('salaysay-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      setUploadProgress(100);
      toast({
        title: "Success",
        description: "File uploaded successfully"
      });

      // Refresh the file list
      await fetchUploadedFiles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message
      });
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setUploadProgress(0);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message
      });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to SALAYSAY TRACKER APP</h1>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="bg-white hover:bg-gray-100"
          >
            Sign Out
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upload Documents</h2>
            <div>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Select PDF File
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Uploaded Documents</h2>
          <div className="space-y-4">
            {uploadedFiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No documents uploaded yet</p>
            ) : (
              uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <File className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upload Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to upload {selectedFile?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedFile(null);
              setShowConfirmDialog(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpload}>Upload</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
