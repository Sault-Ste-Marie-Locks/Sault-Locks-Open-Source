#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

#define AppName "Locks Tracker"
#define AppExeName "Lock Release.exe"
#define AppPublisher "Sault Ste. Marie Locks"

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
WizardImageFile=wizard-image-fixed.bmp
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
WelcomeLabel2=Install Locks Tracker for the Sault Ste. Marie Locks.%n%nSetup will install the desktop application and keep automatic updates enabled.%n%nClick Next to continue.
FinishedHeadingLabel=Locks Tracker is ready to use
FinishedLabel=Setup has finished installing Locks Tracker on your computer.%n%nEverything is ready. Click Finish to exit Setup.

[Files]
Source: "wizard-image-fixed.bmp"; Flags: dontcopy
Source: "..\dist\Lock Release-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Locks Tracker"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppExeName}"; AppUserModelID: "com.lockrelease.desktop"
Name: "{autodesktop}\Locks Tracker"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppExeName}"; AppUserModelID: "com.lockrelease.desktop"; Check: ShouldCreateDesktopShortcut

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch Locks Tracker"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent

[Code]
var
  OptionsPage: TWizardPage;
  OptionsOverlay: TPanel;
  OptionsImage: TBitmapImage;
  OptionsTitle: TNewStaticText;
  OptionsIntro: TNewStaticText;
  OptionsGroup: TNewStaticText;
  OptionsHint: TNewStaticText;
  DesktopShortcutCheck: TNewCheckBox;

function ShouldCreateDesktopShortcut(Param: String): Boolean;
begin
  Result := Assigned(DesktopShortcutCheck) and DesktopShortcutCheck.Checked;
end;

procedure BuildOptionsPage;
var
  ImageWidth: Integer;
  ContentLeft: Integer;
begin
  OptionsPage := CreateCustomPage(wpSelectDir, '', '');
  ExtractTemporaryFile('wizard-image-fixed.bmp');

  OptionsOverlay := TPanel.Create(WizardForm);
  OptionsOverlay.Parent := WizardForm;
  OptionsOverlay.Left := 0;
  OptionsOverlay.Top := 0;
  OptionsOverlay.Width := WizardForm.ClientWidth;
  OptionsOverlay.Height := WizardForm.Bevel.Top;
  OptionsOverlay.BevelOuter := bvNone;
  OptionsOverlay.Color := clWhite;
  OptionsOverlay.Visible := False;

  OptionsImage := TBitmapImage.Create(OptionsOverlay);
  OptionsImage.Parent := OptionsOverlay;
  OptionsImage.Left := 0;
  OptionsImage.Top := 0;
  OptionsImage.Height := OptionsOverlay.Height;
  ImageWidth := (OptionsImage.Height * 336) div 643;
  OptionsImage.Width := ImageWidth;
  OptionsImage.Stretch := True;
  OptionsImage.Bitmap.LoadFromFile(ExpandConstant('{tmp}\wizard-image-fixed.bmp'));

  ContentLeft := ImageWidth + ScaleX(30);

  OptionsTitle := TNewStaticText.Create(OptionsOverlay);
  OptionsTitle.Parent := OptionsOverlay;
  OptionsTitle.Left := ContentLeft;
  OptionsTitle.Top := ScaleY(38);
  OptionsTitle.Width := OptionsOverlay.Width - ContentLeft - ScaleX(28);
  OptionsTitle.AutoSize := False;
  OptionsTitle.Height := ScaleY(34);
  OptionsTitle.Caption := 'Choose Installation Options';
  OptionsTitle.Font.Size := 20;
  OptionsTitle.Font.Style := [fsBold];

  OptionsIntro := TNewStaticText.Create(OptionsOverlay);
  OptionsIntro.Parent := OptionsOverlay;
  OptionsIntro.Left := ContentLeft;
  OptionsIntro.Top := OptionsTitle.Top + OptionsTitle.Height + ScaleY(14);
  OptionsIntro.Width := OptionsTitle.Width;
  OptionsIntro.AutoSize := False;
  OptionsIntro.Height := ScaleY(46);
  OptionsIntro.WordWrap := True;
  OptionsIntro.Caption := 'Choose any extra shortcuts you want Setup to create for Locks Tracker.';
  OptionsIntro.Font.Size := 11;

  OptionsGroup := TNewStaticText.Create(OptionsOverlay);
  OptionsGroup.Parent := OptionsOverlay;
  OptionsGroup.Left := ContentLeft;
  OptionsGroup.Top := OptionsIntro.Top + OptionsIntro.Height + ScaleY(34);
  OptionsGroup.Width := OptionsTitle.Width;
  OptionsGroup.Caption := 'Additional shortcuts';
  OptionsGroup.Font.Size := 12;
  OptionsGroup.Font.Style := [fsBold];

  DesktopShortcutCheck := TNewCheckBox.Create(OptionsOverlay);
  DesktopShortcutCheck.Parent := OptionsOverlay;
  DesktopShortcutCheck.Left := ContentLeft;
  DesktopShortcutCheck.Top := OptionsGroup.Top + ScaleY(38);
  DesktopShortcutCheck.Width := OptionsTitle.Width;
  DesktopShortcutCheck.Height := ScaleY(30);
  DesktopShortcutCheck.Caption := 'Create a desktop shortcut';
  DesktopShortcutCheck.Checked := False;
  DesktopShortcutCheck.Font.Size := 11;

  OptionsHint := TNewStaticText.Create(OptionsOverlay);
  OptionsHint.Parent := OptionsOverlay;
  OptionsHint.Left := ContentLeft;
  OptionsHint.Top := DesktopShortcutCheck.Top + DesktopShortcutCheck.Height + ScaleY(18);
  OptionsHint.Width := OptionsTitle.Width;
  OptionsHint.AutoSize := False;
  OptionsHint.Height := ScaleY(44);
  OptionsHint.WordWrap := True;
  OptionsHint.Caption := 'You can create or remove shortcuts later without reinstalling Locks Tracker.';
  OptionsHint.Font.Size := 9;
  OptionsHint.Font.Color := clGray;
end;

procedure InitializeWizard;
begin
  BuildOptionsPage;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if Assigned(OptionsOverlay) then
  begin
    OptionsOverlay.Visible := (CurPageID = OptionsPage.ID);
    if OptionsOverlay.Visible then
      OptionsOverlay.BringToFront;
  end;
end;