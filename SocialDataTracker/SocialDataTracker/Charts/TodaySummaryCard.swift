import SwiftUI

struct TodaySummaryCard: View {
    @EnvironmentObject var dataUsageStore: DataUsageStore

    var body: some View {
        let today = dataUsageStore.todayUsage()
        let totalMB = today.wifiMB + today.cellularMB

        VStack(spacing: 0) {
            LinearGradient(
                colors: [.purple, .blue],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .overlay(
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Today's Usage")
                                .font(.headline)
                                .foregroundColor(.white.opacity(0.85))
                            Text(totalMB >= 1024
                                 ? String(format: "%.2f GB", totalMB / 1024)
                                 : String(format: "%.0f MB", totalMB))
                                .font(.system(size: 38, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                        }
                        Spacer()
                        Image(systemName: "network")
                            .font(.system(size: 44))
                            .foregroundColor(.white.opacity(0.3))
                    }
                    Divider().background(Color.white.opacity(0.3))
                    HStack(spacing: 20) {
                        usagePill(icon: "wifi", label: "WiFi", mb: today.wifiMB, color: .cyan)
                        usagePill(icon: "antenna.radiowaves.left.and.right", label: "Cellular", mb: today.cellularMB, color: .yellow)
                    }
                }
                .padding()
            )
            .frame(height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 20))
        }
    }

    private func usagePill(icon: String, label: String, mb: Double, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).foregroundColor(color)
            VStack(alignment: .leading, spacing: 1) {
                Text(label).font(.caption2).foregroundColor(.white.opacity(0.7))
                Text(mb >= 1024
                     ? String(format: "%.1f GB", mb / 1024)
                     : String(format: "%.0f MB", mb))
                    .font(.subheadline).bold().foregroundColor(.white)
            }
        }
    }
}
