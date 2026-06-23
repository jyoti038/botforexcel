import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const STORAGE_KEY = "excel-ai-chatbot-chats";
const ACTIVE_CHAT_KEY = "excel-ai-chatbot-active-chat";
const API_BASE = "https://botforexcel.onrender.com";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedChats = localStorage.getItem(STORAGE_KEY);
    const savedActiveChatId = localStorage.getItem(ACTIVE_CHAT_KEY);

    if (!savedChats) {
      return;
    }

    try {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);

      if (savedActiveChatId) {
        const activeId = Number(savedActiveChatId);
        const activeChatExists = parsedChats.some((chat) => chat.id === activeId);

        if (activeChatExists) {
          setActiveChatId(activeId);
          return;
        }
      }

      if (parsedChats.length > 0) {
        setActiveChatId(parsedChats[0].id);
      }
    } catch (error) {
      console.error("Failed to load saved chats", error);
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, String(activeChatId));
    }
  }, [activeChatId]);

  const createChat = () => {
    const id = Date.now();

    setChats((prevChats) => [
      ...prevChats,
      {
        id,
        title: `Chat ${prevChats.length + 1}`,
        messages: [],
      },
    ]);
    setActiveChatId(id);

    return id;
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE}/upload`, formData);

      alert("File Uploaded Successfully");
      console.log(res.data);
    } catch (error) {
      console.error(error);
      alert("Upload Failed");
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const currentChatId = activeChatId || createChat();
    const userMessage = message;

    setMessage("");

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== currentChatId) {
          return chat;
        }

        return {
          ...chat,
          messages: [
            ...chat.messages,
            {
              role: "user",
              text: userMessage,
            },
          ],
        };
      })
    );

    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        message: userMessage,
      });

      const botMessage = {
        role: "bot",
        text:
          typeof res.data.answer === "string"
            ? res.data.answer
            : JSON.stringify(res.data.answer, null, 2),
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== currentChatId) {
            return chat;
          }

          return {
            ...chat,
            messages: [...chat.messages, botMessage],
          };
        })
      );
    } catch (error) {
      console.error(error);

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== currentChatId) {
            return chat;
          }

          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                role: "bot",
                text: "Error getting response from server",
              },
            ],
          };
        })
      );
    }
  };

  const openChat = (chatId) => {
    setActiveChatId(chatId);
  };

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;
  const messages = activeChat?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__top">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Chats</h2>
          </div>

          <div className="upload-card">
            <label className="file-picker">
              <span>Choose file</span>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            </label>

            <button className="upload-button" onClick={uploadFile}>
              Upload
            </button>
          </div>
        </div>

        <button className="new-chat-button" onClick={createChat}>
          + New Chat
        </button>

        <div className="chat-list">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => openChat(chat.id)}
              className={`chat-item ${chat.id === activeChatId ? "is-active" : ""}`}
            >
              <span className="chat-item__title">{chat.title}</span>
              <span className="chat-item__meta">
                {chat.messages.length} messages
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="main-panel">
        <div className="main-column">
          <section className="messages-panel">
            <div className="messages-panel__header">
              <p className="eyebrow">Active chat</p>
              <h1 className="composer-context__title">
                {activeChat ? activeChat.title : "No chat selected"}
              </h1>
            </div>

            <div className="messages-panel__body">
              {messages.length === 0 ? (
                <div className="messages-empty">
                  Select a chat or send a message to see the conversation here.
                </div>
              ) : (
                messages.map((msg, index) => (
                  <article
                    key={index}
                    className={`message-row ${msg.role === "user" ? "is-user" : "is-bot"}`}
                  >
                    <div className="message-bubble">
                      <span className="message-role">
                        {msg.role === "user" ? "You" : "Bot"}
                      </span>
                      <pre>{msg.text}</pre>
                    </div>
                  </article>
                ))
              )}

              <div ref={messagesEndRef}></div>
            </div>
          </section>

          <div className="composer-center">
          <form
            className="composer composer--centered"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about Excel..."
              className="composer__input"
            />

            <button type="submit" className="composer__send">
              Send
            </button>
          </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;