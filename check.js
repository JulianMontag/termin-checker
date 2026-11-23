const { chromium } = require("playwright");

(async () => {
  const url = process.env.TEMPUS_URL;

  if (!url) {
    throw new Error("TEMPUS_URL fehlt.");
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
      page.getByRole("button", { name: "Termin vereinbaren" }).click()
    ]);

    console.log("4. Bestätige Hinweis...");
    await page.locator("#mitbringsel0").check();

    console.log("5. Klicke Hinweise zur Kenntnis genommen...");
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.getByRole("button", {
        name: "Ich habe die Hinweise zur Kenntnis genommen"
      }).click()
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

    console.log("=== GEFUNDENE KALENDERTAGE ===");

    for (const day of days) {
      console.log(
        `${day.day} | class=${day.className} | decoration=${day.decoration} | clickable=${day.clickable}`
      );
    }

    const availableDays = days.filter(day =>
      !day.className.includes("nachvorlauftagen") &&
      day.decoration !== "line-through" &&
      day.clickable
    );

    if (availableDays.length > 0) {
      console.log("!!! TERMIN VERFÜGBAR !!!");

      for (const day of availableDays) {
        console.log(`Verfügbarer Tag: ${day.day}`);
      }
    } else {
      console.log("Keine verfügbaren Termine gefunden.");
    }

    await page.screenshot({
      path: "tempus-calendar.png",
      fullPage: true
    });

    console.log("Screenshot gespeichert.");
    console.log("Test erfolgreich abgeschlossen.");

  } catch (error) {
    console.error("FEHLER:", error);

    await page.screenshot({
      path: "tempus-error.png",
      fullPage: true
    });

    process.exitCode = 1;

  } finally {
    await browser.close();
  }
})();
