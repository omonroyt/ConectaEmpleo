import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Mic, MicOff, Send } from "lucide-react";
import { ImmersiveLayout } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { Avatar, Button, ProgressSteps, Textarea } from "@/components/ui";
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

  const isTyping = createSession.isPending || sendMessage.isPending;

  return (
    <ImmersiveLayout onClose={() => navigate("/candidate")}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={pageSequence}
        className="mx-auto flex w-full min-h-0 max-w-[680px] flex-1 flex-col gap-5"
      >
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-on-dark sm:text-2xl">
            Conversemos sobre tu experiencia
          </h1>
          {session && (
            <ProgressSteps
              total={session.max_turns}
              current={session.turn}
              label={`Turno ${session.turn} de ${session.max_turns}`}
            />
          )}
        </motion.div>

        {/*
          El fondo de marca vive DETRÁS del hilo, no sobre las burbujas: sobre
          ellas competía con el texto y bajaba el contraste justo donde más se
          lee. Aquí la imagen queda muy atenuada bajo un velo oscuro, así que
          aporta profundidad y las burbujas conservan su superficie neutra.
        */}
        {/*
          Altura acotada en vez de `flex-1`: un hijo flex conserva
          `min-height: auto`, así que el hilo no encogía por debajo de su
          contenido y era la **página** la que hacía scroll — en móvil eso
          dejaba fuera de pantalla el encabezado y el campo de respuesta. Con
          altura definida el scroll ocurre dentro del hilo, como debe.
        */}
        <motion.div
          variants={fadeUp}
          className="relative flex h-[58dvh] max-h-[640px] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-border-dark"
        >
          <BrandBackground asset="onboarding" presence="support" overlay="none" position="70% 35%" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,18,.42)_0%,rgba(7,10,18,.66)_50%,rgba(7,10,18,.84)_100%)]"
          />

          <div
            ref={listRef}
            className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex items-end gap-2", message.role === "candidate" && "flex-row-reverse")}
              >
                {message.role === "agent" && <Avatar name="Sofía" size="sm" />}
                <div
                  className={cn(
                    "max-w-[82%] rounded-lg px-4 py-2.5 text-sm leading-relaxed text-pretty shadow-sm",
                    message.role === "agent"
                      ? "rounded-bl-sm bg-surface text-text-primary"
                      : "rounded-br-sm bg-gradient-cta text-white",
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-end gap-2">
                <Avatar name="Sofía" size="sm" />
                <div className="flex items-center gap-1.5 rounded-lg rounded-bl-sm bg-surface px-4 py-3">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-1.5 rounded-full bg-text-tertiary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        delay: dot * 0.16,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                  <span className="sr-only">Sofía está escribiendo</span>
                </div>
              </div>
            )}
          </div>
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
                  // A 390px, el micrófono y el botón de enviar dejaban al campo
                  // de texto ~200px y el placeholder se partía en dos líneas.
                  "flex size-12 shrink-0 items-center justify-center rounded-pill border transition-colors duration-fast ease-standard sm:size-14",
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
              // Cuadrado: con solo un icono, `px-7` de `size="lg"` lo hacía
              // innecesariamente ancho y comía el campo de respuesta.
              className="size-12 shrink-0 px-0 sm:size-14"
            >
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </ImmersiveLayout>
  );
}
