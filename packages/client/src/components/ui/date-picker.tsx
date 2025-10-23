import { useEffect, useMemo, useState, type WheelEventHandler } from 'react';

import {
   CalendarDays,
   ChevronLeft,
   ChevronRight,
   ChevronsLeft,
   ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerProps = {
   value: string;
   onChange: (value: string) => void;
   placeholder?: string;
   disabled?: boolean;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function formatISODate(date: Date): string {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   return `${year}-${month}-${day}`;
}

function parseISODate(value: string): Date | null {
   if (!value) {
      return null;
   }

   const [yearString, monthString, dayString] = value.split('-');
   const year = Number(yearString);
   const month = Number(monthString);
   const day = Number(dayString);

   if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
   }

   const result = new Date(year, month - 1, day);

   if (
      result.getFullYear() !== year ||
      result.getMonth() !== month - 1 ||
      result.getDate() !== day
   ) {
      return null;
   }

   return result;
}

function startOfMonth(date: Date): Date {
   return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function DatePicker({
   value,
   onChange,
   placeholder = 'Select date',
   disabled = false,
}: DatePickerProps) {
   const parsedValue = useMemo(() => parseISODate(value), [value]);
   const [open, setOpen] = useState(false);
   const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
      startOfMonth(parsedValue ?? new Date())
   );

   useEffect(() => {
      if (parsedValue) {
         setVisibleMonth(startOfMonth(parsedValue));
      }
   }, [parsedValue]);

   const monthLabel = useMemo(
      () =>
         new Intl.DateTimeFormat('en', {
            month: 'long',
            year: 'numeric',
         }).format(visibleMonth),
      [visibleMonth]
   );

   const displayValue = parsedValue
      ? new Intl.DateTimeFormat('en', {
           dateStyle: 'medium',
        }).format(parsedValue)
      : placeholder;

   const todayIso = useMemo(() => formatISODate(new Date()), []);

   const days = useMemo(() => {
      const start = startOfMonth(visibleMonth);
      const offset = start.getDay();
      const gridStart = new Date(start);
      gridStart.setDate(1 - offset);

      return Array.from({ length: 42 }, (_, index) => {
         const date = new Date(gridStart);
         date.setDate(gridStart.getDate() + index);
         return {
            date,
            iso: formatISODate(date),
            isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
         };
      });
   }, [visibleMonth]);

   const handleMonthChange = (delta: number) => {
      setVisibleMonth((prev) =>
         startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
      );
   };

   const handleYearChange = (deltaYears: number) => {
      setVisibleMonth((prev) =>
         startOfMonth(
            new Date(prev.getFullYear() + deltaYears, prev.getMonth(), 1)
         )
      );
   };

   const handleYearScroll: WheelEventHandler<HTMLSpanElement> = (event) => {
      event.preventDefault();
      if (event.deltaY < 0) {
         handleYearChange(-1);
      } else if (event.deltaY > 0) {
         handleYearChange(1);
      }
   };

   const handleSelect = (selectedDate: Date, iso: string) => {
      onChange(iso);
      setOpen(false);
      setVisibleMonth(startOfMonth(selectedDate));
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <button
               type="button"
               className={cn(
                  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  !parsedValue && 'text-muted-foreground'
               )}
               disabled={disabled}
            >
               <span>{displayValue}</span>
               <CalendarDays
                  className="size-4 text-muted-foreground"
                  aria-hidden
               />
            </button>
         </PopoverTrigger>
         <PopoverContent align="start" className="w-[20rem] space-y-4 p-4">
            <div className="flex items-center justify-between gap-2">
               <div className="flex items-center gap-1">
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     onClick={() => handleYearChange(-1)}
                     disabled={disabled}
                     aria-label="Previous year"
                  >
                     <ChevronsLeft className="size-4" aria-hidden />
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     onClick={() => handleMonthChange(-1)}
                     disabled={disabled}
                     aria-label="Previous month"
                  >
                     <ChevronLeft className="size-4" aria-hidden />
                  </Button>
               </div>
               <span
                  className="text-sm font-medium text-foreground"
                  onWheel={handleYearScroll}
                  role="presentation"
               >
                  {monthLabel}
               </span>
               <div className="flex items-center gap-1">
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     onClick={() => handleMonthChange(1)}
                     disabled={disabled}
                     aria-label="Next month"
                  >
                     <ChevronRight className="size-4" aria-hidden />
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     onClick={() => handleYearChange(1)}
                     disabled={disabled}
                     aria-label="Next year"
                  >
                     <ChevronsRight className="size-4" aria-hidden />
                  </Button>
               </div>
            </div>
            <div className="space-y-2">
               <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
                  {DAY_LABELS.map((label) => (
                     <span key={label}>{label}</span>
                  ))}
               </div>
               <div className="grid grid-cols-7 gap-1">
                  {days.map(({ date, iso, isCurrentMonth }) => {
                     const isSelected = value === iso;
                     const isToday = iso === todayIso;

                     return (
                        <button
                           key={iso}
                           type="button"
                           onClick={() => handleSelect(date, iso)}
                           disabled={disabled}
                           className={cn(
                              'flex size-9 items-center justify-center rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
                              isSelected
                                 ? 'bg-primary text-primary-foreground shadow-sm'
                                 : 'bg-card hover:bg-muted/80',
                              isCurrentMonth
                                 ? 'text-foreground'
                                 : 'text-muted-foreground/70',
                              isToday && !isSelected
                                 ? 'border border-primary/60'
                                 : 'border border-transparent',
                              disabled && 'cursor-not-allowed opacity-50'
                           )}
                           aria-pressed={isSelected}
                        >
                           {date.getDate()}
                        </button>
                     );
                  })}
               </div>
            </div>
         </PopoverContent>
      </Popover>
   );
}
