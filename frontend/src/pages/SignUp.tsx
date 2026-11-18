
import { useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SignUp = () => {
  const navigate = useNavigate();
  const { logIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/auth/signup", { email, password });

      const response = await api.get("/auth/me");
      logIn(response.data.data.user);

      navigate("/dashboard");
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(
        axiosError.response?.data?.message ||
          "Unable to create your account."
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
          <Link
            to="/signup"
            className="text-2xl font-semibold tracking-[-0.08em]"
          >
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
                Get started
              </span>
            </div>

            <h1 className="text-5xl font-medium leading-[1.08] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
              Structure your data.
              <br />
              <span className="text-neutral-500">
                Simplify your workflow.
              </span>
            </h1>

            <p className="mt-8 max-w-md text-base leading-7 text-neutral-500">
              Create your workspace and start inspecting,
              editing and managing your MessagePack configurations.
            </p>

            <div className="mt-16 max-w-md border-t border-white/[0.08] pt-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-neutral-600">
                  YOUR WORKSPACE STARTS HERE
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                  02 / 03
                </span>
              </div>

              <div className="mt-5 flex gap-2">
                <span className="h-1 w-5 bg-neutral-800" />
                <span className="h-1 w-10 bg-white" />
                <span className="h-1 w-5 bg-neutral-800" />
              </div>
            </div>
          </div>

          {/* Sign up form */}
          <div className="w-full max-w-[440px] lg:justify-self-end">
            <div className="mb-9">
              <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-600">
                ACCOUNT REGISTRATION / 002
              </span>

              <h2 className="mt-5 text-3xl font-medium tracking-[-0.05em]">
                Create account
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Set up your credentials to get started.
              </p>
            </div>

            <form onSubmit={signUp} className="space-y-6">
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
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-white"
                />

                <p className="mt-3 text-xs text-neutral-600">
                  Use at least 8 characters.
                </p>
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
                <span>
                  {loading ? "Creating account..." : "Create account"}
                </span>

                {!loading && (
                  <span className="text-lg transition-transform group-hover:translate-x-1">
                    →
                  </span>
                )}
              </button>
            </form>

            <div className="mt-9 border-t border-white/[0.08] pt-6">
              <p className="text-sm text-neutral-500">
                Already have an account?{" "}
                <Link
                  to="/signin"
                  className="text-white transition hover:text-neutral-400"
                >
                  Sign in →
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


export default SignUp;
