const nodemailer = require("nodemailer");

(async () => {
  const gmxEmail = process.env.GMX_EMAIL;
  const gmxPassword = process.env.GMX_PASSWORD;
  const alertEmail = process.env.ALERT_EMAIL;

  if (!gmxEmail || !gmxPassword || !alertEmail) {
    throw new Error("GMX_EMAIL, GMX_PASSWORD oder ALERT_EMAIL fehlt.");
  }

  console.log("Starte GMX Mail-Test...");

  const transporter = nodemailer.createTransport({
    host: "mail.gmx.net",
    port: 465,
    secure: true,
    auth: {
      user: gmxEmail,
      pass: gmxPassword
    }
  });

  await transporter.verify();
  console.log("GMX SMTP-Verbindung erfolgreich.");

  await transporter.sendMail({
    from: `"Tempus Termin-Checker" <${gmxEmail}>`,
    to: alertEmail,
    subject: "Tempus Checker - Test erfolgreich",
    text: "Die E-Mail-Benachrichtigung des Tempus Termin-Checkers funktioniert."
  });

  console.log("TEST-E-MAIL ERFOLGREICH VERSENDET");
})();
