const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /[0-9\W_]/;

export function meetsPasswordPolicy(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    PASSWORD_COMPLEXITY_REGEX.test(password)
  );
}
