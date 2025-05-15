
import React, { useState, useEffect } from 'react';
import { checkSupabaseConnection } from '@/utils/supabase/checkConnection';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function SupabaseConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);
    } catch (error) {
      console.error("Error checking connection:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-medium mb-2">Supabase Connection Status</h3>
      
      <div className="flex items-center gap-2 mb-4">
        {isConnected === null ? (
          <p className="text-gray-500">Click the button to check connection</p>
        ) : isConnected ? (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Connected to Supabase</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Failed to connect to Supabase</span>
          </div>
        )}
      </div>
      
      <Button 
        onClick={checkConnection}
        disabled={isLoading}
      >
        {isLoading ? "Checking..." : "Check Connection"}
      </Button>
    </div>
  );
}
