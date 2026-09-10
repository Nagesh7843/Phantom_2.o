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

import { api } from '@/lib/api';

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
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskSchedule, setNewTaskSchedule] = useState('Daily at 09:00 AM UTC');
  const [newTaskPrompt, setNewTaskPrompt] = useState('');
  const [lastExecutedMsg, setLastExecutedMsg] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>('default');

  const loadTasksFromDb = async () => {
    setLoading(true);
    try {
      const res = await api.getScheduledTasks();
      if (res && Array.isArray(res.tasks)) {
        setTasks(
          res.tasks.map((t: any) => ({
            id: t.id,
            name: t.name,
            schedule: t.schedule,
            prompt: t.prompt,
            target: t.target || 'chat',
            active: t.active !== false,
            pushEnabled: t.push_enabled !== false && t.pushEnabled !== false,
            lastRun: t.last_run || t.lastRun,
            nextRun: t.next_run || t.nextRun || 'Scheduled for next interval',
          }))
        );
      }
    } catch (e) {
      console.warn('Scheduled tasks DB fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setNotificationStatus(getNotificationPermission());
      loadTasksFromDb();
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
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;

    const newActive = !targetTask.active;
    const newNextRun = newActive ? 'In 1 hour' : 'Paused';

    const updated = tasks.map((t) =>
      t.id === id ? { ...t, active: newActive, nextRun: newNextRun } : t
    );
    setTasks(updated);

    try {
      await api.toggleScheduledTask(id, newActive, newNextRun);
    } catch (e) {
      console.warn('Toggle DB task note:', e);
    }
  };

  const handleTogglePush = async (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;

    const newPush = !(targetTask.pushEnabled !== false);
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, pushEnabled: newPush } : t
    );
    setTasks(updated);

    try {
      await api.saveScheduledTask({
        ...targetTask,
        push_enabled: newPush,
      });
    } catch (e) {
      console.warn('Save push DB note:', e);
    }
  };

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteScheduledTask(id);
    } catch (e) {
      console.warn('Delete DB task note:', e);
    }
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

    const newTaskPayload = {
      id: `task_${Date.now()}`,
      name: newTaskName.trim(),
      schedule: newTaskSchedule,
      prompt: newTaskPrompt.trim(),
      target: 'chat' as const,
      active: true,
      push_enabled: true,
      next_run: 'Scheduled for next interval',
    };

    const optimisticTask: ScheduledTask = {
      id: newTaskPayload.id,
      name: newTaskPayload.name,
      schedule: newTaskPayload.schedule,
      prompt: newTaskPayload.prompt,
      target: newTaskPayload.target,
      active: true,
      pushEnabled: true,
      nextRun: 'Scheduled for next interval',
    };

    setTasks([optimisticTask, ...tasks]);
    setNewTaskName('');
    setNewTaskPrompt('');
    setIsCreating(false);

    try {
      // Save strictly to backend database
      await api.saveScheduledTask(newTaskPayload);
      // Refresh strictly from database
      loadTasksFromDb();
    } catch (e) {
      console.warn('DB Task save note:', e);
    }

    // Notify user
    sendWebPushNotification({
      title: '✨ New Schedule Created in Database',
      body: `"${newTaskPayload.name}" scheduled (${newTaskPayload.schedule}).`,
      playSound: true,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zinc-950 border border-zinc-850 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="px-5 py-4 border-b border-zinc-850/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Scheduled Tasks</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Cancel' : 'New'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message notification if any */}
        {lastExecutedMsg && (
          <div className="mx-4 mt-3 px-3 py-2 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{lastExecutedMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-2.5 custom-scrollbar flex-1 max-h-[480px]">
          {/* Minimal Form to Create New Schedule */}
          {isCreating && (
            <form
              onSubmit={handleCreateTask}
              className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 animate-in fade-in duration-150 mb-3"
            >
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Task Name</label>
                <input
                  type="text"
                  placeholder="e.g. Daily Standup Summary"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  required
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Frequency</label>
                <select
                  value={newTaskSchedule}
                  onChange={(e) => setNewTaskSchedule(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="Daily at 09:00 AM UTC">Daily at 09:00 AM UTC</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Every hour">Every hour</option>
                  <option value="Every Monday at 08:00 AM">Every Monday at 08:00 AM</option>
                  <option value="Nightly at 12:00 AM">Nightly at 12:00 AM</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Prompt to Execute</label>
                <textarea
                  rows={2}
                  placeholder="Enter instructions to automate..."
                  value={newTaskPrompt}
                  onChange={(e) => setNewTaskPrompt(e.target.value)}
                  required
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-mono-subtle transition-all"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          )}

          {/* Minimal Task List */}
          {loading && tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">Loading schedules from database...</div>
          ) : tasks.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="w-6 h-6 text-zinc-700 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">No scheduled tasks in database</p>
              <button
                onClick={() => setIsCreating(true)}
                className="text-xs text-white underline underline-offset-2 hover:text-zinc-300"
              >
                + Create new automation
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850/80 hover:border-zinc-750 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        task.active ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-600'
                      }`}
                    />
                    <h4 className="text-xs font-semibold text-white truncate">{task.name}</h4>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleRunNow(task)}
                      className="p-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium flex items-center gap-1 transition-colors"
                      title="Run now"
                    >
                      <Play className="w-2.5 h-2.5 text-white" />
                      <span>Run</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(task.id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title={task.active ? 'Pause' : 'Resume'}
                    >
                      {task.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2">{task.prompt}</p>

                <div className="pt-1.5 border-t border-zinc-850/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>{task.schedule}</span>
                  <span>{task.active ? task.nextRun : 'Paused'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Minimal Footer */}
        <div className="px-5 py-3 border-t border-zinc-850/80 bg-zinc-950 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="font-mono">
            {tasks.filter((t) => t.active).length} of {tasks.length} active in DB
          </span>
          {notificationStatus !== 'granted' && (
            <button
              onClick={handleRequestPushPermission}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <Bell className="w-3 h-3" />
              <span>Enable notifications</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
