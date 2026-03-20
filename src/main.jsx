import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import "./index.css";
import RegistrationMain from "./pages/RegistrationMain.jsx";
import RegistrationDetails from "./pages/RegistrationDetails.jsx";
import RegistrationPreferences from "./pages/RegistrationPreferences.jsx";
import MainPage from "./pages/MainPage.jsx";
import { RegistrationProvider } from "./pages/RegistrationContext";

const router = createBrowserRouter([
  { path: "/", element: <MainPage /> },
  { path: "/registrationMain", element: <RegistrationMain /> },
  { path: "/registrationDetails", element: <RegistrationDetails /> },
  { path: "/registrationPreferences", element: <RegistrationPreferences /> },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RegistrationProvider>
      <RouterProvider router={router} />
    </RegistrationProvider>
  </StrictMode>,
);