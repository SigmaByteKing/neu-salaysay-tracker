
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <p className="text-gray-600">
            Welcome to your dashboard. This is where you'll manage your salaysay activities.
          </p>
        </div>
      </div>
    </div>
  );
}
