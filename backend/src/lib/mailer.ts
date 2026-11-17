import { config } from '../config.js';

// Sends the forgot-password code. No mail provider is wired up yet, so outside production the code is
// printed in the server log for testing. Plug a provider (Resend, SES, SMTP...) in here before launch.
export async function sendResetCode(email: string, code: string) {
  if (!config.isProd) {
    console.log(`[mail] password reset code for ${email}: ${code}`);
    return;
  }
  console.warn('[mail] no mail provider configured; a password reset code could not be sent');
}
