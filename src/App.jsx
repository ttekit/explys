import { Routes, Route } from "react-router";

import { RegistrationProvider } from "./pages/RegistrationContext";


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