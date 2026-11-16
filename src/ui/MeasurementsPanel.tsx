import { useState } from 'react';
import type { BodyModel } from '../lib/body';
import { MEASUREMENT_DEFS, MEASUREMENT_GROUPS, PRESETS, type MeasurementGroup } from '../lib/measurements';
import { useStore } from '../state/store';
import { NumberField } from './NumberField';

export function MeasurementsPanel({ body }: { body: BodyModel }) {
  const unit = useStore((s) => s.unit);
  const m = useStore((s) => s.measurements);
  const presetId = useStore((s) => s.presetId);
  const profiles = useStore((s) => s.profiles);
  const setMeasurement = useStore((s) => s.setMeasurement);
  const setHeightProportional = useStore((s) => s.setHeightProportional);
  const applyPreset = useStore((s) => s.applyPreset);
  const saveProfile = useStore((s) => s.saveProfile);
  const loadProfile = useStore((s) => s.loadProfile);
  const deleteProfile = useStore((s) => s.deleteProfile);
  const [open, setOpen] = useState<Record<MeasurementGroup, boolean>>({ Lengths: true, Torso: true, Arms: false, Legs: false });
  const [keepProportions, setKeepProportions] = useState(false);
  const [profileId, setProfileId] = useState('');

  const selected = profileId && profiles.some((p) => p.id === profileId) ? `p:${profileId}` : presetId ? `s:${presetId}` : '';
  // The figure may stand taller than the entered height if the segments demand it.
  const effectiveHeight = body.lm.topY;

  return (
    <aside className="panel panel-left" aria-label="Mannequin measurements">
      <div className="panel-head">
        <h2>Mannequin</h2>
        <p className="muted">Enter measurements as a tailor would take them. The figure rebuilds as you type.</p>
      </div>

      <div className="field-row">
        <label className="grow">
          <span className="label">Start from</span>
          <select
            value={selected}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith('s:')) { setProfileId(''); applyPreset(v.slice(2)); }
              if (v.startsWith('p:')) { setProfileId(v.slice(2)); loadProfile(v.slice(2)); }
            }}
          >
            {!selected && <option value="">Custom measurements</option>}
            <optgroup label="Standard forms">
              {PRESETS.map((p) => <option key={p.id} value={`s:${p.id}`}>{p.label}</option>)}
            </optgroup>
            {profiles.length > 0 && (
              <optgroup label="Saved profiles">
                {profiles.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}
              </optgroup>
            )}
          </select>
        </label>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="btn small"
          onClick={() => {
            const name = window.prompt('Name this set of measurements', 'My measurements');
            if (name?.trim()) saveProfile(name.trim());
          }}
        >
          Save as profile
        </button>
        {profileId && profiles.some((p) => p.id === profileId) && (
          <button type="button" className="btn small ghost" onClick={() => { deleteProfile(profileId); setProfileId(''); }}>
            Delete profile
          </button>
        )}
      </div>

      {MEASUREMENT_GROUPS.map((group) => (
        <section key={group} className="group">
          <button type="button" className="group-head" aria-expanded={open[group]} onClick={() => setOpen({ ...open, [group]: !open[group] })}>
            <span>{group}</span>
            <span className="chev" aria-hidden>{open[group] ? '–' : '+'}</span>
          </button>
          {open[group] && (
            <div className="group-body">
              {MEASUREMENT_DEFS.filter((d) => d.group === group).map((d) => {
                const change = (cm: number) =>
                  d.key === 'height' && keepProportions ? setHeightProportional(cm) : setMeasurement(d.key, cm);
                return (
                  <div className="measure" key={d.key}>
                    <div className="measure-top">
                      <span className="measure-label" title={d.how}>{d.label}</span>
                      <NumberField cm={m[d.key]} unit={unit} min={d.min} max={d.max} onChange={change} label={d.label} />
                    </div>
                    <input
                      type="range"
                      min={d.min}
                      max={d.max}
                      step={0.5}
                      value={m[d.key]}
                      aria-label={d.label}
                      title={d.how}
                      onChange={(e) => change(Number(e.target.value))}
                    />
                    {d.key === 'height' && (
                      <>
                        <label className="check">
                          <input type="checkbox" checked={keepProportions} onChange={(e) => setKeepProportions(e.target.checked)} />
                          Scale all lengths with height
                        </label>
                        {effectiveHeight > m.height + 0.3 && (
                          <p className="hint warn">Leg, rise and back length add up to more than this height, so the figure stands taller.</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
      <p className="muted small-print">Hover a measurement name to see how it is taken.</p>
    </aside>
  );
}
