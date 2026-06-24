import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Create from './pages/Create'
import Questionnaire from './pages/Questionnaire'
import Done from './pages/Done'
import Results from './pages/Results'
import ManagerReport from './pages/ManagerReport'
import SelfAssessment from './pages/SelfAssessment'
import ClaimToken from './pages/ClaimToken'
import WaterBackground from './components/WaterBackground'

export default function App() {
  return (
    <HashRouter>
      <WaterBackground />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create" element={<Create />} />
        <Route path="/s/:slug" element={<Questionnaire />} />
        <Route path="/s/:slug/done" element={<Done />} />
        <Route path="/r/:slug" element={<Results />} />
        <Route path="/self/:slug" element={<SelfAssessment />} />
        <Route path="/claim/:token" element={<ClaimToken />} />
        <Route path="/manager-report" element={<ManagerReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
