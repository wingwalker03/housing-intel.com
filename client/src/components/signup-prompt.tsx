import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, UserPlus } from "lucide-react";

export function SignupPrompt() {
  const { isLoggedIn, isLoading } = useAuth();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isLoading || isLoggedIn) return;

    const alreadyDismissed = sessionStorage.getItem("signup-prompt-dismissed");
    if (alreadyDismissed) return;

    const timer = setTimeout(() => {
      setShow(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isLoggedIn, isLoading]);

  if (!show || dismissed || isLoggedIn) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("signup-prompt-dismissed", "true");
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 fade-in duration-300" data-testid="card-signup-prompt">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-5">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          data-testid="button-dismiss-prompt"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Create a Free Account</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Sign up for free to save your preferences and access premium housing data tools.
            </p>
            <div className="flex gap-2">
              <Link href="/register">
                <Button size="sm" data-testid="button-prompt-register">Sign Up Free</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={handleDismiss} data-testid="button-prompt-dismiss">
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
