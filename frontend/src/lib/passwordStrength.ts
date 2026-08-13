export type PasswordStrength = 'weak' | 'fair' | 'strong';

/**
 * Length plus character-class variety. Deliberately simple and local — a real
 * strength estimator belongs on the server, and shipping one client-side would
 * imply a guarantee this demo cannot make.
 */
export const passwordStrength = (value: string): PasswordStrength => {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((pattern) =>
    pattern.test(value),
  ).length;

  if (value.length >= 12 && classes >= 3) return 'strong';
  if (value.length >= 8 && classes >= 2) return 'fair';
  return 'weak';
};
