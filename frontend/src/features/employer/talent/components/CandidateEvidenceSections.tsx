import { FileCheck2, Info, MessageSquareQuote } from "lucide-react";
import type { AnonymousCandidateCard } from "@/api/types";
import {
  Badge,
  Card,
  EvidenceBadge,
  Reveal,
  RevealGroup,
  SectionHeader,
  SkillChip,
} from "@/components/ui";
import {
  evidenceLevelFor,
  interviewEvidence,
  unvalidatedClaims,
} from "../talentLabels";
import { cn } from "@/lib/cn";

export interface CandidateEvidenceSectionsProps {
  /** Solo datos anónimos: este componente nunca recibe identidad. */
  card: AnonymousCandidateCard;
  className?: string;
}

/**
 * Bloques de evidencia compartidos por E9 y E12: habilidades con nivel de
 * evidencia, evidencias de entrevista, consistencias (declarado vs. validado)
 * y conteo de documentos verificados.
 *
 * Los dos bloques de lectura larga van en panel claro; los dos bloques de
 * resumen, en vidrio sobre el lienzo — alternar familias evita que la zona se
 * lea como un muro blanco.
 */
export function CandidateEvidenceSections({ card, className }: CandidateEvidenceSectionsProps) {
  const evidences = interviewEvidence(card.skills);
  const claims = unvalidatedClaims(card.skills);

  return (
    <RevealGroup className={cn("flex flex-col gap-6", className)}>
      <Reveal>
        <Card variant="light" padding="lg">
          <SectionHeader
            title="Habilidades y nivel de evidencia"
            description="Cada habilidad indica de dónde viene su respaldo: declarada por la persona, evaluada en la entrevista o verificada con documento."
          />
          {card.skills.length === 0 ? (
            <p className="mt-5 text-sm text-text-secondary">
              Este perfil aún no tiene habilidades registradas.
            </p>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {card.skills.map((skill) => (
                <li
                  key={skill.skill_code}
                  className="flex items-center justify-between gap-3 rounded-md bg-surface-tint px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {skill.skill_name}
                    </p>
                    {skill.evaluated_score != null && (
                      <p className="text-xs tabular-nums text-text-secondary">
                        Evaluada en {Math.round(skill.evaluated_score)} de 100
                        {skill.confidence != null
                          ? ` · confianza ${Math.round(skill.confidence * 100)} %`
                          : ""}
                      </p>
                    )}
                  </div>
                  <EvidenceBadge level={evidenceLevelFor(skill)} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>

      <Reveal>
        <Card variant="light" padding="lg">
          <SectionHeader
            title="Evidencias de entrevista"
            description="Resumen de lo que la persona respondió y sostuvo con ejemplos concretos."
          />
          {evidences.length === 0 ? (
            <p className="mt-5 text-sm text-text-secondary">
              Todavía no hay evidencias de entrevista registradas para este perfil.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {evidences.map((skill) => (
                <li
                  key={skill.skill_code}
                  className="flex gap-3 rounded-md bg-surface-tint px-4 py-3.5"
                >
                  <MessageSquareQuote
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{skill.skill_name}</p>
                    <p className="mt-1 max-w-[68ch] text-pretty text-sm text-text-secondary">
                      {skill.evidence_summary}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Reveal>
          <Card variant="glass" padding="lg" className="h-full">
            <SectionHeader
              title="Consistencias del perfil"
              description="Lo que la persona declaró y todavía no se ha podido validar con evidencia."
            />
            {claims.length === 0 ? (
              <p className="mt-5 flex items-start gap-2.5 text-pretty text-sm text-text-on-dark-secondary">
                <Info className="mt-0.5 size-5 shrink-0 text-success-on-dark" aria-hidden="true" />
                Todo lo declarado en el perfil tiene respaldo evaluado o verificado.
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                <p className="max-w-[62ch] text-pretty text-sm text-text-on-dark-secondary">
                  {claims.length}{" "}
                  {claims.length === 1 ? "habilidad declarada" : "habilidades declaradas"} sin
                  validar. No resta puntos por sí sola: conviene confirmarla en entrevista
                  presencial.
                </p>
                <ul className="flex flex-wrap gap-2">
                  {claims.map((skill) => (
                    <li key={skill.skill_code}>
                      <SkillChip
                        name={`${skill.skill_name} — declarado, no validado`}
                        evidence="declared"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal>
          <Card variant="glass" padding="lg" className="h-full">
            <SectionHeader title="Documentos verificados" />
            <div className="mt-5 flex items-start gap-4">
              <FileCheck2
                className="mt-0.5 size-6 shrink-0 text-primary-on-dark"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-pretty text-sm font-medium text-text-on-dark">
                  <span className="tabular-nums">{card.evidence_counts.verified}</span>{" "}
                  {card.evidence_counts.verified === 1
                    ? "habilidad verificada con documento"
                    : "habilidades verificadas con documento"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="neutral">{card.evidence_counts.declared} declaradas</Badge>
                  <Badge tone="info">{card.evidence_counts.evaluated} evaluadas</Badge>
                  <Badge tone="success">{card.evidence_counts.verified} verificadas</Badge>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </RevealGroup>
  );
}
