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
import ContentAnalyzer from './pages/ContentAnalyzer'
import TrendingPosts from './pages/TrendingPosts'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="analyze"          element={<Analyze />}          />
          <Route path="compare"          element={<Compare />}          />
          <Route path="hashtags"         element={<Hashtags />}         />
          <Route path="history"          element={<History />}          />
          <Route path="intelligence"     element={<Intelligence />}     />
          <Route path="content-analyzer" element={<ContentAnalyzer />} />
          <Route path="trending-posts"   element={<TrendingPosts />}   />
          <Route path="monetize"         element={<Monetize />}         />
          <Route path="posting-times"    element={<PostingTimes />}    />
          <Route path="currency"         element={<Currency />}         />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
