import nodemailer from "nodemailer";

export type Mail = { to: string; subject: string; text: string };

/** In-memory log used by tests and by the dev notice. Never holds more than the last 50 messages. */
export const sentMail: Mail[] = [];

export async function sendMail(mail: Mail): Promise<void> {
  const driver = process.env.MAIL_DRIVER ?? "console";
  if (driver === "smtp") {
    const url = process.env.SMTP_URL;
    if (!url) throw new Error("MAIL_DRIVER=smtp needs SMTP_URL");
    const transport = nodemailer.createTransport(url);
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "Leksmedia <support@leksmedias.com>",
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("MAIL_DRIVER=console is for development only. Set MAIL_DRIVER=smtp in production.");
  }
  sentMail.push(mail);
  if (sentMail.length > 50) sentMail.shift();
  console.log(`\n[mail:console] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
}

export const isConsoleMail = () => (process.env.MAIL_DRIVER ?? "console") === "console" && process.env.NODE_ENV !== "production";
