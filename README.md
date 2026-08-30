# dsh-music · 网易云音乐播放器（DeepSeek Harness 插件）

一个常驻在 DeepSeek Harness 页面右上角的网易云音乐播放器：扫码登录、搜索（歌曲 + 歌单）、我的歌单、在线播放、进度条可视化，且可拖动。

## 功能

- 🎵 右上角悬浮入口，收起时是迷你播放条（显示当前歌曲 + 播放/暂停），展开是完整面板
- 🔒 扫码登录（网易云音乐 App 扫码），登录态存 `localStorage`，刷新自动恢复
- 🔍 搜索同时返回**歌曲**和**相关歌单**
- 📂 「我的歌单」：加载并播放自己的歌单
- ▶ 在线播放：上一首/下一首/播放暂停、可点击进度条跳转
- 🖱 可拖动（按住 `⠿` 手柄或面板标题栏），不依赖固定坐标

## 架构

插件由两部分组成，通过 DSH 的 `cordis.patch.yml` 补丁层接入：

| 部分 | 位置 | 作用 |
|---|---|---|
| `host/` | `~/.dsh/plugins/dsh-music/` | 宿主插件：DSH 启动时自动拉起网易云 API 服务（端口 3000） |
| `host/netease-api/` | 同上 | 基于 [`NeteaseCloudMusicApi`](https://github.com/Binaryify/NeteaseCloudMusicApi)（npm 包）的服务启动器 |
| `client/` | `~/.dsh/profiles/node_modules/@deepseek-ai/dsh-client-ui-music/` | 浏览器端播放器 UI（注册在 `shell.overlay` 插槽） |

客户端通过 `fetch` 直连 `http://127.0.0.1:3000`（服务自带 CORS），无需额外代理。

## 安装

### 方式一：一键脚本（PowerShell）

```powershell
.\install.ps1
```

脚本会自动完成：拷贝插件文件、`npm install` 网易云 API、并把两行 patch 追加到 `~/.dsh/profiles/web/cordis.patch.yml`。

> 注意：本机若配置了失效的 npm 代理（`.npmrc` 里的 `proxy`），`npm install` 会失败；此时先修正 `.npmrc` 或改用镜像源。

### 方式二：手动安装

1. **宿主插件 + API 服务**

   ```powershell
   $dsh = "$env:USERPROFILE\.dsh"
   $dst = "$dsh\plugins\dsh-music"
   New-Item -ItemType Directory -Force "$dst\netease-api" | Out-Null
   Copy-Item host\index.js $dst\index.js
   Copy-Item host\netease-api\launch.js $dst\netease-api\launch.js
   Copy-Item host\netease-api\package.json $dst\netease-api\package.json
   cd $dst\netease-api
   npm install --no-audit --no-fund
   ```

2. **客户端 UI**

   ```powershell
   $dsh = "$env:USERPROFILE\.dsh"
   $cd = "$dsh\profiles\node_modules\@deepseek-ai\dsh-client-ui-music"
   New-Item -ItemType Directory -Force "$cd\lib" | Out-Null
   Copy-Item client\package.json $cd\package.json
   Copy-Item client\lib\*.js $cd\lib\
   ```

3. **接入补丁** — 把下面两段追加到 `~/.dsh/profiles/web/cordis.patch.yml`（把路径换成你的实际路径）：

   ```yaml
   - insert:
       - id: ui-music
         name: '@deepseek-ai/dsh-client-ui-music'
   - insert:
       - id: tool-music-server
         name: 'file:///C:/Users/<你>/.dsh/plugins/dsh-music/index.js'
         config:
           nodePath: 'C:/Program Files/nodejs/node.exe'
           serverScript: 'C:/Users/<你>/.dsh/plugins/dsh-music/netease-api/launch.js'
           port: 3000
   ```

4. 重启 DSH（或刷新页面），右上角即出现 🎵 入口。

## 使用

1. 点右上角 🎵 打开面板；
2. 首次点「扫码登录」，用手机网易云音乐 App 扫码；
3. 搜索歌曲 / 点「我的歌单」加载歌单，点歌曲即可播放；
4. 收起后胶囊条可直接 ⏸/▶，按住 `⠿` 拖动位置。

## 注意事项

- 登录 cookie 保存在浏览器 `localStorage`（键 `dsh-ncm-cookie`），**不落服务端**；点「退出」会清除。
- 部分 VIP / 无版权歌曲会返回「暂时无法播放」。
- 网易云接口属非官方接口，稳定性与账号风控风险自负，请勿高频请求。
- 本仓库通过 `cordis.patch.yml` 接入 profile；重装 DSH profile 后需重新执行安装。

## 目录结构

```
dsh-music/
├── host/
│   ├── index.js            # 宿主插件：启动/托管 API 服务
│   └── netease-api/
│       ├── launch.js       # NeteaseCloudMusicApi 启动器
│       └── package.json    # 依赖 NeteaseCloudMusicApi
├── client/
│   ├── package.json        # @deepseek-ai/dsh-client-ui-music 清单
│   └── lib/
│       ├── index.js        # 宿主空入口
│       └── client.js       # 浏览器端播放器 bundle
├── install.ps1             # 一键安装脚本
└── README.md
```

## License

MIT
