import { Routes, Route } from "react-router";

import { RegistrationProvider } from "./pages/registration/RegistrationContext";
import MainPage from "./pages/MainPage";
import RegistrationMain from "./pages/registration/RegistrationMain";
import RegistrationDetails from "./pages/registration/RegistrationDetails";
import RegistrationPreferences from "./pages/registration/RegistrationPreferences";


function App() {
  return (

    <RegistrationProvider>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/registrationMain" element={<RegistrationMain />} />
        <Route path="/registrationDetails" element={<RegistrationDetails />} />
        <Route path="/registrationPreferences" element={<RegistrationPreferences />} />

      </Routes>
    </RegistrationProvider>
  );
}

export default App;

