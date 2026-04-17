# 物理Gitゲーム シナリオ集 v1.0

## 前提条件

- blob の中身は「形状-数字」の2ワード（例: ○-2）
- blob / tree / commit すべて連番（B1, T1, C1...）
- blob 付箋には ID と中身を両方書く（例: B1 / ○-2）
- tree には Blob ID で参照を書く（例: HOGE.txt → B1）
- Content Matrix: 4形状（○×△□）× 4数字（1-4）= 16マス。中身 → Blob ID の逆引き検索台帳

---

## ルール集（ハンドブック）

### 3つのルール

1. **付箋は消せない（不変オブジェクト）** -- 一度書いたら上書き禁止・剥がし禁止
2. **参照テーブルだけ書き換えていい（可変参照）** -- Reference 欄だけ動く。1マスに1つ
3. **同じ中身は使い回す（コンテンツアドレッサブル）** -- Content Matrix で検索し、同じ中身の Blob ID があれば新しい付箋は作らない

### 3種類の付箋

| 付箋 | 色 | 役割 | 書くこと |
|---|---|---|---|
| **Blob**（小） | 青 | ファイルの中身 | ID（B1等）+ 中身（形状-数字） |
| **Tree**（中） | 緑 | ファイル名→Blob対応表 | ID（T1等）+ ファイル名 → Blob ID |
| **Commit**（大） | 黄 | スナップショット | ID（C1等）+ tree + parent + msg |

### Content Matrix

4形状（○×△□）× 4数字（1-4）= 16マスの台紙。Blob の「検索台帳」。

- Blob を新規作成したら該当マスに貼り、Blob ID を記入する
- Tree を書くときはまずここで中身を探す。あれば既存の Blob ID を使い回す

### 参照テーブル（ホワイトボード）

| Label | → | Reference |
|---|---|---|
| HEAD | → | （branch名 or commit ID） |
| main | → | （commit ID） |
| feature | → | （commit ID） |

- HEAD は常に一番上
- Reference 欄に書けるのは **1つだけ**（矢印を伸ばして繋げない）
- 参照先を変えるときは消して書き直す

### 禁止事項

- ❌ 付箋の書き換え・上書き
- ❌ 付箋を剥がす・破棄する
- ❌ 参照テーブル以外の情報をホワイトボードに書く（中身や履歴は付箋の仕事）

---

## シナリオ 1: はじめてのコミット

### お題

> `HOGE.txt` というファイルが1つある。中身は `○-1`。
> これを Git で管理開始しよう。

### ゴール状態

- blob 1枚、tree 1枚、commit 1枚が盤面にある
- Content Matrix の ○行・1列 に blob が貼られ「B1」と記入されている
- main → C1、HEAD → main

### やること

1. blob付箋（小/青）を作る: `B1 / ○-1` → Content Matrix の ○行・1列 に貼り「B1」と記入
2. tree付箋（中/緑）を作る: `T1 / HOGE.txt → B1`
3. commit付箋（大/黄）を作る: `C1 / tree: T1 / parent: - / msg: init`
4. ホワイトボードの参照テーブルに書く:

```
| Label    | → | Reference |
|----------|---|-----------|
| HEAD     | → | main      |
| main     | → | C1        |
```

### 学びポイント

- blob はファイルの「中身」だけ。ファイル名は知らない
- tree が「ファイル名 → Blob ID」の対応表。tree が blob を参照している
- commit が tree を指すことで、その時点のファイル構成全体を記録する

---

## シナリオ 2: ファイルを1つ変更する

### 前提

シナリオ 1 の完了状態から開始。

### お題

> `HOGE.txt` の中身を `○-1` から `○-2` に変更してコミットしよう。

### ゴール状態

- Content Matrix: ○行・1列に B1、○行・2列に B2
- main → C2、HEAD → main

### やること

1. 新しい blob: `B2 / ○-2` → Content Matrix の ○行・2列 に貼り「B2」と記入
2. 新しい tree: `T2 / HOGE.txt → B2`
3. 新しい commit: `C2 / tree: T2 / parent: C1 / msg: change HOGE to ○-2`
4. 参照テーブル: main の Reference を `C2` に書き換え

### 学びポイント

- 古い blob（B1 / ○-1）は消えない。Content Matrix にそのまま残る
- commit の parent が前の commit を指す → これが履歴の鎖
- 「上書き」ではなく「追加」で世界が進む

---

## シナリオ 3: ファイルを増やす

### 前提

シナリオ 2 の完了状態から開始。

### お題

> 新しいファイル `PIYO.txt` を追加したい。中身は `○-2`。
> ただし、`HOGE.txt` の中身も `○-2` のままだ。

### ゴール状態

- blob は増えない（B2 を使い回し）
- main → C3

### やること

1. PIYO.txt の中身は `○-2` → Content Matrix を検索 → ○行・2列に B2 がある → **新しい blob は作らない**
2. 新しい tree: `T3 / HOGE.txt → B2 / PIYO.txt → B2`
3. 新しい commit: `C3 / tree: T3 / parent: C2 / msg: add PIYO.txt`
4. 参照テーブル: main の Reference を `C3` に書き換え

### 学びポイント

- **コンテンツアドレッサブル**: 同じ中身なら同じ blob。Content Matrix で検索して既存の Blob ID を使い回す
- tree が変わるのは「どのファイルがあるか」が変わったから
- blob の数 ≠ ファイルの数。中身が同じなら共有される

### ファシリテーターへのヒント

「Content Matrix を見て。○-2 はもうある？ Blob ID は何？」と問いかける。
「blob はファイル名を知らない。名前が違っても中身が同じなら同じ blob」が腹落ちポイント。

---

## シナリオ 4: 片方だけ変更する

### 前提

シナリオ 3 の完了状態から開始。

### お題

> `HOGE.txt` の中身を `△-2` に変更したい。`PIYO.txt` はそのまま `○-2`。

### ゴール状態

- 新しい blob: B3 / △-2
- Content Matrix: △行・2列 に B3 を追加
- main → C4

### やること

1. 新しい blob: `B3 / △-2` → Content Matrix の △行・2列 に貼り「B3」と記入
2. PIYO.txt は変更なし → B2 をそのまま使い回す
3. 新しい tree: `T4 / HOGE.txt → B3 / PIYO.txt → B2`
4. 新しい commit: `C4 / tree: T4 / parent: C3 / msg: change HOGE to △-2`
5. 参照テーブル: main の Reference を `C4` に書き換え

### 学びポイント

- 変更していないファイルの blob は使い回す
- tree は毎回新しく作るが、中の参照先は変わらない部分がある

---

## シナリオ 5: ファイルを削除する

### 前提

シナリオ 4 の完了状態から開始（HOGE.txt→B3/△-2, PIYO.txt→B2/○-2）。

### お題

> `PIYO.txt` を削除したい。`HOGE.txt` はそのまま。

### ゴール状態

- blob は増えない
- main → C5

### やること

1. 新しい tree: `T5 / HOGE.txt → B3`（PIYO.txt の行を書かない）
2. 新しい commit: `C5 / tree: T5 / parent: C4 / msg: remove PIYO.txt`
3. 参照テーブル: main の Reference を `C5` に書き換え

### 確認クイズ

- Q: PIYO.txt の blob（B2 / ○-2）は消える？
- A: 消えない。Content Matrix にそのまま残る。tree から参照されなくなっただけ

### 学びポイント

- 「削除」とは、そのファイルを参照しない新しい tree を作ること
- blob は消えない。Content Matrix にそのまま残る
- 過去の commit からはいつでも復元できる（blob が残っているから）

---

## シナリオ 6: ファイルをリネームする

### 前提

シナリオ 5 の完了状態から開始（HOGE.txt→B3/△-2 のみ）。

### お題

> `HOGE.txt` を `FUGA.txt` にリネームしたい。中身は変えない。

### ゴール状態

- blob は増えない（B3 を使い回し）
- main → C6

### やること

1. FUGA.txt の中身は `△-2` → Content Matrix を検索 → △行・2列に B3 がある → **新しい blob は作らない**
2. 新しい tree: `T6 / FUGA.txt → B3`
3. 新しい commit: `C6 / tree: T6 / parent: C5 / msg: rename HOGE to FUGA`
4. 参照テーブル: main の Reference を `C6` に書き換え

### 学びポイント

- **リネームは blob に影響しない**。変わるのは tree だけ
- Git には「リネーム」という操作は存在しない。旧名で参照していた blob を、新名で参照する新しい tree に切り替えているだけ
- blob はファイル名を知らない → ファイル名が変わっても blob は無関係

---

## シナリオ 7: バグ発見！ fix ブランチを切る

### 前提

シナリオ 6 の完了状態から開始（FUGA.txt→B3/△-2 のみ）。

### お題

> FUGA.txt の中身にバグがあることが分かった！
> 直接 main を触るのは怖いので、`fix` ブランチを作って修正しよう。

### ゴール状態

- 参照テーブルに `fix` 行が追加、Reference は `C6`
- HEAD の Reference が `fix`

### やること

1. 参照テーブルに行を追加: `fix → C6`
2. HEAD の Reference を `fix` に書き換え

### 学びポイント

- **branch はただのラベル**。commit を指すポインタでしかない
- branch を作っても付箋は増えない（参照テーブルに行を足すだけ）
- checkout は HEAD を動かすだけ

---

## シナリオ 8: fix ブランチで修正する

### 前提

シナリオ 7 の完了状態から開始（HEAD → fix → C6）。

### お題

> `FUGA.txt` の中身を `△-2` から `○-1` に修正しよう。
> （S1 の時点の HOGE.txt と同じ中身に戻す）

### ゴール状態

- blob は増えない（B1 / ○-1 は S1 で作った blob を再利用）
- fix → C7

### やること

1. FUGA.txt の中身は `○-1` → Content Matrix を検索 → ○行・1列に B1 がある → **新しい blob は作らない**
2. 新しい tree: `T7 / FUGA.txt → B1`
3. 新しい commit: `C7 / tree: T7 / parent: C6 / msg: fix FUGA to ○-1`
4. 参照テーブル: fix の Reference を `C7` に書き換え（HEAD → fix のまま）

### 確認クイズ

- Q: ○-1 の blob は新しく作った？
- A: 作っていない。S1 で作った B1 がそのまま使える。Content Matrix の ○行・1列 を見れば B1 と分かる
- Q: main はどこを指している？
- A: main → C6 のまま。fix ブランチで作業しているので main は動かない

### 学びポイント

- **fix も新しい commit**。「間違い」の履歴（C6）は消えない
- 過去の blob が再利用される → コンテンツアドレッサブルの恩恵
- ブランチで作業すると main に影響しない → 安全に修正できる

---

## シナリオ 9: main に FF merge する

### 前提

シナリオ 8 の完了状態から開始（fix → C7、main → C6）。

### お題

> 修正が完了したので、fix ブランチの内容を main に取り込もう。

### ゴール状態

- main → C7（fix と同じ commit を指す）
- 付箋は増えない

### やること

1. 参照テーブル: HEAD の Reference を `main` に書き換え（main に checkout）
2. main → C6、fix → C7。C6 は C7 の祖先 → **fast-forward 可能**
3. 参照テーブル: main の Reference を `C7` に書き換え（ポインタを進めるだけ）

### 確認クイズ

- Q: merge commit は作った？
- A: 作っていない。main のポインタを C7 に進めただけ
- Q: なぜ fast-forward できた？
- A: main（C6）が fix（C7）の直接の祖先だから。分岐がない

### 学びポイント

- **fast-forward merge はポインタ移動だけ**。新しい commit は作らない
- 「main が fix に追いつく」イメージ
- 分岐がない場合にのみ可能

---

## シナリオ 10: feature ブランチで並行開発（1）

### 前提

シナリオ 9 の完了状態から開始（main → C7、FUGA.txt→B1/○-1 のみ）。

### お題

> 新機能を開発するために `feature` ブランチを作り、`PIYO.txt`（中身: `×-1`）を追加しよう。

### ゴール状態

- 新しい blob: B4 / ×-1
- feature → C8

### やること

1. 参照テーブルに行を追加: `feature → C7`
2. HEAD の Reference を `feature` に書き換え
3. 新しい blob: `B4 / ×-1` → Content Matrix の ×行・1列 に貼り「B4」と記入
4. 新しい tree: `T8 / FUGA.txt → B1 / PIYO.txt → B4`
5. 新しい commit: `C8 / tree: T8 / parent: C7 / msg: add PIYO.txt ×-1`
6. 参照テーブル: feature の Reference を `C8` に書き換え

### 学びポイント

- feature ブランチで commit しても main は動かない
- 並行開発の準備ができた

---

## シナリオ 11: main で並行開発（2）

### 前提

シナリオ 10 の完了状態から開始（feature → C8、main → C7）。

### お題

> main に戻って、`FUGA.txt` の中身を `×-3` に変更しよう。

### ゴール状態

- 新しい blob: B5 / ×-3
- main → C9
- main と feature が分岐した状態

### やること

1. HEAD の Reference を `main` に書き換え
2. 新しい blob: `B5 / ×-3` → Content Matrix の ×行・3列 に貼り「B5」と記入
3. 新しい tree: `T9 / FUGA.txt → B5`
4. 新しい commit: `C9 / tree: T9 / parent: C7 / msg: change FUGA to ×-3`
5. 参照テーブル: main の Reference を `C9` に書き換え

### 確認クイズ

- Q: main と feature の共通祖先は？
- A: C7。ここから分岐している

### 学びポイント

- main と feature が別々の commit を指している → **分岐が発生**
- C7 が共通祖先（merge base）
- この状態では fast-forward できない（両方に新しい commit がある）

---

## シナリオ 12: 非 fast-forward merge

### 前提

シナリオ 11 の完了状態から開始（main → C9、feature → C8、共通祖先 C7）。

### お題

> feature ブランチの内容を main に取り込もう。
> feature は PIYO.txt を追加、main は FUGA.txt を変更。別ファイルなので conflict はない。

### ゴール状態

- 新しい tree: T10（FUGA.txt → B5, PIYO.txt → B4）
- 新しい commit: C10（parent が2つ: C9 と C8）
- main → C10

### やること

1. 両方の変更を反映した tree を作る:
   - FUGA.txt → B5（main 側の変更: ×-3）
   - PIYO.txt → B4（feature 側の追加: ×-1）
2. 新しい tree: `T10 / FUGA.txt → B5 / PIYO.txt → B4`
3. 新しい commit: `C10 / tree: T10 / parent: C9, C8 / msg: merge feature into main`
4. 参照テーブル: main の Reference を `C10` に書き換え

### 確認クイズ

- Q: S9 の FF merge と何が違う？
- A: 新しい merge commit（C10）が作られた。parent が2つある
- Q: なぜ FF できなかった？
- A: main にも feature にも C7 以降の commit がある。分岐しているから

### 学びポイント

- **非FF merge は新しい commit を作る**。parent が2つ → 履歴の合流点
- conflict がなくても、分岐していれば merge commit が必要
- 履歴がグラフ構造になる

---

## シナリオ 13: conflict を体験する

### 前提

シナリオ 12 の完了状態から開始（main → C10）。

### お題

> `feature2` ブランチと main で、**同じファイル（FUGA.txt）を別々に変更**してしまった。
>
> - feature2: FUGA.txt を `×-3` → `△-2` に変更
> - main: FUGA.txt を `×-3` → `□-3` に変更
>
> merge しようとしたら conflict！ どう解決する？

### 準備（ファシリテーターが誘導）

1. C10 から `feature2` ブランチを作る: `feature2 → C10`
2. feature2 で FUGA.txt を `△-2` に変更:
   - Content Matrix を検索 → △行・2列に B3 がある → blob は使い回し
   - `T11 / FUGA.txt → B3 / PIYO.txt → B4`
   - `C11 / tree: T11 / parent: C10 / msg: change FUGA to △-2`
   - `feature2 → C11`
3. main に戻って FUGA.txt を `□-3` に変更:
   - 新しい blob: `B6 / □-3` → Content Matrix の □行・3列 に貼り「B6」と記入
   - `T12 / FUGA.txt → B6 / PIYO.txt → B4`
   - `C12 / tree: T12 / parent: C10 / msg: change FUGA to □-3`
   - `main → C12`

### conflict 発生！

main（C12）と feature2（C11）を merge しようとすると:

- 共通祖先（C10）: FUGA.txt → B5（×-3）
- main 側: FUGA.txt → B6（□-3）（形状を□に変更）
- feature2 側: FUGA.txt → B3（△-2）（形状を△に、数字を2に変更）
- → **同じファイルを別々に変更 → conflict！**

### conflict 解決デスク（このシナリオだけの特別ルール）

GUI の conflict 解決画面（3ペイン表示）を物理的に再現する。
**普段は Content Matrix から blob を動かさないが、conflict 解決のときだけ一時的に手元に持ってくる。**

1. Content Matrix から以下の3枚の blob 付箋を手元に持ってきて、横に並べる:

```
[B5 / ×-3]      [B6 / □-3]      [B3 / △-2]
 ancestor          ours            theirs
（共通祖先）    （今いる側）     （相手側）
```

2. 3枚を見比べて「何が衝突しているか」を確認する:
   - 形状: × → □（ours）、× → △（theirs）— **両方変えた → 衝突**
   - 数字: 3 → 3（ours）、3 → 2（theirs）— **片方だけ変えた**
3. チームで話し合って解決方法を決める
4. 決まったら3枚を Content Matrix に戻す

> これは本物の Git で conflict が起きたときに、GUI ツールが ancestor / ours / theirs を3ペインで並べて見せてくれるのと同じ。
> 普段 Git は `.git/objects/` の中身を隠しているが、conflict のときだけ「中身を引っ張り出して見せてくれる」。

### 解決方法を選ぶ

| 方針 | 結果 | 新規blob？ | 説明 |
|---|---|---|---|
| **ours**（main 側を採用） | FUGA.txt → B6（□-3） | なし | 今いる側（HEAD）の変更を優先 |
| **theirs**（feature2 側を採用） | FUGA.txt → B3（△-2） | なし | 相手ブランチの変更を優先 |
| **manual**（手動マージ） | FUGA.txt → B7（□-2） | **あり** | 形状は main 側の□、数字は feature2 側の2 |

> ours/theirs は「どちらかを選ぶ」だけなので既存 blob を指すだけ。
> manual は「両方の変更を混ぜて新しい状態を作る」ので、大概は新規 blob になる。

### やること（manual の場合）

1. 新しい blob: `B7 / □-2` → Content Matrix の □行・2列 に貼り「B7」と記入
2. 新しい tree: `T13 / FUGA.txt → B7 / PIYO.txt → B4`
3. 新しい commit: `C13 / tree: T13 / parent: C12, C11 / msg: resolve conflict`
4. 参照テーブル: main の Reference を `C13` に書き換え

### 学びポイント

- **conflict は同じファイルを別々に変更したときに起きる**
- Content Matrix の2ワード構成で「何が衝突しているか」が視覚的に分かる
- ours/theirs は既存 blob を選ぶだけ。manual は混ぜるから新規 blob になる
- ours = 今いる側（HEAD）、theirs = 相手側。迷ったら「HEAD はどこ？」で判断
- 解決方法は1つではない。チームで話し合って決める

---

## シナリオ 14: タグ + 過去からの引き出し（発展）

### 前提

シナリオ 13 の完了状態から開始。

### お題 A: タグ

> 「C6 の時点が最初のリリースだった」ことにしたい。
> C6 に `v1.0` という名前を付けよう。

### やること

1. 参照テーブルに行を追加: `v1.0 → C6`

### 学びポイント

- **タグは動かない参照**。branch は commit のたびに進むが、タグは固定
- 「この時点に名前を付ける」ことで、過去の特定地点へのアクセスが楽になる

### お題 B: 過去からの引き出し（Retrieval）

> 「C3 の時点で PIYO.txt ってどんな中身だったっけ？」
> commit → tree → blob を辿って確認しよう。

### やること

1. C3 を探す → tree は T3
2. T3 を見る → PIYO.txt → B2 → Content Matrix で B2 を探す → 中身は `○-2`

### 学びポイント

- **履歴は消えない → いつでも引き出せる**
- commit → tree → blob を辿れば、任意の時点のファイルの中身が分かる

---

## 全体の流れ

```
C1 ← C2 ← C3 ← C4 ← C5 ← C6 ← C7 ← C8(feature)
                                    ↑     |
                                  v1.0    C9(main) ← C10(merge) ← C11(feature2)
                                                          |              |
                                                         C12(main) ← C13(conflict解決)
```

### Content Matrix 最終状態

```
        1       2       3       4
  ○  | B1   | B2   |      |      |
  ×  | B4   |      | B5   |      |
  △  |      | B3   |      |      |
  □  |      | B7   | B6   |      |
```

使用した blob: 7種（B1=○-1, B2=○-2, B3=△-2, B4=×-1, B5=×-3, B6=□-3, B7=□-2）

### 盤面に残るオブジェクト数

- blob: 7枚
- tree: 13枚（T1〜T13）
- commit: 13枚（C1〜C13）
- 合計: 33枚の付箋
- ホワイトボード: main → C13, feature → C8, feature2 → C11, fix → C7, HEAD → main, v1.0 → C6

### ふりかえり用の問い

1. blob は何枚作った？ commit の数と比べてどう？
2. Content Matrix で使い回した場面はどこ？ そのとき Blob ID は何だった？
3. 「削除」したファイルの blob はまだ Content Matrix にある？
4. FF merge と非FF merge の違いは？ 付箋は増えた？
5. conflict が起きたとき、Content Matrix の2ワードのどこが衝突していた？
6. ours と theirs はどっちがどっち？
7. v1.0 と main の違いは？
8. もし付箋を1枚剥がしたら、何が壊れる？
