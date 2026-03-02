# 401 fix (tek seferlik)

`npx @hopsule/vibechecker .` 401 veriyorsa: `.npmrc` içinde GitHub token satırı var ve geçersiz.

**Yapılacak:** O satırı sil. Paket zaten public, token gerekmez.

Proje kökünde veya `~/.npmrc` içinde şuna benzer bir satır varsa **sil**:

```
//npm.pkg.github.com/:_authToken=ghp_xxxx
```

veya

```
//npm.pkg.github.com/:_authToken=npm_xxxx
```

Şunlar kalsın (sileceğin şey sadece _authToken satırı):

```
@hopsule:registry=https://npm.pkg.github.com
```

**Tek komutla sil (ev dizini .npmrc):**
```bash
sed -i '' '/\/\/npm.pkg.github.com\/:_authToken/d' ~/.npmrc
```
(Linux’ta `sed -i` kullan.)

Sonra: `npx @hopsule/vibechecker .`
