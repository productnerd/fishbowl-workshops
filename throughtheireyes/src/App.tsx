import { HashRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Create from './pages/Create'
import Questionnaire from './pages/Questionnaire'
import Done from './pages/Done'
import Results from './pages/Results'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create" element={<Create />} />
        <Route path="/s/:slug" element={<Questionnaire />} />
        <Route path="/s/:slug/done" element={<Done />} />
        <Route path="/results/:slug" element={<Results />} />
      </Routes>
    </HashRouter>
  )
}
