
import { supabase } from "@/integrations/supabase/client";

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Use the constants from the client file instead of trying to access protected properties
    const SUPABASE_URL = "https://mhpuvcolekfrvvcypgdz.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocHV2Y29sZWtmcnZ2Y3lwZ2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MTk4MTUsImV4cCI6MjA1NDQ5NTgxNX0.M6biIvgBUZ-gX9NRePCh835MSSvM0x3ZyZxu_eV3aRk";
    
    // First ping - check if the service is responding at all
    const initialPing = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    if (!initialPing.ok) {
      console.error("Initial Supabase API ping failed with status:", initialPing.status);
      return false;
    }
    
    // Simple query to check if database connection works
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error("Supabase database connection error:", error);
      return false;
    }
    
    console.log("Supabase connection successful", data);
    return true;
  } catch (error) {
    console.error("Unexpected error when checking Supabase connection:", error);
    return false;
  }
}
