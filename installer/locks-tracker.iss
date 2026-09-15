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

  SidebarWidth := (WelcomeOverlay.Width * 29) div 100;

  WelcomeSidebar := TPanel.Create(WelcomeOverlay);
  WelcomeSidebar.Parent := WelcomeOverlay;
  WelcomeSidebar.Left := 0;
  WelcomeSidebar.Top := 0;
  WelcomeSidebar.Width := SidebarWidth;
  WelcomeSidebar.Height := WelcomeOverlay.Height;
  WelcomeSidebar.BevelOuter := bvNone;
  WelcomeSidebar.Color := $00FAF7F3;

  WelcomeLogo := TBitmapImage.Create(WelcomeSidebar);
  WelcomeLogo.Parent := WelcomeSidebar;
  WelcomeLogo.Width := (SidebarWidth * 52) div 100;
  WelcomeLogo.Height := WelcomeLogo.Width;
  WelcomeLogo.Left := (SidebarWidth - WelcomeLogo.Width) div 2;
  WelcomeLogo.Top := ScaleY(34);
  WelcomeLogo.Stretch := True;
  WelcomeLogo.Bitmap.LoadFromFile(ExpandConstant('{tmp}\installer-logo.bmp'));

  WelcomeBrand := TNewStaticText.Create(WelcomeSidebar);
  WelcomeBrand.Parent := WelcomeSidebar;
  WelcomeBrand.Left := ScaleX(14);
  WelcomeBrand.Top := WelcomeLogo.Top + WelcomeLogo.Height + ScaleY(12);
  WelcomeBrand.Width := SidebarWidth - ScaleX(28);
  WelcomeBrand.Alignment := taCenter;
  WelcomeBrand.Caption := 'Locks Tracker';
  WelcomeBrand.Font.Name := 'Segoe UI';
  WelcomeBrand.Font.Size := 17;
  WelcomeBrand.Font.Style := [fsBold];
  WelcomeBrand.Color := WelcomeSidebar.Color;

  WelcomeVersion := TNewStaticText.Create(WelcomeSidebar);
  WelcomeVersion.Parent := WelcomeSidebar;
  WelcomeVersion.Left := ScaleX(14);
  WelcomeVersion.Top := WelcomeBrand.Top + ScaleY(31);
  WelcomeVersion.Width := SidebarWidth - ScaleX(28);
  WelcomeVersion.Alignment := taCenter;
  WelcomeVersion.Caption := 'Installer v{#AppVersion}';
  WelcomeVersion.Font.Name := 'Segoe UI';
  WelcomeVersion.Font.Size := 9;
  WelcomeVersion.Font.Color := $00747B84;
  WelcomeVersion.Color := WelcomeSidebar.Color;

  WelcomeStep1 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep1.Parent := WelcomeSidebar;
  WelcomeStep1.Left := ScaleX(27);
  WelcomeStep1.Top := (WelcomeSidebar.Height * 57) div 100;
  WelcomeStep1.Width := SidebarWidth - ScaleX(40);
  WelcomeStep1.Caption := '●  1. Welcome';
  WelcomeStep1.Font.Name := 'Segoe UI';
  WelcomeStep1.Font.Size := 10;
  WelcomeStep1.Font.Style := [fsBold];
  WelcomeStep1.Font.Color := $00E98B17;
  WelcomeStep1.Color := WelcomeSidebar.Color;

  WelcomeStep2 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep2.Parent := WelcomeSidebar;
  WelcomeStep2.Left := WelcomeStep1.Left;
  WelcomeStep2.Top := WelcomeStep1.Top + ScaleY(34);
  WelcomeStep2.Width := WelcomeStep1.Width;
  WelcomeStep2.Caption := '○  2. Installation Options';
  WelcomeStep2.Font.Name := 'Segoe UI';
  WelcomeStep2.Font.Size := 9;
  WelcomeStep2.Font.Color := $00969CA4;
  WelcomeStep2.Color := WelcomeSidebar.Color;

  WelcomeStep3 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep3.Parent := WelcomeSidebar;
  WelcomeStep3.Left := WelcomeStep1.Left;
  WelcomeStep3.Top := WelcomeStep2.Top + ScaleY(34);
  WelcomeStep3.Width := WelcomeStep1.Width;
  WelcomeStep3.Caption := '○  3. Ready to Install';
  WelcomeStep3.Font.Name := 'Segoe UI';
  WelcomeStep3.Font.Size := 9;
  WelcomeStep3.Font.Color := $00969CA4;
  WelcomeStep3.Color := WelcomeSidebar.Color;

  WelcomeStep4 := TNewStaticText.Create(WelcomeSidebar);
  WelcomeStep4.Parent := WelcomeSidebar;
  WelcomeStep4.Left := WelcomeStep1.Left;
  WelcomeStep4.Top := WelcomeStep3.Top + ScaleY(34);
  WelcomeStep4.Width := WelcomeStep1.Width;
  WelcomeStep4.Caption := '○  4. Complete';
  WelcomeStep4.Font.Name := 'Segoe UI';
  WelcomeStep4.Font.Size := 9;
  WelcomeStep4.Font.Color := $00969CA4;
  WelcomeStep4.Color := WelcomeSidebar.Color;

  ContentLeft := SidebarWidth + ScaleX(32);
  ContentWidth := WelcomeOverlay.Width - ContentLeft - ScaleX(28);

  WelcomeTitle := TNewStaticText.Create(WelcomeOverlay);
  WelcomeTitle.Parent := WelcomeOverlay;
  WelcomeTitle.Left := ContentLeft;
  WelcomeTitle.Top := ScaleY(38);
  WelcomeTitle.Width := ContentWidth;
  WelcomeTitle.AutoSize := False;
  WelcomeTitle.Height := ScaleY(42);
  WelcomeTitle.Caption := 'Welcome to the Locks Tracker Installer';
  WelcomeTitle.Font.Name := 'Segoe UI';
  WelcomeTitle.Font.Size := 20;
  WelcomeTitle.Font.Style := [fsBold];
  WelcomeTitle.Color := clWhite;

  WelcomeIntro := TNewStaticText.Create(WelcomeOverlay);
  WelcomeIntro.Parent := WelcomeOverlay;
  WelcomeIntro.Left := ContentLeft;
  WelcomeIntro.Top := WelcomeTitle.Top + ScaleY(52);
  WelcomeIntro.Width := ContentWidth;
  WelcomeIntro.AutoSize := False;
  WelcomeIntro.Height := ScaleY(58);
  WelcomeIntro.WordWrap := True;
  WelcomeIntro.Caption := 'This setup wizard will guide you through installing Locks Tracker on your computer.';
  WelcomeIntro.Font.Name := 'Segoe UI';
  WelcomeIntro.Font.Size := 11;
  WelcomeIntro.Color := clWhite;

  WelcomeContinue := TNewStaticText.Create(WelcomeOverlay);
  WelcomeContinue.Parent := WelcomeOverlay;
  WelcomeContinue.Left := ContentLeft;
  WelcomeContinue.Top := WelcomeIntro.Top + ScaleY(48);
  WelcomeContinue.Width := ContentWidth;
  WelcomeContinue.AutoSize := False;
  WelcomeContinue.Height := ScaleY(34);
  WelcomeContinue.Caption := 'It only takes a few moments to complete the installation.';
  WelcomeContinue.Font.Name := 'Segoe UI';
  WelcomeContinue.Font.Size := 10;
  WelcomeContinue.Font.Color := $00545A62;
  WelcomeContinue.Color := clWhite;

  WelcomeInfo := TPanel.Create(WelcomeOverlay);
  WelcomeInfo.Parent := WelcomeOverlay;
  WelcomeInfo.Left := ContentLeft;
  WelcomeInfo.Top := WelcomeContinue.Top + ScaleY(48);
  WelcomeInfo.Width := ContentWidth;
  WelcomeInfo.Height := ScaleY(150);
  WelcomeInfo.Color := $00FCFBFA;
  WelcomeInfo.BevelOuter := bvLowered;

  WelcomeInfoTitle := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfoTitle.Parent := WelcomeInfo;
  WelcomeInfoTitle.Left := ScaleX(20);
  WelcomeInfoTitle.Top := ScaleY(16);
  WelcomeInfoTitle.Width := WelcomeInfo.Width - ScaleX(40);
  WelcomeInfoTitle.Caption := 'What this installer will do:';
  WelcomeInfoTitle.Font.Name := 'Segoe UI';
  WelcomeInfoTitle.Font.Size := 12;
  WelcomeInfoTitle.Font.Style := [fsBold];
  WelcomeInfoTitle.Color := WelcomeInfo.Color;

  WelcomeInfo1 := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfo1.Parent := WelcomeInfo;
  WelcomeInfo1.Left := ScaleX(26);
  WelcomeInfo1.Top := ScaleY(52);
  WelcomeInfo1.Width := WelcomeInfo.Width - ScaleX(52);
  WelcomeInfo1.Caption := '•  Install the latest version of Locks Tracker';
  WelcomeInfo1.Font.Name := 'Segoe UI';
  WelcomeInfo1.Font.Size := 10;
  WelcomeInfo1.Color := WelcomeInfo.Color;

  WelcomeInfo2 := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfo2.Parent := WelcomeInfo;
  WelcomeInfo2.Left := WelcomeInfo1.Left;
  WelcomeInfo2.Top := WelcomeInfo1.Top + ScaleY(29);
  WelcomeInfo2.Width := WelcomeInfo1.Width;
  WelcomeInfo2.Caption := '•  Create optional shortcuts for quick access';
  WelcomeInfo2.Font.Name := 'Segoe UI';
  WelcomeInfo2.Font.Size := 10;
  WelcomeInfo2.Color := WelcomeInfo.Color;

  WelcomeInfo3 := TNewStaticText.Create(WelcomeInfo);
  WelcomeInfo3.Parent := WelcomeInfo;
  WelcomeInfo3.Left := WelcomeInfo1.Left;
  WelcomeInfo3.Top := WelcomeInfo2.Top + ScaleY(29);
  WelcomeInfo3.Width := WelcomeInfo1.Width;
  WelcomeInfo3.Caption := '•  Keep the app ready for future automatic updates';
  WelcomeInfo3.Font.Name := 'Segoe UI';
  WelcomeInfo3.Font.Size := 10;
  WelcomeInfo3.Color := WelcomeInfo.Color;
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

  SidebarWidth := (ReadyOverlay.Width * 29) div 100;

  ReadySidebar := TPanel.Create(ReadyOverlay);
  ReadySidebar.Parent := ReadyOverlay;
  ReadySidebar.Left := 0;
  ReadySidebar.Top := 0;
  ReadySidebar.Width := SidebarWidth;
  ReadySidebar.Height := ReadyOverlay.Height;
  ReadySidebar.BevelOuter := bvNone;
  ReadySidebar.Color := $00FAF7F3;

  ReadyLogo := TBitmapImage.Create(ReadySidebar);
  ReadyLogo.Parent := ReadySidebar;
  ReadyLogo.Width := (SidebarWidth * 52) div 100;
  ReadyLogo.Height := ReadyLogo.Width;
  ReadyLogo.Left := (SidebarWidth - ReadyLogo.Width) div 2;
  ReadyLogo.Top := ScaleY(34);
  ReadyLogo.Stretch := True;
  ReadyLogo.Bitmap.LoadFromFile(ExpandConstant('{tmp}\installer-logo.bmp'));

  ReadyBrand := TNewStaticText.Create(ReadySidebar);
  ReadyBrand.Parent := ReadySidebar;
  ReadyBrand.Left := ScaleX(14);
  ReadyBrand.Top := ReadyLogo.Top + ReadyLogo.Height + ScaleY(12);
  ReadyBrand.Width := SidebarWidth - ScaleX(28);
  ReadyBrand.Alignment := taCenter;
  ReadyBrand.Caption := 'Locks Tracker';
  ReadyBrand.Font.Name := 'Segoe UI';
  ReadyBrand.Font.Size := 17;
  ReadyBrand.Font.Style := [fsBold];
  ReadyBrand.Color := ReadySidebar.Color;

  ReadyVersion := TNewStaticText.Create(ReadySidebar);
  ReadyVersion.Parent := ReadySidebar;
  ReadyVersion.Left := ScaleX(14);
  ReadyVersion.Top := ReadyBrand.Top + ScaleY(31);
  ReadyVersion.Width := SidebarWidth - ScaleX(28);
  ReadyVersion.Alignment := taCenter;
  ReadyVersion.Caption := 'Installer v{#AppVersion}';
  ReadyVersion.Font.Name := 'Segoe UI';
  ReadyVersion.Font.Size := 9;
  ReadyVersion.Font.Color := $00747B84;
  ReadyVersion.Color := ReadySidebar.Color;

  ReadyStep1 := TNewStaticText.Create(ReadySidebar);
  ReadyStep1.Parent := ReadySidebar;
  ReadyStep1.Left := ScaleX(27);
  ReadyStep1.Top := (ReadySidebar.Height * 59) div 100;
  ReadyStep1.Width := SidebarWidth - ScaleX(40);
  ReadyStep1.Caption := '●  1. Ready to Install';
  ReadyStep1.Font.Name := 'Segoe UI';
  ReadyStep1.Font.Size := 10;
  ReadyStep1.Font.Style := [fsBold];
  ReadyStep1.Font.Color := $00E98B17;
  ReadyStep1.Color := ReadySidebar.Color;

  ReadyStep2 := TNewStaticText.Create(ReadySidebar);
  ReadyStep2.Parent := ReadySidebar;
  ReadyStep2.Left := ReadyStep1.Left;
  ReadyStep2.Top := ReadyStep1.Top + ScaleY(38);
  ReadyStep2.Width := ReadyStep1.Width;
  ReadyStep2.Caption := '○  2. Installing Files';
  ReadyStep2.Font.Name := 'Segoe UI';
  ReadyStep2.Font.Size := 9;
  ReadyStep2.Font.Color := $00969CA4;
  ReadyStep2.Color := ReadySidebar.Color;

  ReadyStep3 := TNewStaticText.Create(ReadySidebar);
  ReadyStep3.Parent := ReadySidebar;
  ReadyStep3.Left := ReadyStep1.Left;
  ReadyStep3.Top := ReadyStep2.Top + ScaleY(38);
  ReadyStep3.Width := ReadyStep1.Width;
  ReadyStep3.Caption := '○  3. Complete';
  ReadyStep3.Font.Name := 'Segoe UI';
  ReadyStep3.Font.Size := 9;
  ReadyStep3.Font.Color := $00969CA4;
  ReadyStep3.Color := ReadySidebar.Color;

  ContentLeft := SidebarWidth + ScaleX(32);
  ContentWidth := ReadyOverlay.Width - ContentLeft - ScaleX(28);

  ReadyTitle := TNewStaticText.Create(ReadyOverlay);
  ReadyTitle.Parent := ReadyOverlay;
  ReadyTitle.Left := ContentLeft;
  ReadyTitle.Top := ScaleY(38);
  ReadyTitle.Width := ContentWidth;
  ReadyTitle.AutoSize := False;
  ReadyTitle.Height := ScaleY(42);
  ReadyTitle.Caption := 'Ready to Install';
  ReadyTitle.Font.Name := 'Segoe UI';
  ReadyTitle.Font.Size := 22;
  ReadyTitle.Font.Style := [fsBold];
  ReadyTitle.Color := clWhite;

  ReadyIntro := TNewStaticText.Create(ReadyOverlay);
  ReadyIntro.Parent := ReadyOverlay;
  ReadyIntro.Left := ContentLeft;
  ReadyIntro.Top := ReadyTitle.Top + ScaleY(52);
  ReadyIntro.Width := ContentWidth;
  ReadyIntro.AutoSize := False;
  ReadyIntro.Height := ScaleY(58);
  ReadyIntro.WordWrap := True;
  ReadyIntro.Caption := 'Setup is now ready to install Locks Tracker on your computer.';
  ReadyIntro.Font.Name := 'Segoe UI';
  ReadyIntro.Font.Size := 11;
  ReadyIntro.Color := clWhite;

  ReadyInstruction := TNewStaticText.Create(ReadyOverlay);
  ReadyInstruction.Parent := ReadyOverlay;
  ReadyInstruction.Left := ContentLeft;
  ReadyInstruction.Top := ReadyIntro.Top + ScaleY(52);
  ReadyInstruction.Width := ContentWidth;
  ReadyInstruction.AutoSize := False;
  ReadyInstruction.Height := ScaleY(30);
  ReadyInstruction.Caption := 'Click "Install" to continue with the installation.';
  ReadyInstruction.Font.Name := 'Segoe UI';
  ReadyInstruction.Font.Size := 10;
  ReadyInstruction.Color := clWhite;

  ReadySummary := TPanel.Create(ReadyOverlay);
  ReadySummary.Parent := ReadyOverlay;
  ReadySummary.Left := ContentLeft;
  ReadySummary.Top := ReadyInstruction.Top + ScaleY(42);
  ReadySummary.Width := ContentWidth;
  ReadySummary.Height := ScaleY(158);
  ReadySummary.Color := $00FCFBFA;
  ReadySummary.BevelOuter := bvLowered;

  ReadySummaryTitle := TNewStaticText.Create(ReadySummary);
  ReadySummaryTitle.Parent := ReadySummary;
  ReadySummaryTitle.Left := ScaleX(20);
  ReadySummaryTitle.Top := ScaleY(16);
  ReadySummaryTitle.Width := ReadySummary.Width - ScaleX(40);
  ReadySummaryTitle.Caption := 'Installation Summary:';
  ReadySummaryTitle.Font.Name := 'Segoe UI';
  ReadySummaryTitle.Font.Size := 13;
  ReadySummaryTitle.Font.Style := [fsBold];
  ReadySummaryTitle.Color := ReadySummary.Color;

  ReadyDestination := TNewStaticText.Create(ReadySummary);
  ReadyDestination.Parent := ReadySummary;
  ReadyDestination.Left := ScaleX(28);
  ReadyDestination.Top := ScaleY(54);
  ReadyDestination.Width := ReadySummary.Width - ScaleX(56);
  ReadyDestination.AutoSize := False;
  ReadyDestination.Height := ScaleY(40);
  ReadyDestination.WordWrap := True;
  ReadyDestination.Font.Name := 'Segoe UI';
  ReadyDestination.Font.Size := 9;
  ReadyDestination.Color := ReadySummary.Color;

  ReadyVersionLine := TNewStaticText.Create(ReadySummary);
  ReadyVersionLine.Parent := ReadySummary;
  ReadyVersionLine.Left := ReadyDestination.Left;
  ReadyVersionLine.Top := ScaleY(96);
  ReadyVersionLine.Width := ReadyDestination.Width;
  ReadyVersionLine.Caption := '•  Version to install: v{#AppVersion}';
  ReadyVersionLine.Font.Name := 'Segoe UI';
  ReadyVersionLine.Font.Size := 9;
  ReadyVersionLine.Color := ReadySummary.Color;

  ReadyTimeLine := TNewStaticText.Create(ReadySummary);
  ReadyTimeLine.Parent := ReadySummary;
  ReadyTimeLine.Left := ReadyDestination.Left;
  ReadyTimeLine.Top := ScaleY(122);
  ReadyTimeLine.Width := ReadyDestination.Width;
  ReadyTimeLine.Caption := '•  Estimated time: About 2 minutes';
  ReadyTimeLine.Font.Name := 'Segoe UI';
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