import SwiftUI

struct TodaySummaryCard: View {
    @EnvironmentObject var dataUsageStore: DataUsageStore

    var body: some View {
        // Reads liveSnapshot directly so the card re-renders every 3s
        let today = dataUsageStore.todayUsage()
        let speed = dataUsageStore.liveSpeed()
        let totalMB = today.wifiMB + today.cellularMB
        let speedKBps = (speed.wifiMBps + speed.cellularMBps) * 1024

        ZStack {
            LinearGradient(
                colors: [Color(red: 0.44, green: 0.18, blue: 0.90),
                         Color(red: 0.12, green: 0.45, blue: 0.95)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .shadow(color: .purple.opacity(0.35), radius: 14, x: 0, y: 6)

            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TODAY'S DATA USAGE")
                            .font(.caption).bold()
                            .foregroundColor(.white.opacity(0.7))
                            .tracking(1)
                        Text(totalMB >= 1024
                             ? String(format: "%.2f GB", totalMB / 1024)
                             : String(format: "%.1f MB", totalMB))
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                    Spacer()
                    LiveBadge(kbps: speedKBps)
                }

                Rectangle()
                    .fill(.white.opacity(0.2))
                    .frame(height: 1)

                HStack(spacing: 0) {
                    statPill(icon: "wifi",
                             label: "WiFi",
                             value: formatMB(today.wifiMB),
                             color: Color.cyan)
                    Spacer()
                    Rectangle().fill(.white.opacity(0.2)).frame(width: 1, height: 36)
                    Spacer()
                    statPill(icon: "antenna.radiowaves.left.and.right",
                             label: "Cellular",
                             value: formatMB(today.cellularMB),
                             color: Color.yellow)
                    Spacer()
                    Rectangle().fill(.white.opacity(0.2)).frame(width: 1, height: 36)
                    Spacer()
                    statPill(icon: "arrow.up.arrow.down",
                             label: "Live",
                             value: speedKBps < 1 ? "0 KB/s"
                                  : speedKBps < 1024 ? String(format: "%.0f KB/s", speedKBps)
                                  : String(format: "%.1f MB/s", speedKBps / 1024),
                             color: Color.green)
                }
            }
            .padding(18)
        }
        .frame(height: 180)
    }

    private func statPill(icon: String, label: String, value: String, color: Color) -> some View {
        VStack(spacing: 3) {
            Image(systemName: icon).foregroundColor(color).font(.subheadline)
            Text(value).font(.subheadline).bold().foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
            Text(label).font(.caption2).foregroundColor(.white.opacity(0.65))
        }
    }

    private func formatMB(_ mb: Double) -> String {
        mb >= 1024 ? String(format: "%.1f GB", mb / 1024) : String(format: "%.0f MB", mb)
    }
}

struct LiveBadge: View {
    let kbps: Double
    @State private var pulse = false

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(kbps > 0.5 ? Color.green : Color.gray)
                .frame(width: 7, height: 7)
                .scaleEffect(pulse ? 1.4 : 1.0)
                .animation(.easeInOut(duration: 0.8).repeatForever(), value: pulse)
                .onAppear { pulse = true }
            Text("LIVE")
                .font(.caption2).bold()
                .foregroundColor(.white.opacity(0.85))
                .tracking(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.white.opacity(0.15))
        .clipShape(Capsule())
    }
}
