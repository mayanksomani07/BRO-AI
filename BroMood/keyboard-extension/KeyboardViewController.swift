//
//  KeyboardViewController.swift
//  BroMoodKeyboard
//
//  Full custom QWERTY keyboard extension for BroMood.
//  Captures keystroke METADATA only — never actual text content.
//  Data stored in shared App Group: group.com.bromood.shared
//

import UIKit

class KeyboardViewController: UIInputViewController {

    // ─── Layout ───────────────────────────────────────────────────────────────
    private var mainStack: UIStackView!
    private var topBar: UIView!
    private var keyboardContainer: UIView!
    private var bottomBar: UIView!

    private var isSymbolMode = false
    private var isUppercase = false
    private var currentLanguage: KeyboardLanguage = .english

    // ─── Keystroke tracking ───────────────────────────────────────────────────
    private let keystrokeLogger = KeystrokeLogger()
    private var lastKeyTime: TimeInterval = 0

    // ─── Haptics ──────────────────────────────────────────────────────────────
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)

    // ─── Keyboard layouts ─────────────────────────────────────────────────────
    let qwertyRows: [[String]] = [
        ["q","w","e","r","t","y","u","i","o","p"],
        ["a","s","d","f","g","h","j","k","l"],
        ["⇧","z","x","c","v","b","n","m","⌫"],
        ["123","🌐","space","return"]
    ]

    let symbolRows: [[String]] = [
        ["1","2","3","4","5","6","7","8","9","0"],
        ["-","/",":",";","(",")",  "$","&","@","\""],
        ["#%^",".",",","?","!","'","⌫"],
        ["ABC","🌐","space","return"]
    ]

    // ─── Lifecycle ────────────────────────────────────────────────────────────
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        keystrokeLogger.startSession()
        lightImpact.prepare()
        mediumImpact.prepare()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        keystrokeLogger.endSession()
    }

    override func textWillChange(_ textInput: UITextInput?) {}
    override func textDidChange(_ textInput: UITextInput?) {}

    // ─── UI Setup ─────────────────────────────────────────────────────────────
    private func setupUI() {
        view.backgroundColor = traitCollection.userInterfaceStyle == .dark
            ? UIColor(red: 0.05, green: 0.07, blue: 0.12, alpha: 1)
            : UIColor(red: 0.83, green: 0.84, blue: 0.87, alpha: 1)

        // BroMood top branding bar
        setupTopBar()

        // Keyboard rows
        setupKeyboardRows()

        applyConstraints()
    }

    private func setupTopBar() {
        topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false

        let brandLabel = UILabel()
        brandLabel.text = "BroMood"
        brandLabel.font = UIFont.systemFont(ofSize: 10, weight: .semibold)
        brandLabel.textColor = UIColor.systemBlue.withAlphaComponent(0.5)
        brandLabel.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(brandLabel)

        NSLayoutConstraint.activate([
            brandLabel.centerXAnchor.constraint(equalTo: topBar.centerXAnchor),
            brandLabel.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
        ])

        view.addSubview(topBar)
    }

    private func setupKeyboardRows() {
        keyboardContainer = UIView()
        keyboardContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(keyboardContainer)
        renderKeys()
    }

    private func renderKeys() {
        keyboardContainer.subviews.forEach { $0.removeFromSuperview() }
        let rows = isSymbolMode ? symbolRows : qwertyRows

        let rowStack = UIStackView()
        rowStack.axis = .vertical
        rowStack.distribution = .fillEqually
        rowStack.spacing = 8
        rowStack.translatesAutoresizingMaskIntoConstraints = false
        keyboardContainer.addSubview(rowStack)

        NSLayoutConstraint.activate([
            rowStack.topAnchor.constraint(equalTo: keyboardContainer.topAnchor, constant: 4),
            rowStack.bottomAnchor.constraint(equalTo: keyboardContainer.bottomAnchor, constant: -4),
            rowStack.leadingAnchor.constraint(equalTo: keyboardContainer.leadingAnchor, constant: 3),
            rowStack.trailingAnchor.constraint(equalTo: keyboardContainer.trailingAnchor, constant: -3),
        ])

        for row in rows {
            let rowView = makeRow(keys: row)
            rowStack.addArrangedSubview(rowView)
        }
    }

    private func makeRow(keys: [String]) -> UIView {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 6

        for key in keys {
            let btn = makeKeyButton(key: key)
            stack.addArrangedSubview(btn)

            // Space key is wider
            if key == "space" {
                btn.widthAnchor.constraint(equalTo: stack.widthAnchor, multiplier: 0.45).isActive = true
            }
        }
        return stack
    }

    private func makeKeyButton(key: String) -> UIButton {
        let btn = UIButton(type: .custom)
        btn.translatesAutoresizingMaskIntoConstraints = false
        btn.heightAnchor.constraint(equalToConstant: 44).isActive = true

        let isSpecial = ["⇧","⌫","123","ABC","🌐","#%^","return","space"].contains(key)
        let isDark = traitCollection.userInterfaceStyle == .dark

        if isSpecial {
            btn.backgroundColor = isDark
                ? UIColor(red: 0.12, green: 0.15, blue: 0.22, alpha: 1)
                : UIColor(red: 0.69, green: 0.71, blue: 0.73, alpha: 1)
        } else {
            btn.backgroundColor = isDark
                ? UIColor(red: 0.16, green: 0.20, blue: 0.30, alpha: 1)
                : UIColor.white
        }

        btn.layer.cornerRadius = 5
        btn.layer.shadowColor = UIColor.black.cgColor
        btn.layer.shadowOffset = CGSize(width: 0, height: 1)
        btn.layer.shadowOpacity = 0.3
        btn.layer.shadowRadius = 0.5

        // Label
        let displayText: String
        switch key {
        case "space": displayText = "space"
        case "return": displayText = "return"
        case "⇧": displayText = isUppercase ? "⇪" : "⇧"
        default: displayText = isUppercase && !isSpecial ? key.uppercased() : key
        }

        btn.setTitle(displayText, for: .normal)
        btn.setTitleColor(isDark ? .white : .black, for: .normal)
        btn.titleLabel?.font = isSpecial
            ? UIFont.systemFont(ofSize: 13, weight: .medium)
            : UIFont.systemFont(ofSize: 18, weight: .light)

        btn.addTarget(self, action: #selector(keyTapped(_:)), for: .touchUpInside)
        btn.accessibilityLabel = key  // store original key ID
        return btn
    }

    private func applyConstraints() {
        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: view.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            topBar.heightAnchor.constraint(equalToConstant: 18),

            keyboardContainer.topAnchor.constraint(equalTo: topBar.bottomAnchor, constant: 4),
            keyboardContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
            keyboardContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            keyboardContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    // ─── Key Tap Handler ──────────────────────────────────────────────────────
    @objc private func keyTapped(_ sender: UIButton) {
        let key = sender.accessibilityLabel ?? ""
        lightImpact.impactOccurred()

        // Log keystroke metadata
        let now = Date().timeIntervalSince1970 * 1000
        let interval = lastKeyTime > 0 ? now - lastKeyTime : 0
        lastKeyTime = now

        let keyType: KeyType
        switch key {
        case "⌫":      keyType = .backspace
        case "space":   keyType = .space
        case "return":  keyType = .return_
        case "⇧":       keyType = .shift
        default:        keyType = .character
        }

        keystrokeLogger.log(keyType: keyType, interKeyInterval: interval)

        // Perform text insertion
        switch key {
        case "⌫":
            mediumImpact.impactOccurred()
            if let documentProxy = textDocumentProxy as? UIKeyInput {
                documentProxy.deleteBackward()
            } else {
                (textDocumentProxy as UIKeyInput).deleteBackward()
            }

        case "return":
            textDocumentProxy.insertText("\n")

        case "space":
            textDocumentProxy.insertText(" ")

        case "⇧":
            isUppercase.toggle()
            renderKeys()
            return

        case "123", "#%^":
            isSymbolMode = true
            renderKeys()
            return

        case "ABC":
            isSymbolMode = false
            renderKeys()
            return

        case "🌐":
            advanceToNextInputMode()
            return

        default:
            let char = isUppercase && !isSymbolMode ? key.uppercased() : key
            textDocumentProxy.insertText(char)
            if isUppercase {
                isUppercase = false
                renderKeys()
            }
        }
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        setupUI()
    }
}
