---
name: auto-skill-saver
description: >
  Automatically packages and delivers any newly created skill so Coach Jr gets the
  save-to-database prompt immediately. Use this skill EVERY time Coach Jr asks to
  "create a skill", "save this as a skill", "make a skill", "turn this into a skill",
  or any time Claude creates a SKILL.md file for any reason. This skill should fire
  proactively — never wait for Coach Jr to ask for the save step.
---

# Auto Skill Saver

When Claude creates or updates a skill for Coach Jr, this skill ensures it is
immediately packaged and delivered so the save-to-database button appears in
the conversation.

---

## Automatic Workflow

Every time a skill is created or modified, Claude MUST follow these steps
without being asked:

### Step 1: Write the Skill File

Write the SKILL.md with proper YAML frontmatter:

```yaml
---
name: my-skill-name
description: >
  Clear description of what the skill does and when to trigger it.
  Include specific trigger words and phrases.
---
```

The `name` field must be kebab-case (lowercase, hyphens, no spaces).
The `description` must include trigger phrases so the skill activates automatically.

### Step 2: Name the File Uniquely

Save the file as `{skill-name}.skill.md` — NOT as `SKILL.md`.

Every skill needs a unique filename. Examples:

- `white-label-template-engine.skill.md`
- `skill-engine.skill.md`
- `auto-auth.skill.md`

### Step 3: Deliver with SendUserFile

Immediately call `SendUserFile` with the file path. Use a clear caption:

```
SendUserFile({
  files: ["/path/to/{skill-name}.skill.md"],
  caption: "Skill: {Skill Display Name} — tap to save to your skills",
  status: "normal"
})
```

### Step 4: Confirm Delivery

Tell Coach Jr:

> "Delivered **{Skill Name}** — you should see a save button on the file card.
> Tap it to add this skill to your database so it works across all sessions."

---

## Rules

1. **Never skip the delivery step.** Writing the file to disk is not enough —
   Coach Jr can't access the cloud filesystem. The file MUST be sent via SendUserFile.

2. **Always use unique filenames.** Never deliver multiple skills as "SKILL.md" —
   they overwrite each other. Use `{skill-name}.skill.md`.

3. **Always include frontmatter.** The `name` and `description` fields in the YAML
   frontmatter are required for the save mechanism to work.

4. **Deliver immediately.** Don't batch skills or wait until the end of a task.
   Deliver each skill as soon as it's written.

5. **One skill per file.** Each SKILL.md should contain exactly one skill.
   Don't combine multiple skills into a single file.

6. **Proactive trigger.** If Claude writes a SKILL.md for ANY reason during a
   session — even as part of another task — this auto-saver workflow fires
   automatically. Coach Jr should never have to say "now save it."

---

## Skill Quality Checklist

Before delivering, verify:

- [ ] `name` in frontmatter matches the filename (minus `.skill.md`)
- [ ] `description` includes at least 3 trigger phrases
- [ ] Instructions are clear and actionable
- [ ] No hardcoded values that should be parameters
- [ ] File is self-contained (no references to files that won't exist in other sessions)
