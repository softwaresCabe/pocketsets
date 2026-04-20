import WidgetKit
import SwiftUI

// MARK: - Timeline

struct PocketSetsEntry: TimelineEntry {
    let date: Date
    let payload: WidgetDataPayload?
}

struct PocketSetsProvider: TimelineProvider {
    func placeholder(in context: Context) -> PocketSetsEntry {
        PocketSetsEntry(date: Date(), payload: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PocketSetsEntry) -> Void) {
        completion(PocketSetsEntry(date: Date(), payload: WidgetDataPayload.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PocketSetsEntry>) -> Void) {
        let entry = PocketSetsEntry(date: Date(), payload: WidgetDataPayload.load())
        let next = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Color Helper

extension Color {
    init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red: Double((int & 0xFF0000) >> 16) / 255,
            green: Double((int & 0x00FF00) >> 8) / 255,
            blue: Double(int & 0x0000FF) / 255
        )
    }
}

private enum WC {
    static let bg = Color(red: 0.05, green: 0.05, blue: 0.1)
    static let accent = Color(hexString: "#A855F7")
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let entry: PocketSetsEntry

    var body: some View {
        ZStack {
            WC.bg
            VStack(alignment: .leading, spacing: 4) {
                Text("PocketSets")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(WC.accent)
                    .textCase(.uppercase)
                    .tracking(0.6)

                if let payload = entry.payload {
                    if let next = payload.nextFavorite {
                        primarySection(label: "NEXT UP", labelColor: WC.accent, artist: next.artistName, stage: next.stageName, stageColor: Color(hexString:next.stageColor), sublabel: next.startTimeLabel)
                    } else if let rec = payload.recommendation {
                        primarySection(label: "CHECK OUT", labelColor: .yellow, artist: rec.artistName, stage: rec.stageName, stageColor: Color(hexString:rec.stageColor), sublabel: rec.startTimeLabel)
                    } else {
                        festivalFallback()
                    }
                } else {
                    festivalFallback()
                }
                Spacer()
            }
            .padding(12)
        }
    }

    @ViewBuilder
    private func primarySection(label: String, labelColor: Color, artist: String, stage: String, stageColor: Color, sublabel: String) -> some View {
        Text(label).font(.system(size: 8, weight: .semibold)).foregroundStyle(labelColor).tracking(0.8)
        Text(artist).font(.system(size: 14, weight: .bold)).foregroundStyle(.white).lineLimit(2)
        Text(stage).font(.system(size: 10)).foregroundStyle(stageColor)
        Text(sublabel).font(.system(size: 9)).foregroundStyle(.secondary)
    }

    @ViewBuilder
    private func festivalFallback() -> some View {
        Text("EDC LV 2026").font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
        Text("May 15–17").font(.system(size: 11)).foregroundStyle(.secondary)
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let entry: PocketSetsEntry

    var body: some View {
        ZStack {
            WC.bg
            VStack(alignment: .leading, spacing: 8) {
                Text("PocketSets  ·  EDC LV 2026")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(WC.accent)
                    .textCase(.uppercase)
                    .tracking(0.5)

                HStack(alignment: .top, spacing: 16) {
                    leftColumn
                    Divider().background(Color.white.opacity(0.1))
                    rightColumn
                }
                Spacer()
            }
            .padding(14)
        }
    }

    @ViewBuilder
    private var leftColumn: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let next = entry.payload?.nextFavorite {
                Label("NEXT UP", systemImage: "star.fill").font(.system(size: 8, weight: .semibold)).foregroundStyle(WC.accent).imageScale(.small)
                Text(next.artistName).font(.system(size: 13, weight: .bold)).foregroundStyle(.white).lineLimit(1)
                Text(next.stageName).font(.system(size: 10)).foregroundStyle(Color(hexString:next.stageColor)).lineLimit(1)
                Text(next.startTimeLabel).font(.system(size: 9)).foregroundStyle(.secondary)
            } else if let rec = entry.payload?.recommendation {
                Label("RECOMMENDED", systemImage: "sparkles").font(.system(size: 8, weight: .semibold)).foregroundStyle(.yellow).imageScale(.small)
                Text(rec.artistName).font(.system(size: 13, weight: .bold)).foregroundStyle(.white).lineLimit(1)
                Text(rec.stageName).font(.system(size: 10)).foregroundStyle(Color(hexString:rec.stageColor)).lineLimit(1)
                Text(rec.startTimeLabel).font(.system(size: 9)).foregroundStyle(.secondary)
            } else {
                Text("EDC LV 2026").font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
                Text("May 15–17").font(.system(size: 11)).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var rightColumn: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("NOW PLAYING")
                .font(.system(size: 8, weight: .semibold))
                .foregroundStyle(.green)
                .tracking(0.5)

            let playing = entry.payload?.nowPlaying ?? []
            if playing.isEmpty {
                Text("Nothing live yet").font(.system(size: 10)).foregroundStyle(.secondary)
            } else {
                ForEach(Array(playing.prefix(4).enumerated()), id: \.offset) { _, set in
                    HStack(spacing: 5) {
                        Circle().fill(Color(hexString:set.stageColor)).frame(width: 5, height: 5)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(set.artistName).font(.system(size: 10, weight: .semibold)).foregroundStyle(.white).lineLimit(1)
                            Text(set.stageName).font(.system(size: 8)).foregroundStyle(Color(hexString:set.stageColor)).lineLimit(1)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Entry View

struct PocketSetsWidgetEntryView: View {
    var entry: PocketSetsEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}

// MARK: - Widget Definition

struct PocketSetsWidget: Widget {
    let kind = "PocketSetsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PocketSetsProvider()) { entry in
            PocketSetsWidgetEntryView(entry: entry)
                .containerBackground(WC.bg, for: .widget)
        }
        .configurationDisplayName("PocketSets")
        .description("Your next set, what's live now, and a stage recommendation.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
