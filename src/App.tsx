import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CirclePause,
  ClipboardList,
  ExternalLink,
  FileText,
  Flag,
  Hammer,
  MessageSquare,
  RefreshCcw,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useBridgeSnapshot } from './hooks/useBridgeSnapshot';
import type { Agent, ReportCard, Task } from './types';

const isPetWindowMode = () => new URLSearchParams(window.location.search).get('mode') === 'pet';

async function focusGuildHallWindow() {
  if (!('__TAURI_INTERNALS__' in window)) return false;

  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const mainWindow = await WebviewWindow.getByLabel('main');
  if (!mainWindow) return false;

  await mainWindow.show();
  await mainWindow.unminimize();
  await mainWindow.setFocus();
  return true;
}

const statusLabel: Record<string, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  running: 'Running',
  blocked: 'Blocked',
  needs_review: 'Needs Review',
  error: 'Error',
  created: 'Created',
  assigned: 'Assigned',
  approved: 'Approved',
};

const roleIcon = {
  Researcher: Search,
  Builder: Hammer,
  Reviewer: ShieldCheck,
};

const isActionableReportTask = (task: Task | undefined) => task?.state === 'needs_review' && task.reviewStatus === 'required';

function App() {
  const { snapshot, lastEvent, bridge } = useBridgeSnapshot();
  const [activeView, setActiveView] = useState<'hall' | 'board' | 'review'>('hall');
  const [petOnly] = useState(isPetWindowMode);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [petInput, setPetInput] = useState('Help me prepare a newbro demo brief.');
  const [boardInput, setBoardInput] = useState('');
  const [boardGoals, setBoardGoals] = useState('');
  const [boardNonGoals, setBoardNonGoals] = useState('');
  const [boardContext, setBoardContext] = useState('');
  const [boardDefinitionOfDone, setBoardDefinitionOfDone] = useState('');
  const [boardAssignee, setBoardAssignee] = useState(snapshot.activeProfileId);
  const [revisionText, setRevisionText] = useState('Make it shorter for a 5 minute demo.');

  const activeAgent = snapshot.agents.find((agent) => agent.id === snapshot.activeProfileId) ?? snapshot.agents[0];
  const tasks = snapshot.tasks;
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0],
    [selectedTaskId, tasks],
  );
  const activeQuest = tasks.find((task) => task.assigneeId === activeAgent.id && !['approved', 'needs_review'].includes(task.state));
  const pendingReports = snapshot.reports.filter((report) => {
    const task = tasks.find((item) => item.id === report.taskId);
    return isActionableReportTask(task);
  });

  function createPetQuest() {
    if (!petInput.trim()) return;
    const taskId = bridge.createTask({ brief: petInput.trim(), assigneeId: activeAgent.id, type: 'pet' });
    setSelectedTaskId(taskId);
    setActiveView('board');
    setPetInput('');
  }

  function createBoardQuest() {
    if (!boardInput.trim()) return;
    const taskId = bridge.createTask({
      brief: boardInput.trim(),
      goals: boardGoals.trim() || undefined,
      nonGoals: boardNonGoals.trim() || undefined,
      context: boardContext.trim() || undefined,
      definitionOfDone: boardDefinitionOfDone.trim() || undefined,
      assigneeId: boardAssignee,
      type: 'quest_board',
    });
    setSelectedTaskId(taskId);
    setBoardInput('');
    setBoardGoals('');
    setBoardNonGoals('');
    setBoardContext('');
    setBoardDefinitionOfDone('');
  }

  const openHall = async () => {
    const focusedNativeWindow = await focusGuildHallWindow().catch(() => false);
    if (!focusedNativeWindow) {
      setActiveView('hall');
    }
  };

  if (petOnly) {
    return (
      <div className="pet-window-shell">
        <PetPanel
          activeAgent={activeAgent}
          agents={snapshot.agents}
          pendingCount={pendingReports.length}
          petInput={petInput}
          onPetInput={setPetInput}
          onCreateQuest={createPetQuest}
          onProfileChange={(agentId) => {
            bridge.setActiveProfile(agentId);
            setBoardAssignee(agentId);
          }}
          onOpenHall={openHall}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <PetPanel
        activeAgent={activeAgent}
        agents={snapshot.agents}
        pendingCount={pendingReports.length}
        petInput={petInput}
        onPetInput={setPetInput}
        onCreateQuest={createPetQuest}
        onProfileChange={(agentId) => {
          bridge.setActiveProfile(agentId);
          setBoardAssignee(agentId);
        }}
        onOpenHall={openHall}
      />

      <main className="guild-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hermes Guild</p>
            <h1>{activeView === 'hall' ? 'Guild Hall' : activeView === 'board' ? 'Quest Board' : 'Review'}</h1>
          </div>
          <div className="system-strip">
            <span className={`status-dot ${snapshot.systemStatus.gatewayStatus}`} />
            <span>{snapshot.systemStatus.logsSummary}</span>
          </div>
        </header>

        <nav className="tabs" aria-label="Main views">
          <button className={activeView === 'hall' ? 'active' : ''} onClick={() => setActiveView('hall')}>
            <Sparkles size={16} /> Hall
          </button>
          <button className={activeView === 'board' ? 'active' : ''} onClick={() => setActiveView('board')}>
            <ClipboardList size={16} /> Board
          </button>
          <button className={activeView === 'review' ? 'active' : ''} onClick={() => setActiveView('review')}>
            <ScrollText size={16} /> Review
            {pendingReports.length > 0 && <strong>{pendingReports.length}</strong>}
          </button>
          <button className="ghost" onClick={() => bridge.simulateError(selectedTask?.id)} title="Simulate mock bridge error">
            <AlertTriangle size={16} /> Error
          </button>
          <button className="ghost" onClick={() => bridge.simulateBlocked(selectedTask?.id)} title="Simulate mock blocked state">
            <CirclePause size={16} /> Block
          </button>
        </nav>

        {activeView === 'hall' && (
          <GuildHall
            agents={snapshot.agents}
            activeAgent={activeAgent}
            activeQuest={activeQuest}
            pendingReports={pendingReports}
            tasks={tasks}
            onSelectAgent={(agentId) => bridge.setActiveProfile(agentId)}
            onOpenTask={(taskId) => {
              setSelectedTaskId(taskId);
              setActiveView('board');
            }}
            onOpenReview={() => setActiveView('review')}
          />
        )}

        {activeView === 'board' && (
          <QuestBoard
            agents={snapshot.agents}
            tasks={tasks}
            selectedTask={selectedTask}
            boardInput={boardInput}
            boardGoals={boardGoals}
            boardNonGoals={boardNonGoals}
            boardContext={boardContext}
            boardDefinitionOfDone={boardDefinitionOfDone}
            boardAssignee={boardAssignee}
            onBoardInput={setBoardInput}
            onBoardGoals={setBoardGoals}
            onBoardNonGoals={setBoardNonGoals}
            onBoardContext={setBoardContext}
            onBoardDefinitionOfDone={setBoardDefinitionOfDone}
            onBoardAssignee={setBoardAssignee}
            onCreateQuest={createBoardQuest}
            onSelectTask={setSelectedTaskId}
          />
        )}

        {activeView === 'review' && (
          <ReviewChamber
            reports={snapshot.reports}
            tasks={tasks}
            agents={snapshot.agents}
            revisionText={revisionText}
            onRevisionText={setRevisionText}
            onApprove={(reportId) => bridge.approveReport(reportId)}
            onRevise={(reportId) => {
              bridge.requestRevision(reportId, revisionText);
              setActiveView('board');
            }}
          />
        )}

        {lastEvent && (
          <footer className="event-footer">
            <span>{statusLabel[lastEvent.type] ?? lastEvent.type.replaceAll('_', ' ')}</span>
            <time>{new Date(lastEvent.timestamp).toLocaleTimeString()}</time>
          </footer>
        )}
      </main>
    </div>
  );
}

interface PetPanelProps {
  activeAgent: Agent;
  agents: Agent[];
  pendingCount: number;
  petInput: string;
  onPetInput: (value: string) => void;
  onCreateQuest: () => void;
  onProfileChange: (agentId: string) => void;
  onOpenHall: () => void;
}

function PetPanel({
  activeAgent,
  agents,
  pendingCount,
  petInput,
  onPetInput,
  onCreateQuest,
  onProfileChange,
  onOpenHall,
}: PetPanelProps) {
  const Icon = roleIcon[activeAgent.role];

  return (
    <aside className={`pet-panel ${activeAgent.status}`}>
      <div className="drag-strip" data-tauri-drag-region>
        Pet Mode
      </div>
      <div className="pet-avatar" aria-label={`${activeAgent.name} is ${statusLabel[activeAgent.status]}`}>
        <Icon size={44} />
        <span className="pulse-ring" />
      </div>
      <div className="pet-title">
        <p>{activeAgent.role}</p>
        <h2>{activeAgent.name}</h2>
        <span>{statusLabel[activeAgent.status]}</span>
      </div>
      <select value={activeAgent.id} onChange={(event) => onProfileChange(event.target.value)} aria-label="Active profile">
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name} - {agent.role}
          </option>
        ))}
      </select>
      <textarea
        value={petInput}
        onChange={(event) => onPetInput(event.target.value)}
        placeholder="What should this agent do?"
        rows={4}
      />
      <div className="pet-actions">
        <button onClick={onCreateQuest}>
          <MessageSquare size={16} /> Send
        </button>
        <button className="secondary" onClick={onOpenHall}>
          <ExternalLink size={16} /> Hall
        </button>
      </div>
      {pendingCount > 0 && <div className="return-card">{pendingCount} quest report waiting</div>}
    </aside>
  );
}

interface GuildHallProps {
  agents: Agent[];
  activeAgent: Agent;
  activeQuest?: Task;
  pendingReports: ReportCard[];
  tasks: Task[];
  onSelectAgent: (agentId: string) => void;
  onOpenTask: (taskId: string) => void;
  onOpenReview: () => void;
}

function GuildHall({ agents, activeAgent, activeQuest, pendingReports, tasks, onSelectAgent, onOpenTask, onOpenReview }: GuildHallProps) {
  return (
    <section className="view-grid hall-grid">
      <div className="panel hero-panel">
        <p className="eyebrow">Active Profile</p>
        <div className="hero-row">
          <div>
            <h2>{activeAgent.name}</h2>
            <p>{activeAgent.role} configured signals: {activeAgent.traits.join(', ')}</p>
          </div>
          <span className={`state-pill ${activeAgent.status}`}>{statusLabel[activeAgent.status]}</span>
        </div>
        <div className="quest-focus">
          <Flag size={18} />
          {activeQuest ? (
            <button onClick={() => onOpenTask(activeQuest.id)}>
              {activeQuest.title}
              <ChevronRight size={16} />
            </button>
          ) : (
            <span>No active quest for this profile.</span>
          )}
        </div>
      </div>

      <div className="panel review-callout">
        <p className="eyebrow">Pending Review</p>
        <strong>{pendingReports.length}</strong>
        <button onClick={onOpenReview}>
          <ScrollText size={16} /> Open Reports
        </button>
      </div>

      <div className="agent-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} active={agent.id === activeAgent.id} onSelect={() => onSelectAgent(agent.id)} />
        ))}
      </div>

      <div className="panel recent-panel">
        <p className="eyebrow">Recent Quests</p>
        {tasks.length === 0 ? (
          <p className="muted">Create a quest from the pet to start the loop.</p>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <button key={task.id} className="task-row" onClick={() => onOpenTask(task.id)}>
              <span>{task.title}</span>
              <small>{statusLabel[task.state]}</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function AgentCard({ agent, active, onSelect }: { agent: Agent; active: boolean; onSelect: () => void }) {
  const Icon = roleIcon[agent.role];
  return (
    <article className={`agent-card ${active ? 'active' : ''}`}>
      <div className="agent-card-header">
        <Icon size={22} />
        <button onClick={onSelect}>{active ? 'Active Pet' : 'Assign Pet'}</button>
      </div>
      <h3>{agent.name}</h3>
      <p>{agent.role}</p>
      <div className={`state-pill ${agent.status}`}>{statusLabel[agent.status]}</div>
      <dl>
        <dt>Strong</dt>
        <dd>{agent.traits.join(', ')}</dd>
        <dt>Best for</dt>
        <dd>{agent.bestFor}</dd>
        <dt>Equipment</dt>
        <dd>{agent.equipment.join(', ')}</dd>
      </dl>
    </article>
  );
}

interface QuestBoardProps {
  agents: Agent[];
  tasks: Task[];
  selectedTask?: Task;
  boardInput: string;
  boardGoals: string;
  boardNonGoals: string;
  boardContext: string;
  boardDefinitionOfDone: string;
  boardAssignee: string;
  onBoardInput: (value: string) => void;
  onBoardGoals: (value: string) => void;
  onBoardNonGoals: (value: string) => void;
  onBoardContext: (value: string) => void;
  onBoardDefinitionOfDone: (value: string) => void;
  onBoardAssignee: (value: string) => void;
  onCreateQuest: () => void;
  onSelectTask: (taskId: string) => void;
}

function QuestBoard({
  agents,
  tasks,
  selectedTask,
  boardInput,
  boardGoals,
  boardNonGoals,
  boardContext,
  boardDefinitionOfDone,
  boardAssignee,
  onBoardInput,
  onBoardGoals,
  onBoardNonGoals,
  onBoardContext,
  onBoardDefinitionOfDone,
  onBoardAssignee,
  onCreateQuest,
  onSelectTask,
}: QuestBoardProps) {
  return (
    <section className="board-layout">
      <div className="panel intake-panel">
        <p className="eyebrow">Direct Assignment</p>
        <textarea
          value={boardInput}
          onChange={(event) => onBoardInput(event.target.value)}
          placeholder="What should this agent do?"
          rows={3}
        />
        <details className="advanced-intake">
          <summary>Advanced brief</summary>
          <label>
            Goals
            <textarea value={boardGoals} onChange={(event) => onBoardGoals(event.target.value)} rows={2} />
          </label>
          <label>
            Non-goals
            <textarea value={boardNonGoals} onChange={(event) => onBoardNonGoals(event.target.value)} rows={2} />
          </label>
          <label>
            Context
            <textarea value={boardContext} onChange={(event) => onBoardContext(event.target.value)} rows={2} />
          </label>
          <label>
            Definition of done
            <textarea value={boardDefinitionOfDone} onChange={(event) => onBoardDefinitionOfDone(event.target.value)} rows={2} />
          </label>
        </details>
        <div className="inline-controls">
          <select value={boardAssignee} onChange={(event) => onBoardAssignee(event.target.value)} aria-label="Quest assignee">
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} - {agent.role}
              </option>
            ))}
          </select>
          <button onClick={onCreateQuest}>
            <Flag size={16} /> Create Quest
          </button>
        </div>
      </div>

      <div className="panel task-list">
        <p className="eyebrow">Quest List</p>
        {tasks.length === 0 ? (
          <p className="muted">No quests yet.</p>
        ) : (
          tasks.map((task) => (
            <button key={task.id} className={selectedTask?.id === task.id ? 'selected' : ''} onClick={() => onSelectTask(task.id)}>
              <span>{task.title}</span>
              <small>{statusLabel[task.state]}</small>
            </button>
          ))
        )}
      </div>

      <TaskDetail task={selectedTask} agent={agents.find((agent) => agent.id === selectedTask?.assigneeId)} />
    </section>
  );
}

function TaskDetail({ task, agent }: { task?: Task; agent?: Agent }) {
  if (!task) {
    return (
      <div className="panel task-detail empty">
        <FileText size={28} />
        <p>Select or create a quest to inspect its timeline.</p>
      </div>
    );
  }

  return (
    <article className="panel task-detail">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Task Detail</p>
          <h2>{task.title}</h2>
          <p>{task.brief}</p>
        </div>
        <span className={`state-pill ${task.state}`}>{statusLabel[task.state]}</span>
      </div>
      <div className="progress-track" aria-label={`Progress ${task.progress}%`}>
        <span style={{ width: `${task.progress}%` }} />
      </div>
      <div className="detail-meta">
        <span>Assignee: {agent ? `${agent.name} / ${agent.role}` : task.assigneeId}</span>
        <span>Review: {task.reviewStatus.replaceAll('_', ' ')}</span>
      </div>
      {(task.goals || task.nonGoals || task.context || task.definitionOfDone) && (
        <div className="brief-notes">
          {task.goals && (
            <div>
              <strong>Goals</strong>
              <p>{task.goals}</p>
            </div>
          )}
          {task.nonGoals && (
            <div>
              <strong>Non-goals</strong>
              <p>{task.nonGoals}</p>
            </div>
          )}
          {task.context && (
            <div>
              <strong>Context</strong>
              <p>{task.context}</p>
            </div>
          )}
          {task.definitionOfDone && (
            <div>
              <strong>Definition of done</strong>
              <p>{task.definitionOfDone}</p>
            </div>
          )}
        </div>
      )}
      {task.error && <div className="error-box">{task.error}</div>}
      <div className="artifact-strip">
        {task.artifacts.map((artifact) => (
          <div key={artifact.id}>
            <strong>{artifact.title}</strong>
            <span>{artifact.description}</span>
          </div>
        ))}
      </div>
      <ol className="timeline">
        {task.timeline.map((event) => (
          <li key={event.id}>
            <span className={`timeline-type ${event.type}`} />
            <div>
              <strong>{event.type.replaceAll('_', ' ')}</strong>
              <p>{event.message}</p>
              <time>
                {new Date(event.timestamp).toLocaleTimeString()} / {event.source}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

interface ReviewChamberProps {
  reports: ReportCard[];
  tasks: Task[];
  agents: Agent[];
  revisionText: string;
  onRevisionText: (value: string) => void;
  onApprove: (reportId: string) => void;
  onRevise: (reportId: string) => void;
}

function ReviewChamber({ reports, tasks, agents, revisionText, onRevisionText, onApprove, onRevise }: ReviewChamberProps) {
  if (reports.length === 0) {
    return (
      <section className="panel empty-review">
        <ScrollText size={32} />
        <h2>No quest reports yet</h2>
        <p>Completed mock work returns here for approve or revise.</p>
      </section>
    );
  }

  return (
    <section className="review-list">
      {reports.map((report) => {
        const task = tasks.find((item) => item.id === report.taskId);
        const agent = agents.find((item) => item.id === report.agentId);
        const locked = !isActionableReportTask(task);

        return (
          <article key={report.id} className={`report-card ${locked ? 'locked' : ''}`}>
            <div className="report-header">
              <div>
                <p className="eyebrow">{agent ? `${agent.name} / ${agent.role}` : report.agentId}</p>
                <h2>{report.title}</h2>
                <p>{report.summary}</p>
              </div>
              <span className={`state-pill ${task?.reviewStatus ?? 'none'}`}>{task?.reviewStatus.replaceAll('_', ' ') ?? 'missing task'}</span>
            </div>
            <div className="reward-grid">
              {report.artifacts.map((artifact) => (
                <div key={artifact.id}>
                  <strong>{artifact.title}</strong>
                  <span>{artifact.description}</span>
                </div>
              ))}
            </div>
            <ReportSection title="Facts" items={report.facts} />
            <ReportSection title="Assumptions" items={report.assumptions} />
            <ReportSection title="Known Gaps" items={report.knownGaps} />
            <ReportSection title="Review Items" items={report.reviewItems} />
            <div className="next-action">
              <strong>Recommended next action</strong>
              <p>{report.recommendedNextAction}</p>
            </div>
            {!locked && (
              <div className="review-actions">
                <textarea value={revisionText} onChange={(event) => onRevisionText(event.target.value)} rows={2} />
                <button onClick={() => onApprove(report.id)}>
                  <Check size={16} /> Approve
                </button>
                <button className="secondary" onClick={() => onRevise(report.id)}>
                  <RefreshCcw size={16} /> Revise
                </button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ReportSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="report-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
