
import { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthContext } from "@/App";
import { toast } from "sonner";
import { logLoginActivity } from "@/utils/activity";

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast: uiToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading: authLoading } = useContext(AuthContext);

  useEffect(() => {
    // Check URL parameters for errors
    const params = new URLSearchParams(location.search);
    const errorDesc = params.get('error_description');
    if (errorDesc) {
      setError("Please sign in with your NEU email address (@neu.edu.ph)");
    }

    // Redirect to dashboard if already authenticated
    if (!authLoading && session) {
      console.log("User is authenticated, redirecting to dashboard");
      navigate('/dashboard');
    }
  }, [navigate, location, session, authLoading]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'neu.edu.ph',
          },
        },
      });

      if (error) {
        console.error("Sign in error:", error);
        setError("Failed to sign in. Please try again.");
        toast.error("Sign in failed. Please try again.");
      }
      // The actual login activity will be logged in App.tsx after the redirect completes
    } catch (error) {
      console.error("Unexpected sign in error:", error);
      setError("An unexpected error occurred during sign in.");
      toast.error("An unexpected error occurred during sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-sky-100">
      {/* Background illustration elements */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src="/lovable-uploads/48235189-18d7-4964-8f91-cd59ed708e5f.png" 
          alt="Background illustration" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[920px] z-10"
      >
        <div className="w-full rounded-[20px] overflow-hidden bg-gradient-to-b from-[rgba(27,82,181,0.8)] to-[rgba(13,36,77,0.8)] relative p-12">
          <div className="flex flex-col items-center justify-center">
            {/* NEU Logo - Increased size */}
            <img 
              src="/lovable-uploads/42a0c089-7817-4d54-b180-12a27a76a70f.png" 
              alt="NEU Logo" 
              className="w-[220px] h-[220px] mb-3"
            />
            
            {/* Title and subtitle - Made larger and subtitle positioned below */}
            <h1 className="text-[56px] font-bold text-white text-center w-full mt-3">
              NEU-STAT
            </h1>
            <p className="text-[28px] font-bold text-white text-center w-full mt-2">
              Salaysay Tracking And Archival Tool
            </p>

            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="mt-8 max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-10 w-full max-w-md flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 border-0 py-6 text-lg"
              variant="outline"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
