import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CountryFilter } from '../../../src/components/CountryFilter';
import { COUNTRY_LIST } from '../../fixtures/stations';

const renderFilter = (selectedCountry: string | null = 'Estonia') => {
  const onSelect = vi.fn();
  render(
    <>
      <p>outside</p>
      <CountryFilter
        countries={COUNTRY_LIST}
        selectedCountry={selectedCountry}
        onSelect={onSelect}
        total={872268}
        query=""
      />
    </>,
  );
  return { onSelect, user: userEvent.setup(), trigger: screen.getByRole('button', { name: /Estonia|Global network/ }) };
};

const activeOption = () => {
  const id = screen.getByRole('combobox').getAttribute('aria-activedescendant');
  return document.getElementById(id!);
};

describe('CountryFilter', () => {
  it('opens a listbox of real countries (no "Global" catch-all) with focus in the filter', async () => {
    const { user, trigger } = renderFilter();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await vi.waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toContain('Global network872,268');
    expect(options).toHaveLength(COUNTRY_LIST.length); // 8 countries + "Global network", minus the "Global" row
    expect(screen.getByRole('option', { name: /Estonia/ })).toHaveAttribute('aria-selected', 'true');
    for (const o of options) expect(o).toHaveAttribute('tabindex', '-1'); // arrows, not Tab, move within the list
  });

  it('arrow keys, Home and End move the active option; Enter selects it', async () => {
    const { user, trigger, onSelect } = renderFilter();
    await user.click(trigger);
    await vi.waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
    expect(activeOption()).toHaveTextContent('Global network');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Germany');
    await user.keyboard('{ArrowUp}');
    expect(activeOption()).toHaveTextContent('Estonia');
    await user.keyboard('{End}');
    expect(activeOption()).toHaveTextContent('India');
    await user.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('India'); // clamped
    await user.keyboard('{Home}');
    expect(activeOption()).toHaveTextContent('Global network');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Estonia');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('typing filters the list; Enter on "Global network" clears the country', async () => {
    const { user, trigger, onSelect } = renderFilter();
    await user.click(trigger);
    await user.type(screen.getByRole('combobox'), 'jap');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Global network872,268', 'Japan900']);
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows an empty message for no match', async () => {
    const { user, trigger } = renderFilter();
    await user.click(trigger);
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No matching country')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}'); // nothing to pick — must not throw
  });

  it('clicking an option selects it; Escape and outside clicks close', async () => {
    const { user, trigger, onSelect } = renderFilter(null);
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: /Brazil/ }));
    expect(onSelect).toHaveBeenCalledWith('Brazil');

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();

    await user.click(trigger);
    await user.click(screen.getByText('outside'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
