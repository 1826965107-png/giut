# 前两关新版美术资产与生成提示词

生成日期：2026-11-04。使用内置 image_gen 工具生成；每项为独立新图，未编辑或覆盖旧资产。Codex已查看全部六张输出，认可统一色系与材质细节，最终游戏效果仍需真实WebGL验收。DSH负责复制到工作区并集成；若textures目录的普通写入受限，可统一使用项目assets-v2目录，最终以实际加载路径为准并在验收报告登记。

| 内容 | 原始生成文件 | 工作区目标 | 物理尺度 |
|---|---|---|---|
| spa_floor | `C:/Users/18269/.codex/generated_images/01a192ac-f345-7b13-a7d8-8e18e1361de6/exec-b25b4c99-0fdf-43d3-bbe4-b4dd705570a1.png` | `textures/l12-v2-spa-floor.png` | 2.4×2.4m；4×4块，每块0.6m |
| spa_plaster | `C:/Users/18269/.codex/generated_images/01a192ac-f345-7b13-a7d8-8e18e1361de6/exec-9603d4d7-5e4e-4e62-aea3-08adb51c448c.png` | `textures/l12-v2-spa-plaster.png` | 2×2m；连续表面 |
| spa_mosaic | `C:/Users/18269/.codex/generated_images/01a192ac-f345-7b13-a7d8-8e18e1361de6/exec-b79ca84f-3062-41a0-b2fc-260e59921d8b.png` | `textures/l12-v2-pool-mosaic.png` | 0.4×0.4m；8×8块，每块0.05m |
| l0_wallpaper | `C:/Users/18269/.codex/generated_images/01a192ac-f345-7b13-a7d8-8e18e1361de6/exec-95b0de55-1ca6-4c35-ab63-445ce533de35.png` | `textures/l12-v2-wallpaper.png` | 2×2m；连续表面 |
| l0_carpet | `C:/Users/18269/.codex/generated_images/01a192ac-f345-7b13-a7d8-8e18e1361de6/exec-0e7d8bed-8cb1-43b4-b05b-87f80e65110e.png` | `textures/l12-v2-carpet.png` | 2×2m；连续表面 |

注意：所有数据都按整张图片覆盖率计算；新石砖图有4×4块，池内图有8×8块，不能沿用旧图片的块数/周期。不要把漫反射污渍派生为强浮雕，不覆盖旧图。生成原件保留在Codex默认生成目录，项目运行只引用工作区内文件。

补充木材原件：`C:/Users/18269/.codex/generated_images/01a192ac-f345-7b13-a7d8-8e18e1361de6/exec-b681de55-9be9-407e-92ca-0e47a4afb68f.png`；目标文件名 `l12-v2-smoked-oak.png`，整张覆盖2×2m。桑拿、柜门和木饰面须使用真实木纹，不能用黄麻墙纸染成棕色替代。

## 最终生成提示词

最终项目文件均已落在 `D:/AI/工作文件夹/游戏/assets-v2/`（原表textures为初始接口建议，以下为实际运行路径）：

- `D:/AI/工作文件夹/游戏/assets-v2/l12-v2-spa-floor.png`
- `D:/AI/工作文件夹/游戏/assets-v2/l12-v2-spa-plaster.png`
- `D:/AI/工作文件夹/游戏/assets-v2/l12-v2-pool-mosaic.png`
- `D:/AI/工作文件夹/游戏/assets-v2/l12-v2-wallpaper.png`
- `D:/AI/工作文件夹/游戏/assets-v2/l12-v2-carpet.png`
- `D:/AI/工作文件夹/游戏/assets-v2/l12-v2-smoked-oak.png`

以下提示词采用内置 image_gen 模式逐项生成，原始生成件保留，不覆盖旧资产。

### spa_floor

Use case: photorealistic-natural. Asset type: square seamless diffuse/albedo texture bitmap for a high quality realtime architectural horror game. Generate a flat orthographic material scan filling the entire image edge to edge, 1024x1024. Subject: exactly FOUR by FOUR square anti-slip honed limestone/travertine tiles, sixteen equal tiles in a precise straight grid, each tile real size 60 cm; the whole texture covers 2.4 by 2.4 meters. Refined modern thermal spa, warm grey-beige stone, very restrained fine mineral veins and pin pores, subtle natural variation between tiles, thin 3 mm warm-grey grout. Beautiful tactile believable stone under extremely diffuse uniform cross-polarized illumination. Seamless wrapping on every edge, same brightness at edges and center. Base color only: absolutely no directional light, specular glints, baked shadows, perspective, bevel shading, 3D render presentation, borders, labels, text, watermark, dirt blotches, broken tiles or objects. No large yellow tint, no thick black grout. This will be wrapped over every room in one coherent luxury but deserted spa.

### spa_plaster

Use case: photorealistic-natural. Asset type: seamless square diffuse/albedo texture for realtime spa walls. Generate a flat orthographic material scan, edge to edge, 1024x1024. Warm ivory/off-white mineral lime plaster, refined Japanese thermal bathing interior, subtle tiny fine-grained aggregate and hand-trowelled microtexture, restrained natural variation, matte and clean but slightly aged, whole image corresponds to 2 by 2 real meters. Seamless edges all four sides, evenly illuminated cross-polarized material base color only. No tiles, joints, cracks, broad stains, wall base, vignette, highlights, side lighting, shadows, perspective, furniture, frames, text or watermark. Avoid raised flakes and plastic appearance; quiet sophisticated consistent material.

### spa_mosaic

Use case: photorealistic-natural. Asset type: seamless square pool mosaic diffuse/albedo scan, 1024x1024, full image filled edge to edge. EXACTLY EIGHT by EIGHT small square ceramic mosaic tiles, 64 equal tiles, flat orthographic precise grid. Individual tiles are 5cm, entire texture real coverage 40cm by 40cm. Muted mineral sage/grey-green and subtle desaturated teal variations in one harmonious palette, refined spa pool interior, very thin pale grey mineral grout. Flat base color in soft perfectly uniform polarized lighting, gentle tiny ceramic mottling without sculpted bevels. Seamless wrapping edges. No perspective, reflections, glossy highlights, baked shadows, thick relief, broken tiles, strong saturated blue, dirt spots, objects, text, borders, logos or watermark.

### l0_wallpaper

Use case: photorealistic-natural. Asset type: seamless flat square base-color texture for a high-quality abandoned office/backrooms game, 1024x1024. Aged warm flax-yellow woven fabric wallpaper, very fine linen fibers and subtle vertical weave, restrained honey-ochre and beige palette, whole texture covers 2 by 2 meters. The fabric looks tactile and materially believable, slightly faded with fine gentle irregularity. Completely seamless edges and uniformly lit diffuse albedo scan. No obvious seams, no repeated large stains, no cracks, no peeling plaster, no embossed scratches, no directional shading, no shadows, no vignette, no perspective, no room illustration, no objects, no text or watermark. Do not make broad vertical bands. Small-scale fiber detail should dominate, suitable for repeating across many room wall panels.

### l0_carpet

Use case: photorealistic-natural. Asset type: seamless square diffuse/albedo texture for a realtime first-person interior game, 1024x1024 edge to edge. Low-pile dense commercial loop carpet, dark olive-brown/tobacco grey, whole texture covers 2 by 2 meters. Clearly textile with countless small irregular loops and fine interwoven fibers, dense compact worn pile, subtle mottled fiber tones, very restrained age. Flat orthographic cross-polarized scan with perfectly even brightness, seamless on all edges. No wood grain, no floorboards, no linear streaks, no grout, no large stains, no baked ambient shadow, no reflections, no perspective, no lighting hotspot, no objects, no text, no watermark. Crisp fine believable textile details but no strong contrast pattern.

### smoked_oak

Use case: photorealistic-natural. Asset type: seamless square diffuse/albedo material bitmap for realistic spa furniture, sauna slats, cabinets and small timber wall panels in a high quality realtime architectural game. Edge to edge flat orthographic material scan, 1024x1024, physical coverage 2 by 2 meters. Beautiful lightly smoked quarter-sawn oak, desaturated light grey-brown taupe wood, fine straight longitudinal grain runs vertically, very subtle pores and narrow medullary rays, sophisticated restrained Japanese spa material, moderately pale and matte. Continuous timber surface, no plank gaps, no knots, no linen weave, no printed patterns, no warm orange varnish, no cracks or large stains. Seamless repeating edges, uniform diffuse cross-polarized lighting, true base color only. No highlights, directional shadows, border, vignette, perspective, objects, text or watermark. Grain must read as wood when applied to furniture and sauna boards.
