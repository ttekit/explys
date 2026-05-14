import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "react-hot-toast";
import "./index.css";
import { LandingLocaleProvider } from "./context/LandingLocaleContext";
import RegistrationMain from "./pages/registration/RegistrationMain";
import RegistrationDetails from "./pages/registration/RegistrationDetails";
import RegistrationPreferences from "./pages/registration/RegistrationPreferences";
import LoginForm from "./pages/login/LoginForm";
import { RegistrationProvider } from "./context/RegistrationContext";
import ContentPage from "./pages/content/ContentPage";
import ProfileMain from "./pages/profile/ProfileMain";
import { UserProvider } from "./context/UserContext";
import VideoPage from "./pages/content/VideosPage";
import CatalogSeriesPage from "./pages/content/CatalogSeriesPage";
import WatchedLessonsPage from "./pages/content/WatchedLessonsPage";
import LessonSummaryPage from "./pages/content/LessonSummaryPage";
import RegisterSuccessPage from "./pages/registration/RegisterSuccessPage";
import LandingPage from "./pages/landing/LandingPage";
import LevelTestPage from "./pages/registration/LevelTestPage";
import LearningPlanPage from "./pages/learning/LearningPlanPage";
import PricingPage from "./pages/pricing/PricingPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminVideosPage from "./pages/admin/AdminVideosPage";
import AdminTestsPage from "./pages/admin/AdminTestsPage";
import AdminTeachersPage from "./pages/admin/AdminTeachersPage";
import AdminTopicsPage from "./pages/admin/AdminTopicsPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

import AnalyticsLayout from "./components/AnalyticsLayout";
import RequireAuth from "./components/RequireAuth";
import RequireSubscriberAccess from "./components/RequireSubscriberAccess";
import SubscribePage from "./pages/subscription/SubscribePage";

const router = createBrowserRouter([
  {
    element: <AnalyticsLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/registrationMain", element: <RegistrationMain /> },
      { path: "/registrationDetails", element: <RegistrationDetails /> },
      {
        path: "/registrationPreferences",
        element: <RegistrationPreferences />,
      },
      { path: "/registrationSuccess", element: <RegisterSuccessPage /> },
      { path: "/loginForm", element: <LoginForm /> },
      { path: "/pricing", element: <PricingPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/subscribe", element: <SubscribePage /> },
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: "users", element: <AdminUsersPage /> },
              { path: "videos", element: <AdminVideosPage /> },
              { path: "tests", element: <AdminTestsPage /> },
              { path: "teachers", element: <AdminTeachersPage /> },
              { path: "topics", element: <AdminTopicsPage /> },
              { path: "analytics", element: <AdminAnalyticsPage /> },
              { path: "settings", element: <AdminSettingsPage /> },
            ],
          },
          { path: "/level-test", element: <LevelTestPage /> },
          {
            element: <RequireSubscriberAccess />,
            children: [
              {
                path: "/entrance-test",
                element: <Navigate to="/catalog" replace />,
              },
              {
                path: "/contentPage",
                element: <Navigate to="/watched-lessons" replace />,
              },
              { path: "/watched-lessons", element: <WatchedLessonsPage /> },
              { path: "/profileMain", element: <ProfileMain /> },
              { path: "/profile", element: <ProfileMain /> },
              {
                path: "/catalog/series/:friendlyLink",
                element: <CatalogSeriesPage />,
              },
              { path: "/catalog", element: <VideoPage /> },
              { path: "/learning-plan", element: <LearningPlanPage /> },
              {
                path: "/video-page",
                element: <Navigate to="/catalog" replace />,
              },
              { path: "/content/:id/summary", element: <LessonSummaryPage /> },
              { path: "/content/:id?", element: <ContentPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <LandingLocaleProvider>
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
      </LandingLocaleProvider>
    </HelmetProvider>
  </StrictMode>,
);
