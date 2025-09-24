import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

interface ThemeToggleProps {
   className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
   const { resolvedTheme, setTheme } = useTheme();

   const toggle = () => {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
   };

   return (
      <Button
         type="button"
         variant="ghost"
         size="icon"
         onClick={toggle}
         className={cn('relative', className)}
         aria-label={`Activate ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
         title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
         <Sun className="size-4 rotate-0 scale-100 transition-all duration-200 ease-in-out dark:-rotate-90 dark:scale-0" />
         <Moon className="absolute inset-0 m-auto size-4 rotate-90 scale-0 transition-all duration-200 ease-in-out dark:rotate-0 dark:scale-100" />
         <span className="sr-only">Toggle theme</span>
      </Button>
   );
}
