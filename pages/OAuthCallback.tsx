import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "../src/stores/authStore";

const OAuthCallback: React.FC = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuthStore();

  useEffect(() => {
    const processCallback = async () => {
      console.log("[OAuthCallback] Component mounted");
      try {
        console.log("[OAuthCallback] Calling handleOAuthCallback...");
        await handleOAuthCallback();
        console.log("[OAuthCallback] Callback processed successfully");
        // Navigation handled by Login component based on hasPinSet
        navigate("/", { replace: true });
      } catch (err: any) {
        console.error("[OAuthCallback] Error:", err);
        setError(err.message || "OAuth authentication failed");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      }
    };

    processCallback();
  }, [handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <>
            <p className="text-red-400 text-center">{error}</p>
            <p className="text-gray-400 text-sm">Redirecting...</p>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-primary-500" size={48} />
            <p className="text-gray-400">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
