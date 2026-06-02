import SwiftUI

struct OnboardingView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var page = 0

    var body: some View {
        ZStack {
            LinearGradient(colors: [.purple.opacity(0.8), .blue.opacity(0.6)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()

            TabView(selection: $page) {
                welcomePage.tag(0)
                disclaimerPage.tag(1)
                readyPage.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))
        }
    }

    private var welcomePage: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "chart.bar.fill")
                .font(.system(size: 80))
                .foregroundColor(.white)
                .padding()
                .background(Circle().fill(.white.opacity(0.2)))

            Text("Social Data Tracker")
                .font(.largeTitle).bold()
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text("Monitor your device's data usage and keep track of which social apps you use the most.")
                .font(.body)
                .foregroundColor(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)

            Spacer()
            nextButton
        }
        .padding()
    }

    private var disclaimerPage: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 70))
                .foregroundColor(.white)

            Text("How It Works")
                .font(.largeTitle).bold()
                .foregroundColor(.white)

            VStack(alignment: .leading, spacing: 16) {
                bulletPoint(icon: "checkmark.circle.fill", color: .green,
                            text: "Detects which social apps are installed on your device")
                bulletPoint(icon: "checkmark.circle.fill", color: .green,
                            text: "Tracks total WiFi & Cellular usage using iOS network counters")
                bulletPoint(icon: "checkmark.circle.fill", color: .green,
                            text: "Beautiful charts and reports — 7, 30, 90 day views")
                bulletPoint(icon: "info.circle.fill", color: .yellow,
                            text: "iOS does not allow reading per-app data usage for other apps. We track device-level totals and let you log estimates manually.")
            }
            .padding()
            .background(.white.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal)

            Spacer()
            nextButton
        }
        .padding()
    }

    private var readyPage: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "apps.iphone")
                .font(.system(size: 80))
                .foregroundColor(.white)
                .padding()
                .background(Circle().fill(.white.opacity(0.2)))

            Text("You're All Set!")
                .font(.largeTitle).bold()
                .foregroundColor(.white)

            Text("We'll start tracking your device data usage right away. Tap below to get started.")
                .font(.body)
                .foregroundColor(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)

            Spacer()
            Button(action: { hasCompletedOnboarding = true }) {
                Text("Get Started")
                    .font(.headline)
                    .foregroundColor(.purple)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 30)
        }
        .padding()
    }

    private var nextButton: some View {
        Button(action: { withAnimation { page = min(page + 1, 2) } }) {
            Text("Next")
                .font(.headline)
                .foregroundColor(.purple)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .padding(.horizontal, 30)
    }

    private func bulletPoint(icon: String, color: Color, text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon).foregroundColor(color).font(.body)
            Text(text).font(.subheadline).foregroundColor(.white)
        }
    }
}
