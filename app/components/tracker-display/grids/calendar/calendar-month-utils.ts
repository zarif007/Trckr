/**
 * Builds 42 day cells (6×7) for a month grid, including leading/trailing padding from adjacent months.
 */
export function buildMonthGridCells(anchor: Date): Array<{
  date: Date;
  isCurrentMonth: boolean;
}> {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay();

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return days;
}

/** Seven dates starting Sunday of the week that contains `anchor`. */
export function buildWeekDaysAround(anchor: Date): Date[] {
  const startOfWeek = new Date(anchor);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    return date;
  });
}
