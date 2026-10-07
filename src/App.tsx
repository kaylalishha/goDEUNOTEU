import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { Layout } from './components/Layout'
import Overview from './pages/Overview'
import OrderRecap from './pages/OrderRecap'
import BoxManagement from './pages/BoxManagement'
import TaxBills from './pages/TaxBills'
import EstimatorConfig from './pages/EstimatorConfig'

export default function App() {
  return (
    <AuthGate>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/orders" element={<OrderRecap />} />
            <Route path="/boxes" element={<BoxManagement />} />
            <Route path="/tax-bills" element={<TaxBills />} />
            <Route path="/estimator-config" element={<EstimatorConfig />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthGate>
  )
}
