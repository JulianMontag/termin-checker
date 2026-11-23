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

    console.log("5. Klicke Hinweise zur Kenntnis genommen..."
