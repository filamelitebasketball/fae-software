# Turning on Online Sync

Worker submissions (incidents, shift hours, payments, notes) are always saved on the device and
can be handed over as a QR/code. **Online Sync** adds automatic sending: when a submission is made
and the machine is online, it POSTs to an endpoint you choose. If it is offline, it queues and
sends automatically when the connection returns.

Nothing is sent until you set an endpoint in **Settings → Online Sync**. Until then everything
stays on the device and the QR hand-off is the way to move it.

## What you set (Settings → Online Sync)

- **POST endpoint URL** — where each submission is sent.
- **API key / token** — optional; sent as both `apikey` and `Authorization: Bearer <key>`.
- **Auto-send when online** — the on/off switch.

Each submission is sent as a JSON body, e.g.:

```json
{ "t": "incident", "by": "J. Mendoza", "ts": "2026-09-05T10:00:00Z",
  "name": "Freeman Africa", "category": "Overtime", "severity": "Medium",
  "details": "Ran 30 min over." }
```

`t` is the type: `incident`, `shift`, `payment`, or `note`.

## Three ways to provide an endpoint

Pick one — you only need one.

### A. Supabase REST (if the live site's Supabase is the target)
1. In Supabase, create a table (e.g. `worker_submissions`) with a `jsonb` column `data` (or
   columns matching the fields above).
2. Add an RLS policy allowing `anon` INSERT (or use a service role via an edge function — safer).
3. Endpoint: `https://<project>.supabase.co/rest/v1/worker_submissions`
   Key: the project's `anon` key.
   Note: the endpoint expects the row shape; if the table is `{data jsonb}`, wrap the body — a
   small edge function is cleaner than posting raw. Ask for the edge-function version if you want
   the payload reshaped.

### B. Google Apps Script web app (no Supabase — writes to a Sheet) ← recommended
1. In a Google Sheet, Extensions → Apps Script.
2. Paste the script below and save.
3. Deploy → New deployment → Web app → Execute as **you**, Access: **anyone with the link**.
4. Endpoint: the deployment URL. Key: leave blank.
   Best fit since the business already runs on Google Sheets.

```javascript
// F.A.E. Command Center → Google Sheet
// Handles both kinds of message the command centre sends:
//   { type:"sheet_append", sheet:"MEMBERS", rows:[ {...}, {...} ] }
//   anything else  → appended to a RAW tab as one JSON row
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}

  if (body.type === 'sheet_append' && body.rows && body.rows.length) {
    var name = String(body.sheet || 'DATA').toUpperCase();
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = Object.keys(body.rows[0]);

    // write the header row the first time this tab is used
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#C9A227');
      sh.setFrozenRows(1);
    } else {
      headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]; // respect the existing order
    }

    // de-dupe: skip rows whose first column value is already in the sheet
    var keyCol = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(String) : [];
    var out = [];
    body.rows.forEach(function (r) {
      var key = String(r[headers[0]]);
      if (key && keyCol.indexOf(key) > -1) return;      // already logged
      out.push(headers.map(function (h) { return r[h] === undefined ? '' : r[h]; }));
    });
    if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, headers.length).setValues(out);

    return ContentService.createTextOutput(JSON.stringify({ ok: true, added: out.length }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var raw = ss.getSheetByName('RAW') || ss.insertSheet('RAW');
  raw.appendRow([new Date(), body.type || body.t || 'unknown', JSON.stringify(body)]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Tabs the command centre writes to: **MEMBERS**, **TASKS** (daily task tickets),
**PAYMENTS**. They are created automatically the first time you press *Send to Sheet*.
The first column of each row is treated as the key, so pressing *Send to Sheet* twice
does not duplicate rows.

**No endpoint yet?** Every one of those screens also has **CSV** and **Excel** buttons —
the file opens in Excel and pastes straight into the sheet. Nothing is blocked by not
having the online link.

### C. Lovable edge function
Expose a function on the live site that accepts the JSON POST and writes it wherever you want
(Supabase, a table, an email). Endpoint: the function URL. Key: whatever it checks.

## Honest limits

- This is client-side. The endpoint URL and key live in the folder — anyone with the folder can
  read them. Use a key that only allows INSERT, and validate on the server side.
- Sending happens per submission and on reconnect; there is no delete/edit sync — it is one-way,
  submissions out.
- Photos are not sent (they are not in the submission payload); a photo incident still needs the
  dashboard.

## Check it is working

Open `worker.html` (via the launcher). The bar under the mode buttons shows:
- grey = saving on device only (no endpoint set)
- green = all sent
- gold = some waiting
- red = offline, queued

"Sync now" forces a send.
