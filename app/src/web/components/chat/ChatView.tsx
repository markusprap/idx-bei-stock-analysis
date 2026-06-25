import { ChatBubbleIcon } from "../icons";
import "./ChatView.css";

export function ChatView() {
  return (
    <section className="chat-view">
      <div className="chat-view-empty">
        <ChatBubbleIcon />
        <h1>Mau tanya soal saham apa hari ini?</h1>
        <p>
          Ketik nama atau ticker saham, dan Sahamigo akan jawab pakai data EOD asli — bukan tebakan.
        </p>
      </div>

      <div className="chat-view-input-bar">
        <input type="text" placeholder="Tanya soal saham..." disabled />
        <button type="button" disabled>
          Kirim
        </button>
      </div>

      <p className="chat-view-footer-note">
        Sahamigo menyajikan data, bukan rekomendasi — keputusan tetap di tangan lo.
      </p>
    </section>
  );
}
