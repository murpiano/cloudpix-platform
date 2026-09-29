export const MONTHS: readonly string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const monthYear = ({ year, month }: { year: number; month: number }): string =>
  `${MONTHS[month - 1] ?? ''} ${year}`;
