---
name: model-efficiency
description: >
  Evaluates each request and recommends the optimal Claude model for maximum token
  efficiency. Use this skill when Coach Jr asks about model selection, token costs,
  or says "model efficiency", "save tokens", "which model", or "cost optimize".
  Also use it proactively when a task could run on a lighter model without quality loss.
---

# Model Efficiency — Smart Model Routing

This skill helps Coach Jr get the best results at the lowest token cost by matching
each task to the right Claude model tier.

---

## Model Tiers (as of 2026)

| Model | Best For | Relative Cost | Speed |
|---|---|---|---|
| **Haiku** | Simple lookups, formatting, file reads, quick Q&A | Lowest | Fastest |
| **Sonnet** | Code generation, analysis, medium-complexity tasks | Mid | Fast |
| **Opus** | Complex reasoning, multi-step planning, creative work, code review | Highest | Moderate |

---

## Task-to-Model Routing Guide

### Use Haiku (cheapest, fastest)

- Reading a file and summarizing its contents
- Listing files or checking project status
- Simple find-and-replace operations
- Formatting text or converting between formats
- Answering factual questions from known context
- Running a single Lovable read operation (list_files, read_file)
- Generating simple boilerplate code
- Quick math or unit conversions

### Use Sonnet (balanced)

- Writing new components or features
- Bug fixing with moderate complexity
- Code review of single files
- Writing Lovable prompts (revision prompts, feature prompts)
- Building HTML reports or dashboards
- Data analysis with multiple steps
- Skill creation and editing
- Most day-to-day development work

### Use Opus (maximum quality)

- Multi-file architecture decisions
- Complex debugging across multiple systems
- White-label template creation (needs full codebase understanding)
- Security audits and penetration testing
- Writing comprehensive documentation
- Agent orchestration (multi-agent workflows)
- Creative strategy and business planning
- Quality-critical deliverables (client-facing reports, presentations)
- Tasks where getting it wrong costs more than the token savings

---

## Efficiency Tips for Coach Jr

### 1. Batch Similar Tasks
Instead of 5 separate messages asking to fix 5 bugs, send one message with all 5.
One Sonnet call with 5 fixes costs less than 5 separate calls.

### 2. Be Specific Upfront
"Fix the nav link that shows My Profile to logged-out users in nx-shell.tsx line 42"
is cheaper than "something's wrong with the nav" (which requires investigation).

### 3. Use Skills
Skills front-load the instructions so the model doesn't have to figure out the
approach from scratch each time. The website-revise-check skill saves significant
tokens vs. explaining the workflow manually each session.

### 4. Agent Delegation
For research-heavy tasks, delegate to a Haiku agent for gathering, then synthesize
with Sonnet. Example: "Use a Haiku agent to read all 6 source files, then use Sonnet
to write the revision prompts."

---

## Cost Comparison Example

**Task:** "Scan the NXGEN site and write revision prompts"

| Approach | Model | Est. Tokens | Relative Cost |
|---|---|---|---|
| Manual (no skill) | Opus | ~80K | $$$ |
| With website-revise-check skill | Sonnet | ~45K | $$ |
| Skill + agent delegation | Sonnet + Haiku agents | ~35K | $ |

The skill alone cuts cost by ~40%. Adding agent delegation for file reads saves another ~20%.

---

## When to Override

Sometimes the cheapest model isn't the right choice:

- **Client deliverables**: Always use Opus or Sonnet — quality matters
- **Security-sensitive changes**: Use Opus — mistakes are expensive
- **First-time complex tasks**: Use Opus to get it right, then Sonnet for iterations
- **Repetitive known tasks**: Use Haiku — the pattern is established

The goal is not to always use the cheapest model. It's to avoid using an expensive
model for tasks that don't need it.
