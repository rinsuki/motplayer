# motplayer

NW.js をランタイムとして使っているゲーム (e.g. RPGツクールMV、RPGツクールMZ製など) を NW.js なしで動かしたいアプリです。

## 実行方法

* `pnpm install`
* `pnpm build`
* `pnpm electron . /path/to/game.zip` (zipファイルである必要があります)

セーブデータは `/path/to/game.zip` の隣に `game.motplayer_save` というファイルとして保存されます。中身は SQLite データベースです。

## 動く/動かない

* RPGツクールMV製ゲーム
  * [x] ツクールの初期状態でセーブ/ロード可能
* RPGツクールMZ製ゲーム
  * [x] とあるゲームでセーブ/ロード可能
  * 特定ゲーム用のpolyfill
    * [x] `require("crypto" | "fs" | "path")` の一部を要求するゲーム
* ティラノスクリプト
  * [ ] まだ何もしていない

## なんで NW.js なしで動かしたいの？

* みんながみんな Windows の x86_64 版を使っているわけではない
  * e.g. Windows on Arm, Apple Silicon Mac
* NW.js の実行環境は Node.js で eval しているようなものなので、ゲームのコード(の製作者)がコンピュータに対して任意の行動を取れる
  * `require("fs")` が使えることからも明らか
  * RPGツクールのゲームにそのような権限はいらないはずなので Sandbox に押し込み、このような監査が現実的なコードに特権部分を絞りたい
