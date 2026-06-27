import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChatBubbleIcon } from "../icons";
import { FundamentalCard, type FundamentalCardData } from "./FundamentalCard";
import { IndicatorCard, type IndicatorCardData } from "./IndicatorCard";
import "./ChatView.css";

type TextReply = { type: "text"; message: string };
type ChatReply = TextReply | FundamentalCardData | IndicatorCardData;

function parseReply(content: string): ChatReply {
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "type" in parsed &&
      (parsed.type === "text" || parsed.type === "fundamental_card" || parsed.type === "indicator_card")
    ) {
      return parsed as ChatReply;
    }
  } catch {
    // not JSON — treat as legacy plain text
  }
  return { type: "text", message: content };
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function sendChatMessage(
  message: string,
  threadId: string | null,
): Promise<{ threadId: string; reply: ChatReply }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId: threadId ?? undefined }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  return res.json();
}

async function fetchThreadMessages(threadId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/threads/${threadId}/messages`);

  if (!res.ok) {
    throw new Error(`Failed to load thread messages: ${res.status}`);
  }

  const data: { messages: { role: string; content: string }[] } = await res.json();
  return data.messages.map((m) => ({ role: m.role as ChatMessage["role"], content: m.content }));
}

type ChatViewProps = {
  threadId: string | null;
  ticker?: string;
};

export function ChatView({ threadId, ticker }: ChatViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contextTicker] = useState(ticker);
  const [input, setInput] = useState(contextTicker ? `${contextTicker} ` : "");

  const threadMessagesQuery = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => fetchThreadMessages(threadId as string),
    enabled: threadId !== null,
  });

  const messages = threadId !== null ? threadMessagesQuery.data ?? [] : [];

  const mutation = useMutation({
    mutationFn: (message: string) => sendChatMessage(message, threadId),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["thread-messages", data.threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });

      if (threadId === null) {
        navigate({ to: "/chat/$threadId", params: { threadId: data.threadId } });
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || mutation.isPending) {
      return;
    }

    setInput("");
    mutation.mutate(message);
  }

  const showMessages = messages.length > 0 || mutation.isPending;

  return (
    <section className="chat-view">
      {contextTicker && (
        <div className="chat-ticker-context">
          <span className="chat-ticker-chip">{contextTicker}</span>
          <span className="chat-ticker-context-label">Konteks saham</span>
        </div>
      )}
      {!showMessages ? (
        <div className="chat-view-empty">
          <ChatBubbleIcon />
          <h1>Mau tanya soal saham apa hari ini?</h1>
          <p>
            Ketik nama atau ticker saham, dan Sahamigo akan jawab pakai data EOD asli — bukan tebakan.
          </p>
        </div>
      ) : (
        <div className="chat-view-messages">
          {messages.map((message, index) => {
            if (message.role === "user") {
              return (
                <p key={index} className="chat-view-message chat-view-message--user">
                  {message.content}
                </p>
              );
            }
            const reply = parseReply(message.content);
            if (reply.type === "fundamental_card") {
              return (
                <div key={index} className="chat-view-message chat-view-message--assistant">
                  <FundamentalCard data={reply} />
                </div>
              );
            }
            if (reply.type === "indicator_card") {
              return (
                <div key={index} className="chat-view-message chat-view-message--assistant">
                  <IndicatorCard data={reply} />
                </div>
              );
            }
            return (
              <p key={index} className="chat-view-message chat-view-message--assistant">
                {reply.message}
              </p>
            );
          })}
          {mutation.isPending && (
            <>
              <p className="chat-view-message chat-view-message--user">{mutation.variables}</p>
              <p className="chat-view-message chat-view-message--assistant chat-view-message--pending">
                Sahamigo sedang mengetik...
              </p>
            </>
          )}
        </div>
      )}

      <div className="chat-view-input-wrap">
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
      </div>

      <p className="chat-view-footer-note">
        Sahamigo menyajikan data, bukan rekomendasi — keputusan tetap di tangan lo.
      </p>
    </section>
  );
}
