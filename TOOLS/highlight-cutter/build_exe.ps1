# Builds dist\HighlightStudioIO.exe (one file: ffmpeg, UI toolkit, icon, logos and © LINKMEIO file properties). Run from this folder.
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --noconfirm --onefile --noconsole --name HighlightStudioIO --icon icon.ico --version-file version_info.txt --add-data "icon.ico;." --add-data "assets;assets" --collect-all imageio_ffmpeg --collect-all customtkinter highlight_cutter.py
