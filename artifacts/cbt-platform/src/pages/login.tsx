import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const loginMutation = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      login(res.token);
    } catch {
      // error shown via loginMutation.isError
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
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Welcome Back</h1>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          {loginMutation.isError && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl font-medium border border-destructive/20 text-center">
              Invalid credentials. Please try again.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              error={errors.password?.message}
            />
            <Button type="submit" className="w-full h-12 text-base mt-2" isLoading={loginMutation.isPending}>
              Sign In
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

          <Link href="/login/candidate">
            <Button variant="ghost" className="w-full h-11 border border-border text-muted-foreground hover:text-foreground">
              Candidate Login (Username & Password)
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
