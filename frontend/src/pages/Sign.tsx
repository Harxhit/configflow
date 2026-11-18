
import { useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SignIn = () => {
  const navigate = useNavigate();
  const { logIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/auth/signin", { email, password });
      const response = await api.get("/auth/me");
      logIn(response.data.data.user);
      navigate("/dashboard");
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(
        axiosError.response?.data?.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 sm:px-10 lg:px-16">

        {/* Header */}
        <header className="flex h-24 items-center justify-between border-b border-white/[0.08]">
          <Link to="/signin" className="text-2xl font-semibold tracking-[-0.08em]">
            config<span className="text-neutral-500">flow</span>
            <span className="ml-1 text-neutral-600">.</span>
          </Link>

          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-600">
            CONFIGURATION WORKSPACE
          </span>
        </header>

        {/* Main content */}
        <section className="grid flex-1 items-center gap-16 py-16 lg:grid-cols-[1fr_440px] lg:gap-24">

          {/* Left section */}
          <div className="max-w-2xl">
            <div className="mb-10 flex items-center gap-3">
              <span className="h-px w-8 bg-neutral-500" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                Configuration management
              </span>
            </div>

            <h1 className="text-5xl font-medium leading-[1.08] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
              Your configurations.
              <br />
              <span className="text-neutral-500">
                Under control.
              </span>
            </h1>

            <p className="mt-8 max-w-md text-base leading-7 text-neutral-500">
              A focused workspace to inspect, edit and manage
              your MessagePack configurations.
            </p>

            <div className="mt-16 max-w-md border-t border-white/[0.08] pt-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-neutral-600">
                  BUILT FOR STRUCTURED DATA
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                  01 / 03
                </span>
              </div>
              <div className="mt-5 flex gap-2">
                <span className="h-1 w-10 bg-white" />
                <span className="h-1 w-5 bg-neutral-800" />
                <span className="h-1 w-5 bg-neutral-800" />
              </div>
            </div>
          </div>

          {/* Sign in form */}
          <div className="w-full max-w-[440px] lg:justify-self-end">
            <div className="mb-9">
              <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-600">
                ACCOUNT ACCESS / 001
              </span>

              <h2 className="mt-5 text-3xl font-medium tracking-[-0.05em]">
                Sign in
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Enter your credentials to continue.
              </p>
            </div>

            <form onSubmit={signIn} className="space-y-6">
              <div>
                <label className="mb-3 block text-xs font-medium text-neutral-400">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-white"
                />
              </div>

              <div>
                <label className="mb-3 block text-xs font-medium text-neutral-400">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-white"
                />
              </div>

              {error && (
                <p className="border-l-2 border-red-500 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-between bg-white px-5 py-4 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{loading ? "Authenticating..." : "Continue"}</span>
                {!loading && (
                  <span className="text-lg transition-transform group-hover:translate-x-1">
                    →
                  </span>
                )}
              </button>
            </form>

            <div className="mt-9 border-t border-white/[0.08] pt-6">
              <p className="text-sm text-neutral-500">
                New to configflow?{" "}
                <Link
                  to="/signup"
                  className="text-white transition hover:text-neutral-400"
                >
                  Create an account →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-white/[0.08] py-6 text-[10px] text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono tracking-widest">
            CONFIGFLOW © 2026
          </span>
          <span className="font-mono tracking-widest">
            MESSAGEPACK · STRUCTURE · CONTROL
          </span>
        </footer>
      </div>
    </main>
  );
};


export default SignIn;
