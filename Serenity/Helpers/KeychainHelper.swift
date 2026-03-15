// KeychainHelper.swift
// Stores and retrieves the 256-bit SQLCipher database encryption key from iOS Keychain.

import Foundation
import Security

enum KeychainHelper {

    private static let service = "com.serenity.app"
    private static let dbKeyAccount = "serenity_db_key"

    /// Returns the database key. Creates and stores one if it doesn't exist yet.
    static func getDatabaseKey() -> String {
        if let existing = load(account: dbKeyAccount) {
            return existing
        }
        // Generate a new 256-bit (32 byte) random key
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        let key = Data(bytes).base64EncodedString()
        save(key, account: dbKeyAccount)
        return key
    }

    // MARK: - Private helpers

    @discardableResult
    private static func save(_ value: String, account: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecValueData: data,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        SecItemDelete(query as CFDictionary) // delete old if exists
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    private static func load(account: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8)
        else { return nil }

        return string
    }

    static func deleteAll() {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service
        ]
        SecItemDelete(query as CFDictionary)
    }
}
