"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, CheckCircle2, XCircle, Lock, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface Chat {
  id: string;
  status: "PENDING" | "ACTIVE" | "CLOSED";
  student?: { id: string; firstName: string; lastName: string; email: string };
  counselor?: {
    id: string; firstName: string; lastName: string; email: string;
    counselorProfile?: { whatsappCountryCode?: string; whatsappNumber?: string };
  };
  messages: Message[];
  createdAt: string;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isStudent = role === "STUDENT";

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [initialMsg, setInitialMsg] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchChats = useCallback(async () => {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setChats(data.chats || []);
    setLoading(false);
    if (data.chats?.length > 0 && !activeChat) {
      setActiveChat(data.chats[0]);
    }
  }, [activeChat]);

  useEffect(() => { fetchChats() }, [fetchChats]);

  useEffect(() => {
    const id = setInterval(fetchChats, 10000);
    return () => clearInterval(id);
  }, [fetchChats]);

  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = () => fetch(`/api/chat/${activeChat.id}/messages`).then((r) => r.json()).then((data) => {
      setMessages(data.messages || []);
    });
    fetchMessages();
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [activeChat]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function startChat() {
    if (!initialMsg.trim()) return;
    setRequestSent(true);
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: initialMsg }),
    });
    setInitialMsg("");
    await fetchChats();
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeChat) return;
    setSending(true);
    const res = await fetch(`/api/chat/${activeChat.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMsg("");
    }
    setSending(false);
  }

  async function updateChat(id: string, data: any) {
    setActionLoading(id);
    await fetch(`/api/chat/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchChats();
    setActionLoading(null);
  }

  if (loading) return <div className="p-6 pt-20 text-center text-muted-foreground">Loading...</div>;

  const openChat = chats.find((c) => c.status !== "CLOSED");
  const otherPerson = activeChat ? (isStudent ? activeChat.counselor : activeChat.student) : null;

  const whatsappLink = (() => {
    const wa = activeChat?.counselor?.counselorProfile;
    return wa?.whatsappCountryCode && wa?.whatsappNumber
      ? `https://wa.me/${wa.whatsappCountryCode}${wa.whatsappNumber}`
      : null;
  })();

  const counselorWaLink = (() => {
    if (chats.length === 0) return null;
    const wa = chats[0]?.counselor?.counselorProfile;
    return wa?.whatsappCountryCode && wa?.whatsappNumber
      ? `https://wa.me/${wa.whatsappCountryCode}${wa.whatsappNumber}`
      : null;
  })();

  function renderMainContent() {
    if (isStudent && !openChat && !requestSent) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Chat with Your Counselor</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Send a message to start chatting.</p>
              <Input value={initialMsg} onChange={(e) => setInitialMsg(e.target.value)}
                placeholder="Hi, I'd like to discuss..." />
              <Button onClick={startChat} className="w-full" disabled={!initialMsg.trim()}>
                <Send className="h-4 w-4 mr-2" /> Send Request
              </Button>
              {counselorWaLink && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Or reach out directly on WhatsApp:</p>
                  <a href={counselorWaLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:underline">
                    <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (isStudent && openChat?.status === "PENDING") {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="font-medium">Waiting for counselor to accept...</p>
            {counselorWaLink && (
              <a href={counselorWaLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-green-600 hover:underline">
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp instead
              </a>
            )}
          </div>
        </div>
      );
    }

    if (activeChat?.status === "ACTIVE") {
      return (
        <>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent" />
              <span className="font-medium">{otherPerson?.firstName} {otherPerson?.lastName}</span>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>
            <div className="flex items-center gap-2">
              {isStudent && whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {!isStudent && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => updateChat(activeChat.id, { grantAccess: true })}
                    disabled={actionLoading === activeChat.id}>
                    <Lock className="h-3 w-3 mr-1" /> Grant Booking Access
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => updateChat(activeChat.id, { status: "CLOSED" })}
                    disabled={actionLoading === activeChat.id}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => {
              const isMe = m.senderId === session?.user?.id;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${isMe ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                    {!isMe && <p className="text-xs opacity-60 mb-1">{m.sender.firstName}</p>}
                    <p>{m.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="p-4 border-t">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type a message..." />
              <Button type="submit" size="icon" disabled={sending || !newMsg.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>{isStudent ? "No active conversation" : "Select a conversation"}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] pt-16">
      <div className={`${isStudent ? "w-72" : "w-80"} border-r flex flex-col shrink-0`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chats.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No conversations</p>
          ) : chats.map((chat) => {
            const person = isStudent ? chat.counselor : chat.student;
            return (
              <div key={chat.id}
                className={`rounded-lg text-sm ${isStudent ? "" : "mb-2"} ${activeChat?.id === chat.id ? "bg-accent/10" : "hover:bg-muted"}`}
                onClick={() => setActiveChat(chat)}>
                <div className={`${isStudent ? "p-3" : "p-3"} ${isStudent ? "" : "flex items-start justify-between"}`}>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{person?.firstName} {person?.lastName}</p>
                    {!isStudent && <p className="text-xs text-muted-foreground">{person?.email}</p>}
                    {chat.messages[0] && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{chat.messages[0].content}</p>
                    )}
                  </div>
                  <Badge variant={chat.status === "PENDING" ? (isStudent ? "outline" : "destructive") : chat.status === "ACTIVE" ? "success" : "secondary"}
                    className="text-[10px] shrink-0 ml-2">
                    {chat.status}
                  </Badge>
                </div>
                {!isStudent && chat.status === "PENDING" && (
                  <div className="px-3 pb-3 flex gap-2">
                    <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); updateChat(chat.id, { status: "ACTIVE" }); }}
                      disabled={actionLoading === chat.id} className="flex-1 text-xs">
                      {actionLoading === chat.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); updateChat(chat.id, { status: "CLOSED" }); }}
                      disabled={actionLoading === chat.id} className="flex-1 text-xs">
                      <XCircle className="h-3 w-3 mr-1" /> Decline
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {renderMainContent()}
      </div>
    </div>
  );
}
