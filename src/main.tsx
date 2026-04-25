import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import "./index.css";
import RegistrationMain from "./pages/registration/RegistrationMain";
import RegistrationDetails from "./pages/registration/RegistrationDetails";
import RegistrationPreferences from "./pages/registration/RegistrationPreferences";
import LoginForm from "./pages/login/LoginForm";
import { RegistrationProvider } from "./context/RegistrationContext";
import ContentPage from "./pages/content/ContentPage";
import ProfileMain from "./pages/profile/ProfileMain";
import { UserProvider } from "./context/UserContext";
import VideoPage from "./pages/content/VideosPage";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/contentPage" replace /> },
  { path: "/registrationMain", element: <RegistrationMain /> },
  { path: "/registrationDetails", element: <RegistrationDetails /> },
  { path: "/registrationPreferences", element: <RegistrationPreferences /> },
  { path: "/loginForm", element: <LoginForm /> },
  { path: "/contentPage", element: <ContentPage /> },
  { path: "/profileMain", element: <ProfileMain /> },
  { path: "/video-page", element: <VideoPage /> },
  { path: "/content/:id?", element: <ContentPage /> }
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
