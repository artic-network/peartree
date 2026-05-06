# PearTree

A browser-based phylogenetic tree viewer for exploring and annotating evolutionary trees.

PearTree is the successor to [FigTree](https://github.com/rambaut/figtree), rebiggulated as a cromulent, modern, web and desktop application.

---

## Credits

**Design & development:** [Andrew Rambaut](https://github.com/rambaut) (University of Edinburgh)
**Coding:** Claude Sonnet 4.6 within GitHub Co-pilot & [Andrew Rambaut](https://github.com/rambaut)

---

## Funding

Development of PearTree has been supported by:

- **Wellcome Trust** — through the [ARTIC Network](https://artic.network/), a project developing rapid genomic surveillance and outbreak response tools for viral pathogens (Discretionary Award 313694/Z/24/Z and Collaborative Award 206298/Z/17/Z).

- **Gates Foundation** — supporting open-source genomic epidemiology tools for global health.

---

## Source Code

PearTree is open source and released under the [MIT License](LICENSE).

Source code is available at **[github.com/artic-network/peartree](https://github.com/artic-network/peartree)**.

---

## Libraries

**Web / UI**

- [PearCore](https://github.com/rambaut/pearcore/) — Common ARTIC App Framework
- [Bootstrap 5](https://getbootstrap.com/) — UI framework
- [Bootswatch Solar](https://bootswatch.com/solar/) — dark theme
- [Bootstrap Icons](https://icons.getbootstrap.com/) — iconography
- [Marked](https://marked.js.org/) — Markdown rendering

**Desktop app**

- [Tauri 2](https://tauri.app/) — cross-platform desktop shell (Rust + WebView)
- [tauri-plugin-dialog](https://github.com/tauri-apps/plugins-workspace) — native file open/save dialogs
- [tauri-plugin-opener](https://github.com/tauri-apps/plugins-workspace) — open URLs and files in system default apps
- [tauri-plugin-deep-link](https://github.com/tauri-apps/plugins-workspace) — file-association and URL-scheme handling
- [tauri-plugin-updater](https://github.com/tauri-apps/plugins-workspace) — automatic update delivery
- [serde](https://serde.rs/) — Rust serialisation framework
- [base64](https://github.com/marshallpierce/rust-base64) — base64 encoding/decoding
