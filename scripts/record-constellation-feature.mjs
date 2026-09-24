import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import config from "../jest-playwright.config.js";

async function record() {
  const videosDir = path.resolve("videos");
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const browser = await chromium.launch({
    ...config.launchOptions,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : fs.existsSync("/Users/ivankoltsov/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell")
      ? { executablePath: "/Users/ivankoltsov/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell" }
      : {}),
  });

  const context = await browser.newContext({
    ...config.contextOptions,
    recordVideo: {
      dir: videosDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // Intercept all external or API calls
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // 1. Mock Login API
    if (url.includes("/auth/login") && method === "POST") {
      console.log("[Mock] Fulfilling login request");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-valid-jwt-token",
          requiresTwoFactor: false,
        }),
      });
      return;
    }

    // 2. Mock User Profile API
    if (url.includes("/auth/profile")) {
      console.log("[Mock] Fulfilling user profile request");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "1",
          email: "learner@explys.com",
          name: "Ivan Learner",
          role: "adult",
          isVerified: true,
          hasCompletedPlacement: true,
          englishLevel: "B1",
          workField: "IT",
          education: "Higher",
          nativeLanguage: "Ukrainian",
          subscriptionStatus: "active",
          subscriptionPlan: "smart",
          xp: 450,
          level: 3,
          hobbies: ["travel", "movies"],
          favoriteGenres: [1],
          hatedGenres: [],
        }),
      });
      return;
    }

    // 3. Mock Watched Lessons & Status
    if (url.includes("/content-video/watched")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
      return;
    }

    if (url.includes("/recap/status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          daily: { available: true },
          weekly: { available: false },
          monthly: { available: false },
          mistakes: { available: false },
        }),
      });
      return;
    }

    // 4. Mock Constellations and Star content
    const mockConstellation = {
      id: 101,
      name: "Survival English for Travel",
      description: "Learn practical vocabulary, check-in dialogue, and airport questions.",
      stars: [
        {
          id: 201,
          constellationId: 101,
          name: "At the Airport & Security",
          description: "[Airport] Essential phrases for passport control and luggage drop-off.",
          type: "PHRASE",
          metadata: {
            contentStatus: "ready",
            phrases: [
              {
                targetPhrase: "May I see your boarding pass?",
                translation: "Чи можу я побачити ваш посадковий талон?",
                context: "Використовується офіцером безпеки або бортпровідником.",
                dialogue: ["May I see your boarding pass?", "Here it is."],
              },
            ],
            questions: [
              {
                id: "q-video-1",
                type: "video_riddle",
                subtitleWithBlank: "Please show me your ___ pass before boarding.",
                options: ["boarding", "departure", "ticket", "baggage"],
                correctAnswer: "boarding",
                segment: {
                  contentVideoId: 5,
                  startTimeSec: 2,
                  endTimeSec: 8,
                },
              },
            ],
          },
          prerequisites: [],
        },
        {
          id: 202,
          constellationId: 101,
          name: "Hotel Check-in Dialogue",
          description: "[Hotel] Booking rooms, breakfast hours, and room keys.",
          type: "PHRASE",
          metadata: { contentStatus: "pending" },
          prerequisites: [{ prerequisiteId: 201, dependentId: 202 }],
        },
      ],
    };

    if (url.includes("/constellations/star/201")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockConstellation.stars[0],
          normalizedQuestions: mockConstellation.stars[0].metadata.questions,
          contentStatus: "ready",
          contentReady: true,
        }),
      });
      return;
    }

    if (url.includes("/constellations/101/graph")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          constellationId: 101,
          stars: [
            { starId: 201, status: "AVAILABLE" },
            { starId: 202, status: "LOCKED" },
          ],
        }),
      });
      return;
    }

    if (url.includes("/constellations/ensure") || url.includes("/constellations/regenerate")) {
      console.log("[Mock] Fulfilling ensure/regenerate constellation");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockConstellation),
      });
      return;
    }

    if (url.endsWith("/constellations") || url.includes("/constellations?")) {
      console.log("[Mock] Fulfilling get constellations list");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockConstellation]),
      });
      return;
    }

    // Pass through local frontend assets
    await route.continue();
  });

  // Step 1: Open Login Page
  console.log("Navigating to Login page...");
  await page.goto("http://127.0.0.1:4173/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Step 2: Fill in credentials
  console.log("Entering login credentials...");
  const emailInput = page.locator("input[name='email'], input[type='email']").first();
  await emailInput.fill("learner@explys.com");
  await page.waitForTimeout(500);

  const passwordInput = page.locator("input[name='password'], input[type='password']").first();
  await passwordInput.fill("Explys2026!Secure");
  await page.waitForTimeout(800);

  // Step 3: Click login button
  console.log("Submitting login form...");
  const submitButton = page.locator("button[type='submit']").first();
  await submitButton.click();
  await page.waitForTimeout(2000);

  // Step 4: Navigate to /watched-lessons
  console.log("Navigating to Constellations (watched-lessons)...");
  await page.goto("http://127.0.0.1:4173/watched-lessons", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Step 5: Inspect constellation card
  console.log("Interacting with Constellation plan...");
  const inspectBtn = page.locator("text=Click to inspect").first();
  if (await inspectBtn.isVisible()) {
    await inspectBtn.click();
    await page.waitForTimeout(2000);
  }

  // Step 6: Open Star Task
  console.log("Opening Star Task lesson...");
  await page.goto("http://127.0.0.1:4173/task/201", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Step 7: Answer the video riddle question
  console.log("Demonstrating interactive video riddle question...");
  const continueBtn = page.locator("button:has-text('Почати перевірку'), button:has-text('Далі')").first();
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
    await page.waitForTimeout(1500);
  }

  const optionBtn = page.locator("button:has-text('boarding')").first();
  if (await optionBtn.isVisible()) {
    console.log("Selecting answer 'boarding'...");
    await optionBtn.click();
    await page.waitForTimeout(2500);
  }

  // Step 8: Close and save recording
  console.log("Finalizing video recording...");
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    const finalPath = path.join(videosDir, "constellation-feature-demo.webm");
    fs.copyFileSync(videoPath, finalPath);
    console.log(`Video successfully recorded to: ${finalPath}`);
  }
}

record().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
