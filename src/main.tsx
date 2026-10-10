import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isApiError } from '@/api/client'
import { AuthProvider } from '@/auth/AuthProvider'
import { HostBrandingProvider } from '@/branding/BrandingProvider'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry only transient failures; never a 4xx (403s are final, 401s are handled by the client).
      retry: (count, e) => count < 2 && (!isApiError(e) || e.status === 0 || e.status >= 500),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HostBrandingProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </HostBrandingProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
)
