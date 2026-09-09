import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import { Mail, Lock } from "lucide-react";
import { AuthLayout } from "@/components/layout";
import { Button, FormField, Input, SegmentedControl } from "@/components/ui";
import { useLogin } from "@/api/hooks";
import { ApiClientError } from "@/api";
import { homePathForRole } from "@/store/session";
import { useMotionSafe } from "@/lib/motion";
import { loginSchema, fieldErrorsFrom, type LoginFormValues } from "@/features/auth/auth.schemas";
import { DemoHint } from "@/features/auth/DemoHint";

type AudienceRole = "CANDIDATE" | "COMPANY";

const copyByRole: Record<AudienceRole, { title: string; subtitle: string }> = {
  CANDIDATE: { title: "Bienvenido de vuelta", subtitle: "Tu talento habla por ti." },
  COMPANY: { title: "Acceso para empresas", subtitle: "Encuentra talento con evidencia." },
};

/** C1 — Login `/login`. */
export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole: AudienceRole = searchParams.get("role") === "COMPANY" ? "COMPANY" : "CANDIDATE";
  const [audience, setAudience] = useState<AudienceRole>(initialRole);

  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const login = useLogin();
  const { fadeUp, pageSequence, staggerContainer } = useMotionSafe();
  const copy = copyByRole[audience];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setFieldErrors({});
    login.mutate(parsed.data, {
      onSuccess: (auth) => {
        const next = searchParams.get("next");
        navigate(next && next.startsWith("/") ? next : homePathForRole(auth.user.role), { replace: true });
      },
      onError: (error) => {
        setFormError(
          error instanceof ApiClientError
            ? error.message
            : "No pudimos iniciar sesión. Revisa tu correo y contraseña e inténtalo de nuevo.",
        );
      },
    });
  };

  return (
    <AuthLayout asset={audience === "COMPANY" ? "employer" : "brand-main"} heroTitle={copy.title} heroSubtitle={copy.subtitle}>
      <motion.div initial="hidden" animate="visible" variants={pageSequence} className="flex flex-col gap-6">
        <motion.div variants={fadeUp}>
          <SegmentedControl
            aria-label="Tipo de cuenta"
            options={[
              { value: "CANDIDATE", label: "Candidato" },
              { value: "COMPANY", label: "Empresa" },
            ]}
            value={audience}
            onChange={(value) => setAudience(value as AudienceRole)}
          />
        </motion.div>

        <motion.form
          variants={staggerContainer(0.06, 0.05)}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <motion.div variants={fadeUp}>
            <FormField label="Correo" htmlFor="login-email" error={fieldErrors.email}>
              <Input
                type="email"
                autoComplete="email"
                leadingIcon={<Mail className="size-4" />}
                value={values.email}
                onChange={(event) => setValues((v) => ({ ...v, email: event.target.value }))}
              />
            </FormField>
          </motion.div>
          <motion.div variants={fadeUp}>
            <FormField label="Contraseña" htmlFor="login-password" error={fieldErrors.password}>
              <Input
                type="password"
                autoComplete="current-password"
                leadingIcon={<Lock className="size-4" />}
                value={values.password}
                onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
              />
            </FormField>
          </motion.div>

          {formError && (
            <p role="alert" aria-live="polite" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <motion.div variants={fadeUp}>
            <Button type="submit" size="lg" arrow loading={login.isPending} className="w-full">
              Entrar
            </Button>
          </motion.div>
        </motion.form>

        <motion.p variants={fadeUp} className="text-center text-sm text-text-secondary">
          ¿Aún no tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => navigate(`/register?role=${audience}`)}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Crear cuenta
          </button>
        </motion.p>

        <DemoHint />
      </motion.div>
    </AuthLayout>
  );
}
