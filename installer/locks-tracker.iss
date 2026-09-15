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
DisableDirPage=yes
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
  DesktopShortcutCheck: TNewCheckBox;
  WelcomeOverlay, OptionsOverlay, ReadyOverlay: TPanel;
  InstallingOverlay, FinishedOverlay: TPanel;
  WelcomeSidebar, OptionsSidebar, ReadySidebar: TPanel;
  InstallingSidebar, FinishedSidebar: TPanel;
  WelcomeMain, OptionsMain, ReadyMain: TPanel;
  InstallingMain, FinishedMain: TPanel;
  WelcomeLogo, OptionsLogo, ReadyLogo: TBitmapImage;
  InstallingLogo, FinishedLogo: TBitmapImage;
  ReadyDestination: TNewStaticText;
  InstallingCard, FinishedCard: TPanel;
  InstallProgressTrack, InstallProgressFill: TPanel;
  InstallProgressLabel: TNewStaticText;

function AddPanel(AParent: TWinControl; X, Y, W, H: Integer; AColor: TColor): TPanel;
begin
  Result := TPanel.Create(WizardForm);
  Result.Parent := AParent;
  Result.SetBounds(X, Y, W, H);
  Result.BevelOuter := bvNone;
  Result.Color := AColor;
end;

function AddText(AParent: TWinControl; X, Y, W, H, Size: Integer;
  const S: String; Bold: Boolean; FontColor, BackColor: TColor): TNewStaticText;
begin
  Result := TNewStaticText.Create(WizardForm);
  Result.Parent := AParent;
  Result.SetBounds(X, Y, W, H);  Result.AutoSize := False;
  Result.WordWrap := True;
  Result.Caption := S;
  Result.Font.Name := 'Segoe UI';
  Result.Font.Size := Size;
  Result.Font.Color := FontColor;
  if Bold then Result.Font.Style := [fsBold] else Result.Font.Style := [];
  Result.Color := BackColor;
end;

function StepText(Step, ActiveStep: Integer; const LabelText: String): String;
begin
  Result := IntToStr(Step) + '. ' + LabelText;
end;

function StepColor(Step, ActiveStep: Integer): TColor;
begin
  if Step = ActiveStep then Result := $00E98B17
  else if Step < ActiveStep then Result := $007C8794
  else Result := $00A2A8B0;
end;

procedure BuildSidebar(AOverlay: TPanel; ActiveStep: Integer;
  const InstallLabel: String; var ASidebar: TPanel; var ALogo: TBitmapImage);
var
  W, Y, SW: Integer;
  Bg: TColor;
  L: TNewStaticText;
begin
  Bg := $00FAF7F3;
  W := (AOverlay.Width * 29) div 100;
  ASidebar := AddPanel(AOverlay, 0, 0, W, AOverlay.Height, Bg);

  ALogo := TBitmapImage.Create(ASidebar);
  ALogo.Parent := ASidebar;
  SW := (W * 48) div 100;
  ALogo.SetBounds((W - SW) div 2, ScaleY(28), SW, SW);
  ALogo.Stretch := True;
  ALogo.Bitmap.LoadFromFile(ExpandConstant('{tmp}\installer-logo.bmp'));

  L := AddText(ASidebar, ScaleX(14), ALogo.Top + ALogo.Height + ScaleY(10),
    W - ScaleX(28), ScaleY(34), 17, 'Locks Tracker', True, clBlack, Bg);
  L.Alignment := taCenter;
  L := AddText(ASidebar, ScaleX(14), ALogo.Top + ALogo.Height + ScaleY(42),
    W - ScaleX(28), ScaleY(24), 9, 'Installer v{#AppVersion}', False,
    $00747B84, Bg);
  L.Alignment := taCenter;

  Y := (ASidebar.Height * 50) div 100;
  AddText(ASidebar, ScaleX(22), Y, W - ScaleX(32), ScaleY(26), 10,
    StepText(1, ActiveStep, 'Welcome'), ActiveStep = 1, StepColor(1, ActiveStep), Bg);
  AddText(ASidebar, ScaleX(22), Y + ScaleY(34), W - ScaleX(32), ScaleY(30), 10,
    StepText(2, ActiveStep, 'Options'), ActiveStep = 2, StepColor(2, ActiveStep), Bg);
  AddText(ASidebar, ScaleX(22), Y + ScaleY(70), W - ScaleX(32), ScaleY(26), 10,
    StepText(3, ActiveStep, InstallLabel), ActiveStep = 3, StepColor(3, ActiveStep), Bg);
  AddText(ASidebar, ScaleX(22), Y + ScaleY(106), W - ScaleX(32), ScaleY(26), 10,
    StepText(4, ActiveStep, 'Complete'), ActiveStep = 4, StepColor(4, ActiveStep), Bg);

  AddText(ASidebar, ScaleX(22), ASidebar.Height - ScaleY(52),
    W - ScaleX(44), ScaleY(34), 8, 'Track Today.  Explore Tomorrow.', False,
    $009097A0, Bg);
end;

procedure BuildWelcomePage;
var
  Left, W: Integer;
  Card: TPanel;
  Bg: TColor;
begin
  Bg := clWhite;
  WelcomeOverlay := AddPanel(WizardForm, 0, 0, WizardForm.ClientWidth,
    WizardForm.Bevel.Top, Bg);
  WelcomeOverlay.Visible := False;
  BuildSidebar(WelcomeOverlay, 1, 'Install', WelcomeSidebar, WelcomeLogo);

  Left := WelcomeSidebar.Width + ScaleX(34);
  W := WelcomeOverlay.Width - Left - ScaleX(30);
  WelcomeMain := AddPanel(WelcomeOverlay, WelcomeSidebar.Width, 0,
    WelcomeOverlay.Width - WelcomeSidebar.Width, WelcomeOverlay.Height, Bg);

  AddText(WelcomeOverlay, Left, ScaleY(34), W, ScaleY(46), 21,
    'Welcome to the Locks Tracker Installer', True, clBlack, Bg);
  AddText(WelcomeOverlay, Left, ScaleY(92), W, ScaleY(58), 11,
    'This setup wizard will guide you through installing Locks Tracker on your computer.',
    False, $003F454C, Bg);
  AddText(WelcomeOverlay, Left, ScaleY(148), W, ScaleY(34), 10,
    'It only takes a few moments to complete the installation.', False,
    $00666D75, Bg);

  Card := AddPanel(WelcomeOverlay, Left, ScaleY(198), W, ScaleY(154), $00FCFBFA);
  Card.BevelOuter := bvNone;
  AddText(Card, ScaleX(20), ScaleY(16), Card.Width - ScaleX(40), ScaleY(30), 12,
    'What this installer will do', True, clBlack, Card.Color);
  AddText(Card, ScaleX(24), ScaleY(56), Card.Width - ScaleX(48), ScaleY(25), 10,
    '•  Install the latest version of Locks Tracker', False, $00484F58, Card.Color);
  AddText(Card, ScaleX(24), ScaleY(86), Card.Width - ScaleX(48), ScaleY(25), 10,
    '•  Create an optional desktop shortcut', False, $00484F58, Card.Color);
  AddText(Card, ScaleX(24), ScaleY(116), Card.Width - ScaleX(48), ScaleY(25), 10,
    '•  Keep the app ready for future automatic updates', False, $00484F58, Card.Color);
end;

function ShouldCreateDesktopShortcut: Boolean;
begin
  Result := DesktopShortcutCheck.Checked;
end;

procedure BuildOptionsPage;
var
  Left, W: Integer;
  Card: TPanel;
  Bg: TColor;
begin
  Bg := clWhite;
  OptionsPage := CreateCustomPage(wpWelcome, '', '');
  OptionsOverlay := AddPanel(WizardForm, 0, 0, WizardForm.ClientWidth,
    WizardForm.Bevel.Top, Bg);
  OptionsOverlay.Visible := False;
  BuildSidebar(OptionsOverlay, 2, 'Ready to Install', OptionsSidebar, OptionsLogo);

  Left := OptionsSidebar.Width + ScaleX(34);
  W := OptionsOverlay.Width - Left - ScaleX(30);
  OptionsMain := AddPanel(OptionsOverlay, OptionsSidebar.Width, 0,
    OptionsOverlay.Width - OptionsSidebar.Width, OptionsOverlay.Height, Bg);

  AddText(OptionsOverlay, Left, ScaleY(34), W, ScaleY(46), 21,
    'Choose Installation Options', True, clBlack, Bg);
  AddText(OptionsOverlay, Left, ScaleY(92), W, ScaleY(54), 11,
    'Choose any extra shortcuts you want Setup to create for Locks Tracker.',
    False, $003F454C, Bg);

  Card := AddPanel(OptionsOverlay, Left, ScaleY(172), W, ScaleY(170), $00FCFBFA);
  Card.BevelOuter := bvNone;
  AddText(Card, ScaleX(20), ScaleY(18), Card.Width - ScaleX(40), ScaleY(30), 12,
    'Additional shortcuts', True, clBlack, Card.Color);

  DesktopShortcutCheck := TNewCheckBox.Create(Card);
  DesktopShortcutCheck.Parent := Card;
  DesktopShortcutCheck.SetBounds(ScaleX(24), ScaleY(62),
    Card.Width - ScaleX(48), ScaleY(30));
  DesktopShortcutCheck.Caption := 'Create a desktop shortcut';
  DesktopShortcutCheck.Checked := True;
  DesktopShortcutCheck.Font.Name := 'Segoe UI';
  DesktopShortcutCheck.Font.Size := 10;

  AddText(Card, ScaleX(24), ScaleY(112), Card.Width - ScaleX(48), ScaleY(44), 9,
    'You can create or remove shortcuts later without reinstalling Locks Tracker.',
    False, $00707882, Card.Color);
end;

procedure BuildReadyPage;
var
  Left, W: Integer;
  Card: TPanel;
  Bg: TColor;
begin
  Bg := clWhite;
  ReadyOverlay := AddPanel(WizardForm, 0, 0, WizardForm.ClientWidth,
    WizardForm.Bevel.Top, Bg);
  ReadyOverlay.Visible := False;
  BuildSidebar(ReadyOverlay, 3, 'Ready to Install', ReadySidebar, ReadyLogo);

  Left := ReadySidebar.Width + ScaleX(34);
  W := ReadyOverlay.Width - Left - ScaleX(30);
  ReadyMain := AddPanel(ReadyOverlay, ReadySidebar.Width, 0,
    ReadyOverlay.Width - ReadySidebar.Width, ReadyOverlay.Height, Bg);

  AddText(ReadyOverlay, Left, ScaleY(34), W, ScaleY(46), 21,
    'Ready to Install', True, clBlack, Bg);
  AddText(ReadyOverlay, Left, ScaleY(92), W, ScaleY(54), 11,
    'Setup is ready to install Locks Tracker on your computer.',
    False, $003F454C, Bg);
  AddText(ReadyOverlay, Left, ScaleY(142), W, ScaleY(32), 10,
    'Click Install to continue.', False, $00666D75, Bg);

  Card := AddPanel(ReadyOverlay, Left, ScaleY(190), W, ScaleY(170), $00FCFBFA);
  Card.BevelOuter := bvNone;
  AddText(Card, ScaleX(20), ScaleY(16), Card.Width - ScaleX(40), ScaleY(30), 12,
    'Installation Summary', True, clBlack, Card.Color);
  AddText(Card, ScaleX(24), ScaleY(58), ScaleX(110), ScaleY(24), 9,
    'Destination', True, $00454C54, Card.Color);
  ReadyDestination := AddText(Card, ScaleX(24), ScaleY(82),
    Card.Width - ScaleX(48), ScaleY(38), 9, '', False, $00636B75, Card.Color);
  AddText(Card, ScaleX(24), ScaleY(124), ScaleX(160), ScaleY(24), 9,
    'Version to install', True, $00454C54, Card.Color);
  AddText(Card, ScaleX(174), ScaleY(124), Card.Width - ScaleX(198), ScaleY(24), 9,
    'v{#AppVersion}', False, $00636B75, Card.Color);
end;

procedure BuildInstallingPage;
var
  Left, W: Integer;
  Bg: TColor;
begin
  Bg := clWhite;
  InstallingOverlay := AddPanel(WizardForm, 0, 0, WizardForm.ClientWidth,
    WizardForm.Bevel.Top, Bg);
  InstallingOverlay.Visible := False;
  BuildSidebar(InstallingOverlay, 3, 'Installing Files', InstallingSidebar, InstallingLogo);

  Left := InstallingSidebar.Width + ScaleX(34);
  W := InstallingOverlay.Width - Left - ScaleX(30);
  InstallingMain := AddPanel(InstallingOverlay, InstallingSidebar.Width, 0,
    InstallingOverlay.Width - InstallingSidebar.Width, InstallingOverlay.Height, Bg);

  AddText(InstallingOverlay, Left, ScaleY(34), W, ScaleY(46), 21,
    'Installing Files', True, clBlack, Bg);
  AddText(InstallingOverlay, Left, ScaleY(92), W, ScaleY(48), 11,
    'Please wait while Setup installs Locks Tracker on your computer.',
    False, $003F454C, Bg);

  InstallingCard := AddPanel(InstallingOverlay, Left, ScaleY(164), W, ScaleY(184), $00FCFBFA);
  InstallingCard.BevelOuter := bvNone;

  WizardForm.StatusLabel.Parent := InstallingCard;
  WizardForm.StatusLabel.SetBounds(ScaleX(22), ScaleY(22),
    InstallingCard.Width - ScaleX(44), ScaleY(28));
  WizardForm.StatusLabel.Font.Name := 'Segoe UI';
  WizardForm.StatusLabel.Font.Size := 10;
  WizardForm.StatusLabel.Font.Style := [fsBold];
  WizardForm.StatusLabel.Color := InstallingCard.Color;

  WizardForm.FilenameLabel.Parent := InstallingCard;
  WizardForm.FilenameLabel.SetBounds(ScaleX(22), ScaleY(56),
    InstallingCard.Width - ScaleX(44), ScaleY(44));
  WizardForm.FilenameLabel.Font.Name := 'Segoe UI';
  WizardForm.FilenameLabel.Font.Size := 9;
  WizardForm.FilenameLabel.Font.Color := $00646C76;
  WizardForm.FilenameLabel.Color := InstallingCard.Color;

  WizardForm.ProgressGauge.Visible := False;
  InstallProgressTrack := AddPanel(InstallingCard, ScaleX(22), ScaleY(112),
    InstallingCard.Width - ScaleX(44), ScaleY(12), $00ECE7E1);
  InstallProgressFill := AddPanel(InstallProgressTrack, 0, 0, 1,
    InstallProgressTrack.Height, $00E98B17);
  InstallProgressLabel := AddText(InstallingCard, ScaleX(22), ScaleY(132),
    InstallingCard.Width - ScaleX(44), ScaleY(22), 8, '0% complete', False,
    $00707882, InstallingCard.Color);

  AddText(InstallingCard, ScaleX(22), ScaleY(154),
    InstallingCard.Width - ScaleX(44), ScaleY(28), 9,
    'This usually takes less than a couple of minutes.', False,
    $00707882, InstallingCard.Color);
end;

procedure BuildFinishedPage;
var
  Left, W: Integer;
  Bg: TColor;
begin
  Bg := clWhite;
  FinishedOverlay := AddPanel(WizardForm, 0, 0, WizardForm.ClientWidth,
    WizardForm.Bevel.Top, Bg);
  FinishedOverlay.Visible := False;
  BuildSidebar(FinishedOverlay, 4, 'Installing Files', FinishedSidebar, FinishedLogo);

  Left := FinishedSidebar.Width + ScaleX(34);
  W := FinishedOverlay.Width - Left - ScaleX(30);
  FinishedMain := AddPanel(FinishedOverlay, FinishedSidebar.Width, 0,
    FinishedOverlay.Width - FinishedSidebar.Width, FinishedOverlay.Height, Bg);

  AddText(FinishedOverlay, Left, ScaleY(34), W, ScaleY(46), 21,
    'Installation Complete', True, clBlack, Bg);
  AddText(FinishedOverlay, Left, ScaleY(92), W, ScaleY(52), 11,
    'Locks Tracker has been installed successfully and is ready to use.',
    False, $003F454C, Bg);

  FinishedCard := AddPanel(FinishedOverlay, Left, ScaleY(168), W, ScaleY(172), $00FCFBFA);
  FinishedCard.BevelOuter := bvNone;
  AddText(FinishedCard, ScaleX(20), ScaleY(18),
    FinishedCard.Width - ScaleX(40), ScaleY(30), 12,
    'You’re all set', True, clBlack, FinishedCard.Color);
  AddText(FinishedCard, ScaleX(22), ScaleY(54),
    FinishedCard.Width - ScaleX(44), ScaleY(44), 9,
    'Automatic updates are enabled, so future releases can install directly from the app.',
    False, $00636B75, FinishedCard.Color);

  WizardForm.RunList.Parent := FinishedCard;
  WizardForm.RunList.SetBounds(ScaleX(18), ScaleY(108),
    FinishedCard.Width - ScaleX(36), ScaleY(46));
  WizardForm.RunList.Font.Name := 'Segoe UI';
  WizardForm.RunList.Font.Size := 10;
end;

procedure InitializeWizard;
begin
  ExtractTemporaryFile('installer-logo.bmp');
  BuildWelcomePage;
  BuildOptionsPage;
  BuildReadyPage;
  BuildInstallingPage;
  BuildFinishedPage;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  WelcomeOverlay.Visible := False;
  OptionsOverlay.Visible := False;
  ReadyOverlay.Visible := False;
  InstallingOverlay.Visible := False;
  FinishedOverlay.Visible := False;

  if CurPageID = wpWelcome then
  begin
    WelcomeOverlay.Visible := True;
    WelcomeOverlay.BringToFront;
  end
  else if CurPageID = OptionsPage.ID then
  begin
    OptionsOverlay.Visible := True;
    OptionsOverlay.BringToFront;
  end
  else if CurPageID = wpReady then
  begin
    ReadyDestination.Caption := ExpandConstant('{app}');
    ReadyOverlay.Visible := True;
    ReadyOverlay.BringToFront;
  end
  else if CurPageID = wpInstalling then
  begin
    InstallingOverlay.Visible := True;
    InstallingOverlay.BringToFront;
    WizardForm.StatusLabel.BringToFront;
    WizardForm.FilenameLabel.BringToFront;
    WizardForm.ProgressGauge.Visible := False;
  end
  else if CurPageID = wpFinished then
  begin
    FinishedOverlay.Visible := True;
    FinishedOverlay.BringToFront;
    WizardForm.RunList.BringToFront;
  end;
end;

procedure CurInstallProgressChanged(CurProgress, MaxProgress: Integer);
var
  Pct, NewWidth: Integer;
begin
  if (MaxProgress > 0) and (InstallProgressTrack <> nil) and (InstallProgressFill <> nil) then
  begin
    Pct := (CurProgress * 100) div MaxProgress;
    NewWidth := (InstallProgressTrack.Width * CurProgress) div MaxProgress;
    if NewWidth < 1 then NewWidth := 1;
    InstallProgressFill.Width := NewWidth;
    InstallProgressLabel.Caption := IntToStr(Pct) + '% complete';
  end;
end;
