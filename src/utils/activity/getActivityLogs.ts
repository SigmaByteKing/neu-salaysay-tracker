
import { supabase } from "@/integrations/supabase/client";
import { ActivityLog } from "@/types/activity.types";
import { ActivityLogFilters, ActivityLogResult, ActionType, StatusType } from "./types";

/**
 * Fetches activity logs with optional filtering and pagination
 */
export const getActivityLogs = async ({
  userFilter = 'all',
  actionFilter = 'all',
  violationTypeFilter = 'all',
  startDate = null,
  endDate = null,
  page = 1,
  itemsPerPage = 10,
  fileName = ''
}: ActivityLogFilters): Promise<ActivityLogResult> => {
  try {
    // Calculate pagination parameters
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    // First, get the total count for pagination
    let countQuery = supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true });
    
    // Apply filters to count query
    if (userFilter !== 'all') {
      countQuery = countQuery.eq('user_id', userFilter);
    }
    
    if (actionFilter !== 'all') {
      countQuery = countQuery.eq('action_type', actionFilter);
    }
    
    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }
    
    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error getting count:', countError);
      return { logs: [], totalCount: 0 };
    }
    
    // Now build the main query for the data
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        created_at,
        user_id,
        action_type,
        description,
        related_file_id,
        new_status
      `)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (userFilter !== 'all') {
      query = query.eq('user_id', userFilter);
    }
    
    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    // Apply pagination
    query = query.range(from, to);
    
    // Execute the query
    const { data: activityData, error } = await query;
    
    if (error) {
      console.error('Error fetching activity logs:', error);
      return { logs: [], totalCount: 0 };
    }
    
    // If no data returned, return empty array
    if (!activityData) {
      return { logs: [], totalCount: 0 };
    }
    
    // We need to get profile information separately
    // Get unique user IDs from the activity logs
    const userIds = [...new Set(activityData.map(log => log.user_id))];
    
    // Fetch profile information for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Create a map of user IDs to profile data for quick lookup
    const profileMap: Record<string, any> = {};
    
    // First, populate the map with profiles data
    if (profilesData) {
      profilesData.forEach(profile => {
        profileMap[profile.id] = {
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        };
      });
    }
    
    // Fetch all authenticated users (without admin privileges)
    // We'll try to get avatar URLs from auth metadata for all users
    const authUsersPromises = userIds.map(async (userId) => {
      try {
        // For the current user, we can get their metadata directly
        if (userId === (await supabase.auth.getUser()).data.user?.id) {
          return await supabase.auth.getUser();
        }
        return null;
      } catch (error) {
        console.error(`Error fetching auth user ${userId}:`, error);
        return null;
      }
    });
    
    // Resolve all promises
    const authUsersResults = await Promise.all(authUsersPromises);
    
    // Process auth metadata for avatar URLs
    authUsersResults.forEach(result => {
      if (result && result.data && result.data.user) {
        const user = result.data.user;
        const userId = user.id;
        
        // Only update if we already have a profile for this user
        if (profileMap[userId]) {
          const avatarFromMetadata = 
            user.user_metadata?.avatar_url || 
            user.user_metadata?.picture;
          
          if (avatarFromMetadata) {
            profileMap[userId] = {
              ...profileMap[userId],
              avatar_url: avatarFromMetadata
            };
          }
        }
      }
    });
    
    // Get any related file IDs
    const fileIds = activityData
      .map(log => log.related_file_id)
      .filter(id => id !== null && id !== undefined);
    
    // Create a map for file data
    const fileMap: Record<string, any> = {};
    
    // Store deleted file information extracted from descriptions
    const deletedFilesInfo: Record<string, any> = {};
    
    // Process delete operation descriptions to extract file information
    activityData.forEach(log => {
      if (log.action_type === 'delete' && log.description) {
        // Try to extract file information from the description
        const match = log.description.match(/Deleted\s+salaysay\s+for\s+(.+?)\s+\(filename:\s+(.+?)\)/i);
        if (match && match[1] && match[2]) {
          const violationType = match[1];
          const fileName = match[2];
          
          deletedFilesInfo[log.id] = {
            violation_type: violationType,
            file_name: fileName
          };
          
          // For deleted files where the related_file_id still exists
          if (log.related_file_id) {
            fileMap[log.related_file_id] = {
              violation_type: violationType,
              file_path: 'deleted-file',
              file_name: fileName,
              user_id: log.user_id
            };
          }
        }
      }
    });
    
    if (fileIds.length > 0) {
      // First, try to fetch existing files
      const { data: filesData, error: filesError } = await supabase
        .from('salaysay_submissions')
        .select('id, violation_type, file_path, user_id')
        .in('id', fileIds);
        
      if (filesError) {
        console.error('Error fetching files:', filesError);
      } else if (filesData) {
        // For each file, extract filename and capture user info
        for (const file of filesData) {
          // Extract filename from the file_path
          const fileName = file.file_path.split('/').pop() || file.file_path;
          
          fileMap[file.id] = {
            violation_type: file.violation_type,
            file_path: file.file_path,
            file_name: fileName,
            user_id: file.user_id
          };
        }
      }
      
      // Next, check if any file IDs are missing from the result (might be deleted)
      // and add information from our fileMap if available
      fileIds.forEach(fileId => {
        if (fileId && !fileMap[fileId]) {
          // Check if we have any deleted file info for this ID
          const logWithThisFileId = activityData.find(log => log.related_file_id === fileId);
          if (logWithThisFileId && deletedFilesInfo[logWithThisFileId.id]) {
            const deletedInfo = deletedFilesInfo[logWithThisFileId.id];
            fileMap[fileId] = {
              violation_type: deletedInfo.violation_type,
              file_path: 'deleted-file',
              file_name: deletedInfo.file_name,
              user_id: logWithThisFileId.user_id
            };
          }
        }
      });
    }
    
    // Format the data to match our ActivityLog type
    const logsWithDetails: ActivityLog[] = activityData.map(log => {
      // Get user profile data
      const userProfile = profileMap[log.user_id] || {
        email: null,
        full_name: null,
        avatar_url: null
      };
      
      // Get file info if available
      let fileInfo = log.related_file_id ? fileMap[log.related_file_id] : undefined;
      let deletedFileInfo = deletedFilesInfo[log.id];
      
      // If file info is not found but this is a delete action, try to reconstruct it
      if (!fileInfo && log.action_type === 'delete' && log.description) {
        const match = log.description.match(/Deleted\s+salaysay\s+for\s+(.+?)\s+\(filename:\s+(.+?)\)/i);
        if (match && match[1] && match[2]) {
          const violationType = match[1];
          const fileName = match[2];
          
          fileInfo = {
            violation_type: violationType,
            file_path: 'deleted-file',
            file_name: fileName,
            user_id: log.user_id
          };
          
          deletedFileInfo = {
            violation_type: violationType,
            file_name: fileName
          };
        }
      }
      
      // Get uploader profile if available (but don't include redundant uploader info)
      let uploaderProfile;
      if (fileInfo && fileInfo.user_id && fileInfo.user_id !== log.user_id) {
        uploaderProfile = profileMap[fileInfo.user_id];
      }
      
      // Add uploader info to file object if available and it's not the same user
      if (fileInfo && uploaderProfile) {
        fileInfo.uploader = {
          full_name: uploaderProfile.full_name,
          email: uploaderProfile.email,
          avatar_url: uploaderProfile.avatar_url
        };
      }
      
      // Apply file name filter if provided
      if (fileName && fileInfo) {
        if (!fileInfo.file_name?.toLowerCase().includes(fileName.toLowerCase())) {
          return null; // This log entry doesn't match the file name filter
        }
      }
      
      return {
        id: log.id,
        created_at: log.created_at,
        user_id: log.user_id,
        action_type: log.action_type as ActionType,
        description: log.description,
        related_file_id: log.related_file_id,
        new_status: log.new_status as StatusType | undefined,
        user: {
          ...userProfile
        },
        file: fileInfo,
        deleted_file_info: deletedFileInfo
      };
    }).filter(Boolean) as ActivityLog[]; // Filter out any null entries (from file name filter)
    
    // Apply violation type filter if specified
    let filteredLogs = logsWithDetails;
    if (violationTypeFilter !== 'all') {
      filteredLogs = logsWithDetails.filter(log => {
        if (log.file && log.file.violation_type === violationTypeFilter) {
          return true;
        }
        if (log.deleted_file_info && log.deleted_file_info.violation_type === violationTypeFilter) {
          return true;
        }
        return false;
      });
    }
    
    return {
      logs: filteredLogs,
      totalCount: violationTypeFilter !== 'all' || fileName ? filteredLogs.length : (count || 0)
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return { logs: [], totalCount: 0 };
  }
};
