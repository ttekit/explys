import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import RegistrationMain from "./pages/registration/RegistrationMain";
import RegistrationDetails from "./pages/registration/RegistrationDetails";
import RegistrationPreferences from "./pages/registration/RegistrationPreferences";
import LoginForm from "./pages/login/LoginForm";
import MainPage from "./pages/MainPage";
import { RegistrationProvider } from "./pages/registration/RegistrationContext";
import ContentPage from "./pages/content/ContentPage";
import ProfileMain from "./pages/profile/ProfileMain";
import { UserProvider } from "./context/UserContext";

const router = createBrowserRouter([
  { path: "/", element: <MainPage /> },
  { path: "/registrationMain", element: <RegistrationMain /> },
  { path: "/registrationDetails", element: <RegistrationDetails /> },
  { path: "/registrationPreferences", element: <RegistrationPreferences /> },
  { path: "/loginForm", element: <LoginForm /> },
  { path: "/contentPage", element: <ContentPage /> },
  { path: "/profileMain", element: <ProfileMain /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <RegistrationProvider>
        <RouterProvider router={router} />
      </RegistrationProvider>
    </UserProvider>
  </StrictMode>,
);
