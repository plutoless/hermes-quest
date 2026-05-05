import type { ButtonHTMLAttributes, CSSProperties, ChangeEvent, Ref, ReactNode } from 'react';
import { pixelUi2Assets } from './assets';

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
    <section
      className={`pixel-app-window ${className}`.trim()}
      style={{
        '--pixel-window-texture': `url(${pixelUi2Assets.sheets.controls})`,
        '--pixel-window-border-image': `url(${pixelUi2Assets.frame.darkPanel})`,
        '--pixel-title-border-image': `url(${pixelUi2Assets.frame.titlePanel})`,
      } as CSSProperties}
    >
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
  variant?: 'parchment' | 'dark' | 'inset' | 'review' | 'note';
  compact?: boolean;
  children: ReactNode;
  className?: string;
}

export function PixelPanel({ title, icon, variant = 'parchment', compact = false, children, className = '' }: PixelPanelProps) {
  const panelParts =
    variant === 'dark'
      ? pixelUi2Assets.part.panel.dark
      : variant === 'inset'
        ? pixelUi2Assets.part.panel.inset
        : variant === 'review'
          ? pixelUi2Assets.part.panel.review
          : variant === 'note'
            ? pixelUi2Assets.part.panel.note
            : pixelUi2Assets.part.panel.parchment;

  return (
    <section
      className={`pixel-panel pixel-panel-${variant} ${compact ? 'pixel-panel-compact' : ''} ${className}`.trim()}
      style={{
        ...panelPartVars(panelParts, compact),
      } as CSSProperties}
    >
      <span className="pixel-panel-piece pixel-panel-piece-center" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-top-left" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-top" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-top-right" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-right" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-bottom-right" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-bottom" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-bottom-left" aria-hidden="true" />
      <span className="pixel-panel-piece pixel-panel-piece-left" aria-hidden="true" />
      <span className="pixel-panel-ornament" aria-hidden="true" />
      {(title || icon) && <PixelSectionHeader title={title ?? ''} icon={icon} />}
      <div className="pixel-panel-body">{children}</div>
    </section>
  );
}

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: PixelTone;
}

export function PixelButton({ tone = 'primary', className = '', children, ...props }: PixelButtonProps) {
  const asset = pixelUi2Assets.button[tone];
  const parts = getButtonParts(tone);

  return (
    <button
      className={`pixel-button pixel-button-${tone} ${className}`.trim()}
      style={{ '--pixel-button-image': `url(${asset})`, ...controlPartVars(parts, 0.86) } as CSSProperties}
      {...props}
    >
      <span className="pixel-control-piece pixel-control-piece-left" aria-hidden="true" />
      <span className="pixel-control-content">{children}</span>
      <span className="pixel-control-piece pixel-control-piece-right" aria-hidden="true" />
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
  const style = {
    '--pixel-input-image': `url(${multiline ? pixelUi2Assets.input.textarea : pixelUi2Assets.input.command})`,
    ...controlPartVars(pixelUi2Assets.part.control.command),
  } as CSSProperties;

  if (multiline) {
    return (
      <textarea
        className={`pixel-input pixel-input-multiline ${className}`.trim()}
        style={style}
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
      style={style}
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
    <select
      className={`pixel-select ${className}`.trim()}
      style={{ '--pixel-select-image': `url(${pixelUi2Assets.input.select})`, ...controlPartVars(pixelUi2Assets.part.control.select) } as CSSProperties}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
    >
      {children}
    </select>
  );
}

export function PixelBadge({ status, children, className = '' }: { status: PixelStatus | string; children: ReactNode; className?: string }) {
  const parts = getBadgeParts(status);
  return (
    <span
      className={`pixel-badge pixel-badge-${status} ${className}`.trim()}
      style={{ '--pixel-badge-image': `url(${getBadgeAsset(status)})`, ...controlPartVars(parts, 0.76) } as CSSProperties}
    >
      <span className="pixel-control-piece pixel-control-piece-left" aria-hidden="true" />
      <span className="pixel-control-content">{children}</span>
      <span className="pixel-control-piece pixel-control-piece-right" aria-hidden="true" />
    </span>
  );
}

export function PixelChip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`pixel-chip ${className}`.trim()}
      style={{ '--pixel-chip-image': `url(${pixelUi2Assets.badge.chip})`, ...controlPartVars(pixelUi2Assets.part.control.chip, 0.76) } as CSSProperties}
    >
      <span className="pixel-control-piece pixel-control-piece-left" aria-hidden="true" />
      <span className="pixel-control-content">{children}</span>
      <span className="pixel-control-piece pixel-control-piece-right" aria-hidden="true" />
    </span>
  );
}

export function PixelIcon({ name, label, size = 28, className = '' }: { name: PixelIconName; label?: string; size?: number; className?: string }) {
  return (
    <span
      className={`pixel-icon pixel-icon-${name} ${className}`.trim()}
      style={{ '--pixel-icon-size': `${size}px`, '--pixel-icon-image': `url(${getIconAsset(name)})` } as CSSProperties}
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
  const statusAsset = status === 'needs_review' ? 'needs-review' : status === 'running' ? 'running' : status === 'error' ? 'error' : 'idle';

  return (
    <PixelAvatarFrame status={status} label={`${name}${role ? `, ${role}` : ''}`} className={className}>
      <div className="pixel-avatar-safe-area">
        {icon ?? (
          <span
            className={`pixel-avatar-image pixel-avatar-image-${statusAsset}`}
            style={{ '--pixel-avatar-image': `url(${getAvatarAsset(status)})` } as CSSProperties}
            aria-hidden="true"
          />
        )}
      </div>
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
    <div
      className={`pixel-avatar pixel-avatar-frame pixel-avatar-${status} ${className}`.trim()}
      style={{ '--pixel-avatar-rune': `url(${pixelUi2Assets.icon.rune})` } as CSSProperties}
      aria-label={label}
    >
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
      style={{ '--pixel-mascot-size': `${size}px`, '--pixel-mascot-image': `url(${getMascotAsset(state)})` } as CSSProperties}
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
            <span
              className="pixel-log-marker"
              style={{ '--pixel-log-marker': `url(${pixelUi2Assets.icon.marker})` } as CSSProperties}
              aria-hidden="true"
            />
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
    <section
      className="pixel-truth-strip"
      style={{ '--pixel-truth-image': `url(${pixelUi2Assets.frame.darkPanel})` } as CSSProperties}
      aria-label="Integration truth"
    >
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
      style={{ '--pixel-command-image': `url(${pixelUi2Assets.frame.command})` } as CSSProperties}
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

function getBadgeAsset(status: PixelStatus | string) {
  if (status === 'running' || status === 'thinking' || status === 'real' || status === 'available') return pixelUi2Assets.badge.running;
  if (status === 'needs_review' || status === 'required' || status === 'auto' || status === 'mock' || status === 'fallback') {
    return pixelUi2Assets.badge.review;
  }
  if (status === 'error' || status === 'unavailable' || status === 'blocked') return pixelUi2Assets.badge.error;
  if (status === 'approved' || status === 'success') return pixelUi2Assets.badge.success;
  if (status === 'unchecked') return pixelUi2Assets.badge.warning;
  return pixelUi2Assets.badge.idle;
}

function panelPartVars(parts: ReturnType<typeof panelPartShape>, compact = false) {
  const borderScale = compact ? 0.78 : 1;
  const ornamentScale = compact ? 0.72 : 1;
  const scaled = (value: number, scale: number) => `${Math.max(1, Math.round(value * scale))}px`;

  return {
    '--pixel-panel-corner-top-left': `url(${parts.topLeft})`,
    '--pixel-panel-edge-top': `url(${parts.top})`,
    '--pixel-panel-corner-top-right': `url(${parts.topRight})`,
    '--pixel-panel-edge-right': `url(${parts.right})`,
    '--pixel-panel-corner-bottom-right': `url(${parts.bottomRight})`,
    '--pixel-panel-edge-bottom': `url(${parts.bottom})`,
    '--pixel-panel-corner-bottom-left': `url(${parts.bottomLeft})`,
    '--pixel-panel-edge-left': `url(${parts.left})`,
    '--pixel-panel-ornament': `url(${parts.ornament})`,
    '--pixel-panel-center': `url(${parts.center})`,
    '--pixel-panel-nine-slice': `url(${parts.nineSlice})`,
    '--pixel-panel-border-top': scaled(parts.border.top, borderScale),
    '--pixel-panel-border-right': scaled(parts.border.right, borderScale),
    '--pixel-panel-border-bottom': scaled(parts.border.bottom, borderScale),
    '--pixel-panel-border-left': scaled(parts.border.left, borderScale),
    '--pixel-panel-ornament-width': scaled(parts.ornamentLayout.width, ornamentScale),
    '--pixel-panel-ornament-height': scaled(parts.ornamentLayout.height, ornamentScale),
    '--pixel-panel-ornament-top': parts.ornamentLayout.top,
    '--pixel-panel-ornament-right': parts.ornamentLayout.right,
    '--pixel-panel-ornament-left': parts.ornamentLayout.left,
    '--pixel-panel-ornament-transform': parts.ornamentLayout.transform,
  };
}

function controlPartVars(parts: ReturnType<typeof controlPartShape>, scale = 1) {
  const scaled = (value: number) => `${Math.max(1, Math.round(value * scale))}px`;

  return {
    '--pixel-control-left': `url(${parts.left})`,
    '--pixel-control-middle': `url(${parts.middle})`,
    '--pixel-control-right': `url(${parts.right})`,
    '--pixel-control-left-width': scaled(parts.metrics.left),
    '--pixel-control-middle-width': scaled(parts.metrics.middle),
    '--pixel-control-right-width': scaled(parts.metrics.right),
    '--pixel-control-height': scaled(parts.metrics.height),
  };
}

function panelPartShape() {
  return pixelUi2Assets.part.panel.parchment;
}

function controlPartShape() {
  return pixelUi2Assets.part.control.primary;
}

function getButtonParts(tone: PixelTone) {
  if (tone === 'secondary') return pixelUi2Assets.part.control.secondary;
  if (tone === 'success') return pixelUi2Assets.part.control.success;
  if (tone === 'danger') return pixelUi2Assets.part.control.danger;
  if (tone === 'ghost') return pixelUi2Assets.part.control.ghost;
  return pixelUi2Assets.part.control.primary;
}

function getBadgeParts(status: PixelStatus | string) {
  if (status === 'running' || status === 'thinking' || status === 'real' || status === 'available') return pixelUi2Assets.part.control.badgeIdle;
  if (status === 'needs_review' || status === 'required' || status === 'auto' || status === 'mock' || status === 'fallback') {
    return pixelUi2Assets.part.control.badgeReview;
  }
  if (status === 'error' || status === 'unavailable' || status === 'blocked') return pixelUi2Assets.part.control.badgeReview;
  if (status === 'approved' || status === 'success') return pixelUi2Assets.part.control.badgeIdle;
  if (status === 'unchecked') return pixelUi2Assets.part.control.badgeIdle;
  return pixelUi2Assets.part.control.badgeIdle;
}

function getIconAsset(name: PixelIconName) {
  const assets = pixelUi2Assets.icon;
  const map: Record<PixelIconName, string> = {
    'guild-hall': assets.guildHall,
    'quest-board': assets.questBoard,
    review: assets.review,
    quest: assets.quest,
    'quest-log': assets.questLog,
    report: assets.report,
    companion: assets.companion,
    settings: assets.settings,
    diagnostics: assets.diagnostics,
    'bridge-real': assets.bridgeReal,
    'bridge-mock': assets.bridgeMock,
    'bridge-auto': assets.bridgeAuto,
    'hermes-available': assets.hermesAvailable,
    'hermes-unavailable': assets.hermesUnavailable,
    'no-fallback': assets.noFallback,
    returned: assets.returned,
    approved: assets.approved,
    revise: assets.revise,
    error: assets.error,
    warning: assets.warning,
    search: assets.search,
    close: assets.close,
    minimize: assets.minimize,
    maximize: assets.maximize,
    'dropdown-arrow': assets.dropdownArrow,
    chevron: assets.chevron,
    plus: assets.plus,
    send: assets.send,
    document: assets.document,
    scroll: assets.scroll,
    seal: assets.seal,
    'feather-pen': assets.featherPen,
    spark: assets.spark,
  };
  return map[name];
}

function getAvatarAsset(status: PixelStatus | string) {
  if (status === 'running') return pixelUi2Assets.avatar.running;
  if (status === 'thinking') return pixelUi2Assets.avatar.thinking;
  if (status === 'needs_review') return pixelUi2Assets.avatar.needsReview;
  if (status === 'error' || status === 'blocked') return pixelUi2Assets.avatar.error;
  if (status === 'approved') return pixelUi2Assets.avatar.approved;
  return pixelUi2Assets.avatar.idle;
}

function getMascotAsset(state: 'idle' | 'running' | 'needs_review' | 'error') {
  if (state === 'running') return pixelUi2Assets.mascot.running;
  if (state === 'needs_review') return pixelUi2Assets.mascot.needsReview;
  if (state === 'error') return pixelUi2Assets.mascot.error;
  return pixelUi2Assets.mascot.idle;
}

export { pixelUi2Assets };
