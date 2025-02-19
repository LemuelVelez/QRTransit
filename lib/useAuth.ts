import { useState, useEffect } from "react";

// Example useAuth hook
export function useAuth() {
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading state (e.g., checking user session)
    setTimeout(() => {
      // Simulate an authentication check (replace with actual logic)
      setIsLogged(true); // Set this to true/false based on your logic
      setLoading(false);
    }, 2000); // Simulate a delay
  }, []);

  return { isLogged, loading };
}
