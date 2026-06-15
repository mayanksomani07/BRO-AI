import SwiftUI
#if canImport(FamilyControls)
import FamilyControls
#endif

/// Screen that lets the user (a) grant Screen Time access and (b) pick which apps
/// they want this app to track. Wires straight into ScreenTimeManager.
struct ScreenTimePickerView: View {
    @EnvironmentObject var screenTime: ScreenTimeManager
    @Environment(\.dismiss) private var dismiss
    @State private var showingPicker = false

    var body: some View {
        NavigationView {
            Form {
                statusSection
                actionSection
                helpSection
            }
            .navigationTitle("Screen Time")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            #if canImport(FamilyControls)
            .familyActivityPicker(isPresented: $showingPicker,
                                  selection: pickerSelectionBinding)
            #endif
        }
    }

    // MARK: - Sections

    private var statusSection: some View {
        Section("Status") {
            HStack {
                Circle()
                    .fill(statusColor)
                    .frame(width: 10, height: 10)
                Text(statusText).font(.subheadline)
            }
            if let err = screenTime.lastError {
                Text(err)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }

    private var actionSection: some View {
        Section {
            switch screenTime.authState {
            case .notDetermined, .unknown, .denied:
                Button {
                    Task { await screenTime.requestAuthorization() }
                } label: {
                    Label("Grant Screen Time Access", systemImage: "lock.shield")
                }
            case .approved:
                Button {
                    showingPicker = true
                } label: {
                    Label("Choose Apps to Track", systemImage: "apps.iphone")
                }
                Button(role: .destructive) {
                    screenTime.stopMonitoring()
                } label: {
                    Label("Stop Tracking", systemImage: "stop.circle")
                }
            case .unsupportedPlatform:
                Text("Not available — see help below.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var helpSection: some View {
        Section("Why is this needed?") {
            Text("iOS does not let regular apps see how long you spend in WhatsApp, Instagram, etc. " +
                 "Apple's Screen Time API is the only way to get real per-app time. You stay in control: " +
                 "you pick exactly which apps to track, and you can revoke access any time.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch screenTime.authState {
        case .approved: return .green
        case .denied, .unsupportedPlatform: return .red
        default: return .orange
        }
    }

    private var statusText: String {
        switch screenTime.authState {
        case .unknown:             return "Checking…"
        case .notDetermined:       return "Not granted yet"
        case .denied:              return "Denied — enable in Settings → Screen Time"
        case .approved:            return "Approved — tracking enabled"
        case .unsupportedPlatform: return "Unavailable on this build (Simulator / missing entitlement / iOS < 16)"
        }
    }

    #if canImport(FamilyControls)
    private var pickerSelectionBinding: Binding<FamilyActivitySelection> {
        Binding(
            get: { screenTime.selection },
            set: { screenTime.selection = $0 }
        )
    }
    #endif
}
