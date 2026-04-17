# 物理Gitゲーム 参考資料: 本物のGitで答え合わせ

シナリオ集の盤面操作を、本物の Git で再現して `git cat-file` で中身を確認する手順。
「付箋でやったことが本当に Git の中で起きている」ことを自分の手で確かめられる。

> **注意:** blob のハッシュ値は中身だけで決まるので、誰がいつ実行しても同じ値になる。
> commit / tree のハッシュ値は author / timestamp が影響するため、実行環境によって異なる。

---

## 準備

```bash
mkdir git-game-cm && cd git-game-cm
git init
git branch -m main
```

---

## S1: はじめてのコミット

```bash
echo -n "○-1" > HOGE.txt
git add HOGE.txt
git commit -m "init"
```

### 答え合わせ

```bash
git cat-file -p HEAD          # commit の中身
git cat-file -p HEAD^{tree}   # tree の中身
```
```
100644 blob 3306175...    HOGE.txt
```

→ 付箋の `T1 / HOGE.txt → B1` に対応。

```bash
git cat-file -p 3306175
```
```
○-1
```

→ blob の中身。Content Matrix の ○行・1列（B1）。

---

## S2: ファイルを1つ変更する

```bash
echo -n "○-2" > HOGE.txt
git add HOGE.txt
git commit -m "change HOGE to ○-2"
```

### 答え合わせ

```bash
git cat-file -p HEAD^{tree}
```
```
100644 blob 02c1d18...    HOGE.txt
```

→ blob のハッシュが S1 と違う（中身が変わったから）。

```bash
# 古い blob はまだ残っている
git cat-file -p 3306175
```
```
○-1
```

→ 「履歴は消えない」の証拠。

---

## S3: ファイルを増やす（コンテンツアドレッサブルの確認）

```bash
echo -n "○-2" > PIYO.txt
git add PIYO.txt
git commit -m "add PIYO.txt"
```

### 答え合わせ

```bash
git cat-file -p HEAD^{tree}
```
```
100644 blob 02c1d18...    HOGE.txt
100644 blob 02c1d18...    PIYO.txt
```

**HOGE.txt と PIYO.txt の blob ハッシュが同じ！**

→ 付箋の `T3 / HOGE.txt → B2 / PIYO.txt → B2` に対応。
→ ファイル名が違っても、中身が同じなら同じ blob を指す。

---

## S4: 片方だけ変更する

```bash
echo -n "△-2" > HOGE.txt
git add HOGE.txt
git commit -m "change HOGE to △-2"
```

### 答え合わせ

```bash
git cat-file -p HEAD^{tree}
```
```
100644 blob cd2bb18...    HOGE.txt
100644 blob 02c1d18...    PIYO.txt
```

→ HOGE.txt だけ新しい blob、PIYO.txt は使い回し。

---

## S5: ファイルを削除する

```bash
git rm PIYO.txt
git commit -m "remove PIYO.txt"
```

### 答え合わせ

```bash
git cat-file -p HEAD^{tree}
```
```
100644 blob cd2bb18...    HOGE.txt
```

→ PIYO.txt が tree から消えた。でも blob（02c1d18）はまだ存在する:

```bash
git cat-file -p 02c1d18
```
```
○-2
```

---

## S6: ファイルをリネームする

```bash
git mv HOGE.txt FUGA.txt
git commit -m "rename HOGE to FUGA"
```

### 答え合わせ

```bash
git cat-file -p HEAD^{tree}
```
```
100644 blob cd2bb18...    FUGA.txt
```

→ blob ハッシュは S4 の HOGE.txt と同じ。リネームで blob は変わらない。

---

## S7-S8: fix ブランチで修正する

```bash
git checkout -b fix
echo -n "○-1" > FUGA.txt
git add FUGA.txt
git commit -m "fix FUGA to ○-1"
```

### 答え合わせ

```bash
git cat-file -p HEAD^{tree}
```
```
100644 blob 3306175...    FUGA.txt
```

**S1 の HOGE.txt と同じ blob ハッシュ（3306175）！**

→ ファイル名が HOGE.txt → FUGA.txt に変わっても、中身が `○-1` なら同じ blob。
→ コンテンツアドレッサブル: 中身が同じなら、世界中どこで計算しても同じハッシュ。

---

## S9: main に FF merge

```bash
git checkout main
git merge fix
```

### 答え合わせ

```bash
git rev-parse --short main
git rev-parse --short fix
```

→ 両方同じ commit を指している。**FF merge はポインタ移動だけ。**

```bash
git log --oneline
```

→ merge commit は作られていない。

---

## S10-S11: 並行開発

```bash
# feature ブランチで PIYO.txt 追加
git checkout -b feature
echo -n "×-1" > PIYO.txt
git add PIYO.txt
git commit -m "add PIYO.txt ×-1 on feature"

# main で FUGA.txt 変更
git checkout main
echo -n "×-3" > FUGA.txt
git add FUGA.txt
git commit -m "change FUGA to ×-3 on main"
```

---

## S12: 非 FF merge

```bash
git merge feature -m "merge feature into main"
```

### 答え合わせ

```bash
git cat-file -p HEAD
```
```
tree ad5d0fe...
parent 18836cb...    ← main 側の commit
parent 94e52b1...    ← feature 側の commit
...
merge feature into main
```

→ **parent が2つ！** これが非FF merge の証拠。

```bash
git cat-file -p HEAD^{tree}
```
```
100644 blob cbbb145...    FUGA.txt     ← ×-3（main 側）
100644 blob 4312778...    PIYO.txt     ← ×-1（feature 側）
```

→ 両方の変更が反映されている。

---

## S13: conflict

```bash
# feature2 で FUGA.txt を △-2 に
git checkout -b feature2
echo -n "△-2" > FUGA.txt
git add FUGA.txt
git commit -m "change FUGA to △-2 on feature2"

# main で FUGA.txt を □-3 に
git checkout main
echo -n "□-3" > FUGA.txt
git add FUGA.txt
git commit -m "change FUGA to □-3 on main"

# merge → conflict!
git merge feature2 -m "merge feature2"
```

```
CONFLICT (content): Merge conflict in FUGA.txt
Automatic merge failed; fix conflicts and then commit the result.
```

```bash
cat FUGA.txt
```
```
<<<<<<< HEAD
□-3
=======
△-2
>>>>>>> feature2
```

→ **本物の Git でも同じ conflict が発生！**

### 解決（manual: □-2）

```bash
echo -n "□-2" > FUGA.txt
git add FUGA.txt
git commit -m "resolve conflict: manual merge to □-2"
```

---

## 盤面との対応表

### blob（中身が同じなら誰がいつ実行しても同じハッシュ）

| Content Matrix | Blob ID | blob ハッシュ | 初出 |
|---|---|---|---|
| ○-1 | B1 | `3306175025e0ac8207f996a2523afe877377a663` | S1 |
| ○-2 | B2 | `02c1d188ffa9796b25fa86efa9eb5e38c180902d` | S2 |
| △-2 | B3 | `cd2bb18714afa564c7db4d21ef845088d8b320de` | S4 |
| ×-1 | B4 | `4312778976db63c8b530de5834d4c1a0aec20b45` | S10 |
| ×-3 | B5 | `cbbb1458e531611413ceb8788e0e56a6bd798b8c` | S11 |
| □-3 | B6 | `23cf339a8831479c588c2366602597f0dc721999` | S13 |
| □-2 | B7 | `88c9520a730a50ab0386db49461dcad9fbec3d05` | S13 |

### 再利用の証拠

| シナリオ | ファイル | Blob ID | 中身 | 初出 | 説明 |
|---|---|---|---|---|---|
| S3 | PIYO.txt | B2 | ○-2 | S2 | 同じ中身 → 同じ blob |
| S6 | FUGA.txt | B3 | △-2 | S4 | リネーム → blob 不変 |
| S8 | FUGA.txt | B1 | ○-1 | S1 | fix で過去の blob を再利用 |
| S13 | FUGA.txt(feature2) | B3 | △-2 | S4 | 別ブランチでも同じ blob |

### 履歴グラフ

```
*   2e879da resolve conflict: manual merge to □-2
|\
| * ac63a76 change FUGA to △-2 on feature2
* | 6608e93 change FUGA to □-3 on main
|/
*   d343f11 merge feature into main
|\
| * 9350493 add PIYO.txt ×-1 on feature
* | 5577aff change FUGA to ×-3 on main
|/
* 680e6d0 fix FUGA to ○-1
* da83c41 rename HOGE to FUGA
* 65265ae remove PIYO.txt
* 1d78946 change HOGE to △-2
* 6ce39b3 add PIYO.txt
* 44ef81c change HOGE to ○-2
* c39b2fe init
```

---

## .git/objects/ を覗いてみる

```bash
find .git/objects -type f | sort
```

ここに blob / tree / commit が全てファイルとして保存されている。
ディレクトリ名（先頭2文字）+ ファイル名（残り38文字）= ハッシュ値。

このゲームの Content Matrix は、この `.git/objects/` を人間が手で探せるようにした検索台帳。
本物の Git ではハッシュ値で一発で引けるので、台帳は要らない。

---

## 補足: blob ハッシュの普遍性

```bash
echo -n "○-1" | git hash-object --stdin
```
```
3306175025e0ac8207f996a2523afe877377a663
```

**誰がどのマシンで実行しても同じ値になる。** これがコンテンツアドレッサブルの本質。

commit のハッシュは author / timestamp が入るから毎回変わるが、blob だけは純粋に中身の関数。
