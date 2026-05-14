// src/app/[lang]/trees/[treeId]/MemberDateSection.tsx
"use client";

import type { BirthPrecision } from "./member-form-state";

interface DateSectionT {
  precision: string;
  precisionYear: string;
  precisionMonth: string;
  precisionDay: string;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
}

interface MemberDateSectionProps {
  label: string;
  precision: BirthPrecision;
  year: string;
  month: string;
  day: string;
  isLoading: boolean;
  t: DateSectionT;
  onPrecisionChange: (v: BirthPrecision) => void;
  onYearChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onDayChange: (v: string) => void;
}

export default function MemberDateSection({
  label,
  precision,
  year,
  month,
  day,
  isLoading,
  t,
  onPrecisionChange,
  onYearChange,
  onMonthChange,
  onDayChange,
}: MemberDateSectionProps) {
  return (
    <div>
      <p className="block text-sm font-semibold text-stone-900 mb-2">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs text-stone-500 mb-1">
            {t.precision}
          </label>
          <select
            value={precision}
            onChange={(e) =>
              onPrecisionChange(e.target.value as BirthPrecision)
            }
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 text-stone-900 text-sm"
            disabled={isLoading}
          >
            <option value="year">{t.precisionYear}</option>
            <option value="month">{t.precisionMonth}</option>
            <option value="day">{t.precisionDay}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">
            {t.yearLabel}
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            min={1}
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 text-stone-900 text-sm"
            placeholder="YYYY"
            disabled={isLoading}
          />
        </div>
        {(precision === "month" || precision === "day") && (
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              {t.monthLabel}
            </label>
            <input
              type="number"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              min={1}
              max={12}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 text-stone-900 text-sm"
              placeholder="MM"
              disabled={isLoading}
            />
          </div>
        )}
        {precision === "day" && (
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              {t.dayLabel}
            </label>
            <input
              type="number"
              value={day}
              onChange={(e) => onDayChange(e.target.value)}
              min={1}
              max={31}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-900 text-stone-900 text-sm"
              placeholder="DD"
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
