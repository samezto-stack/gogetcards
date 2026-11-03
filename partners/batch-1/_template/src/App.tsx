import { Routes, Route } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import Home from './pages/Home';
import Services from './pages/Services';
import Service from './pages/Service';
import Pricing from './pages/Pricing';
import HowItWorks from './pages/HowItWorks';
import Standards from './pages/Standards';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Resources from './pages/Resources';
import Contact from './pages/Contact';
import ThankYou from './pages/ThankYou';
import NotFound from './pages/NotFound';
import Terms from './pages/legal/Terms';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import RefundPolicy from './pages/legal/RefundPolicy';
import CookiePolicy from './pages/legal/CookiePolicy';

/* No <BrowserRouter> here on purpose: this tree is mounted by two entry
   points that each supply their own router — entry-client wraps it in
   BrowserRouter to hydrate, entry-server in StaticRouter to render — so App
   itself stays router-agnostic.
 *
 * EVERY ROUTE ADDED HERE MUST ALSO BE ADDED TO server/seo.js. That map is
 * what decides the page title and whether the response is a 200 or a 404, so
 * a route present here and absent there renders perfectly to a human and
 * 404s to a crawler. scripts/check-routes.js asserts the two agree. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="services/:slug" element={<Service />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="standards" element={<Standards />} />
        <Route path="about" element={<About />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="resources" element={<Resources />} />
        <Route path="contact" element={<Contact />} />
        <Route path="thank-you" element={<ThankYou />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="refund-policy" element={<RefundPolicy />} />
        <Route path="cookie-policy" element={<CookiePolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
