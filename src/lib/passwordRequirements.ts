export type PasswordRequirement = { key: string; label: string; test: (pw: string) => boolean };

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: "length", label: "Mínimo 8 caracteres", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "Una letra mayúscula", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "Una letra minúscula", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "Un número", test: (pw) => /[0-9]/.test(pw) },
  { key: "special", label: "Un carácter especial", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function evaluatePassword(newPassword: string, confirmPassword: string) {
  const requirements = PASSWORD_REQUIREMENTS.map((r) => ({ ...r, met: r.test(newPassword) }));
  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  return { requirements, allRequirementsMet, passwordsMatch };
}
