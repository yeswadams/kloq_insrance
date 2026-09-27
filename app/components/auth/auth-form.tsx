"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/app/lib/authClient";
import { EyeOff, Eye } from "lucide-react";
import { register } from "module";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const signup = mode === "sign-up";
  const [showPassword, setShowPassword] = useState(false);
  async function submit(form: FormData) {
    setError("");
    setPending(true);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const result = signup
      ? await authClient.signUp.email({
          name: String(form.get("name") ?? ""),
          email,
          password,
        })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error)
      setError(result.error.message ?? "Unable to authenticate");
    else {
      router.replace("/dashboard");
      router.refresh();
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" href="/">
          KLOQ <span>UNDERWRITING</span>
        </Link>
        <p className="eyebrow">FLEET UNDERWRITING PLATFORM</p>
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">Sign in to your secure workspace.</p>
        <form action={submit} className="form-stack">
          {signup && (
            <label>
              Full name
              <input name="name" required minLength={2} autoComplete="name" />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="flex items-center gap-3 w-full">
            <span className="shrink-0 text-sm font-medium">Password</span>

            <div className="relative flex-1">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete={signup ? "new-password" : "current-password"}
                className="pr-10" /* Adds padding on the right so text doesn't slide under the icon */
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer p-0 flex items-center justify-center"
              >
                {showPassword ? <Eye /> : <EyeOff />}
              </button>
            </div>
          </label>
          <button
            className="bg-[#176c5d] text-white py-2 rounded-lg shadow-sm"
            type="submit"
            onClick={() => setIsLoading(true)}
          >
            {isLoading ? (signup ? "Creating your account..." : "Logging in ..." ) : (signup ? "Register" : "Login")}
          </button>
        </form>
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New to Kloq?"}{" "}
          <Link href={signup ? "/sign-in" : "/sign-up"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
