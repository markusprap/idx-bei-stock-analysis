import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChatBubbleIcon } from "../icons";
import "./ChatView.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function sendChatMessage(message: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const data: { reply: string } = await res.json();
  return data.reply;
}

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || mutation.isPending) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    mutation.mutate(message);
  }

  return (
    <section className="chat-view">
      {messages.length === 0 ? (
        <div className="chat-view-empty">
          <ChatBubbleIcon />
          <h1>Mau tanya soal saham apa hari ini?</h1>
          <p>
            Ketik nama atau ticker saham, dan Sahamigo akan jawab pakai data EOD asli — bukan tebakan.
          </p>
        </div>
      ) : (
        <div className="chat-view-messages">
          {messages.map((message, index) => (
            <p key={index} className={`chat-view-message chat-view-message--${message.role}`}>
              {message.content}
            </p>
          ))}
          {mutation.isPending && (
            <p className="chat-view-message chat-view-message--assistant chat-view-message--pending">
              Sahamigo sedang mengetik...
            </p>
          )}
        </div>
      )}

      <form className="chat-view-input-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Tanya soal saham..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={mutation.isPending}
        />
        <button type="submit" disabled={mutation.isPending || !input.trim()}>
          Kirim
        </button>
      </form>

      <p className="chat-view-footer-note">
        Sahamigo menyajikan data, bukan rekomendasi — keputusan tetap di tangan lo.
      </p>
    </section>
  );
}
