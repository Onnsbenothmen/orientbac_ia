"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Marhba bik! Je suis EduBot, ton assistant d'orientation universitaire en Tunisie. " +
        "Pose-moi tes questions sur les filières, les scores d'admission, ou les débouchés. " +
        "Tu peux écrire en français ou en derja !",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verbosity, setVerbosity] = useState<"short" | "detailed" | "full">("short");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!api.getStoredToken()) {
      router.replace("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Send conversation history (exclude the system greeting)
      const history = messages
        .filter((_, i) => i > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.chat(trimmed, history, verbosity);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desole, je n'ai pas pu traiter ta demande. Reessaye dans un instant.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-3xl flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-slate-800">EduBot — Chatbot IA</h1>
        <p className="text-slate-500">
          Pose tes questions en français ou en derja tunisienne
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border bg-white p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-400">
              <span className="inline-block animate-pulse">EduBot réfléchit…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <label className="text-sm text-slate-600">Longueur réponse:</label>
        <select
          value={verbosity}
          onChange={(e) => setVerbosity(e.target.value as any)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none"
          disabled={loading}
        >
          <option value="short">Courte</option>
          <option value="detailed">Détaillée</option>
          <option value="full">Non tronquée</option>
        </select>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Écris ta question ici…"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-xl bg-primary-600 px-6 py-3 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
