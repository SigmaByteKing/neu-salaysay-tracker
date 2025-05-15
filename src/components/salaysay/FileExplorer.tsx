import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash, FileIcon, Loader2, Eye, ChevronDown, ChevronRight, Info } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logActivity } from "@/utils/activity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Json } from "@/integrations/supabase/types";
import { FileStatistics } from "./FileStatistics";

type SalaysayFile = {
  id: string;
  created_at: string;
  user_id: string;
  file_path: string;
  violation_type: string;
  file_name?: string; // Derived property
  file_size?: number;  // Optional since it might not be in the database
  metadata?: {
    student_number?: string;
    sender_name?: string;
    incident_date?: string;
    excuse_description?: string;
    addressee?: string;
  } | Json | null;
  profiles?: {
    full_name: string;
    avatar_url?: string;
    email?: string;
  }
};

type FileStats = {
  totalFiles: number;
  violationTypeCounts: Record<string, number>;
  senderNames?: Record<string, {
    count: number;
    violationTypes: Record<string, number>;
  }>;
  topSenders: Array<[string, { count: number }]>;
}

export function FileExplorer({ 
  userId, 
  refreshTrigger, 
  showAllUsers,
  violationTypeFilters = [],
  dateRangeFilter = { startDate: null, endDate: null },
  userFilter = null,
  keywordFilter = "",
  onStatsCalculated
}: { 
  userId: string;
  refreshTrigger: number;
  showAllUsers: boolean;
  violationTypeFilters?: string[];
  dateRangeFilter?: { startDate: string | null, endDate: string | null };
  userFilter?: string | null;
  keywordFilter?: string;
  onStatsCalculated?: (stats: FileStats) => void;
}) {
  const [files, setFiles] = useState<SalaysayFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<SalaysayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState<SalaysayFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('salaysay_submissions')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false });
        
        if (!showAllUsers) {
          query = query.eq('user_id', userId);
        } else if (userFilter) {
          query = query.eq('user_id', userFilter);
        }

        if (dateRangeFilter.startDate) {
          query = query.gte('created_at', `${dateRangeFilter.startDate}T00:00:00`);
        }
        
        if (dateRangeFilter.endDate) {
          query = query.lte('created_at', `${dateRangeFilter.endDate}T23:59:59`);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching files:", error);
          toast.error("Failed to load files. Please try again.");
        } else {
          const processedData: SalaysayFile[] = data?.map(item => ({
            ...item,
            file_name: item.file_path.split('/').pop() || item.file_path,
          })) || [];
          
          const userIds = [...new Set(processedData.map(file => file.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', userIds);
            
          const profileMap: Record<string, any> = {};
          if (profiles) {
            profiles.forEach(profile => {
              profileMap[profile.id] = profile;
            });
          }
          
          setUserProfiles(profileMap);
          setFiles(processedData);
          
          applyFilters(processedData, violationTypeFilters, keywordFilter);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("An unexpected error occurred while loading files.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [userId, refreshTrigger, showAllUsers, userFilter, dateRangeFilter.startDate, dateRangeFilter.endDate]);

  useEffect(() => {
    applyFilters(files, violationTypeFilters, keywordFilter);
  }, [violationTypeFilters, keywordFilter]);

  const applyFilters = (files: SalaysayFile[], violationTypeFilters: string[], keywordFilter: string) => {
    if (!files.length) return;
    
    let filtered = files;
    
    if (violationTypeFilters.length) {
      filtered = filtered.filter(file => 
        violationTypeFilters.includes(file.violation_type)
      );
    }
    
    if (keywordFilter.trim()) {
      const searchTerm = keywordFilter.toLowerCase();
      filtered = filtered.filter(file => {
        const fileName = file.file_name || file.file_path.split('/').pop() || '';
        if (fileName.toLowerCase().includes(searchTerm)) return true;
        
        if (file.metadata) {
          const metadata = file.metadata as any;
          
          if (metadata.student_number && metadata.student_number.toLowerCase().includes(searchTerm)) return true;
          if (metadata.sender_name && metadata.sender_name.toLowerCase().includes(searchTerm)) return true;
          if (metadata.incident_date && metadata.incident_date.toLowerCase().includes(searchTerm)) return true;
          if (metadata.excuse_description && metadata.excuse_description.toLowerCase().includes(searchTerm)) return true;
          if (metadata.addressee && metadata.addressee.toLowerCase().includes(searchTerm)) return true;
        }
        
        return false;
      });
    }
    
    setFilteredFiles(filtered);
    calculateFileStats(filtered, keywordFilter);
  };

  const calculateFileStats = (files: SalaysayFile[], searchKeyword: string) => {
    const stats: FileStats = {
      totalFiles: files.length,
      violationTypeCounts: {},
      senderNames: {},
      topSenders: [] // This will be overridden by the Dashboard component
    };

    files.forEach(file => {
      if (file.violation_type) {
        stats.violationTypeCounts[file.violation_type] = 
          (stats.violationTypeCounts[file.violation_type] || 0) + 1;
      }

      if (file.metadata) {
        const metadata = file.metadata as any;
        if (metadata.sender_name) {
          const senderName = metadata.sender_name;
          
          if (!stats.senderNames![senderName]) {
            stats.senderNames![senderName] = {
              count: 0,
              violationTypes: {}
            };
          }
          
          stats.senderNames![senderName].count += 1;
          
          if (file.violation_type) {
            stats.senderNames![senderName].violationTypes[file.violation_type] = 
              (stats.senderNames![senderName].violationTypes[file.violation_type] || 0) + 1;
          }
        }
      }
    });

    // Pass the calculated stats up to the parent component
    if (onStatsCalculated) {
      onStatsCalculated(stats);
    }
  };

  const handleDeleteClick = async (file: SalaysayFile) => {
    if (file.user_id !== userId) {
      toast.error("You can only delete your own files");
      return;
    }
    setFileToDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const handleViewFile = async (file: SalaysayFile) => {
    try {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('salaysay-uploads')
        .createSignedUrl(file.file_path, 60);
      
      if (urlError) {
        console.error("Error generating signed URL:", urlError);
        toast.error("Failed to generate file URL. Please try again.");
        return;
      }
      
      await logActivity(
        'view',
        `Viewed salaysay for ${file.violation_type}`,
        file.id
      );
      
      window.open(urlData.signedUrl, '_blank');
    } catch (error) {
      console.error("Error viewing file:", error);
      toast.error("An error occurred while trying to view the file.");
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      const fileName = fileToDelete.file_name || fileToDelete.file_path.split('/').pop() || fileToDelete.file_path;
      
      const { error: storageError } = await supabase.storage
        .from('salaysay-uploads')
        .remove([fileToDelete.file_path]);
      
      if (storageError) {
        toast.error("Failed to delete file from storage.");
        console.error(storageError);
        return;
      }
      
      await logActivity(
        'delete',
        `Deleted salaysay for ${fileToDelete.violation_type}`,
        fileToDelete.id,
        null,
        fileName
      );
      
      const { error: dbError } = await supabase
        .from('salaysay_submissions')
        .delete()
        .eq('id', fileToDelete.id);
      
      if (dbError) {
        toast.error("Failed to delete file record.");
        console.error(dbError);
        return;
      }
      
      setFiles(files.filter(file => file.id !== fileToDelete.id));
      setFilteredFiles(filteredFiles.filter(file => file.id !== fileToDelete.id));
      toast.success("File deleted successfully.");
    } catch (error) {
      console.error("Error during deletion:", error);
      toast.error("An error occurred during deletion.");
    } finally {
      setIsDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const getUploaderInitials = (file: SalaysayFile) => {
    const profile = userProfiles[file.user_id];
    if (!profile || !profile.full_name) return "U";
    
    return profile.full_name
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleExpandRow = (fileId: string) => {
    setExpandedFileId(expandedFileId === fileId ? null : fileId);
  };

  const getMetadataValue = (metadata: SalaysayFile['metadata'], key: string): string | undefined => {
    if (!metadata) return undefined;
    
    if (typeof metadata === 'object') {
      return (metadata as any)[key];
    }
    
    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata);
        return parsed[key];
      } catch (e) {
        console.error("Error parsing metadata string:", e);
        return undefined;
      }
    }
    
    return undefined;
  };

  if (loading) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-8 text-center">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </td>
      </tr>
    );
  }

  if (files.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
          No salaysay files found. Click "Submit Salaysay" to upload a new file.
        </td>
      </tr>
    );
  }

  if (filteredFiles.length === 0 && (violationTypeFilters.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate || userFilter || keywordFilter)) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
          No files match your selected filters.
        </td>
      </tr>
    );
  }

  return (
    <>
      {filteredFiles.map((file) => {
        const uploader = userProfiles[file.user_id];
        const isExpanded = expandedFileId === file.id;
        const canDelete = file.user_id === userId;
        
        const hasMetadata = file.metadata && (
          getMetadataValue(file.metadata, 'student_number') || 
          getMetadataValue(file.metadata, 'sender_name') || 
          getMetadataValue(file.metadata, 'incident_date') || 
          getMetadataValue(file.metadata, 'excuse_description') ||
          getMetadataValue(file.metadata, 'addressee')
        );
        
        return (
          <>
            <tr 
              key={file.id} 
              className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
              onClick={() => hasMetadata && toggleExpandRow(file.id)}
            >
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  {hasMetadata && (
                    <button 
                      className="flex-shrink-0 focus:outline-none" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandRow(file.id);
                      }}
                    >
                      {isExpanded ? 
                        <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      }
                    </button>
                  )}
                  <FileIcon className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-gray-700 truncate max-w-[200px]">
                    {file.file_name || file.file_path.split('/').pop() || file.file_path}
                  </span>
                  {hasMetadata && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <div className="cursor-help">
                            <Info className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="w-fit p-2">
                          <span className="text-xs">Contains AI-extracted information</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {format(new Date(file.created_at), "dd/MM/yyyy h:mm a")}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {file.violation_type || "Dress Code Violation"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {uploader ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {uploader.avatar_url ? (
                        <AvatarImage 
                          src={uploader.avatar_url} 
                          alt={uploader.full_name || "User"} 
                        />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getUploaderInitials(file)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span>{uploader.full_name || uploader.email || "Unknown user"}</span>
                  </div>
                ) : (
                  <span>Unknown user</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewFile(file);
                    }}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(file);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
            {isExpanded && hasMetadata && (
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-4 py-3 border-t border-gray-100">
                  <div className="px-4 py-3 bg-white rounded-md shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      AI-Extracted Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getMetadataValue(file.metadata, 'sender_name') && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Sender Name</p>
                          <p className="text-sm font-medium">{getMetadataValue(file.metadata, 'sender_name')}</p>
                        </div>
                      )}
                      {getMetadataValue(file.metadata, 'addressee') && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Addressee</p>
                          <p className="text-sm font-medium">{getMetadataValue(file.metadata, 'addressee')}</p>
                        </div>
                      )}
                      {getMetadataValue(file.metadata, 'student_number') && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Student Number</p>
                          <p className="text-sm font-medium">{getMetadataValue(file.metadata, 'student_number')}</p>
                        </div>
                      )}
                      {getMetadataValue(file.metadata, 'incident_date') && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Incident Date</p>
                          <p className="text-sm font-medium">{getMetadataValue(file.metadata, 'incident_date')}</p>
                        </div>
                      )}
                      {getMetadataValue(file.metadata, 'excuse_description') && (
                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <p className="text-xs text-gray-500">Nature of Excuse</p>
                          <p className="text-sm bg-gray-50 p-2 rounded border border-gray-100">{getMetadataValue(file.metadata, 'excuse_description')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </>
        )
      })}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {fileToDelete?.file_name || fileToDelete?.file_path.split('/').pop()}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
