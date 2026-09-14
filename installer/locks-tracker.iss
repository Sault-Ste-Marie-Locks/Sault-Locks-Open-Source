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
Source: "installer-logo.bmp"; Flags: dontcopy
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

  ReadyOverlay: TPanel;
  ReadySidebar: TPanel;
  ReadyLogo: TBitmapImage;
  ReadyBrand: TNewStaticText;
  ReadyVersion: TNewStaticText;
  ReadyStep1: TNewStaticText;
  ReadyStep2: TNewStaticText;
  ReadyStep3: TNewStaticText;
  ReadyTitle: TNewStaticText;
  ReadyIntro: TNewStaticText;
  ReadyInstruction: TNewStaticText;
  ReadySummary: TPanel;
  ReadySummaryTitle: TNewStaticText;
  ReadyDestination: TNewStaticText;
  ReadyVersionLine: TNewStaticText;
  ReadyTimeLine: TNewStaticText;

function ShouldCreateDesktopShortcut: Boolean;
begin
  Result := DesktopShortcutCheck.Checked;
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
  OptionsTitle.Transparent := True;

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
  OptionsIntro.Transparent := True;

  OptionsGroup := TNewStaticText.Create(OptionsOverlay);
  OptionsGroup.Parent := OptionsOverlay;
  OptionsGroup.Left := ContentLeft;
  OptionsGroup.Top := OptionsIntro.Top + OptionsIntro.Height + ScaleY(30);
  OptionsGroup.Width := OptionsTitle.Width;
  OptionsGroup.Caption := 'Additional shortcuts';
  OptionsGroup.Font.Size := 12;
  OptionsGroup.Font.Style := [fsBold];
  OptionsGroup.Transparent := True;

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
  OptionsHint.Transparent := True;
end;

procedure BuildReadyPage;
var
  SidebarWidth: Integer;
  ContentLeft: Integer;
  ContentWidth: Integer;
begin
  ExtractTemporaryFile('installer-logo.bmp');

  ReadyOverlay := TPanel.Create(WizardForm);
  ReadyOverlay.Parent := WizardForm;
  ReadyOverlay.Left := 0;
  ReadyOverlay.Top := 0;
  ReadyOverlay.Width := WizardForm.ClientWidth;
  ReadyOverlay.Height := WizardForm.Bevel.Top;
  ReadyOverlay.BevelOuter := bvNone;
  ReadyOverlay.Color := clWhite;
  ReadyOverlay.Visible := False;

  SidebarWidth := ScaleX(210);

  ReadySidebar := TPanel.Create(ReadyOverlay);
  ReadySidebar.Parent := ReadyOverlay;
  ReadySidebar.Left := 0;
  ReadySidebar.Top := 0;
  ReadySidebar.Width := SidebarWidth;
  ReadySidebar.Height := ReadyOverlay.Height;
  ReadySidebar.BevelOuter := bvNone;
  ReadySidebar.Color := $00F5F7FA;

  ReadyLogo := TBitmapImage.Create(ReadySidebar);
  ReadyLogo.Parent := ReadySidebar;
  ReadyLogo.Width := ScaleX(98);
  ReadyLogo.Height := ScaleY(98);
  ReadyLogo.Left := (SidebarWidth - ReadyLogo.Width) div 2;
  ReadyLogo.Top := ScaleY(48);
  ReadyLogo.Stretch := True;
  ReadyLogo.Bitmap.LoadFromFile(ExpandConstant('{tmp}\installer-logo.bmp'));

  ReadyBrand := TNewStaticText.Create(ReadySidebar);
  ReadyBrand.Parent := ReadySidebar;
  ReadyBrand.Left := ScaleX(16);
  ReadyBrand.Top := ReadyLogo.Top + ReadyLogo.Height + ScaleY(14);
  ReadyBrand.Width := SidebarWidth - ScaleX(32);
  ReadyBrand.Alignment := taCenter;
  ReadyBrand.Caption := 'Locks Tracker';
  ReadyBrand.Font.Size := 16;
  ReadyBrand.Font.Style := [fsBold];
  ReadyBrand.Transparent := True;

  ReadyVersion := TNewStaticText.Create(ReadySidebar);
  ReadyVersion.Parent := ReadySidebar;
  ReadyVersion.Left := ScaleX(16);
  ReadyVersion.Top := ReadyBrand.Top + ScaleY(30);
  ReadyVersion.Width := SidebarWidth - ScaleX(32);
  ReadyVersion.Alignment := taCenter;
  ReadyVersion.Caption := 'Installer v{#AppVersion}';
  ReadyVersion.Font.Size := 10;
  ReadyVersion.Font.Color := $00707070;
  ReadyVersion.Transparent := True;

  ReadyStep1 := TNewStaticText.Create(ReadySidebar);
  ReadyStep1.Parent := ReadySidebar;
  ReadyStep1.Left := ScaleX(36);
  ReadyStep1.Top := ScaleY(248);
  ReadyStep1.Width := SidebarWidth - ScaleX(50);
  ReadyStep1.Caption := '1. Ready to Install';
  ReadyStep1.Font.Size := 11;
  ReadyStep1.Font.Style := [fsBold];
  ReadyStep1.Transparent := True;

  ReadyStep2 := TNewStaticText.Create(ReadySidebar);
  ReadyStep2.Parent := ReadySidebar;
  ReadyStep2.Left := ReadyStep1.Left;
  ReadyStep2.Top := ReadyStep1.Top + ScaleY(36);
  ReadyStep2.Width := ReadyStep1.Width;
  ReadyStep2.Caption := '2. Installing Files';
  ReadyStep2.Font.Size := 10;
  ReadyStep2.Font.Color := $00909090;
  ReadyStep2.Transparent := True;

  ReadyStep3 := TNewStaticText.Create(ReadySidebar);
  ReadyStep3.Parent := ReadySidebar;
  ReadyStep3.Left := ReadyStep1.Left;
  ReadyStep3.Top := ReadyStep2.Top + ScaleY(36);
  ReadyStep3.Width := ReadyStep1.Width;
  ReadyStep3.Caption := '3. Complete';
  ReadyStep3.Font.Size := 10;
  ReadyStep3.Font.Color := $00A0A0A0;
  ReadyStep3.Transparent := True;

  ContentLeft := SidebarWidth + ScaleX(28);
  ContentWidth := ReadyOverlay.Width - ContentLeft - ScaleX(28);

  ReadyTitle := TNewStaticText.Create(ReadyOverlay);
  ReadyTitle.Parent := ReadyOverlay;
  ReadyTitle.Left := ContentLeft;
  ReadyTitle.Top := ScaleY(42);
  ReadyTitle.Width := ContentWidth;
  ReadyTitle.Caption := 'Ready to Install';
  ReadyTitle.Font.Size := 22;
  ReadyTitle.Font.Style := [fsBold];
  ReadyTitle.Transparent := True;

  ReadyIntro := TNewStaticText.Create(ReadyOverlay);
  ReadyIntro.Parent := ReadyOverlay;
  ReadyIntro.Left := ContentLeft;
  ReadyIntro.Top := ReadyTitle.Top + ScaleY(48);
  ReadyIntro.Width := ContentWidth;
  ReadyIntro.AutoSize := False;
  ReadyIntro.Height := ScaleY(52);
  ReadyIntro.WordWrap := True;
  ReadyIntro.Caption := 'Setup is now ready to install Locks Tracker on your computer.';
  ReadyIntro.Font.Size := 11;
  ReadyIntro.Transparent := True;

  ReadyInstruction := TNewStaticText.Create(ReadyOverlay);
  ReadyInstruction.Parent := ReadyOverlay;
  ReadyInstruction.Left := ContentLeft;
  ReadyInstruction.Top := ReadyIntro.Top + ScaleY(64);
  ReadyInstruction.Width := ContentWidth;
  ReadyInstruction.Caption := 'Click Install to continue with the installation.';
  ReadyInstruction.Font.Size := 11;
  ReadyInstruction.Transparent := True;

  ReadySummary := TPanel.Create(ReadyOverlay);
  ReadySummary.Parent := ReadyOverlay;
  ReadySummary.Left := ContentLeft;
  ReadySummary.Top := ReadyInstruction.Top + ScaleY(48);
  ReadySummary.Width := ContentWidth;
  ReadySummary.Height := ScaleY(142);
  ReadySummary.Color := $00FAFAFA;
  ReadySummary.BevelOuter := bvLowered;

  ReadySummaryTitle := TNewStaticText.Create(ReadySummary);
  ReadySummaryTitle.Parent := ReadySummary;
  ReadySummaryTitle.Left := ScaleX(18);
  ReadySummaryTitle.Top := ScaleY(14);
  ReadySummaryTitle.Width := ReadySummary.Width - ScaleX(36);
  ReadySummaryTitle.Caption := 'Installation Summary';
  ReadySummaryTitle.Font.Size := 12;
  ReadySummaryTitle.Font.Style := [fsBold];
  ReadySummaryTitle.Transparent := True;

  ReadyDestination := TNewStaticText.Create(ReadySummary);
  ReadyDestination.Parent := ReadySummary;
  ReadyDestination.Left := ScaleX(26);
  ReadyDestination.Top := ScaleY(50);
  ReadyDestination.Width := ReadySummary.Width - ScaleX(52);
  ReadyDestination.AutoSize := False;
  ReadyDestination.Height := ScaleY(22);
  ReadyDestination.Font.Size := 10;
  ReadyDestination.Transparent := True;

  ReadyVersionLine := TNewStaticText.Create(ReadySummary);
  ReadyVersionLine.Parent := ReadySummary;
  ReadyVersionLine.Left := ReadyDestination.Left;
  ReadyVersionLine.Top := ReadyDestination.Top + ScaleY(28);
  ReadyVersionLine.Width := ReadyDestination.Width;
  ReadyVersionLine.Caption := 'Version to install: v{#AppVersion}';
  ReadyVersionLine.Font.Size := 10;
  ReadyVersionLine.Transparent := True;

  ReadyTimeLine := TNewStaticText.Create(ReadySummary);
  ReadyTimeLine.Parent := ReadySummary;
  ReadyTimeLine.Left := ReadyDestination.Left;
  ReadyTimeLine.Top := ReadyVersionLine.Top + ScaleY(28);
  ReadyTimeLine.Width := ReadyDestination.Width;
  ReadyTimeLine.Caption := 'Estimated time: About 2 minutes';
  ReadyTimeLine.Font.Size := 10;
  ReadyTimeLine.Transparent := True;
end;

procedure InitializeWizard;
begin
  BuildOptionsPage;
  BuildReadyPage;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if Assigned(OptionsOverlay) then
  begin
    OptionsOverlay.Visible := (CurPageID = OptionsPage.ID);
    if OptionsOverlay.Visible then
      OptionsOverlay.BringToFront;
  end;

  if Assigned(ReadyOverlay) then
  begin
    ReadyOverlay.Visible := (CurPageID = wpReady);
    if ReadyOverlay.Visible then
    begin
      ReadyDestination.Caption := 'Destination: ' + ExpandConstant('{app}');
      ReadyOverlay.BringToFront;
    end;
  end;
end;