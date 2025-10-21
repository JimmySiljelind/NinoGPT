import { AuthPage } from '@/components/auth/auth-page';
import { ChatShell } from './chat-shell';
import { useAuth } from '@/hooks/useAuth';
import { AdminShell } from '@/components/admin/admin-shell';

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
      updateProfile,
      changePassword,
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

   if (user.role === 'admin') {
      return <AdminShell user={user} onLogout={logout} />;
   }

   return (
      <ChatShell
         onLogout={logout}
         onUpdateProfile={updateProfile}
         onChangePassword={changePassword}
         user={user}
      />
   );
}

export default App;
