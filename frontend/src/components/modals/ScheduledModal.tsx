'use strict';
import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  Pause,
  Bell,
  BellRing,
  Volume2,
  Sparkles,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendWebPushNotification,
  playNotificationChime,
} from '@/lib/pushNotifications';

interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  target: 'chat' | 'compiler' | 'system';
  active: boolean;
  pushEnabled?: boolean;
  lastRun?: string;
  nextRun: string;
}

interface ScheduledModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunPrompt?: (prompt: string) => void;
}

export const ScheduledModal: React.FC<ScheduledModalProps> = ({
  isOpen,
  onClose,
  onRunPrompt,
}) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([
    {
      id: 'task-1',
      name: 'Daily Developer Morning Briefing',
      schedule: 'Every day at 09:00 AM UTC',
      prompt: 'Summarize today top AI engineering news, GitHub trending repos in Python & Rust, and compile priority checklist.',
      target: 'chat',
      active: true,
      pushEnabled: true,
      lastRun: 'Today at 09:00 AM',
      nextRun: 'Tomorrow at 09:00 AM',
    },
    {
      id: 'task-2',
      name: 'Nightly Code Health & Security Audit',
      schedule: 'Daily at 12:00 AM UTC',
      prompt: 'Scan active workspace code for deprecated dependencies, potential security exploits, and performance bottlenecks.',
      target: 'compiler',
      active: true,
      pushEnabled: true,
      lastRun: 'Yesterday at 12:00 AM',
      nextRun: 'Tonight at 12:00 AM',
    },
    {
      id: 'task-3',
      name: 'PostgreSQL Database Health Check',
      schedule: 'Every 6 hours',
      prompt: 'Execute connection pool diagnostics, verify query latency under 50ms, and optimize active session indexes.',
      target: 'system',
      active: false,
      pushEnabled: true,
      lastRun: '6 hours ago',
      nextRun: 'Paused',
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskSchedule, setNewTaskSchedule] = useState('Daily at 09:00 AM UTC');
  const [newTaskPrompt, setNewTaskPrompt] = useState('');
  const [lastExecutedMsg, setLastExecutedMsg] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>('default');

  useEffect(() => {
    if (isOpen) {
      setNotificationStatus(getNotificationPermission());
      // Try to load saved tasks from backend
      fetch('/api/scheduled/tasks')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.tasks && data.tasks.length > 0) {
            setTasks(
              data.tasks.map((t: any) => ({
                id: t.id,
                name: t.name,
                schedule: t.schedule,
                prompt: t.prompt,
                target: t.target || 'chat',
                active: t.active !== false,
                pushEnabled: t.push_enabled !== false,
                lastRun: t.last_run || t.lastRun,
                nextRun: t.next_run || t.nextRun || 'Scheduled',
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPushPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (granted) {
      setLastExecutedMsg('Web Push & FMC notifications activated! Desktop alerts enabled.');
      sendWebPushNotification({
        title: '⚡ Phantom AI Push Connected',
        body: 'Real-Time Web Push & FMC automations are now active.',
        playSound: true,
      });
      setTimeout(() => setLastExecutedMsg(null), 4000);
    }
  };

  const handleTestPushNotification = () => {
    playNotificationChime('schedule');
    sendWebPushNotification({
      title: '🔔 Phantom Autonomous Trigger Test',
      body: 'Web Push & FMC notification engine is operating normally.',
      playSound: false,
    });
    setLastExecutedMsg('Test push notification dispatched to browser & desktop!');
    setTimeout(() => setLastExecutedMsg(null), 3500);
  };

  const handleToggleActive = async (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, active: !t.active, nextRun: !t.active ? 'In 1 hour' : 'Paused' } : t
    );
    setTasks(updated);

    const task = updated.find((t) => t.id === id);
    if (task) {
      fetch(`/api/scheduled/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: task.active, nextRun: task.nextRun }),
      }).catch(() => {});
    }
  };

  const handleTogglePush = (id: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === id ? { ...t, pushEnabled: !(t.pushEnabled !== false) } : t
      )
    );
  };

  const handleDelete = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
    fetch(`/api/scheduled/tasks/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleRunNow = (task: ScheduledTask) => {
    // Send live Web Push Notification
    if (task.pushEnabled !== false) {
      sendWebPushNotification({
        title: `⚡ Phantom Autonomous: ${task.name}`,
        body: task.prompt.slice(0, 120),
        playSound: true,
      });
    } else {
      playNotificationChime('schedule');
    }

    setLastExecutedMsg(`Triggered '${task.name}' & dispatched real-time notification!`);
    onRunPrompt?.(task.prompt);
    setTimeout(() => setLastExecutedMsg(null), 3500);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !newTaskPrompt.trim()) return;

    const newTask: ScheduledTask = {
      id: `task-${Date.now()}`,
      name: newTaskName.trim(),
      schedule: newTaskSchedule,
      prompt: newTaskPrompt.trim(),
      target: 'chat',
      active: true,
      pushEnabled: true,
      nextRun: 'Scheduled for next interval',
    };

    setTasks([newTask, ...tasks]);
    setNewTaskName('');
    setNewTaskPrompt('');
    setIsCreating(false);

    // Persist to backend
    fetch('/api/scheduled/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    }).catch(() => {});

    // Notify user
    sendWebPushNotification({
      title: '✨ New Schedule Created',
      body: `"${newTask.name}" scheduled (${newTask.schedule}).`,
      playSound: true,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl h-[85vh] max-h-[680px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-white shadow-mono-subtle">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Scheduled Tasks & Cron Automations</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Automated prompt triggers, nightly audits, and recurrent tasks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Web Push / FMC Notification Status Ribbon */}
        <div className="px-5 py-3 border-b border-zinc-850 bg-zinc-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {notificationStatus === 'granted' ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    Real-Time Web Push & FMC Active
                  </span>
                  <p className="text-[11px] text-zinc-400 truncate">Desktop & mobile push alerts trigger on scheduled execution</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    Push Notifications Disabled
                  </span>
                  <p className="text-[11px] text-zinc-400 truncate">Enable permissions to receive real-time autonomous trigger alerts</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {notificationStatus === 'granted' ? (
              <button
                onClick={handleTestPushNotification}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                title="Send test push notification"
              >
                <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Push Alert</span>
              </button>
            ) : (
              <button
                onClick={handleRequestPushPermission}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-mono-subtle active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Web Push</span>
              </button>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="p-3.5 border-b border-zinc-850 flex items-center justify-between bg-zinc-950">
          <span className="text-xs text-zinc-400 font-mono">
            Active Schedules: <strong className="text-white">{tasks.filter((t) => t.active).length}</strong> / {tasks.length}
          </span>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCreating ? 'Cancel' : 'New Schedule'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-zinc-950">
          {lastExecutedMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{lastExecutedMsg}</span>
            </div>
          )}

          {/* Form to Create New Schedule */}
          {isCreating && (
            <form
              onSubmit={handleCreateTask}
              className="p-4 rounded-2xl bg-zinc-900 border border-white/20 space-y-3 animate-in fade-in duration-150"
            >
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Create New Scheduled Automation</h4>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-semibold">Task Name</label>
                <input
                  type="text"
                  placeholder="e.g. Daily Standup Summary"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  required
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-semibold">Execution Frequency</label>
                <select
                  value={newTaskSchedule}
                  onChange={(e) => setNewTaskSchedule(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans"
                >
                  <option value="Daily at 09:00 AM UTC">Daily at 09:00 AM UTC</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Every hour">Every hour</option>
                  <option value="Every Monday at 08:00 AM">Every Monday at 08:00 AM</option>
                  <option value="Nightly at 12:00 AM">Nightly at 12:00 AM</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-semibold">Prompt / Instructions to Execute</label>
                <textarea
                  rows={2}
                  placeholder="Enter the prompt or code command to trigger..."
                  value={newTaskPrompt}
                  onChange={(e) => setNewTaskPrompt(e.target.value)}
                  required
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          )}

          {/* Task List */}
          {tasks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Clock className="w-8 h-8 text-zinc-800 mx-auto" />
              <p className="text-xs font-semibold text-zinc-300">No scheduled tasks</p>
              <p className="text-[11px] text-zinc-500">Click New Schedule to automate AI workflows.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        task.active ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-600'
                      }`}
                    />
                    <h4 className="text-xs font-bold text-white truncate">{task.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRunNow(task)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      title="Run immediately & dispatch push alert"
                    >
                      <Play className="w-3 h-3 text-white" />
                      <span className="hidden sm:inline">Run Now</span>
                    </button>
                    <button
                      onClick={() => handleTogglePush(task.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        task.pushEnabled !== false
                          ? 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/80'
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                      title={task.pushEnabled !== false ? 'Push notifications active' : 'Push notifications disabled'}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(task.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      title={task.active ? 'Pause schedule' : 'Activate schedule'}
                    >
                      {task.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Delete schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 font-sans line-clamp-2">{task.prompt}</p>

                <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 font-mono">
                  <span>Frequency: {task.schedule}</span>
                  <span>Next: {task.nextRun}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 flex items-center justify-between flex-shrink-0 bg-zinc-950">
          <span className="text-[11px] text-zinc-500 font-mono">Phantom AI Autonomous Scheduler • FMC Push Engine</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
