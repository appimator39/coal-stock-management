import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import { InstallPrompt } from "./components/InstallPrompt";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import DailyLog from "./pages/DailyLog";
import Vendors from "./pages/Vendors";
import Items from "./pages/Items";
import PurchaseOrders from "./pages/PurchaseOrders";
import Purchases from "./pages/Purchases";
import BalanceReport from "./pages/BalanceReport";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily-log" element={<DailyLog />} />
              <Route
                path="/vendors"
                element={
                  <ProtectedRoute role="admin">
                    <Vendors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/items"
                element={
                  <ProtectedRoute role="admin">
                    <Items />
                  </ProtectedRoute>
                }
              />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/balance" element={<BalanceReport />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute role="admin">
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
