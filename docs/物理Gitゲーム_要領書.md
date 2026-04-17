# 物理Gitゲーム 要領書 v1.0

## 1. 目的

このゲームは、Git の以下を**身体で理解する**ことを目的とする。

* blob（ファイルの中身）
* tree（ファイル名→blobの対応表）
* commit
* branch
* HEAD
* checkout
* merge
* conflict
* コンテンツアドレッサブル（同じ中身 = 同じ blob = 使い回し。Content Matrix で検索）

このゲームでは、**履歴は消せない**。
変更は「上書き」ではなく、**新しい状態を追加**して表現する。

---

## 2. 用意するもの

* 付箋 3色（小・中・大、または色で区別）
  * 小 or 青: blob付箋（ファイルの中身）
  * 中 or 緑: tree付箋（ファイル名→blobの対応表）
  * 大 or 黄: commit付箋（tree + 親 + メッセージ）
* Content Matrix 台紙（A3横）
* 油性ペン
* ホワイトボード 1枚
* ホワイトボードマーカー
* スマホやタブレットなどのカメラ（盤面撮影用）
* 矢印を書くための細いテープ、または矢印線を引ける道具

---

## 3. 役割

### 3.1 付箋

付箋は **不変オブジェクト** とする。
一度書いた付箋は**書き換え禁止**。

付箋には次の3種類がある。

* blob付箋（小）: ファイル1個の中身。ID（連番 B1, B2...）と「形状-数字」の2ワードで表す（例: B1 / ○-2）
* tree付箋（中）: ファイル名 → Blob ID の対応表
* commit付箋（大）: tree + 親commit + メッセージ

**同じ中身のblob付箋は2枚作らない。Content Matrix で中身を検索し、既存の Blob ID を使い回す。**
これが「コンテンツアドレッサブル」の体験ポイント。

### 3.2 ホワイトボード

ホワイトボードは **可変参照領域** とする。
ここには以下だけを書いてよい。

* branch
* HEAD
* 補助メモ

### 3.3 カメラ

カメラは **盤面状態を撮影して記録するため**に使う。

---

## 4. 基本概念

### 4.1 blob

blob は「ファイル1個の中身」を表す。
中身は「形状-数字」の2ワードで構成される。

* 形状: ○ ×  △ □ の4種
* 数字: 1, 2, 3, 4 の4種

**blob ID は連番**（B1, B2, B3...）。blob 付箋には ID と中身を両方書く。

例:

```text
B1 / ○-1（ID: B1、中身: 形状○、数字1）
B3 / △-3（ID: B3、中身: 形状△、数字3）
```

※ blob はファイル名を知らない。どのファイルの中身かは tree が管理する。

### 4.2 tree

tree は「ファイル名 → blob ID の対応表」を表す。

例:

```text
T1
HOGE.txt → B1
PIYO.txt → B1
```

※ HOGE.txt と PIYO.txt の中身が同じなら、同じ Blob ID を指す。

### 4.3 commit

commit は以下を持つ。

* commit ID（連番: C1, C2...）
* 参照する tree
* 親 commit
* メッセージ

例:

```text
C1
tree: T1
parent: -
msg: initial commit
```

### 4.4 branch

branch は **どの commit を指しているか** だけを表す。

例:

```text
main -> C3
feature -> C2
```

### 4.5 HEAD

HEAD は **今どこを見ているか** を表す。

例:

```text
HEAD -> main
```

または detached HEAD の場合:

```text
HEAD -> C2
```

---

## 5. 盤面構成

ホワイトボード上に大きく2領域 + Content Matrix を配置する。

### 5.1 オブジェクト領域

ここに付箋を貼る。

* blob付箋（小）
* tree付箋（中）
* commit付箋（大）

### 5.2 参照領域

ホワイトボードにテーブルを書く。**1行に1つの参照。Reference 欄には値を1つだけ書く。**

```
| Label    | → | Reference |
|----------|---|-----------|
| HEAD     | → |           |
| main     | → |           |
| feature  | → |           |
```

* HEAD は常に一番上。消さない
* branch やタグが増えたら行を追加する
* 参照先を変えるときは Reference 欄を消して書き直す
* **Reference 欄に書けるのは1つだけ**（矢印を伸ばして繋げない）

### 5.3 Content Matrix（中身 → Blob ID の逆引き検索台帳）

4形状 × 4数字 = 16マスのマトリクス。blob の「検索台帳」として機能する。

![ContentMatrix](./物理Gitゲーム_ContentMatrix.jpeg)

* 新しい blob を作ったら、該当するマスに付箋を貼り、Blob ID を記入する
* tree を書くときは、まず Content Matrix で中身を探し、既存の Blob ID があるか確認する
* **同じ中身なら新しい付箋は作らない** -- Content Matrix で見つけた Blob ID を tree に書く

> Content Matrix は、本物の Git における `.git/objects/` の概念的な対応物である。
> 本物の Git では中身からハッシュ値を計算してオブジェクトを検索する（コンテンツアドレッサブル）。
> このゲームでは Content Matrix の座標で中身を探し、対応する Blob ID を見つけることで、ハッシュ計算なしでコンテンツアドレッサブルを体験できる。

---

## 6. 初期状態の作り方

### 6.1 blob を作る

最初のファイルの中身を blob付箋 に書き、Content Matrix の該当マスに貼る。

例:

```text
B1 / ○-1
```

Content Matrix の ○行・1列 に貼り、「B1」と記入する。

※ HOGE.txt も PIYO.txt も中身が `○-1` なら、blob は1枚だけでよい。

### 6.2 tree を作る

ファイル名 → Blob ID の対応表を tree付箋 に書く。

例:

```text
T1
HOGE.txt → B1
PIYO.txt → B1
```

### 6.3 commit を作る

最初の commit付箋 を作る。

例:

```text
C1
tree: T1
parent: -
msg: init
```

### 6.4 branch と HEAD を書く

ホワイトボードの参照テーブルに書く。

```
| Label    | → | Reference |
|----------|---|-----------|
| HEAD     | → | main      |
| main     | → | C1        |
```

---

## 7. 基本操作

## 7.1 commit

### 手順

1. 変更したファイルの中身で新しい blob付箋 を作る（Content Matrix に同じ中身があれば作らない）
2. 新しい tree付箋 を作る（ファイル名 → blob ID の対応表）
3. 新しい commit付箋 を作る
4. parent に現在の commit を書く
5. HEAD が指す branch を新しい commit に進める

### 例

HOGE.txt の中身を `○-1` から `○-2` に変更する場合:

新しい blob（HOGE.txt の新しい中身）:

```text
B2 / ○-2
```

Content Matrix の ○行・2列 に貼り、「B2」と記入する。

※ PIYO.txt は変更なし → `B1`（○-1）をそのまま使い回す。新しい blob付箋は不要。

新しい tree:

```text
T2
HOGE.txt → B2
PIYO.txt → B1
```

新しい commit:

```text
C2
tree: T2
parent: C1
msg: change HOGE
```

ホワイトボード更新（main の Reference 欄を C1 → C2 に書き換え）:

```
| Label    | → | Reference |
|----------|---|-----------|
| HEAD     | → | main      |
| main     | → | C2        |
```

---

## 7.2 branch

### 手順

1. 現在の commit を確認する
2. 新しい branch 名をホワイトボードに書く
3. その branch を現在の commit に向ける

### 例

参照テーブルに行を追加:

```
| feature  | → | C2        |
```

---

## 7.3 checkout

### branch へ checkout

HEAD の Reference 欄を書き換える。

```
| HEAD     | → | feature   |
```

### commit へ checkout

detached HEAD にする。HEAD の Reference 欄に commit ID を直接書く。

```
| HEAD     | → | C1        |
```

---

## 7.4 merge

### 条件

2つの branch が異なる commit を指しているときに実施可能。

### 手順

1. マージ元 branch とマージ先 branch を決める
2. 両方の変更を反映した新しい blob を作る（Content Matrix で同じ中身を検索し、あれば使い回す）
3. 新しい tree を作る
4. 新しい commit を作る
5. parent を2つ書く
6. マージ先 branch を新しい commit に進める

### 例

```text
C5
tree: T5
parent: C3, C4
msg: merge feature into main
```

---

## 8. conflict

## 8.1 発生条件

別 branch で**同じファイルの中身を別々に変更**した場合、conflict とする。

例（Content Matrix の2ワードで考える）:

* 共通祖先: `HOGE.txt` → B5（中身: ×-3）
* main 側: 形状を□に変更 → B6（中身: □-3）
* feature 側: 形状を△に、数字を2に変更 → B3（中身: △-2）

## 8.2 解決方法

プレイヤーが話し合って、どの状態を採用するか決める。
決めた内容で新しい blob を作り（Content Matrix で同じ中身を検索し、あれば使い回す）、新しい tree を作る。

解決方針の例:

* **ours（今いる側を採用）**: B6（□-3）を採用 → 既存 blob を指すだけ
* **theirs（相手側を採用）**: B3（△-2）を採用 → 既存 blob を指すだけ
* **manual（手動マージ）**: 両方の変更を取り込む → B7（□-2）を新たに作成

> ours = 今 HEAD がいる側（merge を実行した側）
> theirs = マージされる側（相手ブランチ）

---

## 9. ID ルール

## 9.1 目的

ID は **オブジェクトを一意に識別する** ために使う。

## 9.2 blob / tree / commit ID: 連番

すべてのオブジェクトに連番で ID を振る。

* Blob: B1, B2, B3...
* Tree: T1, T2, T3...
* Commit: C1, C2, C3...

blob 付箋には ID と中身を両方書く（例: `B3 / △-2`）。
tree に書くのは `HOGE.txt → B3` のように Blob ID で参照する。

**同じ中身の blob には同じ Blob ID を使い回す。** Content Matrix で中身を検索し、既存の Blob ID があればそれを tree に書く。新しい中身なら新しい連番を振る。

> **注意:** 本物の Git では全オブジェクト（blob / tree / commit）の中身からハッシュ値を計算し、それが ID になる。
> このゲームでは連番で簡略化しつつ、Content Matrix による検索で「同じ中身 = 同じ blob」を体験する。

## 9.3 発展: 本物の Git との接続

このゲームの Content Matrix は、本物の Git の `.git/objects/` に対応する。

本物の Git では:
* 全オブジェクト（blob / tree / commit）の中身からSHA-1ハッシュ値を計算し、それがIDになる
* `.git/objects/` ディレクトリにハッシュ値の先頭2文字でフォルダ分けして保存される
* 16×16 = 256フォルダの構造（256マスハッシュマトリクス）

このゲームでは Content Matrix が「中身 → Blob ID」の逆引き台帳として機能し、
ハッシュ計算なしで「同じ中身なら同じオブジェクトを使い回す」を体験できる。

---

## 10. 禁止事項

以下は禁止。

### 10.1 blob付箋の書き換え

一度書いた blob は変更不可。

### 10.2 tree付箋の書き換え

一度書いた tree は変更不可。

### 10.3 commit付箋の書き換え

一度書いた commit は変更不可。

### 10.4 既存履歴の削除

過去の付箋を剥がしたり破棄したりしてはならない。

### 10.5 参照テーブル以外の情報をホワイトボードに書くこと

ファイルの中身や履歴は付箋で管理する。ホワイトボードに書いてよいのは参照テーブル（と補助メモ）だけ。

---

## 11. 勝ち負けの決め方

このゲームは本質的には学習用だが、ゲーム化するなら以下が使える。

### 11.1 最短達成型

指定された最終状態に、最少 commit 数で到達したら勝ち。

### 11.2 品質型

以下を評価する。

* conflict が少ない
* branch の使い方が上手い
* main を汚していない
* 履歴が読みやすい

### 11.3 事故回避型

「main 直書き禁止」などの運用ルールを守れたら高得点。

---

## 12. おすすめの遊び方

### ステップ1: 直線履歴

* branch は main のみ
* commit / checkout / rename / fix / retrieval / タグを体験
* Content Matrix で「同じ中身は使い回す」を体験

### ステップ2: branch と merge

* branch を作って並行開発
* fast-forward merge と 非fast-forward merge を体験
* merge commit（親が2つ）の構造を理解

### ステップ3: conflict 体験

* 同じファイルを別ブランチで別々に変更
* ours / theirs / manual の解決方法を体験
* Content Matrix の2ワード構成が conflict の可視化に効く

### 発展: 本物の Git との接続

* `git cat-file` で本物の Git オブジェクトを覗く
* Content Matrix と `.git/objects/` の対応を確認
* ハッシュ値による ID 決定の仕組みを理解

---

## 13. 最小テンプレート

## blob付箋テンプレート（小）

```text
B__
[形状]-[数字]
```

ID: B + 連番 / 形状: ○ × △ □ / 数字: 1 2 3 4

## tree付箋テンプレート（中）

```text
T__
HOGE.txt →
PIYO.txt →
FUGA.txt →
```

## commit付箋テンプレート

```text
C__
tree:
parent:
msg:
```

## ホワイトボードテンプレート

```
| Label    | → | Reference |
|----------|---|-----------|
| HEAD     | → |           |
| main     | → |           |
| feature  | → |           |
```

---

## 14. このゲームで伝えたいこと

このゲームの本質は次の3つ。

### 14.1 データは不変

Git は「上書き」より「追加」で世界を作る。

### 14.2 同じ中身は同じオブジェクト

同じ中身のファイルは同じ blob。新しい付箋を作る必要がない。
これが**コンテンツアドレッサブル**の本質。
Content Matrix はこの原則を、ハッシュ計算なしで体験するための検索台帳。

### 14.3 branch はただの参照

branch は履歴そのものではなく、**commit を指すラベル**である。

### 14.4 履歴は線ではなく構造

Git の履歴は一本道ではなく、**分岐と合流を持つグラフ**である。

### 14.5 手段は付箋だけではない

このゲームの本質は「不変追記 + 可変ポインタ + 内容アドレッシング」の3原則である。
この3原則を体現できる手段なら、何を使ってもGitの設計思想を再現できる。

例:
* 付箋 + ホワイトボード（このゲーム）
* OTP ROM + RAMレジスタ（HW設計課題として）
* イミュータブルデータ構造 + 参照変数（SW設計課題として）

---

## 15. 一言でいうと

> **付箋はROM、ホワイトボードはポインタ、Content Matrix は検索台帳。**
