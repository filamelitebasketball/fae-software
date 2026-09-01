---
name: deploy-to-lovable
description: >
  Sends revision prompts from a /website-revise-check report to Lovable and monitors the build.
  Use this skill AFTER running /website-revise-check — it reads the generated HTML report,
  extracts all numbered prompts, checks whether they have already been sent, and deploys
  each one to Lovable via MCP. Triggers on: "deploy prompts to lovable", "send prompts to lovable",
  "push changes to lovable", "run the lovable deploy", "deploy revisions", or any mention of
  sending website-revise-check output to the Lovable project. Always use this skill when
  Coach Jr says to send prompts after a site check.
---

# Deploy to Lovable

Automates the last mile of the `/website-revise-check` workflow: take the revision prompts
that were already written and reviewed, send them to the Lovable project, and verify the
build succeeds — so Coach Jr can go from "scan & prompt" to "live on Lovable" without
copy-pasting.

## Prerequisites

- `/website-revise-check` must have been run first in this session (or a previous session
  whose report file is still accessible).
- The Lovable MCP connector must be available (`mcp__Lovable__*` tools).
- The NXGEN Premier League project ID is `b6e07c0a-6de8-4333-903f-2c03559cc90e`.
  For other projects, ask Coach Jr for the project ID or use `mcp__Lovable__list_projects`.

## Workflow

### Step 1 — Locate the Report

Find the most recent `NXGEN_Revision_Report*.html` file in the workspace. If multiple
versions exist, use the one with the highest version suffix (e.g., `_v3` beats `_v2`).
If no report file exists, stop and tell Coach Jr to run `/website-revise-check` first.

### Step 2 — Extract Prompts

Parse the HTML report and extract each numbered prompt block. Each prompt block sits
inside a `<pre>` or `<textarea>` element within a section headed "Prompt 1", "Prompt 2",
etc. Collect them in order.

If the report also contains a "Logo/Media" prompt, collect it separately — it always
goes last.

### Step 3 — Duplicate Guard

Before sending, check recent Lovable messages with `mcp__Lovable__list_messages` to see
if any message in the last 24 hours contains the same opening line as the prompt about
to be sent. If a match is found:

- Tell Coach Jr which prompt was already sent and when.
- Skip that prompt.
- Continue with the next one.

This prevents double-deploying the same revision if the skill is run twice by accident.

### Step 4 — Send Prompts

Send each prompt to Lovable one at a time using `mcp__Lovable__send_message`:

```
mcp__Lovable__send_message({
  project_id: "<project-id>",
  message: "<full prompt text>"
})
```

**Important**: Lovable processes one message at a time. After sending each prompt:

1. Save the returned `message_id`.
2. Poll `mcp__Lovable__get_message` every 30–60 seconds until `status` is `completed`.
3. If the build fails or errors, stop and report the failure to Coach Jr with the
   error details — do not send the next prompt on top of a broken build.
4. If the build succeeds, note the `commit_sha` and move to the next prompt.

Wait for each prompt to finish building before sending the next one. Prompts build on
each other (Prompt 1 is lowest-risk layout, Prompt 2 is auth/logic, Prompt 3 is
enhancements), so order matters.

### Step 5 — Verify All Changes

After all prompts have been sent and built successfully:

1. Use `mcp__Lovable__get_diff` to pull the combined diff.
2. Summarize what changed: files touched, lines added/removed, features added.
3. Check the diff against the original prompt items — flag any item that was requested
   but does not appear in the diff.

### Step 6 — Report

Provide Coach Jr with a summary:

```
✅ Prompt 1 — deployed (commit abc1234)
✅ Prompt 2 — deployed (commit def5678)
⏭️ Prompt 3 — skipped (already sent 2h ago)
❌ Prompt 4 — failed (error: ...)

Preview: https://id-preview--<project-id>.lovable.app
```

Include the live preview URL so Coach Jr can check the site immediately.

### Step 7 — Update Pending Issues

If the `/website-revise-check` skill's pending issues tracker is accessible, mark the
deployed items as resolved and note the commit SHA next to each one.

## Error Handling

- **MCP timeout on send_message**: The message was likely accepted. Use
  `mcp__Lovable__list_messages` to find the message ID, then poll `get_message`
  for status. Do not re-send — that would create a duplicate.
- **Build failure**: Read the Lovable agent's response content for error details.
  Report the error and stop. Do not attempt to fix the code from here — that is
  Lovable's agent's job. Coach Jr can adjust the prompt and re-run.
- **No Lovable MCP**: Tell Coach Jr the Lovable connector is not available and
  suggest they connect it in the Claude app settings.

## Notes

- This skill is designed to work with NXGEN Premier League but can be adapted for
  any Lovable project by changing the project ID.
- Credit cost: each `send_message` call consumes Lovable workspace credits (typically
  1–3 credits per prompt depending on complexity).
- The skill never modifies code directly — it only sends the prompts that
  `/website-revise-check` already generated and reviewed.
