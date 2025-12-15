import { FormEvent, useMemo, useState } from "react";
import "./App.css";
import { useBlendmateSocket } from "./useBlendmateSocket";

function App() {
  const { status, lastMessage, sendJson } = useBlendmateSocket();
  const [outgoing, setOutgoing] = useState("Hello from Blendmate!");

  const statusLabel = useMemo(() => {
    if (status === "connected") return "Connected";
    if (status === "connecting") return "Connecting";
    return "Disconnected";
  }, [status]);

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendJson({ type: "message", text: outgoing });
  };

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Blendmate status</p>
        <h1>WebSocket bridge</h1>
        <p className="lede">
          Connects to <code>ws://127.0.0.1:32123</code> and echoes the latest
          message from Blender.
        </p>
      </header>

      <section className="panel">
        <div className={`status status-${status}`}>
          <div className="status-dot" aria-hidden />
          <div>
            <p className="status-label">{statusLabel}</p>
            <p className="status-subtext">Native WebSocket client</p>
          </div>
        </div>

        <form className="send" onSubmit={handleSend}>
          <label className="send-label" htmlFor="send-input">
            Send test payload
          </label>
          <div className="send-row">
            <input
              id="send-input"
              value={outgoing}
              onChange={(event) => setOutgoing(event.target.value)}
              placeholder="Message to send as JSON"
            />
            <button type="submit" disabled={status !== "connected"}>
              Send
            </button>
          </div>
          <p className="send-helper">
            Payload shape: {"{ type: 'message', text: '<your text>' }"}
          </p>
        </form>
      </section>

      <section className="panel">
        <p className="panel-title">Last message</p>
        <div className="message-box">
          {lastMessage ? (
            <pre>{lastMessage}</pre>
          ) : (
            <p className="muted">Waiting for incoming data…</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
