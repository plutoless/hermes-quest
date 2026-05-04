import type { ButtonHTMLAttributes, CSSProperties, ChangeEvent, Ref, ReactNode } from 'react';

type PixelTone = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type PixelIconName =
  | 'guild-hall'
  | 'quest-board'
  | 'review'
  | 'quest'
  | 'quest-log'
  | 'report'
  | 'companion'
  | 'settings'
  | 'diagnostics'
  | 'bridge-real'
  | 'bridge-mock'
  | 'bridge-auto'
  | 'hermes-available'
  | 'hermes-unavailable'
  | 'no-fallback'
  | 'returned'
  | 'approved'
  | 'revise'
  | 'error'
  | 'warning'
  | 'search'
  | 'close'
  | 'minimize'
  | 'maximize'
  | 'dropdown-arrow'
  | 'chevron'
  | 'plus'
  | 'send'
  | 'document'
  | 'scroll'
  | 'seal'
  | 'feather-pen'
  | 'spark';
type PixelStatus =
  | 'idle'
  | 'thinking'
  | 'running'
  | 'blocked'
  | 'needs_review'
  | 'error'
  | 'approved'
  | 'real'
  | 'mock'
  | 'auto'
  | 'fallback'
  | 'required'
  | 'unavailable'
  | 'available'
  | 'unchecked';

export interface PixelAppWindowProps {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  toolbar?: ReactNode;
  commandBar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PixelAppWindow({ title, subtitle, status, toolbar, commandBar, children, className = '' }: PixelAppWindowProps) {
  return (
    <section className={`pixel-app-window ${className}`.trim()}>
      <PixelTitleBar title={title} subtitle={subtitle} status={status} />
      {toolbar && <div className="pixel-window-toolbar">{toolbar}</div>}
      <div className="pixel-window-content">{children}</div>
      {commandBar && <footer className="pixel-window-command">{commandBar}</footer>}
    </section>
  );
}

export function PixelTitleBar({ title, subtitle, status }: { title: string; subtitle?: string; status?: ReactNode }) {
  return (
    <header className="pixel-app-titlebar">
      <div className="pixel-window-controls" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="pixel-title-copy">
        <p>{title}</p>
        {subtitle && <span>{subtitle}</span>}
      </div>
      {status && <div className="pixel-title-status">{status}</div>}
    </header>
  );
}

export interface PixelPanelProps {
  title?: string;
  icon?: ReactNode;
  variant?: 'parchment' | 'dark' | 'inset' | 'review';
  compact?: boolean;
  children: ReactNode;
  className?: string;
}

export function PixelPanel({ title, icon, variant = 'parchment', compact = false, children, className = '' }: PixelPanelProps) {
  return (
    <section className={`pixel-panel pixel-panel-${variant} ${compact ? 'pixel-panel-compact' : ''} ${className}`.trim()}>
      {(title || icon) && <PixelSectionHeader title={title ?? ''} icon={icon} />}
      <div className="pixel-panel-body">{children}</div>
    </section>
  );
}

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: PixelTone;
}

export function PixelButton({ tone = 'primary', className = '', children, ...props }: PixelButtonProps) {
  return (
    <button className={`pixel-button pixel-button-${tone} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export interface PixelInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
}

export function PixelInput({ value, onChange, placeholder, ariaLabel, multiline = false, rows = 2, className = '', inputRef }: PixelInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value);

  if (multiline) {
    return (
      <textarea
        className={`pixel-input pixel-input-multiline ${className}`.trim()}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={rows}
        ref={inputRef as Ref<HTMLTextAreaElement>}
      />
    );
  }

  return (
    <input
      className={`pixel-input ${className}`.trim()}
      value={value}
      onChange={handleChange}
    placeholder={placeholder}
    aria-label={ariaLabel}
    ref={inputRef as Ref<HTMLInputElement>}
  />
);
}

export function PixelTextarea(props: Omit<PixelInputProps, 'multiline'>) {
  return <PixelInput {...props} multiline />;
}

export function PixelSelect({
  value,
  onChange,
  children,
  ariaLabel,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <select className={`pixel-select ${className}`.trim()} value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>
      {children}
    </select>
  );
}

export function PixelBadge({ status, children, className = '' }: { status: PixelStatus | string; children: ReactNode; className?: string }) {
  return <span className={`pixel-badge pixel-badge-${status} ${className}`.trim()}>{children}</span>;
}

export function PixelChip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`pixel-chip ${className}`.trim()}>{children}</span>;
}

export function PixelIcon({ name, label, size = 28, className = '' }: { name: PixelIconName; label?: string; size?: number; className?: string }) {
  return (
    <span
      className={`pixel-icon pixel-icon-${name} ${className}`.trim()}
      style={{ '--pixel-icon-size': `${size}px` } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export interface PixelAvatarProps {
  name: string;
  role?: string;
  status?: PixelStatus | string;
  icon?: ReactNode;
  className?: string;
}

export function PixelAvatar({ name, role, status = 'idle', icon, className = '' }: PixelAvatarProps) {
  const roleAsset = role === 'Builder' ? 'builder' : role === 'Reviewer' ? 'scribe' : role === 'Researcher' ? 'scout' : 'gatherer';
  const statusAsset = status === 'needs_review' ? 'needs-review' : status === 'running' ? 'running' : status === 'error' ? 'error' : 'idle';

  return (
    <PixelAvatarFrame status={status} label={`${name}${role ? `, ${role}` : ''}`} className={className}>
      <div className="pixel-avatar-safe-area">
        {icon ?? <span className={`pixel-avatar-image pixel-avatar-image-${roleAsset}-${statusAsset}`} aria-hidden="true" />}
      </div>
      <span className="pixel-avatar-glint" />
    </PixelAvatarFrame>
  );
}

export function PixelAvatarFrame({
  status = 'idle',
  label,
  className = '',
  children,
}: {
  status?: PixelStatus | string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`pixel-avatar pixel-avatar-frame pixel-avatar-${status} ${className}`.trim()} aria-label={label}>
      <div className="pixel-avatar-sprite">
        {children}
      </div>
    </div>
  );
}

export function PixelMascot({
  state = 'idle',
  label,
  size = 82,
  className = '',
}: {
  state?: 'idle' | 'running' | 'needs_review' | 'error';
  label?: string;
  size?: number;
  className?: string;
}) {
  const assetState = state === 'needs_review' ? 'needs-review' : state;
  return (
    <span
      className={`pixel-mascot pixel-mascot-owl-${assetState} ${className}`.trim()}
      style={{ '--pixel-mascot-size': `${size}px` } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function PixelSectionHeader({ title, icon, action }: { title: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="pixel-section-header">
      <span className="pixel-section-title">
        {icon && <span className="pixel-section-icon">{icon}</span>}
        {title}
      </span>
      {action && <span className="pixel-section-action">{action}</span>}
    </div>
  );
}

export interface PixelQuestCardProps {
  title: string;
  brief: string;
  currentStep: string;
  progress: number;
  state: string;
  action: ReactNode;
  empty?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export function PixelQuestCard({
  title,
  brief,
  currentStep,
  progress,
  state,
  action,
  empty = false,
  suggestions = [],
  onSuggestionSelect,
}: PixelQuestCardProps) {
  return (
    <PixelPanel className={`pixel-quest-card ${empty ? 'pixel-quest-empty' : ''}`.trim()} title="Active Quest" variant="parchment">
      <div className="pixel-card-heading">
        <div>
          <h2>{title}</h2>
          <p>{brief}</p>
        </div>
        <PixelBadge status={state}>{state.replaceAll('_', ' ')}</PixelBadge>
      </div>
      <div className="pixel-progress" aria-label={`Progress ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="pixel-inset-note">
        <strong>Current step</strong>
        <p>{currentStep}</p>
      </div>
      {empty && suggestions.length > 0 && (
        <div className="pixel-prompt-chips" aria-label="Suggested quest prompts">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => onSuggestionSelect?.(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {action}
    </PixelPanel>
  );
}

export interface PixelLogEntry {
  id: string;
  title: string;
  detail: string;
  time: string;
  status?: string;
}

export function PixelLogList({ entries, emptyText }: { entries: PixelLogEntry[]; emptyText: string }) {
  return (
    <div className="pixel-log-list">
      {entries.length === 0 ? (
        <p className="pixel-muted">{emptyText}</p>
      ) : (
        entries.slice(0, 5).map((entry) => (
          <div key={entry.id} className="pixel-log-entry">
            <span className="pixel-log-marker" aria-hidden="true" />
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
            </div>
            <time>{entry.time}</time>
          </div>
        ))
      )}
    </div>
  );
}

export const PixelQuestLog = PixelLogList;

export interface PixelReviewCardProps {
  title: string;
  summary: string;
  artifact?: string;
  provenance: string;
  pendingCount?: number;
  actions?: ReactNode;
}

export function PixelReviewCard({ title, summary, artifact, provenance, pendingCount, actions }: PixelReviewCardProps) {
  return (
    <PixelPanel className="pixel-review-card" title="Review & Result" variant="review" compact>
      <div className="pixel-review-heading">
        <h3>{title}</h3>
        {typeof pendingCount === 'number' && <span>{pendingCount}</span>}
      </div>
      <p>{summary}</p>
      {actions}
      <div className="pixel-review-meta">
        {artifact && (
          <span>
            <strong>Artifact</strong>
            {artifact}
          </span>
        )}
        <span>
          <strong>Source</strong>
          {provenance}
        </span>
      </div>
    </PixelPanel>
  );
}

export function PixelTruthStrip({
  mode,
  implementation,
  execution,
  hermes,
  fallback,
  profileSource,
}: {
  mode: string;
  implementation: string;
  execution: string;
  hermes: string;
  fallback?: string;
  profileSource: string;
}) {
  const fallbackText = fallback ? `Fallback: ${fallback}` : 'Fallback: none';
  const fallbackSummary = fallback ? 'Mock fallback' : 'No fallback';
  const modeLabel = mode.slice(0, 1).toUpperCase() + mode.slice(1);
  const hermesLabel = hermes.slice(0, 1).toUpperCase() + hermes.slice(1);

  return (
    <section className="pixel-truth-strip" aria-label="Integration truth">
      <PixelSectionHeader title="Integration Truth" />
      <p>
        <span>{modeLabel}</span>
        <span>{fallbackSummary}</span>
        <span>Hermes {hermesLabel}</span>
        <span>Profiles: {profileSource}</span>
      </p>
      <details className="pixel-truth-details">
        <summary>Diagnostics</summary>
        <dl>
          <div>
            <dt>Bridge</dt>
            <dd>{mode} / {implementation}</dd>
          </div>
          <div>
            <dt>Execution</dt>
            <dd>{execution}</dd>
          </div>
          <div>
            <dt>Hermes</dt>
            <dd>{hermes}</dd>
          </div>
          <div>
            <dt>Profiles</dt>
            <dd>{profileSource}</dd>
          </div>
          <div>
            <dt>Fallback</dt>
            <dd>{fallbackText}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

export function PixelCommandBar({
  value,
  onChange,
  onSubmit,
  disabled,
  hint,
  placeholder = 'Ask Hermes to do something...',
  actionLabel = 'Send',
  secondaryAction,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
  actionLabel?: string;
  secondaryAction?: ReactNode;
}) {
  return (
    <form
      className="pixel-command-bar"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {hint && <span className="pixel-command-hint">{hint}</span>}
      <PixelInput value={value} onChange={onChange} placeholder={placeholder} ariaLabel="Command input" />
      <PixelButton type="submit" disabled={disabled}>
        {actionLabel}
      </PixelButton>
      {secondaryAction}
    </form>
  );
}
