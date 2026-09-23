# Mobile Engineering & Agent Guidelines

Guidelines for working in `mobile/` (React Native + Expo SDK 56).

---

## 1. Branching Rule Reminder
If you are on `product`, switch to a new branch before modifying mobile files:
```bash
git checkout -b <type>/<description>
```

---

## 2. Expo SDK 56 Documentation Requirement

> [!IMPORTANT]
> **Expo HAS CHANGED.**
> Always read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code. Do not use deprecated APIs or patterns from older Expo versions.

---

## 3. Core Stack & Conventions
- **Framework**: Expo SDK 56, React Native 0.85, React 19.
- **Navigation**: React Navigation v7 (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`).
- **Video & Media**: `expo-video` v56.
- **Typography & Icons**: `@expo-google-fonts/inter`, `@expo-google-fonts/space-grotesk`, `@expo/vector-icons`.

---

## 4. Verification Commands
```bash
cd mobile
npm run type-check   # TypeScript check (tsc --noEmit)
npm run start        # Launch dev client
```
