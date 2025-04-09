import { baseEmailTemplate } from "./base.template";

export const verificationEmailTemplate = (verificationUrl: string): string => {
  return baseEmailTemplate({
    title: "Verify your email",
    body: `
        <p>Click the button below to verify your email:</p>
        <a href="${verificationUrl}">Verify email</a>
        `,
    buttonText: "Verify email",
    buttonUrl: verificationUrl,
  });
};
