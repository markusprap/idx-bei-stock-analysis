import { ChatBubbleIcon, SearchMagnifierIcon, StarOutlineIcon } from "../icons";
import "./Sidebar.css";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo">Sahamigo</div>
        <p className="sidebar-tagline">belajar baca saham, bukan ikut sinyal</p>
      </div>

      <button type="button" className="sidebar-new-chat">
        <ChatBubbleIcon />+ Chat Baru
      </button>

      <nav className="sidebar-nav">
        <button type="button" className="sidebar-nav-pill" disabled>
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
        <p className="sidebar-history-empty">Belum ada riwayat chat.</p>
      </div>

      <div className="sidebar-footer">
        <span>Bang Markus</span>
        <span className="sidebar-footer-tier">Free</span>
      </div>
    </aside>
  );
}
