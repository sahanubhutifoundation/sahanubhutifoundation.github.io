import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';

// Pages
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ActivityDetailPage } from './pages/ActivityDetailPage';
import { MembersPage } from './pages/MembersPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { FundPage } from './pages/FundPage';
import { GalleryPage } from './pages/GalleryPage';
import { NoticePage } from './pages/NoticePage';
import { NoticeDetailPage } from './pages/NoticeDetailPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/admin/AdminPage';

/**
 * Listens for hash-based admin routing: /#adminfoundation
 * Directly routes to the Admin CMS whenever this hash is present.
 */
const HashRouteListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminHash, setIsAdminHash] = useState(() => {
    return window.location.hash === '#adminfoundation' || window.location.hash.startsWith('#admin');
  });

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminHash(window.location.hash === '#adminfoundation' || window.location.hash.startsWith('#admin'));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isAdminHash) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-800">
        <Header />
        <main className="flex-1">
          <AdminPage />
        </main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
};

export function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <HashRouteListener>
          <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-800 selection:bg-orange-100 selection:text-orange-900 font-sans">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/activities/:id" element={<ActivityDetailPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/members/:id" element={<MemberDetailPage />} />
                <Route path="/fund" element={<FundPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/notice" element={<NoticePage />} />
                <Route path="/notice/:id" element={<NoticeDetailPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </HashRouteListener>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
