import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import { Building2, Lock, Mail, User } from "lucide-react";
import { AuthLayout } from "@/components/layout";
import { Button, FormField, Input, RadioCards } from "@/components/ui";
import { useRegister } from "@/api/hooks";
import { ApiClientError } from "@/api";
import { useMotionSafe } from "@/lib/motion";
import {
  registerSchema,
  fieldErrorsFrom,
  type RegisterFormValues,
} from "@/features/auth/auth.schemas";
import { DemoHint } from "@/features/auth/DemoHint";
import type { Role } from "@/api/types";

const roleOptions = [
  { value: "CANDIDATE", label: "Soy candidato", description: "Quiero mostrar mis capacidades y encontrar trabajo.", icon: User },
  { value: "COMPANY", label: "Soy empresa", description: "Quiero encontrar talento con evidencia real.", icon: Building2 },
];

/** C2 — Registro `/register`. */
export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole: Role = searchParams.get("role") === "COMPANY" ? "COMPANY" : "CANDIDATE";

  const [role, setRole] = useState<Role>(initialRole);
  const [values, setValues] = useState({ email: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const register = useRegister();
  const { fadeUp, pageSequence, staggerContainer } = useMotionSafe();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const candidate: RegisterFormValues = { role, ...values };
    const parsed = registerSchema.safeParse(candidate);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setFieldErrors({});
    register.mutate(
      { email: parsed.data.email, password: parsed.data.password, role: parsed.data.role },
      {
        onSuccess: (auth) => {
          navigate(auth.user.role === "CANDIDATE" ? "/candidate/onboarding" : "/employer/onboarding", {
            replace: true,
          });
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "No pudimos crear tu cuenta. Inténtalo de nuevo en unos segundos.",
          );
        },
      },
    );
  };

  return (
    <AuthLayout
      asset={role === "COMPANY" ? "employer" : "brand-main"}
      heroTitle="Crea tu cuenta"
      heroSubtitle="Un perfil respaldado por evidencia, no solo por palabras."
    >
      <motion.div initial="hidden" animate="visible" variants={pageSequence} className="flex flex-col gap-6">
        <motion.div variants={fadeUp}>
          <RadioCards
            name="role"
            options={roleOptions}
            value={role}
            onChange={(value) => setRole(value as Role)}
            columns={2}
          />
        </motion.div>

        <motion.form
          variants={staggerContainer(0.06, 0.05)}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <motion.div variants={fadeUp}>
            <FormField label="Correo" htmlFor="register-email" error={fieldErrors.email}>
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
            <FormField
              label="Contraseña"
              htmlFor="register-password"
              hint="Al menos 8 caracteres."
              error={fieldErrors.password}
            >
              <Input
                type="password"
                autoComplete="new-password"
                leadingIcon={<Lock className="size-4" />}
                value={values.password}
                onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
              />
            </FormField>
          </motion.div>
          <motion.div variants={fadeUp}>
            <FormField label="Confirmar contraseña" htmlFor="register-confirm" error={fieldErrors.confirmPassword}>
              <Input
                type="password"
                autoComplete="new-password"
                leadingIcon={<Lock className="size-4" />}
                value={values.confirmPassword}
                onChange={(event) => setValues((v) => ({ ...v, confirmPassword: event.target.value }))}
              />
            </FormField>
          </motion.div>

          {formError && (
            <p role="alert" aria-live="polite" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <motion.div variants={fadeUp}>
            <Button type="submit" size="lg" arrow loading={register.isPending} className="w-full">
              Crear cuenta
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} className="text-xs text-text-tertiary">
            Al continuar aceptas que usemos tu información para construir tu perfil y conectarte con
            oportunidades relevantes. Nunca compartimos tu identidad sin tu consentimiento.
          </motion.p>
        </motion.form>

        <motion.p variants={fadeUp} className="text-center text-sm text-text-secondary">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => navigate(`/login?role=${role}`)}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Iniciar sesión
          </button>
        </motion.p>

        <DemoHint />
      </motion.div>
    </AuthLayout>
  );
}
