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
WizardStyle=modern windows11
WizardBackColor=#ffffff
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

  WelcomeOverlay: TPanel;
  WelcomeSidebar: TPanel;
  WelcomeLogo: TBitmapImage;
  WelcomeBrand: TNewStaticText;
  WelcomeVersion: TNewStaticText;
  WelcomeStep1: TNewStaticText;
  WelcomeStep2: TNewStaticText;
  WelcomeStep3: TNewStaticText;
  WelcomeStep4: TNewStaticText;
  WelcomeTitle: TNewStaticText;
  WelcomeIntro: TNewStaticText;
  WelcomeInfo: TPanel;
  WelcomeInfoTitle: TNewStaticText;
  WelcomeInfo1: TNewStaticText;
  WelcomeInfo2: TNewStaticText;
  WelcomeInfo3: TNewStaticText;
  WelcomeContinue: TNewStaticText;

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

procedure BuildWelcomePage;
var
  SidebarWidth: Integer;
  ContentLeft: Integer;
  ContentWidth: Integer;
begin
  ExtractTemporaryFile('installer-logo.bmp');

  WelcomeOverlay := TPanel.Create(WizardForm);
  WelcomeOverlay.Parent := WizardForm;
  WelcomeOverlay.Left := 0;
  WelcomeOverlay.Top := 0;
  WelcomeOverlay.Width := WizardForm.ClientWidth;
  WelcomeOverlay.Height := WizardForm.Bevel.Top;
  WelcomeOverlay.BevelOuter := bvNone;
  WelcomeOverlay.Color := clWhite;
  WelcomeOverlay.Visible := False;

  SidebarWidth := ScaleX(210);
  WelcomeSidebar := TPanel.Create(WelcomeOverlay);
  WelcomeSidebar.Parent := WelcomeOverlay;
  WelcomeSidebar.Left := 0;
  WelcomeSidebar.Top := 0;
  WelcomeSidebar.Width := SidebarWidth;
  WelcomeSidebar.Height := WelcomeOverlay.Height;
  WelcomeSidebar.BevelOuter := bvNone;
  WelcomeSidebar.Color := $00F5F7FA;

  WelcomeLogo := TBitmapImage.Create(WelcomeSidebar);
  WelcomeLogo.Parent := WelcomeSidebar;
  WelcomeLogo.Width := ScaleX(98);
  WelcomeLogo.Height := ScaleY(98);
  WelcomeLogo.Left := (SidebarWidth - WelcomeLogo.Width) div 2;
  WelcomeLogo.Top := ScaleY(46);
  WelcomeLogo.Stretch := True;
  WelcomeLogo.Bitmap.LoadFromFile(ExpandConstant('{tmp}\installer-logo.bmp'));

  WelcomeBrand := TNewStaticText.Create(WelcomeSidebar);
  WelcomeBrand.Parent := WelcomeSidebar;
  WelcomeBrand.Left := ScaleX(16);
  WelcomeBrand.Top := WelcomeLogo.Top + WelcomeLogo.Height + ScaleY(14);
  WelcomeBrand.Width := SidebarWidth - ScaleX(32);
  WelcomeBrand.Alignment := taCenter;
  WelcomeBrand.Caption := 'Locks Tracker';
  WelcomeBrand.Font.Size := 16;
  WelcomeBrand.Font.Style := [fsBold];
  WelcomeBrand.Color := WelcomeSidebar.Color;

  WelcomeVersion := TNewStaticText.Create(WelcomeSidebar);
  WelcomeVersion.Parent := WelcomeSidebar;
  WelcomeVersion.Left := ScaleX(16);
  WelcomeVersion.Top := WelcomeBrand.Top + ScaleY(30);
  WelcomeVersion.Width := SidebarWidth - ScaleX(32);
  WelcomeVersion.Alignment := taCenter;
  WelcomeVersion.Caption := 'Installer v{#AppVersion}';
  WelcomeVersion.Font.Size := 10;
  WelcomeVersion.Font.Color := $00707070;
  WelcomeVersion.Color := WelcomeSidebar.Color;

  WelcomeStep1 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep1.Parent := WelcomeSidebar;
  WelcomeStep1.Left := ScaleX(36);
  WelcomeStep1.Top := ScaleY(246);
  WelcomeStep1.Width := SidebarWidth - ScaleX(50);
  WelcomeStep1.Caption := '1. Welcome';
  WelcomeStep1.Font.Size := 11;
  WelcomeStep1.Font.Style := [fsBold];
  WelcomeStep1.Color := WelcomeSidebar.Color;

  WelcomeStep2 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep2.Parent := WelcomeSidebar;
  WelcomeStep2.Left := WelcomeStep1.Left;
  WelcomeStep2.Top := WelcomeStep1.Top + ScaleY(34);
  WelcomeStep2.Width := WelcomeStep1.Width;
  WelcomeStep2.Caption := '2. Options';
  WelcomeStep2.Font.Size := 10;
  WelcomeStep2.Font.Color := $00909090;
  WelcomeStep2.Color := WelcomeSidebar.Color;

  WelcomeStep3 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep3.Parent := WelcomeSidebar;
  WelcomeStep3.Left := WelcomeStep1.Left;
  WelcomeStep3.Top := WelcomeStep2.Top + ScaleY(34);
  WelcomeStep3.Width := WelcomeStep1.Width;
  WelcomeStep3.Caption := '3. Install';
  WelcomeStep3.Font.Size := 10;
  WelcomeStep3.Font.Color := $00909090;
  WelcomeStep3.Color := WelcomeSidebar.Color;

  WelcomeStep4 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep4.Parent := WelcomeSidebar;
  WelcomeStep4.Left := WelcomeStep1.Left;
  WelcomeStep4.Top := WelcomeStep3.Top + ScaleY(34);
  WelcomeStep4.Width := WelcomeStep1.Width;
  WelcomeStep4.Caption := '4. Complete';
  WelcomeStep4.Font.Size := 10;
  WelcomeStep4.Font.Color := $00A0A0A0;
  WelcomeStep4.Color := WelcomeSidebar.Color;

  ContentLeft := SidebarWidth + ScaleX(30);
  ContentWidth := WelcomeOverlay.Width - ContentLeft - ScaleX(30);

  WelcomeTitle := TNewStaticText.Create(WelcomeOverlay);
  WelcomeTitle.Parent := WelcomeOverlay;
  WelcomeTitle.Left := ContentLeft;
  WelcomeTitle.Top := ScaleY(44);
  WelcomeTitle.Width := ContentWidth;
  WelcomeTitle.Caption := 'Welcome to Locks Tracker';
  WelcomeTitle.Font.Size := 22;
  WelcomeTitle.Font.Style := [fsBold];
  WelcomeTitle.Color := clWhite;

  WelcomeIntro := TNewStaticText.Create(WelcomeOverlay);
  WelcomeIntro.Parent := WelcomeOverlay;
  WelcomeIntro.Left := ContentLeft;
  WelcomeIntro.Top := WelcomeTitle.Top + ScaleY(52);
  WelcomeIntro.Width := ContentWidth;
  WelcomeIntro.AutoSize := False;
  WelcomeIntro.Height := ScaleY(60);
  WelcomeIntro.WordWrap := True;
  WelcomeIntro.Caption := 'This setup wizard will install Locks Tracker on your computer and prepare it for automatic updates.';
  WelcomeIntro.Font.Size := 11;
  WelcomeIntro.Color := clWhite;

  WelcomeInfo := TPanel.Create(WelcomeOverlay);
  WelcomeInfo.Parent := WelcomeOverlay;
  WelcomeInfo.Left := ContentLeft;
  WelcomeInfo.Top := WelcomeIntro.Top + ScaleY(76);
  WelcomeInfo.Width := ContentWidth;
  WelcomeInfo.Height := ScaleY(146);
  WelcomeInfo.Color := $00FAFAFA;
  WelcomeInfo.BevelOuter := bvLowered;

  WelcomeInfoTitle := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfoTitle.Parent := WelcomeInfo;
  WelcomeInfoTitle.Left := ScaleX(18);
  WelcomeInfoTitle.Top := ScaleY(14);
  WelcomeInfoTitle.Width := WelcomeInfo.Width - ScaleX(36);
  WelcomeInfoTitle.Caption := 'Setup will:';
  WelcomeInfoTitle.Font.Size := 12;
  WelcomeInfoTitle.Font.Style := [fsBold];
  WelcomeInfoTitle.Color := WelcomeInfo.Color;

  WelcomeInfo1 := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfo1.Parent := WelcomeInfo;
  WelcomeInfo1.Left := ScaleX(26);
  WelcomeInfo1.Top := ScaleY(50);
  WelcomeInfo1.Width := WelcomeInfo.Width - ScaleX(52);
  WelcomeInfo1.Caption := '- Install the Locks Tracker desktop app';
  WelcomeInfo1.Font.Size := 10;
  WelcomeInfo1.Color := WelcomeInfo.Color;

  WelcomeInfo2 := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfo2.Parent := WelcomeInfo;
  WelcomeInfo2.Left := WelcomeInfo1.Left;
  WelcomeInfo2.Top := WelcomeInfo1.Top + ScaleY(28);
  WelcomeInfo2.Width := WelcomeInfo1.Width;
  WelcomeInfo2.Caption := '- Keep automatic updates enabled';
  WelcomeInfo2.Font.Size := 10;
  WelcomeInfo2.Color := WelcomeInfo.Color;

  WelcomeInfo3 := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfo3.Parent := WelcomeInfo;
  WelcomeInfo3.Left := WelcomeInfo1.Left;
  WelcomeInfo3.Top := WelcomeInfo2.Top + ScaleY(28);
  WelcomeInfo3.Width := WelcomeInfo1.Width;
  WelcomeInfo3.Caption := '- Let you choose whether to create a desktop shortcut';
  WelcomeInfo3.Font.Size := 10;
  WelcomeInfo3.Color := WelcomeInfo.Color;

  WelcomeContinue := TNewStaticText.Create(WelcomeOverlay);
  WelcomeContinue.Parent := WelcomeOverlay;
  WelcomeContinue.Left := ContentLeft;
  WelcomeContinue.Top := WelcomeInfo.Top + WelcomeInfo.Height + ScaleY(24);
  WelcomeContinue.Width := ContentWidth;
  WelcomeContinue.Caption := 'Click Next to continue.';
  WelcomeContinue.Font.Size := 10;
  WelcomeContinue.Font.Color := $00707070;
  WelcomeContinue.Color := clWhite;
end;
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
  OptionsTitle.Color := clWhite;

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
  OptionsIntro.Color := clWhite;

  OptionsGroup := TNewStaticText.Create(OptionsOverlay);
  OptionsGroup.Parent := OptionsOverlay;
  OptionsGroup.Left := ContentLeft;
  OptionsGroup.Top := OptionsIntro.Top + OptionsIntro.Height + ScaleY(30);
  OptionsGroup.Width := OptionsTitle.Width;
  OptionsGroup.Caption := 'Additional shortcuts';
  OptionsGroup.Font.Size := 12;
  OptionsGroup.Font.Style := [fsBold];
  OptionsGroup.Color := clWhite;

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
  OptionsHint.Color := clWhite;
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

  SidebarWidth := (ReadyOverlay.Width * 28) div 100;

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
  ReadyLogo.Width := (SidebarWidth * 58) div 100;
  ReadyLogo.Height := ReadyLogo.Width;
  ReadyLogo.Left := (SidebarWidth - ReadyLogo.Width) div 2;
  ReadyLogo.Top := ScaleY(26);
  ReadyLogo.Stretch := True;
  ReadyLogo.Bitmap.LoadFromFile(ExpandConstant('{tmp}\installer-logo.bmp'));

  ReadyBrand := TNewStaticText.Create(ReadySidebar);
  ReadyBrand.Parent := ReadySidebar;
  ReadyBrand.Left := ScaleX(16);
  ReadyBrand.Top := ReadyLogo.Top + ReadyLogo.Height + ScaleY(10);
  ReadyBrand.Width := SidebarWidth - ScaleX(32);
  ReadyBrand.Alignment := taCenter;
  ReadyBrand.Caption := 'Locks Tracker';
  ReadyBrand.Font.Size := 13;
  ReadyBrand.Font.Style := [fsBold];
  ReadyBrand.Color := ReadySidebar.Color;

  ReadyVersion := TNewStaticText.Create(ReadySidebar);
  ReadyVersion.Parent := ReadySidebar;
  ReadyVersion.Left := ScaleX(16);
  ReadyVersion.Top := ReadyBrand.Top + ScaleY(25);
  ReadyVersion.Width := SidebarWidth - ScaleX(32);
  ReadyVersion.Alignment := taCenter;
  ReadyVersion.Caption := 'Installer v{#AppVersion}';
  ReadyVersion.Font.Size := 9;
  ReadyVersion.Font.Color := $00707070;
  ReadyVersion.Color := ReadySidebar.Color;

  ReadyStep1 := TNewStaticText.Create(ReadySidebar);
  ReadyStep1.Parent := ReadySidebar;
  ReadyStep1.Left := ScaleX(28);
  ReadyStep1.Top := (ReadySidebar.Height * 58) div 100;
  ReadyStep1.Width := SidebarWidth - ScaleX(50);
  ReadyStep1.Caption := '1. Ready to Install';
  ReadyStep1.Font.Size := 9;
  ReadyStep1.Font.Style := [fsBold];
  ReadyStep1.Color := ReadySidebar.Color;

  ReadyStep2 := TNewStaticText.Create(ReadySidebar);
  ReadyStep2.Parent := ReadySidebar;
  ReadyStep2.Left := ReadyStep1.Left;
  ReadyStep2.Top := ReadyStep1.Top + ScaleY(32);
  ReadyStep2.Width := ReadyStep1.Width;
  ReadyStep2.Caption := '2. Installing Files';
  ReadyStep2.Font.Size := 9;
  ReadyStep2.Font.Color := $00909090;
  ReadyStep2.Color := ReadySidebar.Color;

  ReadyStep3 := TNewStaticText.Create(ReadySidebar);
  ReadyStep3.Parent := ReadySidebar;
  ReadyStep3.Left := ReadyStep1.Left;
  ReadyStep3.Top := ReadyStep2.Top + ScaleY(32);
  ReadyStep3.Width := ReadyStep1.Width;
  ReadyStep3.Caption := '3. Complete';
  ReadyStep3.Font.Size := 9;
  ReadyStep3.Font.Color := $00A0A0A0;
  ReadyStep3.Color := ReadySidebar.Color;

  ContentLeft := SidebarWidth + ScaleX(24);
  ContentWidth := ReadyOverlay.Width - ContentLeft - ScaleX(24);

  ReadyTitle := TNewStaticText.Create(ReadyOverlay);
  ReadyTitle.Parent := ReadyOverlay;
  ReadyTitle.Left := ContentLeft;
  ReadyTitle.Top := ScaleY(24);
  ReadyTitle.Width := ContentWidth;
  ReadyTitle.Caption := 'Ready to Install';
  ReadyTitle.Font.Size := 18;
  ReadyTitle.Font.Style := [fsBold];
  ReadyTitle.Color := clWhite;

  ReadyIntro := TNewStaticText.Create(ReadyOverlay);
  ReadyIntro.Parent := ReadyOverlay;
  ReadyIntro.Left := ContentLeft;
  ReadyIntro.Top := ReadyTitle.Top + ScaleY(42);
  ReadyIntro.Width := ContentWidth;
  ReadyIntro.AutoSize := False;
  ReadyIntro.Height := ScaleY(42);
  ReadyIntro.WordWrap := True;
  ReadyIntro.Caption := 'Setup is now ready to install Locks Tracker on your computer.';
  ReadyIntro.Font.Size := 10;
  ReadyIntro.Color := clWhite;

  ReadyInstruction := TNewStaticText.Create(ReadyOverlay);
  ReadyInstruction.Parent := ReadyOverlay;
  ReadyInstruction.Left := ContentLeft;
  ReadyInstruction.Top := ReadyIntro.Top + ScaleY(52);
  ReadyInstruction.Width := ContentWidth;
  ReadyInstruction.Caption := 'Click Install to continue with the installation.';
  ReadyInstruction.Font.Size := 10;
  ReadyInstruction.Color := clWhite;

  ReadySummary := TPanel.Create(ReadyOverlay);
  ReadySummary.Parent := ReadyOverlay;
  ReadySummary.Left := ContentLeft;
  ReadySummary.Top := ReadyInstruction.Top + ScaleY(38);
  ReadySummary.Width := ContentWidth;
  ReadySummary.Height := ScaleY(126);
  ReadySummary.Color := $00FAFAFA;
  ReadySummary.BevelOuter := bvLowered;

  ReadySummaryTitle := TNewStaticText.Create(ReadySummary);
  ReadySummaryTitle.Parent := ReadySummary;
  ReadySummaryTitle.Left := ScaleX(18);
  ReadySummaryTitle.Top := ScaleY(12);
  ReadySummaryTitle.Width := ReadySummary.Width - ScaleX(36);
  ReadySummaryTitle.Caption := 'Installation Summary';
  ReadySummaryTitle.Font.Size := 10;
  ReadySummaryTitle.Font.Style := [fsBold];
  ReadySummaryTitle.Color := ReadySummary.Color;

  ReadyDestination := TNewStaticText.Create(ReadySummary);
  ReadyDestination.Parent := ReadySummary;
  ReadyDestination.Left := ScaleX(24);
  ReadyDestination.Top := ScaleY(44);
  ReadyDestination.Width := ReadySummary.Width - ScaleX(52);
  ReadyDestination.AutoSize := False;
  ReadyDestination.Height := ScaleY(22);
  ReadyDestination.Font.Size := 9;
  ReadyDestination.Color := ReadySummary.Color;

  ReadyVersionLine := TNewStaticText.Create(ReadySummary);
  ReadyVersionLine.Parent := ReadySummary;
  ReadyVersionLine.Left := ReadyDestination.Left;
  ReadyVersionLine.Top := ReadyDestination.Top + ScaleY(25);
  ReadyVersionLine.Width := ReadyDestination.Width;
  ReadyVersionLine.Caption := 'Version to install: v{#AppVersion}';
  ReadyVersionLine.Font.Size := 9;
  ReadyVersionLine.Color := ReadySummary.Color;

  ReadyTimeLine := TNewStaticText.Create(ReadySummary);
  ReadyTimeLine.Parent := ReadySummary;
  ReadyTimeLine.Left := ReadyDestination.Left;
  ReadyTimeLine.Top := ReadyVersionLine.Top + ScaleY(25);
  ReadyTimeLine.Width := ReadyDestination.Width;
  ReadyTimeLine.Caption := 'Estimated time: About 2 minutes';
  ReadyTimeLine.Font.Size := 9;
  ReadyTimeLine.Color := ReadySummary.Color;
end;

procedure InitializeWizard;
begin
  BuildWelcomePage;
  BuildOptionsPage;
  BuildReadyPage;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if Assigned(WelcomeOverlay) then
  begin
    WelcomeOverlay.Visible := (CurPageID = wpWelcome);
    if WelcomeOverlay.Visible then
      WelcomeOverlay.BringToFront;
  end;
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