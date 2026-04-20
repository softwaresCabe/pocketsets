import Foundation

struct WidgetNowPlaying: Codable {
    let stageName: String
    let stageColor: String
    let artistName: String
    let timeLeft: String
}

struct WidgetSetInfo: Codable {
    let artistName: String
    let stageName: String
    let stageColor: String
    let startTimeLabel: String
}

struct WidgetDataPayload: Codable {
    let nextFavorite: WidgetSetInfo?
    let nowPlaying: [WidgetNowPlaying]
    let recommendation: WidgetSetInfo?
    let updatedAt: String

    static func load() -> WidgetDataPayload? {
        guard let defaults = UserDefaults(suiteName: "group.com.pocketsets.app"),
              let jsonString = defaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetDataPayload.self, from: jsonData)
    }
}
