import Foundation
import Capacitor
import WidgetKit

// Capacitor plugin that writes widget data to the shared App Group UserDefaults
// and triggers a WidgetKit timeline reload so the home screen widget refreshes.
//
// App Group "group.com.pocketsets.app" must be enabled in Xcode for both the
// App target and the PocketSetsWidget extension target.
@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetDataPlugin"
    public let jsName = "WidgetData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise)
    ]

    private let appGroupSuite = "group.com.pocketsets.app"

    @objc func updateWidgetData(_ call: CAPPluginCall) {
        guard let data = call.getObject("data") else {
            call.reject("Missing 'data' parameter")
            return
        }

        if let defaults = UserDefaults(suiteName: appGroupSuite),
           let jsonData = try? JSONSerialization.data(withJSONObject: data, options: []),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            defaults.set(jsonString, forKey: "widgetData")
            defaults.synchronize()
        }

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }
}
