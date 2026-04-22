import { Routes, Route } from "react-router";
import { RegistrationProvider } from "./pages/registration/RegistrationContext";
import MainPage from "./pages/MainPage";
import RegistrationMain from "./pages/registration/RegistrationMain";
import RegistrationDetails from "./pages/registration/RegistrationDetails";
import RegistrationPreferences from "./pages/registration/RegistrationPreferences";
import LoginForm from "./pages/login/LoginForm";
import ProfileMain from "./pages/profile/ProfileMain";

function App() {
  return (
    <RegistrationProvider>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/registrationMain" element={<RegistrationMain />} />
        <Route path="/registrationDetails" element={<RegistrationDetails />} />
        <Route
          path="/registrationPreferences"
          element={<RegistrationPreferences />}
        />
        <Route path="/loginForm" element={<LoginForm />} />
        <Route path="/ProfileMain" element={<ProfileMain />} />
      </Routes>
    </RegistrationProvider>
  );
}

export default App;
