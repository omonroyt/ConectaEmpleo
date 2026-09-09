import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Mic, MicOff, Send } from "lucide-react";
import { ImmersiveLayout } from "@/components/layout";
import { Avatar, Button, Card, ProgressSteps, Textarea } from "@/components/ui";
import { useCvBuilder } from "@/api/hooks";
import { useMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { BrowserVoiceGateway } from "@/voice";
import type { CVBuilderSession } from "@/api/types";

interface ChatMessage {
  id: string;
  role: "agent" | "candidate";
  text: string;
}

/** C6 — CV conversacional `/candidate/cv/build`, chat con Sofía. */
export function Component() {
  const navigate = useNavigate();
  const { fadeUp, pageSequence } = useMotionSafe();
  const { createSession, sendMessage, finalize } = useCvBuilder();

  const [session, setSession] = useState<CVBuilderSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [done, setDone] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const startedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const voiceGateway = useMemo(() => new BrowserVoiceGateway(), []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    createSession.mutate(undefined, {
      onSuccess: (reply) => {
        setSession(reply.session);
        setMessages([{ id: reply.agent_message.id, role: "agent", text: reply.agent_message.text }]);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      void voiceGateway.dispose();
    };
  }, [voiceGateway]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = draftText.trim();
    if (!text || !session || sendMessage.isPending || done) return;
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "candidate", text }]);
    setDraftText("");
    sendMessage.mutate(
      { sessionId: session.id, text },
      {
        onSuccess: (reply) => {
          setSession(reply.session);
          if (reply.agent_message.text) {
            setMessages((current) => [
              ...current,
              { id: reply.agent_message.id, role: "agent", text: reply.agent_message.text },
            ]);
          }
          if (reply.done) setDone(true);
        },
      },
    );
  };

  const toggleMic = async () => {
    if (!voiceGateway.available) return;
    if (isListening) {
      setIsListening(false);
      const { transcript } = await voiceGateway.stopListening();
      if (transcript) setDraftText((current) => (current ? `${current} ${transcript}` : transcript));
      return;
    }
    setIsListening(true);
    await voiceGateway.startListening();
  };

  const handleFinalize = () => {
    if (!session) return;
    finalize.mutate(session.id, {
      onSuccess: () => navigate("/candidate/cv/review"),
    });
  };

  const draft = session?.draft;
  const isTyping = createSession.isPending || sendMessage.isPending;

  const draftPanel = (
    <Card padding="lg" className="sticky top-6">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Tu perfil se va armando</p>
      <div className="mt-4 flex flex-col gap-5">
        <AnimatePresence mode="popLayout">
          {draft?.experience && draft.experience.length > 0 && (
            <motion.div key="experience" initial="hidden" animate="visible" variants={fadeUp}>
              <p className="text-sm font-medium text-text-primary">Experiencia</p>
              <ul className="mt-1 space-y-1 text-sm text-text-secondary">
                {draft.experience.map((item) => (
                  <li key={item.id}>{item.position}{item.company ? ` · ${item.company}` : ""}</li>
                ))}
              </ul>
            </motion.div>
          )}
          {draft?.education && draft.education.length > 0 && (
            <motion.div key="education" initial="hidden" animate="visible" variants={fadeUp}>
              <p className="text-sm font-medium text-text-primary">Estudios</p>
              <ul className="mt-1 space-y-1 text-sm text-text-secondary">
                {draft.education.map((item) => (
                  <li key={item.id}>{item.degree}</li>
                ))}
              </ul>
            </motion.div>
          )}
          {draft?.skills && draft.skills.length > 0 && (
            <motion.div key="skills" initial="hidden" animate="visible" variants={fadeUp}>
              <p className="text-sm font-medium text-text-primary">Habilidades</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {draft.skills.map((skill) => (
                  <span key={skill.code} className="rounded-pill bg-surface-soft px-2.5 py-1 text-xs text-text-secondary">
                    {skill.name}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
          {(!draft || (!draft.experience?.length && !draft.education?.length && !draft.skills?.length)) && (
            <p className="text-sm text-text-tertiary">A medida que conversas, aquí verás tu perfil tomar forma.</p>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );

  return (
    <ImmersiveLayout onClose={() => navigate("/candidate")} aside={draftPanel}>
      <motion.div initial="hidden" animate="visible" variants={pageSequence} className="flex h-full flex-col gap-5">
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-text-on-dark">Conversemos sobre tu experiencia</h1>
          {session && <ProgressSteps total={session.max_turns} current={session.turn} label={`Turno ${session.turn} de ${session.max_turns}`} />}
        </motion.div>

        <motion.div
          variants={fadeUp}
          ref={listRef}
          className="flex max-h-[50vh] min-h-[280px] flex-1 flex-col gap-3 overflow-y-auto rounded-lg bg-bg-dark-soft p-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex items-end gap-2", message.role === "candidate" && "flex-row-reverse")}
            >
              {message.role === "agent" && <Avatar name="Sofía" size="sm" />}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2.5 text-sm",
                  message.role === "agent"
                    ? "bg-surface text-text-primary"
                    : "bg-gradient-cta text-white",
                )}
              >
                {message.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2">
              <Avatar name="Sofía" size="sm" />
              <div className="rounded-lg bg-surface px-4 py-2.5 text-sm text-text-tertiary">
                Sofía está escribiendo…
              </div>
            </div>
          )}
        </motion.div>

        {done ? (
          <motion.div variants={fadeUp}>
            <Button size="lg" arrow loading={finalize.isPending} onClick={handleFinalize} className="w-full">
              Revisar mi perfil
            </Button>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="flex items-end gap-2">
            <Textarea
              autoResize
              placeholder="Escribe tu respuesta…"
              value={draftText}
              disabled={!session}
              onChange={(event) => setDraftText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-surface"
            />
            {voiceGateway.available && (
              <button
                type="button"
                aria-pressed={isListening}
                aria-label={isListening ? "Detener dictado" : "Dictar por voz"}
                onClick={() => void toggleMic()}
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-pill border transition-colors duration-fast ease-standard",
                  isListening
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-border-dark text-text-on-dark-secondary hover:text-text-on-dark",
                )}
              >
                {isListening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </button>
            )}
            <Button
              size="lg"
              aria-label="Enviar"
              disabled={!draftText.trim() || !session}
              loading={sendMessage.isPending}
              onClick={handleSend}
            >
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </ImmersiveLayout>
  );
}
