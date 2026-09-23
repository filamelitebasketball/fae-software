# Builds dist\YourBrandHighlightCutter.exe (one file, ffmpeg included). Run from this folder.
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --noconfirm --onefile --noconsole --name YourBrandHighlightCutter --collect-all imageio_ffmpeg highlight_cutter.py
