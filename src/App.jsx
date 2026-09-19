import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Compare from './pages/Compare'
import Hashtags from './pages/Hashtags'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="analyze"  element={<Analyze />}  />
          <Route path="compare"  element={<Compare />}  />
          <Route path="hashtags" element={<Hashtags />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
