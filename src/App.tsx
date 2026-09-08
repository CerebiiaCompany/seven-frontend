import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Players from "./pages/Players.tsx";
import PlayerProfile from "./pages/PlayerProfile.tsx";
import Content from "./pages/Content.tsx";
import Coaches from "./pages/Coaches.tsx";
import Performance from "./pages/Performance.tsx";
import Gamification from "./pages/Gamification.tsx";
import CalendarPage from "./pages/Calendar.tsx";
import Attendance from "./pages/Attendance.tsx";
import Reports from "./pages/Reports.tsx";
import Payments from "./pages/Payments.tsx";
import Family from "./pages/Family.tsx";
import Forms from "./pages/Forms.tsx";
import PublicRegister from "./pages/PublicRegister.tsx";
import SettingsPage from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register/:formId" element={<PublicRegister />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
            <Route path="/players/:id" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute><Content /></ProtectedRoute>} />
            <Route path="/coaches" element={<ProtectedRoute><Coaches /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
            <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/family" element={<ProtectedRoute><Family /></ProtectedRoute>} />
            <Route path="/forms" element={<ProtectedRoute><Forms /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
