# Builds ..\trial\DinkCutIO-Trial.exe: the full app for 24 hours from first launch, then a free tier
# (highlights video only, 720p, LINKMEIO watermark). The trial folder is what you send prospects; never the source.
python -m pip install -r requirements.txt pyinstaller
python -m PyInstaller --noconfirm --onefile --noconsole --name DinkCutIO-Trial --distpath ..\trial --icon icon.ico --version-file version_info.txt --splash assets\splash.png --add-data "icon.ico;." --add-data "assets;assets" --add-data "trial-flag/trial.txt;." --collect-all imageio_ffmpeg --collect-all customtkinter dinkcut_io.py
