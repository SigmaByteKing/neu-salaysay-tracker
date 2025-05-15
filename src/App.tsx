
import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ActivityLogs from "./pages/ActivityLogs";
import NotFound from "./pages/NotFound";
import { supabase } from "./integrations/supabase/client";
import { logLoginActivity, logLogoutActivity } from "./utils/activity";
import { toast } from "sonner";

export const AuthContext = React.createContext({
  session: null,
  user: null,
  isLoading: true
});

// Define queryClient outside component to avoid recreation on render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000,
    },
  },
});

const App: React.FC = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActiveUserId, setLastActiveUserId] = useState<string | null>(null);
  const [hasInitialSessionLoaded, setHasInitialSessionLoaded] = useState(false);
  
  // Use these flags to track genuine login/logout events
  const [hasGenuineLogin, setHasGenuineLogin] = useState(false);
  const [genuineLoginLogged, setGenuineLoginLogged] = useState(false);

  const isGoogleAuth = () => {
    const url = new URL(window.location.href);
    return url.hash.includes('google') || 
           url.searchParams.has('provider=google') || 
           url.hash.includes('provider=google');
  };

  const handleLogout = async (userId: string) => {
    if (!userId) {
      console.error("Cannot log logout: No user ID provided");
      return;
    }
    
    console.log("Logging out user:", userId);
    
    try {
      const logSuccess = await logLogoutActivity(userId);
      
      if (logSuccess) {
        console.log("Successfully logged logout activity to Supabase");
        queryClient.invalidateQueries();
      } else {
        console.error("Failed to log logout activity to Supabase");
      }
    } catch (err) {
      console.error("Error logging logout activity:", err);
    }
  };

  // Handle login activity logging
  useEffect(() => {
    // Only run when we have a genuine login
    if (session && user && hasGenuineLogin && !genuineLoginLogged) {
      console.log("Genuine login detected, logging activity");
      setGenuineLoginLogged(true);
      
      try {
        // Ensure user profile exists with correct avatar URL
        const updateUserProfile = async () => {
          const avatarUrl = user.user_metadata?.avatar_url || 
                          user.user_metadata?.picture || 
                          null;
                          
          if (avatarUrl) {
            console.log("Updating user profile with avatar URL on login:", avatarUrl);
            const { error } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "User",
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
              });
              
            if (error) {
              console.error("Error updating profile with avatar on login:", error);
            }
          }
        };
        
        // Update profile first, then log activity
        updateUserProfile().then(() => {
          logLoginActivity(user.id)
            .then(logSuccess => {
              if (logSuccess) {
                console.log("Successfully logged login activity to Supabase");
                toast.success("Successfully signed in");
              } else {
                console.error("Failed to log login activity to Supabase");
              }
            });
        });
      } catch (err) {
        console.error("Error logging login activity:", err);
      }
    }
  }, [session, user, hasGenuineLogin, genuineLoginLogged]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        const userId = lastActiveUserId || (user?.id) || (newSession?.user?.id);
        
        if (userId) {
          console.log("SIGNED_OUT event detected for user:", userId);
          await handleLogout(userId);
        }
        
        setSession(null);
        setUser(null);
        setHasGenuineLogin(false);
        setGenuineLoginLogged(false);
        
        toast.info("Signed out successfully");
      } else if (event === 'SIGNED_IN') {
        console.log("Genuine login detected, SIGNED_IN event");
        setSession(newSession);
        setUser(newSession?.user || null);
        setLastActiveUserId(newSession?.user?.id || null);
        setHasGenuineLogin(true);
        
        // The toast will be shown in the useEffect that logs the login
      } else if (event === 'INITIAL_SESSION') {
        // Don't show toast for initial session loading
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession?.user) {
          setLastActiveUserId(newSession.user.id);
          setHasInitialSessionLoaded(true);
        }
      }
    });

    const initSession = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          toast.error("Error retrieving your session.");
        } else if (data?.session) {
          console.log("Retrieved existing session:", data.session.user?.email);
          setSession(data.session);
          setUser(data.session.user);
          setLastActiveUserId(data.session.user.id);
          setHasInitialSessionLoaded(true);
        } else {
          console.log("No existing session found");
        }
      } catch (err) {
        console.error("Unexpected error in session initialization:", err);
        toast.error("An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ session, user, isLoading }}>
          <BrowserRouter>
            <TooltipProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route 
                  path="/dashboard" 
                  element={
                    !isLoading && !session ? <Navigate to="/" /> : <Dashboard />
                  } 
                />
                <Route 
                  path="/activity-logs" 
                  element={
                    !isLoading && !session ? <Navigate to="/" /> : <ActivityLogs />
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </BrowserRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
