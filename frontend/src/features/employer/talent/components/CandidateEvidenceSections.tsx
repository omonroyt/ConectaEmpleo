import { FileCheck2, Info, MessageSquareQuote } from "lucide-react";
import type { AnonymousCandidateCard } from "@/api/types";
import { Badge, Card, EvidenceBadge, SectionHeader, SkillChip } from "@/components/ui";
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
 */
export function CandidateEvidenceSections({ card, className }: CandidateEvidenceSectionsProps) {
  const evidences = interviewEvidence(card.skills);
  const claims = unvalidatedClaims(card.skills);

  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <section>
        <SectionHeader
          title="Habilidades y nivel de evidencia"
          description="Cada habilidad indica de dónde viene su respaldo: declarada por la persona, evaluada en la entrevista o verificada con documento."
        />
        {card.skills.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            Este perfil aún no tiene habilidades registradas.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {card.skills.map((skill) => (
              <li
                key={skill.skill_code}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{skill.skill_name}</p>
                  {skill.evaluated_score != null && (
                    <p className="text-xs text-text-secondary">
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
      </section>

      <section>
        <SectionHeader
          title="Evidencias de entrevista"
          description="Resumen de lo que la persona respondió y sostuvo con ejemplos concretos."
        />
        {evidences.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            Todavía no hay evidencias de entrevista registradas para este perfil.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {evidences.map((skill) => (
              <li key={skill.skill_code}>
                <Card padding="md" className="flex gap-3">
                  <MessageSquareQuote
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{skill.skill_name}</p>
                    <p className="mt-1 text-sm text-text-secondary">{skill.evidence_summary}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader
          title="Consistencias del perfil"
          description="Lo que la persona declaró y todavía no se ha podido validar con evidencia."
        />
        {claims.length === 0 ? (
          <Card padding="md" className="mt-4 flex gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm text-text-secondary">
              Todo lo declarado en el perfil tiene respaldo evaluado o verificado.
            </p>
          </Card>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              {claims.length} {claims.length === 1 ? "habilidad declarada" : "habilidades declaradas"}{" "}
              sin validar. No resta puntos por sí sola: conviene confirmarla en entrevista presencial.
            </p>
            <ul className="flex flex-wrap gap-2">
              {claims.map((skill) => (
                <li key={skill.skill_code}>
                  <SkillChip name={`${skill.skill_name} — declarado, no validado`} evidence="declared" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Documentos verificados" />
        <Card padding="md" className="mt-4 flex items-center gap-4">
          <FileCheck2 className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {card.evidence_counts.verified}{" "}
              {card.evidence_counts.verified === 1
                ? "habilidad verificada con documento"
                : "habilidades verificadas con documento"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="neutral">{card.evidence_counts.declared} declaradas</Badge>
              <Badge tone="info">{card.evidence_counts.evaluated} evaluadas</Badge>
              <Badge tone="success">{card.evidence_counts.verified} verificadas</Badge>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
