import { Sidebar } from "../components/layout/Sidebar";
import { ChatView } from "../components/chat/ChatView";

export function ChatRoute() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <ChatView />
    </div>
  );
}
