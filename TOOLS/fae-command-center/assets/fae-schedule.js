/* ===========================================================================
   FAE court renter schedule — single source for the live schedule the office
   views. When the schedule file changes, edit ONLY this file.

   fileId : the Google Drive id from the share link .../d/<fileId>/...
   kind   : 'drive-file'  -> an uploaded Excel (.xlsx) file in Drive
            'sheet'       -> a native Google Sheet

   Current: "FAE COURT RENTER CALENDAR SCHEDULE" (uploaded .xlsx in Drive,
   owned by filamelitebasketball@gmail.com). A .xlsx renders live in the Drive
   viewer but cannot be auto-parsed by CSV export — for the automatic
   "who's on court" reader to work too, save it as a native Google Sheet
   (File > Save as Google Sheets) and set kind:'sheet' with the new id.
   =========================================================================== */
window.FAE_SCHEDULE = { fileId: '1aBfsyhUq6sjvdCVtgUDlbhu8UtsYZgTR', kind: 'drive-file' };
(function (s) {
  s.previewUrl = s.kind === 'sheet'
    ? 'https://docs.google.com/spreadsheets/d/' + s.fileId + '/preview'
    : 'https://drive.google.com/file/d/' + s.fileId + '/preview';
  /* opening an uploaded .xlsx at the spreadsheets/edit URL launches it in the
     Google Sheets editor (Office-compatibility mode), which works for both kinds */
  s.editUrl = 'https://docs.google.com/spreadsheets/d/' + s.fileId + '/edit';
})(window.FAE_SCHEDULE);
