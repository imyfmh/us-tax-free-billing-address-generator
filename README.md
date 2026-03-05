# 美国免税账单地址生成器

在线地址：`https://imyfmh.github.io/us-tax-free-billing-address-generator/`

## 数据来源模式

- `Zippopotam.us`：按免税州 ZIP 在线查询城市/州，街道随机模板生成。
- `OpenAddresses`：读取本地 `data/openaddresses-samples.json` 样本。
- 姓名/电话/邮箱：来自 `RandomUser`（失败时自动回退本地随机）。

## 半自动更新 OpenAddresses 样本

脚本：`scripts/update-openaddresses.mjs`

### 1) 用在线 CSV 更新

```bash
node scripts/update-openaddresses.mjs \
  --url "你的 OpenAddresses CSV 链接" \
  --per-state 40
```

### 2) 用本地 CSV 更新

```bash
node scripts/update-openaddresses.mjs \
  --input ./your-openaddresses.csv \
  --per-state 40
```

默认输出：`data/openaddresses-samples.json`

可选参数：

- `--out <path>`：指定输出文件路径
- `--per-state <number>`：每个免税州抽样数量

脚本会只保留 `AK / DE / MT / NH / OR`，并输出前端可直接读取的数据结构。
