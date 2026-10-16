import { DAYPARTS, WEEKDAYS } from "@/lib/time";

/** Raster ma–zo × ochtend/middag/avond met checkboxen "slot" = "weekday-daypart". */
export function AvailabilityGrid({ selected }: { selected: Set<string> }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr>
            <th className="sr-only">Dagdeel</th>
            {WEEKDAYS.map((d) => (
              <th key={d} className="px-1 pb-1 font-semibold text-stone-600">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYPARTS.map((p) => (
            <tr key={p.key}>
              <th className="pr-2 text-left font-normal text-stone-600">{p.label}</th>
              {WEEKDAYS.map((d, wi) => {
                const key = `${wi}-${p.key}`;
                return (
                  <td key={key} className="p-1 text-center">
                    <label className="block cursor-pointer">
                      <input type="checkbox" name="slot" value={key} defaultChecked={selected.has(key)} className="peer sr-only" />
                      <span className="block h-9 w-9 rounded-lg border border-stone-300 bg-white peer-checked:border-brand-600 peer-checked:bg-brand-500 peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600" />
                      <span className="sr-only">{d} {p.label}</span>
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
