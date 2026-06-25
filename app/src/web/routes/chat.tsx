import { useParams } from "@tanstack/react-router";
import { Sidebar } from "../components/layout/Sidebar";
import { ChatView } from "../components/chat/ChatView";

export function ChatRoute() {
  const { threadId } = useParams({ strict: false });

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <ChatView threadId={threadId ?? null} />
    </div>
  );
}
