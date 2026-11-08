import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import ComingSoon from './pages/ComingSoon'

export default function App() {
  return (
    <BrowserRouter>
      <div className="spatial-bg" />
      <a href="#main-content" className="skip-link">
        Lompat ke isi
      </a>
      <main id="main-content" className="relative z-10">
        <Routes>
          <Route path="/" element={<Navigate to="/id" replace />} />
          <Route path="/id" element={<Landing />} />
          <Route path="/id/order" element={<ComingSoon title="Bayar Batch" backTab="order" />} />
          <Route path="/id/calculator" element={<ComingSoon title="Kalkulator Harga" backTab="order" />} />
          <Route path="/id/ems-tax" element={<ComingSoon title="Tagihan EMS & Pajak" backTab="tagihan" />} />
          <Route path="*" element={<Navigate to="/id" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
