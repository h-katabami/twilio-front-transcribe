import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { useEnv } from "./hooks/useEnv";
import { SignInPage } from "./pages/SignInPage";
import { TranscribePage } from "./pages/TranscribePage";
import "./index.css";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { ready, authenticated } = useAuth();

  if (!ready) {
    return <p>読み込み中...</p>;
  }

  return authenticated ? <>{children}</> : <Navigate to="/signin" replace />;
}

export default function App() {
  const env = useEnv();
  const basename = env.pathText ? `/${env.pathText}` : undefined;
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <AuthProvider>
      <QueryClientProvider client={client}>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route
              path="/transcribe"
              element={(
                <PrivateRoute>
                  <TranscribePage />
                </PrivateRoute>
              )}
            />
            <Route path="*" element={<Navigate to="/transcribe" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);