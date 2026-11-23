const { chromium } = require("playwright");
const nodemailer = require("nodemailer");

(async () => {
  const url = process.env.TEMPUS_URL;
  const gmxEmail = process.env.GMX_EMAIL;
  const gmxPassword = process.env.GMX_PASSWORD;
  const alertEmail = process.env.ALERT_EMAIL;

  if (!url || !gmxEmail || !gmxPassword || !alertEmail) {
    throw new Error(
      "TEMPUS_URL, GMX_EMAIL, GMX_PASSWORD oder ALERT_EMAIL fehlt."
    );
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

    console.log("5. Bestätige Kenntnisnahme...");

    await Promise.all([
      page.waitForLoadState("networkidle"),
      page
        .getByRole("button", {
          name: "Ich habe die Hinweise zur Kenntnis genommen"
        })
        .click()
    ]);

    console.log("6. Warte auf Kalender...");

    await page.waitForSelector("table.cal", {
      timeout: 30000
    });

    console.log("Kalender erreicht.");

    const days = await page.locator("table.cal td").evaluateAll(elements =>
      elements
        .filter(el => /^\d{1,2}$/.test(el.innerText.trim()))
        .map(el => ({
          day: el.innerText.trim(),
          className: el.className,
          decoration:
            window.getComputedStyle(el).textDecorationLine,
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

    console.log(
      `TERMIN VERFÜGBAR: ${availableDayNumbers}`
    );

    console.log("7. Verbinde mit GMX...");

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
      subject: "Standesamt: Termin verfügbar",
      text: [
        "Ein Termin beim Standesamt ist verfügbar.",
        "",
        `Gefundene Kalendertage: ${availableDayNumbers}`,
        "",
        "Terminbuchung:",
        url,
        "",
        "Bitte schnell prüfen. Der Termin wurde nicht automatisch gebucht."
      ].join("\n")
    });

    console.log("BENACHRICHTIGUNG ERFOLGREICH VERSENDET.");

  } catch (error) {
    console.error("FEHLER:", error);

    try {
      await page.screenshot({
        path: "tempus-error.png",
        fullPage: true
      });
    } catch (screenshotError) {
      console.error(
        "Fehler-Screenshot konnte nicht erstellt werden."
      );
    }

    process.exitCode = 1;

  } finally {
    await browser.close();
  }
})();
