import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Overview from './pages/Overview'
import OrderRecap from './pages/OrderRecap'
import TaxBills from './pages/TaxBills'
import EstimatorConfig from './pages/EstimatorConfig'

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/orders" element={<OrderRecap />} />
          <Route path="/tax-bills" element={<TaxBills />} />
          <Route path="/estimator-config" element={<EstimatorConfig />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
