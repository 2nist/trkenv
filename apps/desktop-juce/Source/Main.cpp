// Minimal JUCE app with WebView and menu items: Start/Stop/Last Job
#include <juce_gui_extra/juce_gui_extra.h>

using namespace juce;

static String trkHost() {
  auto env = SystemStats::getEnvironmentVariable("TRK_DESKTOP_HOST", {}).trim();
  if (env.isNotEmpty()) return env;
  return "http://127.0.0.1:8000"; // default
}

static var httpGetJSON(const String& url) {
  URL u(url);
  auto stream = u.createInputStream(URL::InputStreamOptions(URL::ParameterHandling::inAddress)
    .withConnectionTimeoutMs(4000)
    .withNumRedirectsToFollow(2)
    .withHttpRequestCmd("GET"));
  if (stream == nullptr) return var();
  const auto body = stream->readEntireStreamAsString();
  return JSON::parse(body);
}

static var httpPostJSON(const String& url, const var& payload) {
  URL u(url);
  const auto body = JSON::toString(payload);
  StringPairArray headers; headers.set("Content-Type", "application/json");
  auto stream = u.createInputStream(URL::InputStreamOptions(URL::ParameterHandling::inAddress)
    .withHttpRequestCmd("POST")
    .withExtraHeaders("Content-Type: application/json\r\n")
    .withConnectionTimeoutMs(5000)
    .withNumRedirectsToFollow(2)
    .withDataToUpload(body.getCharPointer(), (size_t)body.getNumBytesAsUTF8()));
  if (stream == nullptr) return var();
  const auto resp = stream->readEntireStreamAsString();
  return JSON::parse(resp);
}

class MainComponent : public Component, public MenuBarModel, private Timer {
public:
  MainComponent() {
    setOpaque(true);
    addAndMakeVisible(browser);
    menuBar.reset(new MenuBarComponent(this));
    addAndMakeVisible(menuBar.get());
    setSize(1100, 750);
    startTimer(1500); // poll last job periodically to update window title

     #if JUCE_MAC || JUCE_WINDOWS || JUCE_LINUX
    browser.goToURL(trkHost());
     #endif
  }

  ~MainComponent() override { menuBar = nullptr; }

  void paint(Graphics& g) override { g.fillAll(Colours::black); }
  void resized() override {
    auto r = getLocalBounds();
    menuBar->setBounds(r.removeFromTop(28));
    browser.setBounds(r);
  }

  // MenuBarModel
  StringArray getMenuBarNames() override { return { "TRK" }; }
  PopupMenu getMenuForIndex(int, const String&) override {
    PopupMenu m;
    m.addItem(1, "Start Rehearsal Flow");
    m.addSeparator();
    m.addItem(10, "Start Audio Job...");
    m.addItem(11, "Stop Last Job");
    m.addItem(12, "Open Audio Panel");
    m.addSeparator();
    m.addItem(2, "Last Job Info");
    m.addSeparator();
    m.addItem(3, "Quit");
    return m;
  }
  void menuItemSelected(int itemId, int) override {
    const auto base = trkHost();
    if (itemId == 1) {
      const var res = httpPostJSON(base + "/api/flows/run", JSON::parse("{}"));
      NativeMessageBox::showMessageBoxAsync(AlertWindow::InfoIcon, "Flow", "Started: " + JSON::toString(res));
    } else if (itemId == 10) {
      FileChooser fc("Select audio file", {}, "*.wav;*.mp3;*.*");
      if (fc.browseForFileToOpen()) {
        auto f = fc.getResult();
        // Form a Windows-friendly file:/// URI
        auto p = f.getFullPathName().replaceCharacters("\\", "/");
        auto uri = String("file:///") + p;
        var payload (new DynamicObject());
        payload.getDynamicObject()->setProperty("audio", uri);
        const var res = httpPostJSON(base + "/api/experiments/audio-engine/jobs", payload);
        lastJobId = res.getProperty("jobId", var()).toString();
        NativeMessageBox::showMessageBoxAsync(AlertWindow::InfoIcon, "Job", "Started: " + lastJobId);
      }
    } else if (itemId == 11) {
      if (lastJobId.isNotEmpty()) {
        const var res = httpPostJSON(base + "/api/jobs/" + lastJobId + "/cancel", JSON::parse("{}"));
        NativeMessageBox::showMessageBoxAsync(AlertWindow::InfoIcon, "Cancel", "Requested: " + JSON::toString(res));
      } else {
        const var lj = httpGetJSON(base + "/api/jobs/last");
        const auto jid = lj.getProperty("jobId", var()).toString();
        if (jid.isNotEmpty()) {
          lastJobId = jid;
          const var res = httpPostJSON(base + "/api/jobs/" + lastJobId + "/cancel", JSON::parse("{}"));
          NativeMessageBox::showMessageBoxAsync(AlertWindow::InfoIcon, "Cancel", "Requested: " + JSON::toString(res));
        } else {
          NativeMessageBox::showMessageBoxAsync(AlertWindow::WarningIcon, "Cancel", "No job to cancel.");
        }
      }
    } else if (itemId == 12) {
      browser.goToURL(base + "/experiments/audio-engine/ui/index.html");
    } else if (itemId == 2) {
      const var lj = httpGetJSON(base + "/api/jobs/last");
      NativeMessageBox::showMessageBoxAsync(AlertWindow::InfoIcon, "Last Job", JSON::toString(lj));
    } else if (itemId == 3) {
      JUCEApplicationBase::quit();
    }
  }

private:
  void timerCallback() override {
    // optional: could hit a future /api/jobs/last; for now, ping health and set title
    const auto res = httpGetJSON(trkHost() + "/api/health");
    if (auto* obj = res.getDynamicObject()) {
      const auto ok = obj->getProperty("ok");
      if (ok.isBool() && (bool)ok) {
        if (auto* tl = getTopLevelComponent()) tl->setName("TRK Desktop (host: " + trkHost() + ")");
      }
    }
  }

  std::unique_ptr<MenuBarComponent> menuBar;
  String lastJobId;
   #if JUCE_MODULE_AVAILABLE_juce_gui_extra
  WebBrowserComponent browser { true };
   #else
  Component browser;
   #endif
};

class MainWindow : public DocumentWindow {
public:
  MainWindow() : DocumentWindow("TRK Desktop",
    Desktop::getInstance().getDefaultLookAndFeel().findColour(ResizableWindow::backgroundColourId),
    DocumentWindow::allButtons) {
    setUsingNativeTitleBar(true);
    setResizable(true, true);
    setContentOwned(new MainComponent(), true);
    centreWithSize(getWidth(), getHeight());
    setVisible(true);
  }
  void closeButtonPressed() override { JUCEApplicationBase::quit(); }
};

class TRKDesktopApp : public JUCEApplication {
public:
  const String getApplicationName() override { return "TRK Desktop"; }
  const String getApplicationVersion() override { return "0.1.0"; }
  void initialise(const String&) override { mainWindow.reset(new MainWindow()); }
  void shutdown() override { mainWindow = nullptr; }
private:
  std::unique_ptr<MainWindow> mainWindow;
};

START_JUCE_APPLICATION(TRKDesktopApp)
