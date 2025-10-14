import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useRef,
   useState,
   type PropsWithChildren,
} from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = Extract<Theme, 'light' | 'dark'>;

interface ThemeContextValue {
   theme: Theme;
   resolvedTheme: ResolvedTheme;
   setTheme: (theme: Theme) => void;
}

const storageKey = 'ui-theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isTheme = (value: unknown): value is Theme =>
   value === 'light' || value === 'dark' || value === 'system';

const prefersDark = () =>
   typeof window !== 'undefined' &&
   window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveTheme = (theme: Theme): ResolvedTheme =>
   theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;

const readStoredTheme = (fallback: Theme): Theme => {
   if (typeof window === 'undefined') {
      return fallback;
   }

   const stored = window.localStorage.getItem(storageKey);
   return isTheme(stored) ? stored : fallback;
};

const storeTheme = (theme: Theme) => {
   if (typeof window === 'undefined') {
      return;
   }

   try {
      window.localStorage.setItem(storageKey, theme);
   } catch (error) {
      console.warn('Unable to persist theme preference.', error);
   }
};

const shouldReduceMotion = () =>
   typeof window !== 'undefined' &&
   window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let transitionTimer: number | undefined;

const applyThemeClass = (theme: Theme, withTransition: boolean) => {
   if (typeof document === 'undefined') {
      return;
   }

   const root = document.documentElement;
   const resolved = resolveTheme(theme);

   root.classList.toggle('dark', resolved === 'dark');
   root.dataset.theme = resolved;

   if (withTransition && !shouldReduceMotion()) {
      root.classList.add('theme-transition');
      if (typeof window !== 'undefined') {
         window.clearTimeout(transitionTimer);
         transitionTimer = window.setTimeout(() => {
            root.classList.remove('theme-transition');
         }, 350);
      }
      return;
   }

   root.classList.remove('theme-transition');
};

export interface ThemeProviderProps extends PropsWithChildren {
   defaultTheme?: Theme;
}

export function ThemeProvider({
   children,
   defaultTheme = 'system',
}: ThemeProviderProps) {
   const [theme, setThemeState] = useState<Theme>(() =>
      readStoredTheme(defaultTheme)
   );
   const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
      resolveTheme(readStoredTheme(defaultTheme))
   );

   const setTheme = useCallback((next: Theme) => {
      setThemeState(next);
      storeTheme(next);
   }, []);

   const apply = useCallback((value: Theme, withTransition = false) => {
      applyThemeClass(value, withTransition);
      setResolvedTheme(resolveTheme(value));
   }, []);

   const isFirstRender = useRef(true);

   useEffect(() => {
      const shouldAnimate = !isFirstRender.current;
      apply(theme, shouldAnimate);
      if (isFirstRender.current) {
         isFirstRender.current = false;
      }
   }, [apply, theme]);

   useEffect(() => {
      if (typeof window === 'undefined') {
         return;
      }

      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
         if (theme === 'system') {
            apply(theme, true);
         } else {
            setResolvedTheme(resolveTheme(theme));
         }
      };

      if (typeof media.addEventListener === 'function') {
         media.addEventListener('change', listener);
         return () => media.removeEventListener('change', listener);
      }

      media.addListener(listener);
      return () => media.removeListener(listener);
   }, [apply, theme]);

   const value = useMemo<ThemeContextValue>(
      () => ({
         theme,
         resolvedTheme,
         setTheme,
      }),
      [theme, resolvedTheme, setTheme]
   );

   return (
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
   );
}

// eslint-disable-next-line react-refresh/only-export-components -- Expose the shared hook alongside the provider for convenience.
export const useTheme = () => {
   const context = useContext(ThemeContext);

   if (!context) {
      throw new Error('useTheme must be used within a ThemeProvider');
   }

   return context;
};
