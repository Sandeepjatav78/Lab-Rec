import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import HomePage from "./pages/HomePage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import LabsPage from "./pages/LabsPage.jsx";
import ChemicalsPage from "./pages/ChemicalsPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";

export default function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/chemicals" element={<ChemicalsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
}
