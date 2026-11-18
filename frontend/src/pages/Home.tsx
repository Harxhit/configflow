
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { isLoggedIn, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <header className="flex h-24 items-center justify-between border-b border-white/[0.08]">
          <Link
            to="/"
            className="text-2xl font-semibold tracking-[-0.08em]"
          >
            config<span className="text-neutral-500">flow</span>
            <span className="text-neutral-600">.</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            {!loading && (
              isLoggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-neutral-400 transition hover:text-white"
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="text-neutral-400 transition hover:text-white"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="text-neutral-400 transition hover:text-white"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/signup"
                    className="bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200"
                  >
                    Create account
                  </Link>
                </>
              )
            )}
          </nav>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col justify-center py-24">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-px w-8 bg-neutral-500" />

            <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500">
              MESSAGEPACK CONFIGURATION WORKSPACE
            </span>
          </div>

          <h1 className="max-w-4xl text-5xl font-medium leading-[1.08] tracking-[-0.065em] sm:text-6xl lg:text-8xl">
            Configuration
            <br />
            <span className="text-neutral-500">
              without the chaos.
            </span>
          </h1>

          <p className="mt-8 max-w-lg text-base leading-8 text-neutral-500">
            Inspect, edit and manage your video configuration files
            in one focused workspace. Work with structured MessagePack
            data without losing control of its underlying format.
          </p>

          {/* CTA */}
          {!loading && (
            <div className="mt-12 flex flex-wrap items-center gap-4">
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-8 bg-white px-6 py-4 text-sm font-medium text-black transition hover:bg-neutral-200"
                >
                  Open workspace
                  <span className="text-lg">→</span>
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="flex items-center gap-8 bg-white px-6 py-4 text-sm font-medium text-black transition hover:bg-neutral-200"
                  >
                    Get started
                    <span className="text-lg">→</span>
                  </Link>

                  <Link
                    to="/signin"
                    className="px-5 py-4 text-sm text-neutral-400 transition hover:text-white"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Features */}
          <div className="mt-24 grid max-w-3xl grid-cols-1 border-t border-white/[0.08] sm:grid-cols-3">
            <div className="border-b border-white/[0.08] py-6 sm:border-b-0 sm:border-r sm:pr-6">
              <p className="font-mono text-[10px] tracking-widest text-neutral-600">
                01 / INSPECT
              </p>

              <p className="mt-3 text-sm text-neutral-300">
                Read structured configuration data.
              </p>
            </div>

            <div className="border-b border-white/[0.08] py-6 sm:border-b-0 sm:border-r sm:px-6">
              <p className="font-mono text-[10px] tracking-widest text-neutral-600">
                02 / EDIT
              </p>

              <p className="mt-3 text-sm text-neutral-300">
                Modify fields, arrays and nested objects.
              </p>
            </div>

            <div className="py-6 sm:pl-6">
              <p className="font-mono text-[10px] tracking-widest text-neutral-600">
                03 / SAVE
              </p>

              <p className="mt-3 text-sm text-neutral-300">
                Preserve your MessagePack configuration.
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

export default Home;
