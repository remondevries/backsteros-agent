import type { RunFixtureId, RunViewModel } from "../types";

export interface RunFixture {
  id: RunFixtureId;
  label: string;
  userMessage: string;
  run: RunViewModel;
}

const LINEAR_ISSUES = [
  {
    id: "issue-fin-248",
    identifier: "FIN-248",
    title: "Payment: Innova Energie (€ 267,00)",
    status: "Ready to Start",
    stateType: "unstarted",
    priority: 3,
    assigneeName: "remon",
    assigneeId: "eac047ba-fd17-4eab-b97e-016ecb854693",
    assigneeAvatarUrl:
      "https://public.linear.app/d10ef989-a610-4b9e-9275-c9f58e23045e/88493e3d-710b-45a2-b133-8db1e1275ca4/d8082c5e-6657-4677-8d04-5ec23e35a76b",
    projectName: "Personal Financials",
    url: "https://linear.app/example/issue/FIN-248",
  },
  {
    id: "issue-1",
    identifier: "BACK-42",
    title: "Composer should remember vault context between sessions",
    status: "In Progress",
    stateType: "started",
    priority: 2,
    assigneeName: "remon",
    projectName: "BacksterOS Agent",
    url: "https://linear.app/example/issue/BACK-42",
  },
  {
    id: "issue-2",
    identifier: "BACK-17",
    title: "Polish Linear activity cards in chat",
    status: "Todo",
    stateType: "unstarted",
    priority: 4,
    projectName: "BacksterOS Agent",
    url: "https://linear.app/example/issue/BACK-17",
  },
  {
    id: "issue-3",
    identifier: "BACK-9",
    title: "Add attachment preview for pasted screenshots",
    status: "Done",
    stateType: "completed",
    priority: 3,
    url: "https://linear.app/example/issue/BACK-9",
  },
];

const LINEAR_PRIORITY_PREVIEW_ISSUES = [
  {
    id: "issue-priority-0",
    identifier: "PRI-0",
    title: "No priority",
    status: "Todo",
    stateType: "unstarted",
    priority: 0,
    projectName: "Priority preview",
    url: "https://linear.app/example/issue/PRI-0",
  },
  {
    id: "issue-priority-1",
    identifier: "PRI-1",
    title: "Urgent",
    status: "Todo",
    stateType: "unstarted",
    priority: 1,
    projectName: "Priority preview",
    url: "https://linear.app/example/issue/PRI-1",
  },
  {
    id: "issue-priority-2",
    identifier: "PRI-2",
    title: "High",
    status: "Todo",
    stateType: "unstarted",
    priority: 2,
    projectName: "Priority preview",
    url: "https://linear.app/example/issue/PRI-2",
  },
  {
    id: "issue-priority-3",
    identifier: "PRI-3",
    title: "Medium",
    status: "Todo",
    stateType: "unstarted",
    priority: 3,
    projectName: "Priority preview",
    url: "https://linear.app/example/issue/PRI-3",
  },
  {
    id: "issue-priority-4",
    identifier: "PRI-4",
    title: "Low",
    status: "Todo",
    stateType: "unstarted",
    priority: 4,
    projectName: "Priority preview",
    url: "https://linear.app/example/issue/PRI-4",
  },
];

const OBSIDIAN_NOTE_FILES = [
  {
    path: "Projects/BacksterOS Agent.md",
    title: "BacksterOS Agent",
  },
  {
    path: "Daily/2026-06-07.md",
    title: "2026-06-07",
  },
  {
    path: "Letters/Intro to vault search.md",
    title: "Intro to vault search",
  },
  {
    path: "Meetings/Product sync.md",
    title: "Product sync",
  },
  {
    path: "Inbox/Quick capture.md",
    title: "Quick capture",
  },
  {
    path: "Organizations/Acme Corp.md",
    title: "Acme Corp",
  },
  {
    path: "Contacts/Jane Doe.md",
    title: "Jane Doe",
  },
];

const CALENDAR_EVENTS = [
  {
    id: "evt-standup",
    title: "Team standup",
    start: "Today · 9:00 AM",
    end: "9:30 AM",
    calendarName: "Work",
    calendarColor: "#4986e7",
    url: "https://calendar.google.com/event?eid=standup",
  },
  {
    id: "evt-design",
    title: "Design review — Backster composer",
    start: "Today · 2:00 PM",
    end: "3:00 PM",
    calendarName: "Work",
    calendarColor: "#4986e7",
    location: "Zoom",
    url: "https://calendar.google.com/event?eid=design",
  },
  {
    id: "evt-lunch",
    title: "Lunch with Alex",
    start: "Tomorrow · 12:30 PM",
    end: "1:30 PM",
    calendarName: "Personal",
    calendarColor: "#16a765",
  },
  {
    id: "evt-focus",
    title: "Focus block",
    start: "Wed · 10:00 AM",
    end: "12:00 PM",
    calendarName: "Work",
    calendarColor: "#4986e7",
  },
];

const WHOOP_SNAPSHOTS = {
  todayRed: {
    id: "whoop-2026-06-08",
    date: "2026-06-08",
    recoveryScore: 32,
    recoveryState: "RED" as const,
    hrvMs: 45,
    rhrBpm: 62,
    sleepPerformance: 78,
    sleepDuration: "7h 2m",
    strainScore: 5.8,
    workoutsCount: 2,
  },
  todayGreen: {
    id: "whoop-2026-06-07",
    date: "2026-06-07",
    recoveryScore: 84,
    recoveryState: "GREEN" as const,
    hrvMs: 72,
    rhrBpm: 54,
    sleepPerformance: 92,
    sleepDuration: "8h 10m",
    strainScore: 12.4,
    workoutsCount: 1,
  },
  todayYellow: {
    id: "whoop-2026-06-06",
    date: "2026-06-06",
    recoveryScore: 58,
    recoveryState: "YELLOW" as const,
    hrvMs: 58,
    rhrBpm: 59,
    sleepPerformance: 71,
    sleepDuration: "6h 45m",
    strainScore: 8.2,
    workoutsCount: 0,
  },
};

export const RUN_FIXTURES: RunFixture[] = [
  {
    id: "linear-search-running",
    label: "Searching",
    userMessage: "Find open issues about the composer",
    run: {
      runId: "preview-linear-search-running",
      status: "running",
      text: "I'll look through Linear for open composer-related issues.",
      steps: [
        {
          stepId: "step-search",
          kind: "linear",
          label: "Searching Linear…",
          status: "running",
        },
      ],
      entities: [],
      approvals: [],
      expanded: true,
    },
  },
  {
    id: "linear-search-done",
    label: "Results",
    userMessage: "Show me all Linear priority icons",
    run: {
      runId: "preview-linear-search-done",
      status: "finished",
      durationMs: 4200,
      text: "Here are all five Linear priority levels so you can compare the icons.",
      steps: [
        {
          stepId: "step-search",
          kind: "linear",
          label: "Linear search completed",
          status: "completed",
          durationMs: 1800,
        },
      ],
      entities: [{ type: "linear_issues", items: LINEAR_PRIORITY_PREVIEW_ISSUES }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "linear-read-issue",
    label: "Read issue",
    userMessage: "What's in BACK-42?",
    run: {
      runId: "preview-linear-read",
      status: "finished",
      durationMs: 3100,
      text: "BACK-42 tracks keeping vault context between sessions. It's currently in progress.",
      steps: [
        {
          stepId: "step-read",
          kind: "linear",
          label: "Read Linear issue BACK-42",
          status: "completed",
          durationMs: 1200,
        },
      ],
      entities: [{ type: "linear_issues", items: [LINEAR_ISSUES[0]] }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "linear-create",
    label: "Create",
    userMessage: "Create a Linear issue for polishing the activity timeline",
    run: {
      runId: "preview-linear-create",
      status: "finished",
      durationMs: 5400,
      text: "Created a new issue for the activity timeline polish work.",
      steps: [
        {
          stepId: "step-create",
          kind: "linear",
          label: "Created Linear issue",
          status: "completed",
          durationMs: 2400,
        },
      ],
      entities: [
        {
          type: "linear_issues",
          items: [
            {
              id: "issue-new",
              identifier: "BACK-108",
              title: "Polish Linear activity cards in chat",
              status: "Todo",
              url: "https://linear.app/example/issue/BACK-108",
            },
          ],
        },
      ],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "linear-multi",
    label: "Multi-step",
    userMessage: "Summarize what's in flight for Backster this week",
    run: {
      runId: "preview-linear-multi",
      status: "finished",
      durationMs: 8900,
      text: "I checked Linear and pulled the issues that look active this week.",
      steps: [
        {
          stepId: "step-search",
          kind: "linear",
          label: "Linear search completed",
          status: "completed",
          durationMs: 1600,
        },
        {
          stepId: "step-read-1",
          kind: "linear",
          label: "Read Linear issue BACK-42",
          status: "completed",
          durationMs: 900,
        },
        {
          stepId: "step-read-2",
          kind: "linear",
          label: "Read Linear issue BACK-17",
          status: "completed",
          durationMs: 850,
        },
      ],
      entities: [{ type: "linear_issues", items: LINEAR_ISSUES }],
      approvals: [],
      expanded: true,
    },
  },
  {
    id: "obsidian-search-running",
    label: "Search",
    userMessage: "Search my vault for notes about the composer UI",
    run: {
      runId: "preview-obsidian-search-running",
      status: "running",
      text: "I'll search your Obsidian vault for composer-related notes.",
      steps: [
        {
          stepId: "step-grep",
          kind: "notes",
          label: 'Searching notes for "composer UI"…',
          status: "running",
        },
      ],
      entities: [],
      approvals: [],
      expanded: true,
    },
  },
  {
    id: "obsidian-search-done",
    label: "Found",
    userMessage: "Search my vault for notes about the composer UI",
    run: {
      runId: "preview-obsidian-search-done",
      status: "finished",
      durationMs: 2800,
      text: "I found a few notes in your vault that mention the composer UI.",
      steps: [
        {
          stepId: "step-grep",
          kind: "notes",
          label: "Search completed",
          status: "completed",
          durationMs: 1100,
        },
      ],
      entities: [{ type: "markdown_files", items: OBSIDIAN_NOTE_FILES.slice(0, 4) }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "obsidian-read",
    label: "Read",
    userMessage: "What does my BacksterOS Agent project note say?",
    run: {
      runId: "preview-obsidian-read",
      status: "finished",
      durationMs: 1900,
      text: "Your project note outlines the local agent, vault path, and chat UI goals.",
      steps: [
        {
          stepId: "step-read",
          kind: "notes",
          label: "Read Projects/BacksterOS Agent.md",
          status: "completed",
          durationMs: 700,
        },
      ],
      entities: [{ type: "markdown_files", items: [OBSIDIAN_NOTE_FILES[0]] }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "obsidian-write",
    label: "Write",
    userMessage: "Add a section to my daily note about today's UI polish",
    run: {
      runId: "preview-obsidian-write",
      status: "finished",
      durationMs: 3600,
      text: "I updated your daily note with a short UI polish summary.",
      steps: [
        {
          stepId: "step-write",
          kind: "notes",
          label: "Wrote Daily/2026-06-07.md",
          status: "completed",
          durationMs: 1400,
        },
      ],
      entities: [
        {
          type: "file_diff",
          path: "Daily/2026-06-07.md",
          summary: "Updated 2026-06-07",
        },
      ],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "obsidian-list",
    label: "List",
    userMessage: "What's in my Projects folder?",
    run: {
      runId: "preview-obsidian-list",
      status: "finished",
      durationMs: 2200,
      text: "Here are the markdown files currently in your Projects folder.",
      steps: [
        {
          stepId: "step-list",
          kind: "notes",
          label: "Listed Projects/",
          status: "completed",
          durationMs: 900,
        },
      ],
      entities: [{ type: "markdown_files", items: OBSIDIAN_NOTE_FILES }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "obsidian-approval",
    label: "Approve",
    userMessage: "Create a new project note for the Linear UI polish",
    run: {
      runId: "preview-obsidian-approval",
      status: "running",
      text: "I drafted a new note and need your approval before writing it to the vault.",
      steps: [
        {
          stepId: "step-write",
          kind: "notes",
          label: "Writing Projects/Linear UI polish.md…",
          status: "running",
        },
      ],
      entities: [],
      approvals: [
        {
          approvalId: "preview-approval-1",
          summary: "Write Projects/Linear UI polish.md",
          action: "write_workspace_file",
          path: "Projects/Linear UI polish.md",
        },
      ],
      expanded: true,
    },
  },
  {
    id: "calendar-search-running",
    label: "Searching",
    userMessage: "What's on my calendar today?",
    run: {
      runId: "preview-calendar-search-running",
      status: "running",
      text: "I'll check your Google Calendar for today's events.",
      steps: [
        {
          stepId: "step-search",
          kind: "calendar",
          label: "Searching calendar…",
          status: "running",
        },
      ],
      entities: [],
      approvals: [],
      expanded: true,
    },
  },
  {
    id: "calendar-search-done",
    label: "Results",
    userMessage: "What's on my calendar today?",
    run: {
      runId: "preview-calendar-search-done",
      status: "finished",
      durationMs: 3600,
      text: "You have four events coming up — two today, one tomorrow, and a focus block on Wednesday.",
      steps: [
        {
          stepId: "step-search",
          kind: "calendar",
          label: "Calendar search completed",
          status: "completed",
          durationMs: 1400,
        },
      ],
      entities: [{ type: "calendar_events", items: CALENDAR_EVENTS }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "calendar-freebusy",
    label: "Availability",
    userMessage: "Am I free tomorrow afternoon?",
    run: {
      runId: "preview-calendar-freebusy",
      status: "finished",
      durationMs: 2900,
      text: "Tomorrow you're free from 1:30 PM until 4:00 PM. Lunch with Alex ends at 1:30 PM and you have no other events that afternoon.",
      steps: [
        {
          stepId: "step-freebusy",
          kind: "calendar",
          label: "Checked availability",
          status: "completed",
          durationMs: 1100,
        },
      ],
      entities: [{ type: "calendar_events", items: [CALENDAR_EVENTS[2]] }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "calendar-create",
    label: "Create",
    userMessage: "Schedule a 30-minute sync with the design team Friday at 11 AM",
    run: {
      runId: "preview-calendar-create",
      status: "finished",
      durationMs: 4800,
      text: "Created the design team sync on your Work calendar.",
      steps: [
        {
          stepId: "step-create",
          kind: "calendar",
          label: "Created calendar event",
          status: "completed",
          durationMs: 2100,
        },
      ],
      entities: [
        {
          type: "calendar_events",
          items: [
            {
              id: "evt-new",
              title: "Design team sync",
              start: "Fri · 11:00 AM",
              end: "11:30 AM",
              calendarName: "Work",
              calendarColor: "#4986e7",
              url: "https://calendar.google.com/event?eid=design-sync",
              created: true,
            },
          ],
        },
      ],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "calendar-multi",
    label: "Multi-step",
    userMessage: "Check my schedule and find a free slot for a 1-hour meeting this week",
    run: {
      runId: "preview-calendar-multi",
      status: "finished",
      durationMs: 7200,
      text: "I listed your events and checked availability. Wednesday 10:00–12:00 is blocked, but you're open Thursday 3:00–5:00 PM.",
      steps: [
        {
          stepId: "step-list",
          kind: "calendar",
          label: "Calendar search completed",
          status: "completed",
          durationMs: 1300,
        },
        {
          stepId: "step-freebusy",
          kind: "calendar",
          label: "Checked availability",
          status: "completed",
          durationMs: 950,
        },
      ],
      entities: [{ type: "calendar_events", items: CALENDAR_EVENTS.slice(0, 3) }],
      approvals: [],
      expanded: true,
    },
  },
  {
    id: "whoop-fetch-running",
    label: "Fetching",
    userMessage: "Update today's daily note with my Whoop sleep, recovery, and strain.",
    run: {
      runId: "preview-whoop-fetch-running",
      status: "running",
      text: "I'll pull today's Whoop snapshot and update your daily note.",
      steps: [
        {
          stepId: "step-whoop",
          kind: "whoop",
          label: "Fetching Whoop today…",
          status: "running",
        },
      ],
      entities: [],
      approvals: [],
      expanded: true,
    },
  },
  {
    id: "whoop-today-done",
    label: "Today",
    userMessage: "What are my Whoop stats for today?",
    run: {
      runId: "preview-whoop-today-done",
      status: "finished",
      durationMs: 4200,
      text: "",
      steps: [
        {
          stepId: "step-whoop",
          kind: "whoop",
          label: "Fetched Whoop today",
          status: "completed",
          durationMs: 1600,
        },
      ],
      entities: [{ type: "whoop_snapshots", items: [WHOOP_SNAPSHOTS.todayRed] }],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "whoop-daily-note",
    label: "Daily note",
    userMessage: "Update today's daily note with my Whoop sleep, recovery, and strain.",
    run: {
      runId: "preview-whoop-daily-note",
      status: "finished",
      durationMs: 5700,
      text: "",
      steps: [
        {
          stepId: "step-whoop",
          kind: "whoop",
          label: "Fetched Whoop today",
          status: "completed",
          durationMs: 1500,
        },
        {
          stepId: "step-write",
          kind: "notes",
          label: "Wrote Daily/2026-06-08.md",
          status: "completed",
          durationMs: 900,
        },
      ],
      entities: [
        { type: "whoop_snapshots", items: [WHOOP_SNAPSHOTS.todayRed] },
        {
          type: "file_diff",
          path: "Daily/2026-06-08.md",
          summary: "Updated sleep, recovery, and strain",
        },
      ],
      approvals: [],
      expanded: false,
    },
  },
  {
    id: "whoop-recovery-states",
    label: "Recovery",
    userMessage: "Show my Whoop recovery over the last three days",
    run: {
      runId: "preview-whoop-recovery-states",
      status: "finished",
      durationMs: 6100,
      text: "Recovery moved from green to yellow to red over the last three days.",
      steps: [
        {
          stepId: "step-whoop",
          kind: "whoop",
          label: "Fetched Whoop history",
          status: "completed",
          durationMs: 1800,
        },
      ],
      entities: [
        {
          type: "whoop_snapshots",
          items: [WHOOP_SNAPSHOTS.todayGreen, WHOOP_SNAPSHOTS.todayYellow, WHOOP_SNAPSHOTS.todayRed],
        },
      ],
      approvals: [],
      expanded: true,
    },
  },
];

export function getRunFixture(id: RunFixtureId): RunFixture {
  const fixture = RUN_FIXTURES.find((item) => item.id === id);
  if (!fixture) {
    throw new Error(`Unknown run fixture: ${id}`);
  }
  return fixture;
}
