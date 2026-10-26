import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Compare from './pages/Compare'
import Hashtags from './pages/Hashtags'
import History from './pages/History'
import Monetize from './pages/Monetize'
import PostingTimes from './pages/PostingTimes'
import Currency from './pages/Currency'
import Intelligence from './pages/Intelligence'
import StationeryMarket from './pages/StationeryMarket'
import TrendingPosts from './pages/TrendingPosts'
import NicheDiscovery from './pages/NicheDiscovery'
import Improv from './pages/Improv'
import ColorPalette from './pages/ColorPalette'
import Home from './pages/Home'
import ClipTubeShell from './pages/cliptube/ClipTubeShell'
import MarketAnalyzer from './pages/MarketAnalyzer'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="home"            element={<Home />}             />
          <Route path="analyze"         element={<Analyze />}          />
          <Route path="compare"         element={<Compare />}          />
          <Route path="hashtags"        element={<Hashtags />}         />
          <Route path="history"         element={<History />}          />
          <Route path="intelligence"    element={<Intelligence />}     />
          <Route path="market-analyzer" element={<MarketAnalyzer />}   />
          <Route path="stationery"      element={<StationeryMarket />} />
          <Route path="trending-posts"  element={<TrendingPosts />}   />
          <Route path="discover"        element={<NicheDiscovery />}   />
          <Route path="improv"          element={<Improv />}           />
          <Route path="color-palette"   element={<ColorPalette />}     />
          <Route path="monetize"        element={<Monetize />}         />
          <Route path="posting-times"   element={<PostingTimes />}    />
          <Route path="currency"        element={<Currency />}         />
          <Route path="cliptube/*"      element={<ClipTubeShell />}    />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
