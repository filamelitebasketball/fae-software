# Builds dist\HighlightStudioIO-Trial.exe: the full app for 24 hours from first launch, then a free tier
# (highlights video only, 720p, LINKMEIO watermark). Send prospects this file only, never the source.
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --noconfirm --onefile --noconsole --name HighlightStudioIO-Trial --icon icon.ico --version-file version_info.txt --add-data "icon.ico;." --add-data "assets;assets" --add-data "trial/trial.txt;." --collect-all imageio_ffmpeg --collect-all customtkinter highlight_cutter.py
