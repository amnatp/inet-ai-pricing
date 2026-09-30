import { Archive, Plane, Ship, Container, ListChecks, Search, SlidersHorizontal, Truck, Warehouse } from 'lucide-react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import ServiceRatesPage from './pages/ServiceRatesPage';
import ArchiveRatesPage from './pages/ArchiveRatesPage';
import CostsPage from './pages/CostsPage';
import RulesPage from './pages/RulesPage';
import PricingRequestsPage from './pages/PricingRequestsPage';
import ChargeMappingPage from './pages/ChargeMappingPage';
import QuotePage from './pages/QuotePage';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand"><span className="brand-icon"><Container size={19} /></span>Freight Pricing</span>
        <nav>
          <NavLink to="/costs"><Container size={15} aria-hidden="true" />Freight tariffs</NavLink>
          <NavLink to="/sea-local-pricing"><Ship size={15} aria-hidden="true" />Sea local charges</NavLink>
          <NavLink to="/air-local-pricing"><Plane size={15} aria-hidden="true" />Air local charges</NavLink>
          <NavLink to="/customs-pricing"><Warehouse size={15} aria-hidden="true" />Customs tariffs</NavLink>
          <NavLink to="/transport-pricing"><Truck size={15} aria-hidden="true" />Transport tariffs</NavLink>
          <NavLink to="/archive-rates"><Archive size={15} aria-hidden="true" />Archive rates</NavLink>
          <NavLink to="/charge-mappings">Charge mapping</NavLink>
          <NavLink to="/rules"><SlidersHorizontal size={15} aria-hidden="true" />Pricing rules</NavLink>
          <NavLink to="/rate-inquiry"><Search size={15} aria-hidden="true" />Rate inquiry</NavLink>
          <NavLink to="/pricing-requests"><ListChecks size={15} aria-hidden="true" />Pricing requests</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/costs" replace />} />
          <Route path="/costs" element={<CostsPage />} />
          <Route path="/sea-local-pricing" element={<ServiceRatesPage key="sea-local" category="sea-local" />} />
          <Route path="/air-local-pricing" element={<ServiceRatesPage key="air-local" category="air-local" />} />
          <Route path="/customs-pricing" element={<ServiceRatesPage key="customs" category="customs" />} />
          <Route path="/transport-pricing" element={<ServiceRatesPage key="transport" category="transport" />} />
          <Route path="/archive-rates/*" element={<ArchiveRatesPage />} />
          <Route path="/charge-mappings" element={<ChargeMappingPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/rate-inquiry" element={<QuotePage />} />
          <Route path="/pricing-requests" element={<PricingRequestsPage />} />
          <Route path="/quote" element={<Navigate to="/rate-inquiry" replace />} />
          <Route path="*" element={<Navigate to="/costs" replace />} />
        </Routes>
      </main>
    </div>
  );
}
