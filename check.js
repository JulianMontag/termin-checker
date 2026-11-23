const { chromium } = require("playwright");
const nodemailer = require("nodemailer");

(async () => {
  const url = process.env.TEMPUS_URL;
  const gmxEmail = process.env.GMX_EMAIL;
  const gmxPassword = process.env.GMX_PASSWORD;
  const alertEmail = process.env.ALERT_EMAIL;

  if (!url) {
    throw new Error("TEMPUS_URL fehlt.");
  }

  if (!gmxEmail || !gmxPassword || !alertEmail) {
    throw new Error("GMX_EMAIL, GMX_PASSWORD oder ALERT_EMAIL fehlt.");
  }

  // Reiner Mail-Test
  if (process.env.TEST_EMAIL === "true") {
    console.log("Starte GMX E-Mail-Test...");

    const transporter = nodemailer.createTransport({
      host: "mail.gmx.net",
      port: 465,
      secure: true,
      auth: {
        user: gmxEmail,
        pass: gmxPassword
      }
    });

    await transporter.sendMail({
      from: `"Tempus Termin-Checker" <${gmxEmail}>`,
      to: alertEmail,
      subject: "Tempus Checker - Test erfolgreich",
      text: "Die E-Mail-Benachrichtigung des Tempus Termin-Checkers funktioniert."
    });

    console.log("TEST-E-MAIL ERFOLGREICH VERSENDET");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("1. Öffne Tempus...");

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000
    });

    console.log("2. Wähle Anmeldung Eheschließung = 1 Paar...");

    await page
      .locator("#EHE_DT-11887-mittermin")
      .selectOption({ label: "1 Paar" });

    console.log("3. Klicke Termin vereinbaren...");

    await Promise.all([
      page.waitForLoadState("networkidle"),
      page
        .getByRole("button", { name: "Termin vereinbaren" })
        .click()
    ]);

    console.log("4. Bestätige Hinweis...");

    await page.locator("#mitbringsel0").check();

    console.log("5. Klicke Hinweise zur Kenntnis genommen...");

    await Promise.all([
      page.waitForLoadState("networkidle"),
      page
        .getByRole("button", {
          name: "Ich habe die Hinweise zur Kenntnis genommen"
        })
        .click()
    ]);

    console.log("6. Warte auf Terminkalender...");

    await page.waitForSelector("table.cal", {
      timeout: 30000
    });

    console.log("Kalender wurde erfolgreich erreicht.");

    const days = await page.locator("table.cal td").evaluateAll(elements =>
      elements
        .filter(el => /^\d{1,2}$/.test(el.innerText.trim()))
        .map(el => ({
          day: el.innerText.trim(),
          className: el.className,
          decoration: window.getComputedStyle(el).textDecorationLine,
          clickable: !!el.querySelector("a, button")
        }))
    );

    const availableDays = days.filter(day =>
      !day.className.includes("nachvorlauftagen") &&
      day.decoration !== "line-through" &&
      day.clickable
    );

    await page.screenshot({
      path: "tempus-calendar.png",
      fullPage: true
    });

    if (availableDays.length === 0) {
      console.log("Keine verfügbaren Termine gefunden.");
      return;
    }

    const availableDayNumbers = availableDays
      .map(day => day.day)
      .join(", ");

    console.log(`TERMIN VERFÜGBAR: ${availableDayNumbers}`);

    const transporter = nodemailer.createTransport({
      host: "mail.gmx.net",
      port: 465,
      secure: true,
      auth: {
        user: gmxEmail,
        pass: gmxPassword
      }
    });

    await transporter.sendMail({
      from: `"Tempus Termin-Checker" <${gmxEmail}>`,
      to: alertEmail,
      subject: "Termin beim
