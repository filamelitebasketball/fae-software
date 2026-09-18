#!/usr/bin/env python3
# =============================================================================
#  F.A.E. Command Center — office Wi-Fi server
#
#  Does two jobs:
#    1. Serves the Command Center to every phone on the office Wi-Fi, so staff
#       can open  http://<this-pc-ip>:8765/tasks.html  and fill a task ticket.
#    2. Receives what they submit. A ticket POSTed to /fae-inbox is written into
#       data\tickets\ as a JSON file AND appended to a dated CSV you can open in
#       Excel. The office dashboard reads them back with GET /fae-inbox.
#
#  No internet, no Google account, no monthly cost. Everything stays in this
#  folder on this computer.
#
#  Started by START-COMMAND-CENTER-WIFI.bat — you do not run this by hand.
#  Stop it by closing the black window.
# =============================================================================

import csv
import json
import os
import socket
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

# Column order for the ticket CSV. Kept identical to the dashboard's export so
# the two files can be stacked in the same spreadsheet.
TICKET_COLS = ["Ticket", "Date", "Employee", "Position", "Shift", "TimeIn", "TimeOut",
               "Hours", "TasksDone", "TasksTotal", "Accomplished", "Issues", "Status",
               "SubmittedAt", "ReceivedAt", "From"]


def ensure(*parts):
    r"""Make a folder inside data\ and return its path."""
    p = os.path.join(DATA, *parts)
    os.makedirs(p, exist_ok=True)
    return p


def staff_code():
    r"""The 4-digit code a phone must know before it can send a ticket.

    Kept in data\staff-code.txt so it survives restarts and you can change it by
    editing that file. Made up on first run. This stops a random person on the
    office Wi-Fi (or a bored customer) from filing junk tickets. It is a gate,
    not real security - anyone who watches a staff member type it knows it.
    """
    os.makedirs(DATA, exist_ok=True)
    path = os.path.join(DATA, "staff-code.txt")
    try:
        with open(path, encoding="utf-8") as f:
            code = f.read().strip()
        if code:
            return code
    except Exception:
        pass
    import random
    code = "%04d" % random.randint(1000, 9999)
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(code + "\n")
    except Exception:
        pass
    return code


def is_local(addr):
    """Requests from the office PC itself skip the code and may read tickets."""
    return addr in ("127.0.0.1", "::1", "localhost")


def clock(iso):
    """2026-09-06T14:05:00Z -> 2:05 PM. Blank stays blank."""
    if not iso:
        return ""
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00")).astimezone()
        return t.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return str(iso)


def ticket_row(t, sender):
    tasks = t.get("tasks") or []
    return {
        "Ticket": t.get("id", ""),
        "Date": t.get("date", ""),
        "Employee": t.get("name", ""),
        "Position": t.get("pos", ""),
        "Shift": t.get("shift", ""),
        "TimeIn": clock(t.get("timeIn")),
        "TimeOut": clock(t.get("timeOut")),
        "Hours": t.get("hours", 0),
        "TasksDone": sum(1 for x in tasks if x.get("done")),
        "TasksTotal": len(tasks),
        "Accomplished": t.get("acc", ""),
        "Issues": t.get("issue", ""),
        "Status": t.get("status", ""),
        "SubmittedAt": t.get("submittedAt", ""),
        "ReceivedAt": datetime.now().isoformat(timespec="seconds"),
        "From": sender,
    }


def append_csv(path, row, cols):
    """Append one row, writing the header the first time the file is made."""
    new = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        if new:
            w.writeheader()
        w.writerow(row)


def save_ticket(t, sender):
    r"""One JSON file per ticket (the record) + a line in the day's CSV (for Excel)."""
    day = t.get("date") or datetime.now().strftime("%Y-%m-%d")
    folder = ensure("tickets")
    tid = "".join(c for c in str(t.get("id") or "ticket") if c.isalnum() or c in "-_")

    path = os.path.join(folder, tid + ".json")
    already = os.path.exists(path)

    # A re-send MERGES onto what is already filed: a later, thinner copy of the
    # same ticket must never wipe out details the office already received.
    if already:
        try:
            with open(path, encoding="utf-8") as f:
                old = json.load(f)
            merged = dict(old)
            for k, v in t.items():
                if v not in ("", None, [], {}):
                    merged[k] = v
            t = merged
        except Exception:
            pass

    t["receivedAt"] = datetime.now().isoformat(timespec="seconds")
    t["receivedFrom"] = sender
    with open(path, "w", encoding="utf-8") as f:
        json.dump(t, f, indent=2, ensure_ascii=False)

    if not already:                      # do not double-log a re-send
        append_csv(os.path.join(folder, "FAE-tickets-%s.csv" % day), ticket_row(t, sender), TICKET_COLS)
    return already


def save_sheet_rows(sheet, rows, sender):
    r"""A 'sheet_append' (members / payments / tasks) lands as a dated CSV."""
    name = "".join(c for c in str(sheet or "data") if c.isalnum() or c in "-_").lower() or "data"
    folder = ensure(name if name in ("members", "tickets", "payments", "stock") else "sheets")
    day = datetime.now().strftime("%Y-%m-%d")
    path = os.path.join(folder, "FAE-%s-%s.csv" % (name, day))
    cols = list(rows[0].keys()) + ["ReceivedAt", "From"]
    for r in rows:
        r = dict(r)
        r["ReceivedAt"] = datetime.now().isoformat(timespec="seconds")
        r["From"] = sender
        append_csv(path, r, cols)
    return len(rows)


def save_visitor(h, sender):
    r"""One JSON file per household + a line in the visitors CSV.

    A returning family re-registers over the same household id, so the JSON is
    replaced but the CSV keeps both lines - the CSV is a log of registrations,
    the JSON is the current truth.
    """
    folder = ensure("visitors")
    hid = "".join(c for c in str(h.get("id") or "household") if c.isalnum() or c in "-_")
    path = os.path.join(folder, hid + ".json")
    already = os.path.exists(path)
    h["receivedAt"] = datetime.now().isoformat(timespec="seconds")
    h["receivedFrom"] = sender
    with open(path, "w", encoding="utf-8") as f:
        json.dump(h, f, indent=2, ensure_ascii=False)

    adult = h.get("adult") or {}
    deps = h.get("dependents") or []
    row = {
        "Household": h.get("id", ""),
        "Registered": str(h.get("createdAt", ""))[:19],
        "Adult": adult.get("name", ""),
        "Phone": adult.get("phone", ""),
        "Email": adult.get("email", ""),
        "Address": adult.get("address", ""),
        "Emergency": adult.get("emergency", ""),
        "EmergencyPhone": adult.get("emergencyPhone", ""),
        "Dependents": len(deps),
        "DependentNames": " | ".join(str(d.get("name", "")) for d in deps),
        "Source": h.get("source", ""),
        "ReceivedAt": h["receivedAt"],
    }
    append_csv(os.path.join(folder, "FAE-visitors-%s.csv" % datetime.now().strftime("%Y-%m-%d")),
               row, list(row.keys()))
    return already


def save_checkin(rec, sender):
    r"""Append one in/out movement to the day's file. Never overwritten."""
    folder = ensure("checkins")
    day = rec.get("day") or datetime.now().strftime("%Y-%m-%d")
    row = {
        "Id": rec.get("id", ""), "Time": clock(rec.get("ts")), "Day": day,
        "Person": rec.get("name", ""), "Role": rec.get("role", ""),
        "Guardian": rec.get("guardian", ""), "Direction": (rec.get("dir") or "").upper(),
        "Household": rec.get("hid", ""), "Voided": "yes" if rec.get("voided") else "",
        "ReceivedAt": datetime.now().isoformat(timespec="seconds"), "From": sender,
    }
    append_csv(os.path.join(folder, "FAE-checkins-%s.csv" % day), row, list(row.keys()))

    path = os.path.join(folder, "checkins-%s.json" % day)
    try:
        with open(path, encoding="utf-8") as f:
            all_recs = json.load(f)
    except Exception:
        all_recs = []
    all_recs = [x for x in all_recs if x.get("id") != rec.get("id")]   # a re-send replaces
    all_recs.append(rec)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(all_recs, f, indent=2, ensure_ascii=False)
    return len(all_recs)


def read_visitors():
    folder = ensure("visitors")
    out = []
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith(".json"):
            continue
        try:
            with open(os.path.join(folder, fn), encoding="utf-8") as f:
                out.append(json.load(f))
        except Exception:
            continue
    return out


def read_checkins(day=""):
    folder = ensure("checkins")
    day = day or datetime.now().strftime("%Y-%m-%d")
    try:
        with open(os.path.join(folder, "checkins-%s.json" % day), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def read_inbox(since=""):
    """Every ticket the office has received, newest last. Used by the dashboard."""
    folder = ensure("tickets")
    out = []
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith(".json"):
            continue
        try:
            with open(os.path.join(folder, fn), encoding="utf-8") as f:
                t = json.load(f)
            if since and str(t.get("receivedAt", "")) <= since:
                continue
            out.append(t)
        except Exception:
            continue
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def handle_one_request(self):
        # A phone that walks out of Wi-Fi range mid-download drops the connection.
        # That is normal, not a fault - swallow it so the office window stays clean.
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            self.close_connection = True

    # -- quieter log: one readable line per request, no noise for assets -------
    def log_message(self, fmt, *args):
        msg = fmt % args
        if any(s in msg for s in (".png", ".js", ".css", ".ico", ".woff")):
            return
        sys.stderr.write("   %s  %s\n" % (datetime.now().strftime("%H:%M:%S"), msg))

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, apikey, Authorization")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/fae-inbox":
            # Reading everyone's tickets is for the office computer only - a phone
            # on the Wi-Fi must not be able to pull the whole staff log.
            if not is_local(self.client_address[0]):
                return self._json({"ok": False, "error": "reading tickets is allowed on the office computer only"}, 403)
            since = ""
            if "?" in self.path:
                for part in self.path.split("?", 1)[1].split("&"):
                    if part.startswith("since="):
                        from urllib.parse import unquote
                        since = unquote(part[6:])
            tickets = read_inbox(since)
            return self._json({"ok": True, "count": len(tickets), "tickets": tickets})
        if path in ("/fae-visitors", "/fae-checkins"):
            # Personal details and a log of who is in the building, children
            # included. This never leaves the office computer.
            if not is_local(self.client_address[0]):
                return self._json({"ok": False, "error": "office computer only"}, 403)
            if path == "/fae-visitors":
                v = read_visitors()
                return self._json({"ok": True, "count": len(v), "households": v})
            day = ""
            if "?" in self.path:
                from urllib.parse import unquote
                for part in self.path.split("?", 1)[1].split("&"):
                    if part.startswith("day="):
                        day = unquote(part[4:])
            c = read_checkins(day)
            return self._json({"ok": True, "count": len(c), "checkins": c})
        if path == "/fae-code":
            # the office PC may read the code so the dashboard can show it to the
            # manager; a phone on the Wi-Fi may not.
            if not is_local(self.client_address[0]):
                return self._json({"ok": False, "error": "office computer only"}, 403)
            return self._json({"ok": True, "code": staff_code()})
        if path == "/fae-ping":
            # lets a page ask "is the office receiver running, and do I need the code?"
            return self._json({"ok": True, "server": "fae", "port": PORT,
                               "codeRequired": not is_local(self.client_address[0])})
        # never serve the file that could contain keys over the network
        if path.endswith(".bat") or "/data/backups/" in path:
            return self._json({"ok": False, "error": "not shared"}, 403)
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/fae-inbox":
            return self._json({"ok": False, "error": "unknown endpoint"}, 404)
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n > 2_000_000:
                return self._json({"ok": False, "error": "too big"}, 413)
            body = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception as e:
            return self._json({"ok": False, "error": "bad json: %s" % e}, 400)

        sender = self.client_address[0]

        # A phone must know the office code. The office PC itself does not.
        if not is_local(sender):
            given = str(self.headers.get("X-FAE-Code") or body.get("code") or "").strip()
            if given != staff_code():
                print("   !! rejected a submission from %s - wrong office code" % sender)
                return self._json({"ok": False, "error": "code", "message": "Wrong office code"}, 403)
        try:
            kind = body.get("type") or ""
            if kind == "task_ticket" and body.get("ticket"):
                t = body["ticket"]
                dupe = save_ticket(t, sender)
                who = t.get("name") or "someone"
                print("   >> TICKET  %-22s %s  %s" % (who, t.get("date", ""), "(re-sent)" if dupe else "SAVED"))
                return self._json({"ok": True, "saved": "ticket", "duplicate": dupe})

            if kind == "visitor_register" and body.get("household"):
                h = body["household"]
                dupe = save_visitor(h, sender)
                who = (h.get("adult") or {}).get("name") or "someone"
                kids = len(h.get("dependents") or [])
                print("   >> VISITOR  %-22s %d dependent(s)  %s" % (who, kids, "(updated)" if dupe else "REGISTERED"))
                return self._json({"ok": True, "saved": "visitor", "duplicate": dupe})

            if kind == "checkin" and body.get("record"):
                rec = body["record"]
                save_checkin(rec, sender)
                print("   >> %-4s  %s" % ((rec.get("dir") or "").upper(), rec.get("name", "")))
                return self._json({"ok": True, "saved": "checkin"})

            if kind == "sheet_append" and body.get("rows"):
                n = save_sheet_rows(body.get("sheet"), body["rows"], sender)
                print("   >> %d row(s) -> %s" % (n, body.get("sheet", "data")))
                return self._json({"ok": True, "saved": n})

            # anything else still gets kept, so nothing a phone sends is lost
            folder = ensure("inbox")
            fn = datetime.now().strftime("%Y%m%d-%H%M%S-") + (kind or "item") + ".json"
            with open(os.path.join(folder, fn), "w", encoding="utf-8") as f:
                json.dump(body, f, indent=2, ensure_ascii=False)
            print("   >> saved %s" % fn)
            return self._json({"ok": True, "saved": "raw"})
        except Exception as e:
            print("   !! could not save: %s" % e)
            return self._json({"ok": False, "error": str(e)}, 500)


def is_private(ip):
    """192.168.x.x, 10.x.x.x and 172.16-31.x.x are office/home networks."""
    p = ip.split(".")
    if len(p) != 4 or not all(x.isdigit() for x in p):
        return False
    a, b = int(p[0]), int(p[1])
    return a == 10 or (a == 172 and 16 <= b <= 31) or (a == 192 and b == 168)


def lan_ip():
    """This PC's address on the OFFICE network.

    Collects every address this machine has and prefers a private one. Without
    this it can report the internet-facing address, which no phone on the office
    Wi-Fi can reach - and which must never end up printed on the QR sheet.
    Returns (ip, is_office_network).
    """
    found = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))            # no data sent; just reveals the route
        found.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            found.append(info[4][0])
    except Exception:
        pass
    for ip in found:
        if is_private(ip):
            return ip, True
    for ip in found:
        if ip and not ip.startswith("127."):
            return ip, False                  # public/unknown - warn the operator
    return "127.0.0.1", False


def main():
    try:
        sys.stdout.reconfigure(line_buffering=True)   # banner must appear at once
    except Exception:
        pass
    ensure("tickets")
    ip, office = lan_ip()
    print()
    print("   F.A.E. COMMAND CENTER  -  office Wi-Fi mode")
    print("   " + "=" * 52)
    print()
    print("   On THIS computer :  http://127.0.0.1:%d/console.html" % PORT)
    print("   On a PHONE       :  http://%s:%d/tasks.html" % (ip, PORT))
    if not office:
        print()
        print("   !! That does not look like an office Wi-Fi address.")
        print("      Normally it starts with 192.168. or 10.  If the phones cannot")
        print("      open it, this PC may be on a VPN or plugged into the wrong")
        print("      network. Turn the VPN off, or check with your provider.")
    print()
    print("   Staff must be on the same Wi-Fi. Print the QR sheet from")
    print("   qr-poster.html so nobody has to type that address.")
    print()
    print("   OFFICE CODE for phones :  %s" % staff_code())
    print("   Each phone types it once. Give it only to staff.")
    print("   To change it, edit  data\\staff-code.txt  and restart.")
    print()
    print("   Visitor sign-up  :  http://%s:%d/register.html   (QR by the door)" % (ip, PORT))
    print("   Front-desk kiosk :  http://127.0.0.1:%d/checkin.html" % PORT)
    print()
    print("   Submitted tickets are saved into  data\\tickets\\")
    print("   Visitors -> data\\visitors    In/out -> data\\checkins")
    print("   Keep this window OPEN. Close it to stop.")
    print()
    print("   " + "-" * 52)
    try:
        ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\n   Stopped.")
    except OSError as e:
        print("\n   Could not start on port %d: %s" % (PORT, e))
        print("   Another copy may already be running. Close it and try again.")
        input("\n   Press Enter to close...")


if __name__ == "__main__":
    main()
