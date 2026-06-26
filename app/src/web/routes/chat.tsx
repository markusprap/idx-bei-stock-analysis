import { useParams, useSearch } from "@tanstack/react-router";
import { Sidebar } from "../components/layout/Sidebar";
import { ChatView } from "../components/chat/ChatView";

export function ChatRoute() {
  const { threadId } = useParams({ strict: false });
  const { ticker } = useSearch({ strict: false }) as { ticker?: string };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <ChatView threadId={threadId ?? null} ticker={ticker} />
    </div>
  );
}
