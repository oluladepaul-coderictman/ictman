import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useCandidateLogin } from "@workspace/api-client-react";

export default function CandidateLogin() {
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useCandidateLogin();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const returnUrl = React.useMemo(() => {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("cbt_exam_return") || null;
    }
    return null;
  }, []);

  React.useEffect(() => {
    if (user?.role === "Candidate") {
      if (returnUrl) {
        sessionStorage.removeItem("cbt_exam_return");
        setLocation(returnUrl);
      } else {
        setLocation("/candidate-exams");
      }
    }
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await loginMutation.mutateAsync({ data: { username: username.trim(), password } });
      login(res.token);
    } catch {
      setError("Invalid username or password. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center mb-10">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-6 text-2xl font-display font-bold shadow-lg shadow-primary/20">
              C
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Candidate Login</h1>
            <p className="text-muted-foreground mt-2">Enter the credentials provided by your administrator</p>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl font-medium border border-destructive/20 text-center">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="your.username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full h-12 text-base mt-2" isLoading={loginMutation.isPending}>
              Sign In as Candidate
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground uppercase tracking-wider">
              <span className="bg-surface px-3">or</span>
            </div>
          </div>

          <Link href="/">
            <Button variant="ghost" className="w-full h-11 border border-border text-muted-foreground hover:text-foreground">
              Admin / Staff Login
            </Button>
          </Link>
        </motion.div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-muted items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20 z-0" />
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Geometric abstract background"
          className="w-full h-full object-cover opacity-90 mix-blend-multiply z-10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-20" />
      </div>
    </div>
  );
}
