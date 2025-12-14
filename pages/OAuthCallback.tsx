import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "../src/stores/authStore";

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        await handleOAuthCallback();
        navigate("/vaults", { replace: true });
      } catch (err: any) {
        setError(err.message || "Failed to authenticate.");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {error ? (
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Authentication Failed</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-4">Redirecting to login...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary-500" size={32} />
          <p className="text-gray-400 font-medium">
            Completing secure sign in...
          </p>
        </div>
      )}
    </div>
  );
};

export default OAuthCallback;
