---
name: agent-execution
description: >
  Framework for creating and using agents within business workflows. Use this skill when
  Coach Jr asks about agents, wants to delegate work to subagents, says "agent execution",
  "use agents", "run agents", "create an agent", "business workflow", or wants to
  understand how agents work. Also use it when a task would benefit from parallel agents
  (multi-file scanning, bulk operations, research tasks).
---

# Agent Execution — Business Workflow Agents

This skill teaches Coach Jr how agents work and provides ready-made agent patterns
for his business workflows.

---

## What Are Agents?

Think of agents as specialized assistants that Claude can hire for specific jobs.
Instead of Claude doing everything sequentially, it can spin up multiple agents
that work in parallel — like having a team instead of a single person.

**Real-world analogy:** You're the head coach. You can either scout every player
yourself (slow), or send out 4 assistant coaches to scout 4 divisions simultaneously
(fast). Agents are those assistant coaches.

---

## Agent Types Available

| Agent Type | What It Does | When to Use |
|---|---|---|
| **general-purpose** | Any task — reading, writing, research | Default for most work |
| **Explore** | Fast file/code search across a project | Finding specific code, symbols, patterns |
| **Plan** | Architecture and implementation planning | Before big changes |
| **code-reviewer** | Reviews code for bugs, security, quality | After writing code |

---

## Ready-Made Agent Patterns for Coach Jr

### Pattern 1: Site Scanner (Multi-File Read)

Reads multiple source files in parallel, then synthesizes findings.

**When to use:** Running website-revise-check, auditing the codebase, extracting
template parameters.

**How it works:**
```
Claude spawns 4 agents simultaneously:
  Agent 1 → reads index.tsx, extracts brand values
  Agent 2 → reads auth.tsx, checks security
  Agent 3 → reads register.tsx, validates forms
  Agent 4 → reads nx-shell.tsx, checks nav logic

All 4 run at the same time (parallel).
Claude collects all results and writes the report.
```

**Estimated savings:** 60% faster than reading files one by one.

### Pattern 2: Revision Prompt Builder

Generates Lovable revision prompts from feedback, with each prompt independently
quality-checked.

**When to use:** After Coach Jr gives feedback on the site.

**How it works:**
```
Claude categorizes feedback into page groups.
  Agent 1 → writes Prompt 1 (homepage/content)
  Agent 2 → writes Prompt 2 (auth/registration)
  Agent 3 → writes Prompt 3 (profile/animations)

Each agent gets the relevant source file + feedback.
Claude reviews all prompts, merges, and delivers.
```

### Pattern 3: Template Rebrander

Applies a brand config to the white-label template across all files simultaneously.

**When to use:** When selling the template to a new client.

**How it works:**
```
Claude reads the new brand.ts config.
  Agent 1 → rebrands index.tsx
  Agent 2 → rebrands auth.tsx
  Agent 3 → rebrands register.tsx
  Agent 4 → rebrands sponsors.tsx
  Agent 5 → rebrands nx-shell.tsx

Claude collects all rebranded files.
Sends as Lovable prompts to the new project.
```

### Pattern 4: Competitive Research

Researches competitors, market data, or business intelligence in parallel.

**When to use:** When Coach Jr needs market research, pricing comparison, or
competitor analysis.

**How it works:**
```
Claude identifies 3-5 research angles.
  Agent 1 → searches for competitor league sites
  Agent 2 → researches pricing models for sports leagues
  Agent 3 → finds sponsorship rate benchmarks
  Agent 4 → looks up registration platform alternatives

Claude synthesizes all findings into a report.
```

### Pattern 5: Quality Assurance Pipeline

After code changes, runs multiple quality checks in parallel.

**When to use:** After deploying changes to the NXGEN site.

**How it works:**
```
Claude deploys the code change.
  Agent 1 → checks for broken imports/references
  Agent 2 → validates auth flow security
  Agent 3 → tests form validation logic
  Agent 4 → reviews CSS/layout for mobile

Claude compiles results into pass/fail report.
```

---

## How to Ask for Agents

Coach Jr can trigger agent workflows with natural language:

| What you say | What happens |
|---|---|
| "Scan all the files" | Site Scanner pattern — parallel reads |
| "Check this with agents" | QA Pipeline — parallel quality checks |
| "Research [topic]" | Competitive Research — parallel web searches |
| "Rebrand for [client]" | Template Rebrander — parallel file updates |
| "Use agents to speed this up" | Claude picks the best pattern for the task |

---

## Agent Reports

After agents finish, Claude always delivers a summary showing:

1. **What each agent did** — task, files read, findings
2. **Time saved** — compared to sequential processing
3. **Combined results** — synthesized into one clear deliverable
4. **Next steps** — what to do with the results

---

## Limitations

- Agents can't talk to each other directly — they report back to Claude
- Each agent starts fresh (no memory of previous agents)
- Agents share the session's token budget — more agents = tokens split across them
- Complex multi-step tasks with dependencies should stay sequential
- Agent results need Claude's synthesis — raw agent output isn't the final product

---

## Business Use Cases

### For the League
- **Game night prep:** Agents check schedule, verify team rosters, confirm venue
- **Post-game:** Agents update scores, generate highlights summary, update leaderboards
- **Season planning:** Agents research venues, compare insurance options, draft schedules

### For Selling Templates
- **Client onboarding:** Agents gather client's brand details from multiple sources
- **Customization:** Agents rebrand all files simultaneously
- **Quality check:** Agents verify the rebranded site before delivery

### For Business Operations
- **Invoice processing:** Agents scan, categorize, and summarize invoices
- **Social media:** Agents draft posts for multiple platforms simultaneously
- **Email campaigns:** Agents write personalized emails for different sponsor tiers
