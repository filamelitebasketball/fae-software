# Builds ..\product\DinkCutIO.exe, the real product (one file: ffmpeg, UI toolkit, icon, logos, splash, © LINKMEIO file properties). Run from this folder.
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --noconfirm --onefile --noconsole --name DinkCutIO --distpath ..\product --icon icon.ico --version-file version_info.txt --splash assets\splash.png --add-data "icon.ico;." --add-data "assets;assets" --collect-all imageio_ffmpeg --collect-all customtkinter dinkcut_io.py
