
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Index() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check URL parameters for errors
    const params = new URLSearchParams(location.search);
    const errorDesc = params.get('error_description');
    if (errorDesc) {
      setError("Please sign in with your NEU email address (@neu.edu.ph)");
    }

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userEmail = session.user.email;
        if (userEmail?.endsWith('@neu.edu.ph')) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: session.user.id,
                  email: userEmail,
                  full_name: session.user.user_metadata.full_name || null,
                }
              ]);

            if (profileError) {
              toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create user profile.",
              });
              return;
            }
          }
          navigate('/dashboard');
        }
      }
    };

    checkUser();
  }, [navigate, toast, location]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'neu.edu.ph',
          },
        },
      });

      if (error) {
        setError("Failed to sign in. Please try again.");
      }
    } catch (error) {
      setError("An unexpected error occurred during sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-500 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-sm bg-white/90 shadow-xl border-0 p-8">
          <CardContent className="p-0 space-y-6">
            <div className="flex justify-center">
              <img 
                src="/lovable-uploads/1662da6e-c745-4b96-a54c-d177ff86c299.png" 
                alt="NEU Logo" 
                className="w-24 h-24"
              />
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-gray-800">
                Welcome to NEU Salaysay Tracker App
              </h1>
              <p className="text-gray-600 text-sm">
                Sign in with your NEU account to continue
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
              variant="outline"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
