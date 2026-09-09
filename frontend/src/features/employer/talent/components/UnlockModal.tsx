import { KeyRound } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { anonDisplayCode } from "../talentLabels";

export interface UnlockModalProps {
  open: boolean;
  anonCode: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmación previa al desbloqueo de identidad (04 §E9).
 * El copy es fijo: la acción queda registrada y es irreversible para la demo.
 */
export function UnlockModal({ open, anonCode, loading = false, onClose, onConfirm }: UnlockModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Desbloquear identidad">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-md bg-surface-soft p-4">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            Vas a desbloquear a{" "}
            <span className="font-medium text-text-primary">{anonDisplayCode(anonCode)}</span>. Verás
            nombre, contacto y documentos. Esta acción queda registrada.
          </p>
        </div>

        <p className="text-sm text-text-tertiary">
          El primer filtro se hizo sin identidad para reducir sesgos. A partir de aquí la decisión y
          el contacto son tuyos.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={onConfirm} loading={loading}>
            Desbloquear identidad
          </Button>
        </div>
      </div>
    </Modal>
  );
}
