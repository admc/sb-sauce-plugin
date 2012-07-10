// Init namespace.
var sauce = {};

sauce.shutdown = function() {

};

sauce.getCredentials = function() {
  return {
    username:
      (bridge.prefManager.prefHasUserValue("extensions.seleniumbuilder.plugins.sauce.username") ? bridge.prefManager.getCharPref("extensions.seleniumbuilder.plugins.sauce.username") : ""),
    accesskey:
      (bridge.prefManager.prefHasUserValue("extensions.seleniumbuilder.plugins.sauce.accesskey") ? bridge.prefManager.getCharPref("extensions.seleniumbuilder.plugins.sauce.accesskey") : "")
  };
};

sauce.setCredentials = function(username, accesskey) {
  bridge.prefManager.setCharPref("extensions.seleniumbuilder.plugins.sauce.username", username);
  bridge.prefManager.setCharPref("extensions.seleniumbuilder.plugins.sauce.accesskey", accesskey);
};

sauce.settingspanel = {};
/** The dialog. */
sauce.settingspanel.dialog = null;

sauce.settingspanel.show = function(callback, askForBrowserString) {
  if (sauce.settingspanel.dialog) { return; }
  var credentials = sauce.getCredentials();
  sauce.settingspanel.dialog =
    newNode('div', {'class': 'dialog'},
      newNode('h3', "Sauce Settings"),
      newNode('table', {style: 'border: none;', id: 'rc-options-table'},
        newNode('tr',
          newNode('td', "Sauce Username "),
          newNode('td', newNode('input', {id: 'sauce-username', type: 'text', value: credentials.username}))
        ),
        newNode('tr',
          newNode('td', "Sauce Access Key "),
          newNode('td', newNode('input', {id: 'sauce-accesskey', type: 'text', value: credentials.accesskey}))
        ),
        newNode('tr',
          newNode('td', "Browser "),
          newNode('td', newNode('input', {id: 'sauce-browserstring', type: 'text', value: builder.selenium2.rcPlayback.getBrowserString()}))
        )
      ),
      newNode('a', {'href': '#', 'class': 'button', 'id': 'sauce-ok', 'click': function() {
        var username = jQuery('#sauce-username').val();
        var accesskey = jQuery('#sauce-accesskey').val();
        sauce.setCredentials(username, accesskey);
        sauce.settingspanel.hide();
        if (callback) {
          callback({'username': username, 'accesskey': accesskey, 'browserstring': jQuery('#sauce-browserstring').val()});
        }
      }}, "OK"),
      newNode('a', {'href': '#', 'class': 'button', 'id': 'sauce-cancel', 'click': function() {
        sauce.settingspanel.hide();
      }}, "Cancel")
    );
  builder.dialogs.show(sauce.settingspanel.dialog);
  if (!askForBrowserString) {
    jQuery('#sauce-browserstring').hide();
  }
};

sauce.settingspanel.hide = function() {
  jQuery(sauce.settingspanel.dialog).remove();
  sauce.settingspanel.dialog = null;
};

builder.gui.menu.addItem('file', 'Sauce Settings', 'file-sauce-settings', sauce.settingspanel.show);

builder.gui.menu.addItem('run', 'Run on Sauce OnDemand', 'run-sauce-ondemand', function() {
  sauce.settingspanel.show(function(result) {
    builder.selenium2.rcPlayback.run(
      result.username + ":" + result.accesskey + "@ondemand.saucelabs.com:80",
      result.browserstring
    );
  }, true);
});

builder.suite.addScriptChangeListener(function() {
  var script = builder.getScript();
  if (script && script.seleniumVersion === builder.selenium2) {
    jQuery('#run-sauce-ondemand').show();
  } else {
    jQuery('#run-sauce-ondemand').hide();
  }
});

// Add a Java exporter that talks to the Sauce infrastructure.
// Shallow copy and modify the existing Java formatter.
var exporter_info = {};
for (var k in builder.selenium2.io.formats.java_info) {
  exporter_info[k] = builder.selenium2.io.formats.java_info[k];
}

exporter_info.name = "Java/Sauce On Demand";

exporter_info.get_params = function(script, callback) { sauce.settingspanel.show(callback); };

exporter_info.start = 
  "import java.util.concurrent.TimeUnit;\n" +
  "import java.util.Date;\n" + 
  "import java.io.File;\n" +
  "import java.net.URL;\n" +
  "import org.openqa.selenium.support.ui.Select;\n" +
  "import org.openqa.selenium.interactions.Actions;\n" +
  "import org.openqa.selenium.firefox.FirefoxDriver;\n" +
  "import org.openqa.selenium.*;\n" +
  "import org.openqa.selenium.remote.*;\n" +
  "import static org.openqa.selenium.OutputType.*;\n" +
  "\n" +
  "public class {name} {\n" +
  "    public static void main(String[] args) throws Exception {\n" +
  "        DesiredCapabilities caps = DesiredCapabilities.firefox();\n" +
  "            caps.setCapability(\"version\", \"5\");\n" +
  "            caps.setCapability(\"platform\", Platform.XP);\n" +
  "            caps.setCapability(\"name\", \"{name}\");\n" +
  "        RemoteWebDriver wd = new RemoteWebDriver(\n" +
  "            new URL(\"http://{username}:{accesskey}@ondemand.saucelabs.com:80/wd/hub\"),\n" +
  "            caps);\n" +
  "        wd.manage().timeouts().implicitlyWait(60, TimeUnit.SECONDS);\n";
  
exporter_info.end =
  "        wd.quit();\n" +
  "    }\n" +
  "}\n";

builder.selenium2.io.formats.push(builder.selenium2.io.createLangFormatter(exporter_info));