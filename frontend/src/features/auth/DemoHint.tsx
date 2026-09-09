/** Hint discreto con los usuarios demo, visible solo en `import.meta.env.DEV` (modo mock). */
export function DemoHint() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="mt-6 rounded-md border border-dashed border-border bg-surface-soft/60 p-3 text-xs text-text-tertiary">
      <p className="font-medium text-text-secondary">Usuarios demo (solo desarrollo)</p>
      <p className="mt-1">
        <span className="font-mono">candidato@demo.mx</span> · perfil nuevo, para recorrer el flujo completo
      </p>
      <p>
        <span className="font-mono">maria@demo.mx</span> · candidata ya evaluada
      </p>
      <p>
        Contraseña: <span className="font-mono">demo1234</span>
      </p>
    </div>
  );
}
