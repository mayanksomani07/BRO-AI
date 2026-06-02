import SwiftUI

struct LogUsageSheet: View {
    let app: SocialApp
    @EnvironmentObject var selfReportStore: SelfReportStore
    @Environment(\.dismiss) private var dismiss

    @State private var minutes = 30
    @State private var dataEstimate: DataEstimate = .medium

    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        Image(systemName: app.sfSymbol)
                            .font(.largeTitle)
                            .foregroundColor(.purple)
                        VStack(alignment: .leading) {
                            Text(app.displayName).font(.title2).bold()
                            Text(app.category.rawValue).font(.caption).foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("Time Spent") {
                    Stepper("\(minutes) minutes", value: $minutes, in: 1...600, step: 5)
                    HStack {
                        quickTimeButton(15)
                        quickTimeButton(30)
                        quickTimeButton(60)
                        quickTimeButton(120)
                    }
                }

                Section("Estimated Data Used") {
                    Picker("Data", selection: $dataEstimate) {
                        ForEach(DataEstimate.allCases, id: \.self) { est in
                            Text(est.rawValue).tag(est)
                        }
                    }
                    .pickerStyle(.inline)
                }

                Section {
                    Button(action: save) {
                        HStack {
                            Spacer()
                            Label("Save Entry", systemImage: "checkmark.circle.fill")
                                .font(.headline)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding()
                        .background(Color.purple)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
            }
            .navigationTitle("Log Usage")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func quickTimeButton(_ min: Int) -> some View {
        Button("\(min)m") {
            minutes = min
        }
        .buttonStyle(.bordered)
        .tint(minutes == min ? .purple : .secondary)
    }

    private func save() {
        let entry = SelfReportEntry(appId: app.id, estimatedMinutes: minutes, dataEstimate: dataEstimate)
        selfReportStore.add(entry)
        dismiss()
    }
}
