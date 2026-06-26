import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChatBubbleIcon, SearchMagnifierIcon, StarOutlineIcon } from "../icons";
import "./Sidebar.css";

type Thread = {
  id: string;
  title: string | null;
  updatedAt: string;
};

async function fetchThreads(): Promise<Thread[]> {
  const res = await fetch("/api/threads");

  if (!res.ok) {
    throw new Error(`Failed to load threads: ${res.status}`);
  }

  const data: { threads: Thread[] } = await res.json();
  return data.threads;
}

export function Sidebar() {
  const navigate = useNavigate();
  const threadsQuery = useQuery({ queryKey: ["threads"], queryFn: fetchThreads });
  const threads = threadsQuery.data ?? [];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo">Sahamigo</div>
        <p className="sidebar-tagline">belajar baca saham, bukan ikut sinyal</p>
      </div>

      <button
        type="button"
        className="sidebar-new-chat"
        onClick={() => navigate({ to: "/", search: { ticker: undefined } })}
      >
        <ChatBubbleIcon />+ Chat Baru
      </button>

      <nav className="sidebar-nav">
        <button type="button" className="sidebar-nav-pill" onClick={() => navigate({ to: "/search" })}>
          <SearchMagnifierIcon />
          Search
        </button>
        <button type="button" className="sidebar-nav-pill" disabled>
          <StarOutlineIcon />
          Watchlist
        </button>
      </nav>

      <div className="sidebar-history">
        <h3>Riwayat</h3>
        {threads.length === 0 ? (
          <p className="sidebar-history-empty">Belum ada riwayat chat.</p>
        ) : (
          <ul className="sidebar-history-list">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  className="sidebar-history-item"
                  onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: thread.id } })}
                >
                  {thread.title || "Chat tanpa judul"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sidebar-footer">
        <span>Bang Markus</span>
        <span className="sidebar-footer-tier">Free</span>
      </div>
    </aside>
  );
}
