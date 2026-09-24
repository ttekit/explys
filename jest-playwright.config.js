// jest-playwright.config.js
module.exports = {
  launchOptions: { headless: true },
  contextOptions: {
    recordVideo: { dir: "videos/" }, // Saves recordings to the videos/ folder
    viewport: { width: 1920, height: 1080 }
  },
  browsers: ["chromium"]
};
