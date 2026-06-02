import Foundation
import Darwin

struct NetworkSampler {
    static func currentSnapshot() -> InterfaceSnapshot {
        var wifiSent:     UInt64 = 0
        var wifiReceived: UInt64 = 0
        var cellSent:     UInt64 = 0
        var cellReceived: UInt64 = 0

        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let firstAddr = ifaddr else {
            return InterfaceSnapshot(wifiSent: 0, wifiReceived: 0,
                                     cellularSent: 0, cellularReceived: 0)
        }
        defer { freeifaddrs(ifaddr) }

        var ptr: UnsafeMutablePointer<ifaddrs> = firstAddr
        while true {
            let iface = ptr.pointee
            if iface.ifa_addr.pointee.sa_family == UInt8(AF_LINK),
               let dataPtr = iface.ifa_data {
                let name = String(cString: iface.ifa_name)
                let nd = dataPtr.load(as: if_data.self)
                let sent     = UInt64(nd.ifi_obytes)
                let received = UInt64(nd.ifi_ibytes)

                // en0 / en1 = WiFi & Ethernet (treat as WiFi for on-device usage)
                if name.hasPrefix("en") {
                    wifiSent     += sent
                    wifiReceived += received
                }
                // pdp_ip* = Cellular data interfaces
                else if name.hasPrefix("pdp_ip") {
                    cellSent     += sent
                    cellReceived += received
                }
                // utun* / ipsec* = VPN — skip; don't double-count
            }
            guard let next = iface.ifa_next else { break }
            ptr = next
        }

        return InterfaceSnapshot(
            timestamp:        Date(),
            wifiSent:         wifiSent,
            wifiReceived:     wifiReceived,
            cellularSent:     cellSent,
            cellularReceived: cellReceived
        )
    }
}
