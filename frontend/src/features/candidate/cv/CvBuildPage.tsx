import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Mic, MicOff, Send } from "lucide-react";
import { ImmersiveLayout } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { Avatar, Button, Eyebrow, ProgressSteps, Textarea } from "@/components/ui";
import { useCvBuilder } from "@/api/hooks";
import { useMotionSafe } from "@/lib/motion";
import { useReducedMotion } from "@/lib/a11y";
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
  const reducedMotion = useReducedMotion();
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
        className="mx-auto flex w-full min-h-0 flex-1 flex-col gap-4 sm:gap-6"
      >
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <Eyebrow tone="dark">Con Sofía</Eyebrow>
          <h1 className="text-balance text-xl font-semibold tracking-[-0.02em] text-text-on-dark sm:text-2xl">
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
          Altura en `dvh` (definida) en vez de `flex-1`: el shell
          (`ImmersiveLayout`) no tiene una altura acotada, solo `min-h-dvh`,
          así que un hijo `flex-1` no tiene de qué "sobrar" y no se limita
          (ver historial de este archivo). Con una altura generosa y acotada
          en `dvh`/`max-h` el hilo scrollea internamente y el compositor de
          abajo, en flujo normal justo debajo, queda siempre visible sin
          necesitar `position: sticky` (que sin un contenedor del alto exacto
          del viewport se queda flotando sobre el hilo mientras se scrollea
          la página, en vez de quedarse quieto al fondo).
        */}
        <motion.div
          variants={fadeUp}
          className="relative flex h-[68dvh] max-h-[760px] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border-dark sm:rounded-[28px]"
        >
          <BrandBackground asset="onboarding" presence="support" overlay="none" position="70% 35%" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,18,.42)_0%,rgba(7,10,18,.66)_50%,rgba(7,10,18,.84)_100%)]"
          />

          <div
            ref={listRef}
            className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-7"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex items-end gap-2", message.role === "candidate" && "flex-row-reverse")}
              >
                {message.role === "agent" && <Avatar name="Sofía" size="sm" />}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed text-pretty shadow-sm sm:max-w-[75%] sm:text-[0.9375rem]",
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

        {/*
          Compositor con apariencia "flotante" (vidrio + sombra + esquinas
          redondeadas), pero en flujo normal justo debajo del hilo: como el
          hilo ya tiene altura acotada, no hace falta `position: sticky` para
          que quede siempre visible, y así se evita que flote encima del
          propio hilo mientras se hace scroll de la página en pantallas bajas.
        */}
        {done ? (
          <motion.div variants={fadeUp}>
            <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-5">
              <Button size="lg" arrow loading={finalize.isPending} onClick={handleFinalize} className="w-full">
                Revisar mi perfil
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp}>
            <div className="glass flex flex-col gap-4 rounded-2xl p-4 sm:rounded-3xl sm:p-5">
              {/*
                El micrófono es ahora la acción protagonista: un círculo grande
                con halo de marca e invitación a hablar, en vez de un botón
                secundario del tamaño del de enviar. El dictado sigue usando
                exactamente el mismo handler/estado (`toggleMic`/`isListening`)
                y los mismos `aria-label`; solo cambió su peso visual.
              */}
              {voiceGateway.available && (
                <div className="flex flex-col items-center gap-2.5 border-b border-border-glass/70 pb-4 sm:pb-5">
                  <button
                    type="button"
                    aria-pressed={isListening}
                    aria-label={isListening ? "Detener dictado" : "Dictar por voz"}
                    onClick={() => void toggleMic()}
                    className={cn(
                      "relative flex size-16 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_34px_-8px_rgba(74,69,255,.85)]",
                      "transition-transform duration-normal ease-out-smooth hover:scale-[1.04] active:scale-95",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-2",
                      "sm:size-20",
                      isListening ? "bg-danger" : "bg-gradient-cta",
                    )}
                  >
                    {isListening &&
                      (reducedMotion ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full ring-4 ring-danger/50"
                        />
                      ) : (
                        <>
                          <motion.span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full border-2 border-danger/60"
                            animate={{ scale: [1, 1.65], opacity: [0.55, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                          />
                          <motion.span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full border-2 border-danger/60"
                            animate={{ scale: [1, 1.65], opacity: [0.55, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.55 }}
                          />
                        </>
                      ))}
                    {isListening ? (
                      <MicOff className="relative size-6 sm:size-7" aria-hidden="true" />
                    ) : (
                      <Mic className="relative size-6 sm:size-7" aria-hidden="true" />
                    )}
                  </button>
                  <p className="text-center text-sm text-text-on-dark-secondary">
                    {isListening ? "Escuchando… toca para detener" : "Cuéntamelo hablando, es más rápido"}
                  </p>
                </div>
              )}

              <div className="flex items-end gap-2">
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
                  className="flex-1"
                />
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
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </ImmersiveLayout>
  );
}
