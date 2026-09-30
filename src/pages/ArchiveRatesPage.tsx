import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import CostsPage from './CostsPage';
import ServiceRatesPage from './ServiceRatesPage';

export default function ArchiveRatesPage() {
  return <>
    <nav className="toolbar archive-nav" aria-label="Archive rate categories">
      <NavLink to="/archive-rates/freight">Freight archive</NavLink>
      <NavLink to="/archive-rates/sea-local">Sea local archive</NavLink>
      <NavLink to="/archive-rates/air-local">Air local archive</NavLink>
      <NavLink to="/archive-rates/customs">Customs archive</NavLink>
      <NavLink to="/archive-rates/transport">Transport archive</NavLink>
    </nav>
    <p className="muted">Expired rates are retained here after their Valid to date (UTC).</p>
    <Routes>
      <Route index element={<Navigate to="freight" replace />} />
      <Route path="freight" element={<CostsPage archiveOnly />} />
      <Route path="sea-local" element={<ServiceRatesPage key="archive-sea-local" category="sea-local" archiveOnly />} />
      <Route path="air-local" element={<ServiceRatesPage key="archive-air-local" category="air-local" archiveOnly />} />
      <Route path="customs" element={<ServiceRatesPage key="archive-customs" category="customs" archiveOnly />} />
      <Route path="transport" element={<ServiceRatesPage key="archive-transport" category="transport" archiveOnly />} />
      <Route path="*" element={<Navigate to="/archive-rates/freight" replace />} />
    </Routes>
  </>;
}
