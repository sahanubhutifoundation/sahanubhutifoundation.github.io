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
import { ErrorBoundary } from './components/ErrorBoundary';
import { storageService } from './services/storageService';
import { supabaseService } from './services/supabaseService';
import { syncBrowserIdentity } from './utils/browserIdentity';

/**
 * Synchronizes browser tab title, favicon, apple-touch-icon, and Open Graph tags
 * with the canonical Foundation config and current route.
 */
const BrowserIdentitySync: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    let pageTitle = '';
    const path = location.pathname;
    if (path.startsWith('/about')) pageTitle = 'আমাদের সম্পর্কে';
    else if (path.startsWith('/activities')) pageTitle = 'কার্যক্রম';
    else if (path.startsWith('/members')) pageTitle = 'সদস্যবৃন্দ';
    else if (path.startsWith('/fund')) pageTitle = 'তহবিল ও হিসাব';
    else if (path.startsWith('/gallery')) pageTitle = 'মিডিয়া ও গ্যালারি';
    else if (path.startsWith('/notice')) pageTitle = 'নোটিশ বোর্ড';
    else if (path.startsWith('/contact')) pageTitle = 'যোগাযোগ';
    else if (path.startsWith('/admin')) pageTitle = 'অ্যাডমিন প্যানেল';

    syncBrowserIdentity(pageTitle);

    const handleUpdate = () => syncBrowserIdentity(pageTitle);
    window.addEventListener('sf_config_updated', handleUpdate);
    window.addEventListener('sf_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sf_config_updated', handleUpdate);
      window.removeEventListener('sf_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [location.pathname]);

  return null;
};

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
  useEffect(() => {
    // Attempt automatic cloud synchronization on app mount
    storageService.syncFromCloud().catch(() => {});

    // Set up real-time cross-device listener
    const unsubscribe = supabaseService.subscribeToChanges(() => {
      // If another device makes changes in Supabase, auto-pull latest data
      storageService.syncFromCloud().catch(() => {});
    });

    // Auto-sync when user returns to the tab or every 60 seconds
    const handleFocus = () => {
      storageService.syncFromCloud().catch(() => {});
    };
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => {
      storageService.syncFromCloud().catch(() => {});
    }, 60000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <BrowserIdentitySync />
        <HashRouteListener>
          <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-800 selection:bg-orange-100 selection:text-orange-900 font-sans">
            <Header />
            <main className="flex-1">
              <ErrorBoundary>
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
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </HashRouteListener>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
