import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'agent';
  text: string;
  time: string;
}

const FAQ_RESPONSES: Record<string, string> = {
  food: 'Most of our PGs offer home-cooked meals (breakfast + dinner) included in the rent. Some properties offer meal plans as add-ons. Check the amenities section for details!',
  rent: 'Rent varies by room type and sharing. You can see exact per-bed pricing in the "Available Rooms" section. All prices are inclusive of maintenance charges.',
  wifi: 'Yes! All our verified PGs come with high-speed WiFi (minimum 50 Mbps). This is included in your monthly rent.',
  deposit: 'Security deposit is typically 1-2 months rent, refundable at move-out. The exact amount will be shared during booking confirmation.',
  'move-in': 'You can move in as early as 24 hours after booking confirmation! Just select your preferred move-in date during the pre-booking process.',
  laundry: 'Laundry services vary by property. Most PGs have washing machines available, and some offer professional laundry service at an extra charge.',
  security: 'All Gharpayy verified PGs have 24/7 security with CCTV surveillance, biometric/key card access, and security guards.',
  cleaning: 'Room cleaning is provided 2-3 times per week at most properties. Common areas are cleaned daily.',
  rules: 'Most PGs have standard house rules around visitor timings and noise levels. Each property page lists specific rules. We recommend checking before booking.',
  available: 'You can see real-time bed availability in the "Available Rooms" section above. Green beds are available for instant booking!',
};

const getAutoResponse = (message: string): string | null => {
  const lower = message.toLowerCase();
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('charge')) return FAQ_RESPONSES.rent;
  if (lower.includes('internet') || lower.includes('broadband')) return FAQ_RESPONSES.wifi;
  if (lower.includes('safe') || lower.includes('guard')) return FAQ_RESPONSES.security;
  return null;
};

interface PropertyChatProps {
  propertyId: string;
  propertyName: string;
  isOpen: boolean;
  onClose: () => void;
}

const formatTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function PropertyChat({ propertyId, propertyName, isOpen, onClose }: PropertyChatProps) {
  const storageKey = useMemo(() => `gharpayy:property_chat_lead:${propertyId}`, [propertyId]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickQuestions = ['What about food?', 'Is WiFi included?', 'Security details?', 'Move-in process?'];

  // Bootstrap: get/create a lead for this property chat
  useEffect(() => {
    if (!isOpen) return;
    const existing = localStorage.getItem(storageKey);
    if (existing) setLeadId(existing);
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (leadId) return;

    (async () => {
      const now = new Date().toISOString();
      const pseudoPhone = `WEBCHAT_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          name: `Website Chat — ${propertyName}`,
          phone: pseudoPhone,
          property_id: propertyId,
          source: 'website',
          status: 'new',
          last_activity_at: now,
        })
        .select()
        .single();
      if (error) throw error;

      localStorage.setItem(storageKey, lead.id);
      setLeadId(lead.id);

      await supabase.from('conversations').insert({
        lead_id: lead.id,
        message: `Hi! 👋 I'm here to help you with ${propertyName}. Ask me about rent, food, amenities, move-in process, or anything else!`,
        direction: 'outbound',
        channel: 'website_chat',
        context_type: 'bot',
        context_id: propertyId,
        created_at: now,
      });
    })().catch(() => {
      // Fail silently in UI; widget still works but without persistence
      setMessages([
        {
          id: 'local-1',
          role: 'bot',
          text: `Hi! 👋 I'm here to help you with ${propertyName}. Ask me about rent, food, amenities, move-in process, or anything else!`,
          time: formatTime(new Date()),
        },
      ]);
    });
  }, [isOpen, leadId, propertyId, propertyName, storageKey]);

  // Load messages from Supabase
  useEffect(() => {
    if (!isOpen || !leadId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (cancelled) return;
      const mapped: ChatMessage[] = (data || []).map((m: any) => ({
        id: m.id,
        role:
          m.direction === 'inbound'
            ? 'user'
            : m.context_type === 'agent'
              ? 'agent'
              : 'bot',
        text: m.message,
        time: formatTime(m.created_at),
      }));
      setMessages(mapped);
    })().catch(() => {
      // Keep whatever is already shown
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, leadId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!isOpen || !leadId) return;
    const channel = supabase
      .channel(`property-chat-${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const m: any = payload.new;
          setMessages((prev) => [
            ...prev,
            {
              id: m.id,
              role:
                m.direction === 'inbound'
                  ? 'user'
                  : m.context_type === 'agent'
                    ? 'agent'
                    : 'bot',
              text: m.message,
              time: formatTime(m.created_at),
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, leadId]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!leadId) return;

    const now = new Date().toISOString();
    setInput('');
    setIsTyping(true);

    await supabase.from('conversations').insert({
      lead_id: leadId,
      message: text.trim(),
      direction: 'inbound',
      channel: 'website_chat',
      context_type: 'user',
      context_id: propertyId,
      created_at: now,
    });

    await supabase
      .from('leads')
      .update({ last_activity_at: now })
      .eq('id', leadId);

    const delay = 800 + Math.random() * 600;
    window.setTimeout(async () => {
      const auto = getAutoResponse(text);
      const reply =
        auto ||
        "Thanks for your question! I'm connecting you with a Gharpayy housing advisor who can help. They usually respond within 2 minutes. You'll also get a WhatsApp message shortly.";

      await supabase.from('conversations').insert({
        lead_id: leadId,
        message: reply,
        direction: 'outbound',
        channel: 'website_chat',
        context_type: auto ? 'bot' : 'agent',
        context_id: propertyId,
        created_at: new Date().toISOString(),
      });
      setIsTyping(false);
    }, delay);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
          style={{ height: 520 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xs">G</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Gharpayy Support</p>
                <p className="text-[10px] text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> Online
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'flex gap-2'}`}>
                  {msg.role !== 'user' && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'bot' ? 'bg-accent/10' : 'bg-info/10'}`}>
                      {msg.role === 'bot' ? <Bot size={12} className="text-accent" /> : <User size={12} className="text-info" />}
                    </div>
                  )}
                  <div>
                    <div className={`px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent text-accent-foreground rounded-br-md'
                        : 'bg-secondary text-foreground rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 px-1">{msg.time}</p>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                  <Bot size={12} className="text-accent" />
                </div>
                <div className="px-3 py-2 rounded-xl bg-secondary">
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Quick questions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask about this PG..."
              className="h-9 text-sm"
            />
            <Button size="sm" className="h-9 w-9 p-0 bg-accent hover:bg-accent/90" onClick={() => sendMessage(input)}>
              <Send size={14} className="text-accent-foreground" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
