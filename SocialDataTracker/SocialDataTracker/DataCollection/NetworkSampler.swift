import Foundation
import Darwin

struct NetworkSampler {
    static func currentSnapshot() -> InterfaceSnapshot {
        var wifiSent: UInt64 = 0
        var wifiReceived: UInt64 = 0
        var cellularSent: UInt64 = 0
        var cellularReceived: UInt64 = 0

        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let firstAddr = ifaddr else {
            return InterfaceSnapshot(wifiSent: 0, wifiReceived: 0, cellularSent: 0, cellularReceived: 0)
        }
        defer { freeifaddrs(ifaddr) }

        var ptr = firstAddr
        while true {
            let addr = ptr.pointee
            let name = String(cString: addr.ifa_name)
            if addr.ifa_addr.pointee.sa_family == UInt8(AF_LINK) {
                if let data = addr.ifa_data {
                    let networkData = data.load(as: if_data.self)
                    let sent = UInt64(networkData.ifi_obytes)
                    let received = UInt64(networkData.ifi_ibytes)

                    if name.hasPrefix("en") {
                        wifiSent += sent
                        wifiReceived += received
                    } else if name.hasPrefix("pdp_ip") || name.hasPrefix("utun") {
                        cellularSent += sent
                        cellularReceived += received
                    }
                }
            }
            guard let next = addr.ifa_next else { break }
            ptr = next
        }

        return InterfaceSnapshot(
            wifiSent: wifiSent,
            wifiReceived: wifiReceived,
            cellularSent: cellularSent,
            cellularReceived: cellularReceived
        )
    }
}
