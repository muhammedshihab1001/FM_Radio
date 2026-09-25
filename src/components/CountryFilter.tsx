import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { CountryNode } from '../types/terminal';

interface CountryFilterProps {
  countries: CountryNode[];
  selectedCountry: string | null;
  onSelect: (country: string | null) => void;
  total: number | null;
  query: string;
}

/**
 * Searchable country selector: a trigger that opens a listbox with real
 * `role="listbox"`/`role="option"` semantics and arrow-key navigation
 * (v3 had none — only Tab-through-buttons and an Esc handler).
 */
export const CountryFilter: React.FC<CountryFilterProps> = React.memo(
  ({ countries, selectedCountry, onSelect, total }) => {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const fn = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', fn);
      return () => document.removeEventListener('mousedown', fn);
    }, []);

    useEffect(() => {
      if (!open) return;
      const fn = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      document.addEventListener('keydown', fn);
      return () => document.removeEventListener('keydown', fn);
    }, [open]);

    useEffect(() => {
      if (open) {
        setActiveIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }, [open]);

    // 'Global' is a database catch-all category, not a real country.
    const filtered = useMemo(
      () =>
        countries.filter(
          (c) => c.country !== 'Global' && (c.country ?? '').toLowerCase().includes(filter.toLowerCase()),
        ),
      [countries, filter],
    );
    // Index 0 in the option list is always "Global Network".
    const optionCount = filtered.length + 1;

    const choose = (country: string | null) => {
      onSelect(country);
      setOpen(false);
      setFilter('');
    };

    const onListKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(optionCount - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(optionCount - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex === 0) choose(null);
        else {
          const target = filtered[activeIndex - 1];
          if (target) choose(target.country);
        }
      }
    };

    useEffect(() => {
      listRef.current?.querySelector(`[data-idx="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const label = selectedCountry || 'Global network';

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-button surface-raised text-sm font-medium text-primary transition-colors hover:border-line/20"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            className="text-cyan shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="truncate max-w-[9rem] sm:max-w-none">{label}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`text-tertiary shrink-0 transition-transform duration-standard ${open ? 'rotate-180' : ''}`}
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div className="card-enter absolute top-[calc(100%+8px)] left-0 z-[150] w-72 max-w-[85vw] h-[22rem] flex flex-col rounded-card surface-raised overflow-hidden shadow-raised">
            <div className="p-3 border-b border-line/[0.06]">
              <label htmlFor="country-filter-input" className="sr-only">
                Filter countries
              </label>
              <input
                id="country-filter-input"
                ref={inputRef}
                type="text"
                placeholder="Search countries…"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onListKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls="country-listbox"
                aria-activedescendant={`country-opt-${activeIndex}`}
                className="w-full h-11 px-3 rounded-button bg-base border border-line/10 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-cyan/40"
              />
            </div>

            <div
              id="country-listbox"
              ref={listRef}
              role="listbox"
              aria-label="Countries"
              className="flex-1 overflow-y-auto py-1.5 custom-scrollbar"
            >
              <button
                id="country-opt-0"
                data-idx={0}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={!selectedCountry}
                onClick={() => choose(null)}
                onMouseEnter={() => setActiveIndex(0)}
                className={`w-full min-h-[44px] px-4 flex items-center justify-between gap-2 text-left transition-colors ${
                  activeIndex === 0 ? 'bg-raised' : ''
                } ${!selectedCountry ? 'text-cyan font-medium' : 'text-secondary'}`}
              >
                <span>Global network</span>
                <span className="font-mono text-2xs text-tertiary tabular">{total ? total.toLocaleString() : ''}</span>
              </button>

              {filtered.map((c, i) => {
                const idx = i + 1;
                const selected = selectedCountry === c.country;
                return (
                  <button
                    key={c.country}
                    id={`country-opt-${idx}`}
                    data-idx={idx}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={selected}
                    onClick={() => choose(c.country)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full min-h-[44px] px-4 flex items-center justify-between gap-3 text-left transition-colors ${
                      activeIndex === idx ? 'bg-raised' : ''
                    } ${selected ? 'text-cyan font-medium' : 'text-secondary'}`}
                  >
                    <span dir="auto" className="truncate">
                      {c.country}
                    </span>
                    <span className="font-mono text-2xs text-tertiary shrink-0 tabular">
                      {c.count.toLocaleString()}
                    </span>
                  </button>
                );
              })}

              {filtered.length === 0 && <p className="py-8 text-center text-xs text-tertiary">No matching country</p>}
            </div>
          </div>
        )}
      </div>
    );
  },
);
