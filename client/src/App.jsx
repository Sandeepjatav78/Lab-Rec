import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import HomePage from "./pages/HomePage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import LabsPage from "./pages/LabsPage.jsx";
import ChemicalsPage from "./pages/ChemicalsPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { getToken, clearToken } from "./auth.js";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  const handleLogin = () => setAuthed(true);

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
  };

  if (!authed) {
    return (
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/chemicals" element={<ChemicalsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
}
