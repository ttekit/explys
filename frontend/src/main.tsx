import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { Toaster } from "react-hot-toast";
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
import RegisterSuccessPage from "./pages/registration/RegisterSuccessPage";
import LandingPage from "./pages/landing/LandingPage";
import LevelTestPage from "./pages/registration/LevelTestPage";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/registrationMain", element: <RegistrationMain /> },
  { path: "/registrationDetails", element: <RegistrationDetails /> },
  { path: "/registrationPreferences", element: <RegistrationPreferences /> },
  { path: "/registrationSuccess", element: <RegisterSuccessPage /> },
  { path: "/level-test", element: <LevelTestPage /> },
  { path: "/loginForm", element: <LoginForm /> },
  { path: "/entrance-test", element: <Navigate to="/catalog" replace /> },
  { path: "/contentPage", element: <ContentPage /> },
  { path: "/profileMain", element: <ProfileMain /> },
  { path: "/catalog", element: <VideoPage /> },
  { path: "/video-page", element: <Navigate to="/catalog" replace /> },
  { path: "/content/:id?", element: <ContentPage /> }
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <RegistrationProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          toastOptions={{
            className: "bg-zinc-900 text-zinc-100 border border-zinc-700",
            style: { boxShadow: "0 8px 30px rgba(0,0,0,0.4)" },
          }}
        />
      </RegistrationProvider>
    </UserProvider>
  </StrictMode>,
);
