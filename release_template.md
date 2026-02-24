# PearTree v[VERSION] Release Notes

## What's New

- 

## Bug Fixes

- 

## Known Issues

- 

---

## Download

Choose the package for your operating system and processor below.

### macOS

| File | System | Processor |
|------|--------|-----------|
| `PearTree_[VERSION]_x64.dmg` | macOS 10.13+ | Intel (x64) |
| `PearTree_[VERSION]_aarch64.dmg` | macOS 11.0+ | Apple Silicon (M1/M2/M3/M4) |

> If you are unsure which Mac you have, click the Apple menu () → **About This Mac**. If the chip says "Apple M1" or later, download the `aarch64` build. If it says "Intel", download the `x64` build.

> The `.app.tar.gz` files (`PearTree_x64.app.tar.gz`, `PearTree_aarch64.app.tar.gz`) are used internally for auto-updates and do not need to be downloaded manually.

### Windows

| File | System | Processor | Notes |
|------|--------|-----------|-------|
| `PearTree_[VERSION]_x64-setup.exe` | Windows 10/11 | 64-bit Intel/AMD | Recommended installer — simple double-click setup |
| `PearTree_[VERSION]_x64_en-US.msi` | Windows 10/11 | 64-bit Intel/AMD | MSI installer for enterprise/managed deployments |

> Most Windows users should use the `.exe` installer. The `.msi` package is intended for system administrators deploying via Group Policy or other management tools.

### Linux

| File | System | Processor | Notes |
|------|--------|-----------|-------|
| `PearTree_[VERSION]_amd64.deb` | Debian, Ubuntu, Linux Mint, Pop!_OS | 64-bit Intel/AMD | Install with `sudo dpkg -i` or double-click |
| `PearTree-[VERSION]-1.x86_64.rpm` | Fedora, Red Hat, CentOS, openSUSE | 64-bit Intel/AMD | Install with `sudo rpm -i` or `sudo dnf install` |
| `PearTree_[VERSION]_amd64.AppImage` | Any Linux distribution | 64-bit Intel/AMD | Portable — no installation required, just make executable and run |

> **Not sure which Linux package to use?**
> - Use `.deb` if you are on Ubuntu, Debian, or a derivative.
> - Use `.rpm` if you are on Fedora, Red Hat, CentOS, or openSUSE.
> - Use the `.AppImage` if your distro is not listed above, or if you want a portable version that requires no installation. Run `chmod +x PearTree_[VERSION]_amd64.AppImage && ./PearTree_[VERSION]_amd64.AppImage`.

---

## Processor / Architecture Reference

| Term | Meaning | Common hardware |
|------|---------|-----------------|
| `x64` / `amd64` / `x86_64` | 64-bit Intel or AMD processor | Most Windows PCs and Intel Macs |
| `aarch64` / `arm64` | 64-bit ARM processor | Apple Silicon Macs (M1 and later), ARM-based Windows devices |

---

## Checksums

```
SHA-256:
PearTree-[VERSION]-1.x86_64.rpm        <hash>
PearTree_[VERSION]_aarch64.dmg         <hash>
PearTree_[VERSION]_amd64.AppImage      <hash>
PearTree_[VERSION]_amd64.deb           <hash>
PearTree_[VERSION]_x64-setup.exe       <hash>
PearTree_[VERSION]_x64.dmg             <hash>
PearTree_[VERSION]_x64_en-US.msi       <hash>
PearTree_aarch64.app.tar.gz            <hash>
PearTree_x64.app.tar.gz                <hash>
```
