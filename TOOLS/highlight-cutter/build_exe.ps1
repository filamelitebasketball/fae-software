# Builds dist\YourBrandHighlightCutter.exe (one file: ffmpeg, UI toolkit, icon and client logo included). Run from this folder.
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --noconfirm --onefile --noconsole --name YourBrandHighlightCutter --icon icon.ico --add-data "icon.ico;." --add-data "assets;assets" --collect-all imageio_ffmpeg --collect-all customtkinter highlight_cutter.py
