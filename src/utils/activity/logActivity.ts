
import { supabase } from "@/integrations/supabase/client";
import { ActionType, StatusType } from "./types";

/**
 * Logs user activity in the system
 */
export const logActivity = async (
  action: ActionType, 
  description: string, 
  fileId?: string, 
  newStatus?: StatusType,
  fileName?: string
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("Cannot log activity: No active session");
      return false;
    }

    console.log(`Logging activity: ${action} - ${description}`);

    // Create a new log entry in Supabase
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        action_type: action,
        description: action === 'delete' ? description : description,
        related_file_id: fileId || null,
        new_status: newStatus || null,
      });
      
    if (error) {
      console.error("Error logging activity to Supabase:", error);
      return false;
    } else {
      console.log("Activity logged successfully to Supabase", data);
      return true;
    }
  } catch (err) {
    console.error("Error logging activity:", err);
    return false;
  }
};

/**
 * Checks if there was a recent login activity for the user
 * to prevent duplicate login logs on page refresh
 */
export const hasRecentLoginActivity = async (userId: string, timeWindowMinutes: number = 10): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    // Calculate time window (default: 10 minutes)
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);
    
    // Check for any login activities in the recent time window
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', 'login')
      .gte('created_at', timeWindow.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error("Error checking for recent login activity:", error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (err) {
    console.error("Error checking recent login activity:", err);
    return false;
  }
};

/**
 * Forcefully logs login activity without requiring an active session
 */
export const logLoginActivity = async (userId: string) => {
  try {
    // First check if we already have a recent login activity to avoid duplicates on refresh
    const hasRecent = await hasRecentLoginActivity(userId);
    if (hasRecent) {
      console.log("Skipping login activity logging - recent login found");
      return true; // Return true to indicate successful handling (just not logging)
    }
    
    console.log(`Logging login activity for user ${userId}`);
    
    // Create a new log entry in Supabase with a clean description
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: 'login',
        description: 'User logged in',
        related_file_id: null,
        new_status: null,
      });
      
    if (error) {
      console.error("Error logging login activity to Supabase:", error);
      return false;
    } else {
      console.log("Login activity logged successfully to Supabase", data);
      return true;
    }
  } catch (err) {
    console.error("Error logging login activity:", err);
    return false;
  }
};

/**
 * Specifically logs logout activity, should be called when user signs out
 */
export const logLogoutActivity = async (userId: string) => {
  if (!userId) {
    console.error("Cannot log logout: No user ID provided");
    return false;
  }
  
  console.log(`Explicitly logging logout for user ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: 'logout',
        description: 'User logged out',
        related_file_id: null,
        new_status: null,
      });
      
    if (error) {
      console.error("Error logging logout to Supabase:", error);
      return false;
    } else {
      console.log("Logout logged successfully to Supabase", data);
      return true;
    }
  } catch (err) {
    console.error("Error logging logout:", err);
    return false;
  }
};
