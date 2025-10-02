import { AuthPage } from '@/components/auth/auth-page';
import { ChatShell } from './chat-shell';
import { useAuth } from '@/hooks/useAuth';

function LoadingScreen() {
   return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
   );
}

function App() {
   const {
      user,
      isLoading,
      isAuthenticating,
      error,
      login,
      register,
      logout,
      resetError,
   } = useAuth();

   if (isLoading) {
      return <LoadingScreen />;
   }

   if (!user) {
      return (
         <AuthPage
            onLogin={login}
            onRegister={register}
            isSubmitting={isAuthenticating}
            error={error}
            resetError={resetError}
         />
      );
   }

   return <ChatShell onLogout={logout} user={user} />;
}

export default App;
