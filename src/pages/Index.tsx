import { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Moon, Sun } from "lucide-react";
import { AuthContext } from "@/App";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading: authLoading } = useContext(AuthContext);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorDesc = params.get('error_description');
    if (errorDesc) {
      setError("Please sign in with your NEU email address (@neu.edu.ph)");
    }

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
    } catch (error) {
      console.error("Unexpected sign in error:", error);
      setError("An unexpected error occurred during sign in.");
      toast.error("An unexpected error occurred during sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode 
      ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900' 
      : 'bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100'}`}>

      {/* Background Patterns */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 opacity-30">
        <div className="absolute w-full h-full">
          {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-blue-600/40' : 'bg-blue-400/60'}`} style={{transform: `translate(${pos.includes('right') ? '30%' : '-30%'}, ${pos.includes('bottom') ? '30%' : '-30%'})`}}></div>
          ))}
        </div>
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C83.45,59.92,200.66,80.59,321.39,56.44Z" className={darkMode ? "fill-blue-700/30" : "fill-blue-500/30"}></path>
        </svg>
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className={darkMode ? "fill-blue-800/30" : "fill-blue-700/30"}></path>
        </svg>
      </div>

      {/* Main Container */}
      <div className={`z-10 flex flex-col md:flex-row max-w-7xl w-full mx-6 overflow-hidden rounded-3xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Left Side */}
        <div className="md:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-700 to-blue-900 hidden md:block">
          <div className="flex flex-col items-center justify-center h-full p-12 relative z-10">
            <img src="/lovable-uploads/NEULogoPic.png" alt="NEU Logo" className="w-40 h-40 mb-6" />
            <h2 className="text-4xl font-bold text-white text-center mb-1">NEU-STAT</h2>
            <p className="text-xl text-blue-100 text-center mb-4">Salaysay Tracking And Archival Tool</p>
            <p className="text-sm text-blue-100 text-center max-w-md italic">
              Streamlining documentation management for better efficiency.
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className={`md:w-1/2 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'} p-10 md:p-16 flex flex-col justify-center`}>
          <div className="absolute top-4 right-4">
            <button onClick={toggleDarkMode} className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="flex items-center justify-center md:hidden mb-6">
            <img src="/lovable-uploads/NEULogoPic.png" alt="NEU Logo" className="w-24 h-24" />
          </div>

          <h1 className="text-3xl font-bold mb-2 text-center">
            Sign in to <span className={darkMode ? 'text-blue-400' : 'text-blue-700'}>NEU-STAT</span>
          </h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8 text-center`}>
            Access your university account to continue
          </p>

          {error && (
            <div className={`flex items-center gap-2 p-4 mb-6 ${darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-3 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'} font-medium py-3 px-4 border ${darkMode ? 'border-gray-700' : 'border-gray-300'} rounded-lg transition-all duration-200`}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>

          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-6 text-center`}>
            Please use your NEU email address (@neu.edu.ph) to sign in.
          </p>

          <div className={`mt-8 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Need help? Contact IT Support
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 text-center w-full text-xs z-10">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          © 2025 New Era University. All rights reserved.
        </span>
      </div>
    </div>
  );
}
