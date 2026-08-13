import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Landing from './pages/Landing'
import WaterBackground from './components/WaterBackground'

// The landing page loads eagerly (it's the entry point); every other route is split into
// its own chunk so a first-time visitor doesn't download the whole app (Results + charts +
// framer-motion, SelfAssessment, etc.) just to see the home page.
const Topics = lazy(() => import('./pages/Topics'))
const Create = lazy(() => import('./pages/Create'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Questionnaire = lazy(() => import('./pages/Questionnaire'))
const Done = lazy(() => import('./pages/Done'))
const Results = lazy(() => import('./pages/Results'))
const ManagerReport = lazy(() => import('./pages/ManagerReport'))
const SelfAssessment = lazy(() => import('./pages/SelfAssessment'))
const ClaimToken = lazy(() => import('./pages/ClaimToken'))
const MyReports = lazy(() => import('./pages/MyReports'))
const Demo = lazy(() => import('./pages/Demo'))
const Legal = lazy(() => import('./pages/Legal'))

// A tiny CSS-only spinner while a route chunk loads (no framer-motion, so the shell
// bundle stays lean instead of pulling that in just for the fallback).
function RouteFallback() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="animate-spin text-5xl">🐟</div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <WaterBackground />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/create" element={<Create />} />
          <Route path="/create/t/:topicKey" element={<Create />} />
          <Route path="/dashboard/:slug" element={<Dashboard />} />
          <Route path="/s/:slug" element={<Questionnaire />} />
          <Route path="/s/:slug/t/:topicKey" element={<Questionnaire />} />
          <Route path="/s/:slug/done" element={<Done />} />
          <Route path="/r/:slug" element={<Results />} />
          <Route path="/self/:slug" element={<SelfAssessment />} />
          <Route path="/claim/:token" element={<ClaimToken />} />
          <Route path="/me" element={<MyReports />} />
          <Route path="/demo/:slug" element={<Demo />} />
          <Route path="/manager-report" element={<ManagerReport />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
