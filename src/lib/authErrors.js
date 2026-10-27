export function authError(error) {
  const code = error?.code;
  const message = String(error?.message || '');
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos. Confira e tente novamente.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (code === 'user_already_exists' || /already registered/i.test(message)) return 'Este e-mail já possui uma conta. Tente entrar.';
  if (/rate_limit|over_.*limit/.test(code || '') || /rate limit|too many/i.test(message)) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  if (code === 'same_password') return 'Escolha uma senha diferente da anterior.';
  if (code === 'weak_password' || /password.*(weak|short|least)/i.test(message)) return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
  if (/otp_expired|session_not_found/.test(code || '') || /expired|invalid.*token/i.test(message)) return 'Este link expirou ou já foi utilizado. Solicite um novo link.';
  if (code === 'signup_disabled') return 'O cadastro está desativado. Entre com uma conta existente.';
  if (/provider.*(disabled|not enabled)/i.test(message)) return 'O login com Google ainda não foi ativado.';
  if (/fetch|network|load|timeout/i.test(message)) return 'Não foi possível conectar. Confira sua internet e tente novamente.';
  return 'Não foi possível concluir. Tente novamente em alguns instantes.';
}
