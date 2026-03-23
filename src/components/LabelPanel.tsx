import { FormEvent, useState } from 'react';
import type { Label } from '../types';

interface LabelPanelProps {
  labels: Label[];
  onCreateLabel: (input: { name: string; color: string }) => Promise<void>;
}

export function LabelPanel({ labels, onCreateLabel }: LabelPanelProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#db2777');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Label name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreateLabel({ name: name.trim(), color });
      setName('');
      setColor('#db2777');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create label.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="label-panel">
      <header>
        <h2>Labels</h2>
        <p>{labels.length} label{labels.length === 1 ? '' : 's'}</p>
      </header>

      <div className="label-list">
        {labels.length === 0 ? <p className="team-empty">No labels yet.</p> : null}
        {labels.map((label) => (
          <span key={label.id} className="label-chip" style={{ borderColor: label.color, color: label.color }}>
            {label.name}
          </span>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="team-form">
        <h3>Add label</h3>
        <div className="team-form-row">
          <label>
            Color
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Bug" />
          </label>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add label'}
        </button>
      </form>
    </section>
  );
}
