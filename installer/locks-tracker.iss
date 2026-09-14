#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

#define AppName "Locks Tracker"
#define AppExeName "Lock Release.exe"
#define AppPublisher "Sault Ste. Marie Locks"
#define AppId "{A28D5EA8-7060-4AA5-BF86-51E06D1B6517}"

[Setup]
AppId=SaultSteMarieLocks.LocksTracker
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppVerName={#AppName} {#AppVersion}
DefaultDirName={localappdata}\LockReleaseDesktop\Lock Release-win32-x64
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..
OutputBaseFilename=Locks_Tracker_Setup
SetupIconFile=..\assets\lock-release.ico
WizardStyle=modern
WizardImageFile=wizard-image.png
WizardSmallImageFile=..\assets\lock-release.png
WizardImageStretch=yes
WizardKeepAspectRatio=yes
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes
CloseApplicationsFilter={#AppExeName}
RestartApplications=no
Uninstallable=yes
UninstallDisplayIcon={app}\{#AppExeName}
VersionInfoVersion={#AppVersion}
VersionInfoCompany={#AppPublisher}
VersionInfoDescription=Locks Tracker Installer
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
SetupWindowTitle=Locks Tracker Installer
WelcomeLabel1=Welcome to the Locks Tracker Setup Wizard
WelcomeLabel2=This wizard will install Locks Tracker on your computer.%n%nIt will install the desktop application, create the shortcuts you choose, and keep the built-in automatic updater enabled.%n%nClick Next to continue.
FinishedHeadingLabel=Locks Tracker is ready to use
FinishedLabel=Setup has finished installing Locks Tracker on your computer.

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\dist\Lock Release-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Locks Tracker"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppExeName}"; AppUserModelID: "com.lockrelease.desktop"
Name: "{autodesktop}\Locks Tracker"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppExeName}"; AppUserModelID: "com.lockrelease.desktop"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch Locks Tracker"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent
