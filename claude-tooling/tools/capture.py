import json, os, collections

home = os.path.expanduser("~")
base = os.path.join(home, ".claude", "plugins")
dest = os.path.join(home, "Desktop", "CLAUDE", "06-SOFTWARE", "claude-tooling")

inst = json.load(open(os.path.join(base, "installed_plugins.json"), encoding="utf-8"))
mkts = json.load(open(os.path.join(base, "known_marketplaces.json"), encoding="utf-8"))
settings = json.load(open(os.path.join(home, ".claude", "settings.json"), encoding="utf-8"))

marketplaces = collections.OrderedDict()
skipped = []
for name in sorted(mkts):
    src = mkts[name].get("source", {})
    if src.get("source") == "git":
        marketplaces[name] = src["url"]
    else:
        skipped.append(name)

plugins = collections.OrderedDict()
for key in inst["plugins"]:
    plug, _, mkt = key.partition("@")
    plugins.setdefault(mkt, []).append(plug)
for k in plugins:
    plugins[k] = sorted(plugins[k])
plugins = collections.OrderedDict((k, plugins[k]) for k in sorted(plugins))

manifest = collections.OrderedDict()
manifest["name"] = "fae-claude-tooling"
manifest["description"] = (
    "Claude Code marketplaces, plugins and F.A.E. skills captured from Coach Jr's "
    "home desktop, packaged for reinstall at the FAE court."
)
manifest["capturedFrom"] = "home desktop (Desktop/CLAUDE)"
manifest["capturedOn"] = "2026-09-01"
manifest["counts"] = {
    "marketplaces": len(marketplaces),
    "plugins": sum(len(v) for v in plugins.values()),
}
manifest["marketplaces"] = marketplaces
manifest["plugins"] = plugins
manifest["localOnlyMarketplacesSkipped"] = skipped

os.makedirs(os.path.join(dest, "settings"), exist_ok=True)
with open(os.path.join(dest, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)
    f.write("\n")

tmpl = collections.OrderedDict()
tmpl["permissions"] = settings.get("permissions", {"defaultMode": "auto"})
tmpl["enableWorkflows"] = settings.get("enableWorkflows", True)
tmpl["agentPushNotifEnabled"] = settings.get("agentPushNotifEnabled", True)
tmpl["extraKnownMarketplaces"] = collections.OrderedDict(
    (n, {"source": {"source": "git", "url": u}}) for n, u in marketplaces.items()
)
tmpl["enabledPlugins"] = collections.OrderedDict(
    (k, True) for k in sorted(inst["plugins"])
)
with open(os.path.join(dest, "settings", "settings.template.json"), "w", encoding="utf-8") as f:
    json.dump(tmpl, f, indent=2)
    f.write("\n")

print("dest:", dest)
print("marketplaces:", len(marketplaces), "plugins:", manifest["counts"]["plugins"])
print("skipped local-only marketplaces:", skipped)
print()
for mkt in plugins:
    print("- **%s** — `%s`  " % (mkt, marketplaces[mkt]))
    print("  %s" % ", ".join("`%s`" % p for p in plugins[mkt]))
