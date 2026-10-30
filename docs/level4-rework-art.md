# 第四关首次回返：Codex 美术交付

2026-10-30。范围以 `level4-rework-brief.md` 为准。此记录只证明材质及其检查台，不能代替完整游戏验收。

## 正式素材

- `textures/l4-damp-concrete.png`：渗水混凝土，毛孔、矿物沉积、克制细裂。
- `textures/l4-aged-enamel.png`：灰绿白旧车漆、斑驳底漆和局部氧化。
- `textures/l4-worn-vinyl.png`：暗青乙烯基座椅、细颗粒及表面磨损。

三张均为 1254×1254 RGB PNG，通过内置 `image_gen.imagegen` 生成。原始生成提示词保存在 `textures/l4-art-manifest.json`。不替换前面关卡的材质。

## 材质工厂

`levels/level4-art.js` 输出色板、灯光参数与 `createLevel4Art({THREE})`。使用粗糙表面与细微凹凸；手电稳定、柔边、有限照距。照片不烘焙光源。镜像重复采样避免图边色值跳变，隧道接缝必须匹配偶数纹理周期。

所有材质在首次入场前建立。程序需等待 `art.ready`、检查 `art.failedTextures`，同时预热正常/异常列车材质。不能只等待宿主旧的 textureReady Map（它不含工厂自己加载的贴图）。

## 已完成检查

- 已运行材质检查台与正式游戏的 WebGL 机位；正式场景可用根目录 `test-level4.html` 复查。
- 三张正式 PNG 均加载，控制台 error/warn 为空。
- 以真实灯光检查混凝土、旧漆和座椅，调亮过暗的座椅底色；没有靠提高全景环境光补亮。
- 材质工厂 JavaScript 语法检查通过。
- [材质检查截图](images/level4-rework-materials-20261030.jpg)。

程序交付后，正式材质下的步道、异变车厢、资源与开/关灯接缝机位已完成 WebGL 检查。手电光束适度放宽，远处仍保持黑暗；游戏内补充简洁电量和物品显示。最终完整证据见 `level4-acceptance.md`。
