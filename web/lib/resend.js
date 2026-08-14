import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (to, verifyUrl) => {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Verify your BeFit account",
    html: `
      <p>Click the link below to verify your account:</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>This link expires in 15 minutes. If the button doesn't work, copy and paste this URL:</p>
      <p>${verifyUrl}</p>
    `,
  });
};
