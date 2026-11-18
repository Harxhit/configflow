
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [files, setFiles] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchConfigFiles = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/config/all");

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch files");
      }

      setFiles(response.data.files);
    } catch (err) {
      console.error("Failed to fetch configuration files:", err);
      setError("Unable to load configuration files. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigFiles();
  }, []);

  const filteredFiles = useMemo(
    () =>
      files.filter((file) =>
        file.toLowerCase().includes(search.toLowerCase())
      ),
    [files, search]
  );

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  const handleFileClick = (fileName: string) => {
    navigate(`/config/${encodeURIComponent(fileName)}`);
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.08] px-6 py-8 md:flex">
          <Link
            to="/"
            className="text-2xl font-semibold tracking-[-0.08em]"
          >
            config<span className="text-neutral-500">flow</span>
            <span className="text-neutral-600">.</span>
          </Link>

          <div className="mt-16">
            <p className="mb-4 font-mono text-[10px] tracking-[0.2em] text-neutral-600">
              WORKSPACE
            </p>

            <button className="flex w-full items-center gap-3 border-l-2 border-white bg-white/[0.06] px-4 py-3 text-left text-sm text-white">
              <span className="text-neutral-400">▦</span>
              Configurations
            </button>
          </div>

          <div className="mt-auto border-t border-white/[0.08] pt-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-between text-sm text-neutral-500 transition hover:text-white"
            >
              Sign out
              <span>↗</span>
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-white/[0.08] px-6 sm:px-10">
            <div className="md:hidden">
              <Link
                to="/dashboard"
                className="text-xl font-semibold tracking-[-0.08em]"
              >
                config<span className="text-neutral-500">flow</span>.
              </Link>
            </div>

            <div className="hidden font-mono text-[10px] tracking-[0.2em] text-neutral-600 md:block">
              CONFIGURATION WORKSPACE / OVERVIEW
            </div>

            <button
              onClick={handleLogout}
              className="text-xs text-neutral-500 transition hover:text-white md:hidden"
            >
              Sign out
            </button>

            <div className="hidden items-center gap-3 md:flex">
              <span className="h-2 w-2 rounded-full bg-neutral-500" />
              <span className="font-mono text-[10px] tracking-widest text-neutral-500">
                LOCAL WORKSPACE
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-[1400px] px-6 py-10 sm:px-10 lg:px-14">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-neutral-600">
                  WORKSPACE / 001
                </p>

                <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">
                  Configurations
                </h1>

                <p className="mt-3 text-sm text-neutral-500">
                  Browse and manage your MessagePack configuration files.
                </p>
              </div>

              <div className="font-mono text-[10px] tracking-widest text-neutral-600">
                {files.length.toString().padStart(2, "0")} FILES
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 border-y border-white/[0.08] sm:grid-cols-3">
              <div className="border-r border-white/[0.08] py-6 pr-5">
                <p className="font-mono text-[10px] tracking-widest text-neutral-600">
                  TOTAL FILES
                </p>
                <p className="mt-3 text-3xl font-medium tracking-tight">
                  {loading ? "--" : files.length.toString().padStart(2, "0")}
                </p>
              </div>

              <div className="border-r border-white/[0.08] px-5 py-6">
                <p className="font-mono text-[10px] tracking-widest text-neutral-600">
                  STORAGE
                </p>
                <p className="mt-3 text-3xl font-medium tracking-tight">
                  LOCAL
                </p>
              </div>

              <div className="col-span-2 px-5 py-6 sm:col-span-1">
                <p className="font-mono text-[10px] tracking-widest text-neutral-600">
                  FORMAT
                </p>
                <p className="mt-3 text-3xl font-medium tracking-tight">
                  .msgpack
                </p>
              </div>
            </div>

            <div className="mt-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-medium tracking-tight">
                  All files
                </h2>
                <p className="mt-1 text-xs text-neutral-600">
                  Select a configuration to inspect and edit.
                </p>
              </div>

              <div className="w-full sm:w-72">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search configurations..."
                  className="w-full border-b border-neutral-800 bg-transparent px-0 py-3 text-sm text-white outline-none placeholder:text-neutral-700 focus:border-white"
                />
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-white/[0.08] font-mono text-[10px] tracking-widest text-neutral-600">
                    <th className="py-4 font-normal">CONFIGURATION</th>
                    <th className="py-4 font-normal">FORMAT</th>
                    <th className="py-4 text-right font-normal">ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-16 text-center text-sm text-neutral-500"
                      >
                        Loading configurations...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={3} className="py-16 text-center">
                        <p className="text-sm text-red-400">{error}</p>
                        <button
                          onClick={fetchConfigFiles}
                          className="mt-4 text-xs text-white underline underline-offset-4 hover:text-neutral-400"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : filteredFiles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-16 text-center text-sm text-neutral-600"
                      >
                        {files.length === 0
                          ? "No configuration files available."
                          : "No configurations found."}
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((fileName, index) => (
                      <tr
                        key={fileName}
                        onClick={() => handleFileClick(fileName)}
                        className="group cursor-pointer border-b border-white/[0.06] transition hover:bg-white/[0.025]"
                      >
                        <td className="py-6 pr-4">
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-[10px] text-neutral-700">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <p className="text-sm font-medium text-neutral-200 transition group-hover:text-white">
                              {fileName}
                            </p>
                          </div>
                        </td>

                        <td className="py-6 text-sm text-neutral-500">
                          MessagePack
                        </td>

                        <td className="py-6 text-right">
                          <span className="text-xs text-neutral-600 transition group-hover:text-white">
                            Open →
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-white/[0.08] pt-6 text-[10px] text-neutral-700 sm:flex-row">
              <span className="font-mono tracking-widest">
                CONFIGFLOW © 2026
              </span>
              <span className="font-mono tracking-widest">
                MESSAGEPACK · STRUCTURE · CONTROL
              </span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
