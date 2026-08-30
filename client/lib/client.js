window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-client-ui-music",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { useState, useEffect, useRef } = React;

    const API = "http://127.0.0.1:3000";
    const COOKIE_KEY = "dsh-ncm-cookie";
    function cleanCookie(raw) {
      if (!raw) return "";
      return String(raw).split(";").map(function (s) { return s.trim(); }).filter(function (s) {
        if (s.indexOf("=") === -1) return false;
        const name = s.split("=")[0].trim().toLowerCase();
        if (name === "path" || name === "expires" || name === "max-age" || name === "domain" || name === "samesite" || name === "secure" || name === "httponly" || name === "priority") return false;
        const val = s.slice(s.indexOf("=") + 1).trim();
        return name !== "" && val !== "";
      }).map(function (s) {
        const i = s.indexOf("=");
        return s.slice(0, i).trim() + "=" + s.slice(i + 1).trim();
      }).join("; ");
    }
    function saveCookie(ck) { try { if (ck) localStorage.setItem(COOKIE_KEY, cleanCookie(ck)); else localStorage.removeItem(COOKIE_KEY); } catch (e) {} }
    function loadCookie() { try { return cleanCookie(localStorage.getItem(COOKIE_KEY) || ""); } catch (e) { return ""; } }

    const MODES = [
      { id: "sequential", icon: "➡", title: "顺序播放" },
      { id: "repeat-all", icon: "🔁", title: "列表循环" },
      { id: "repeat-one", icon: "🔂", title: "单曲循环" },
      { id: "shuffle", icon: "🔀", title: "随机播放" },
    ];
    function modeIcon(m) { for (const x of MODES) if (x.id === m) return x.icon; return "➡"; }
    function modeTitle(m) { for (const x of MODES) if (x.id === m) return x.title; return ""; }
    function nextMode(m) { const i = MODES.findIndex(function (x) { return x.id === m; }); return MODES[(i + 1) % MODES.length].id; }

    function httpsUrl(u) { return u ? String(u).replace(/^http:\/\//, "https://") : ""; }
    function parseLyric(text) {
      const lines = [];
      if (!text) return lines;
      String(text).split("\n").forEach(function (line) {
        const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
        if (m) lines.push({ time: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text: m[3].trim() });
      });
      return lines;
    }

    // Shared "now playing" store between the collapsed pill and the full player.
    const nowStore = { song: null, playing: false, listeners: new Set() };
    function setNow(song, playing) {
      nowStore.song = song;
      nowStore.playing = playing;
      nowStore.listeners.forEach(function (l) { l(); });
    }
    function useNow() {
      const [v, setV] = useState({ song: nowStore.song, playing: nowStore.playing });
      useEffect(function () {
        const f = function () { setV({ song: nowStore.song, playing: nowStore.playing }); };
        nowStore.listeners.add(f);
        return function () { nowStore.listeners.delete(f); };
      }, []);
      return v;
    }
    const playerControls = { toggle: null, next: null, prev: null };

    (function injectStyles() {
      if (typeof document === "undefined") return;
      const id = "@deepseek-ai/dsh-client-ui-music/styles";
      if (document.querySelector('style[data-plugin-css="' + id + '"]')) return;
      const tag = document.createElement("style");
      tag.dataset.pluginCss = id;
      tag.textContent = "" +
        ".ncm-widget{position:fixed;z-index:9990;pointer-events:none;user-select:none;}" +
        ".ncm-pill{pointer-events:auto;display:flex;align-items:center;gap:7px;padding:5px 8px 5px 5px;border-radius:999px;border:1px solid var(--dsh-border,#3f3f46);background:var(--dsh-surface,#1f1f23);color:var(--dsh-text,#e5e7eb);box-shadow:0 4px 16px rgba(0,0,0,.28);cursor:pointer;max-width:360px;}" +
        ".ncm-drag{flex:0 0 auto;cursor:grab;opacity:.55;font-size:13px;padding:0 2px;touch-action:none;}" +
        ".ncm-drag:active{cursor:grabbing;}" +
        ".ncm-pillCover{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:rgba(128,128,128,.2);}" +
        ".ncm-pillText{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}" +
        ".ncm-pillPlay{width:28px;height:28px;border-radius:50%;border:none;background:#ec4141;color:#fff;font-size:13px;cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;line-height:1;}" +
        ".ncm-pillPlay:hover{background:#d93434;}" +
        ".ncm-pillOpen{font-size:12px;opacity:.6;flex:0 0 auto;}" +
        ".ncm-panel{pointer-events:auto;position:relative;width:380px;max-width:94vw;max-height:min(680px,90vh);background:var(--dsh-surface,#1f1f23);color:var(--dsh-text,#e5e7eb);border:1px solid var(--dsh-border,#3f3f46);border-radius:14px;box-shadow:0 16px 50px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;}" +
        ".ncm-panelBg{position:absolute;inset:-30px;background-size:cover;background-position:center;filter:blur(34px);transform:scale(1.2);opacity:.9;}" +
        ".ncm-panelTint{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,16,22,.4),rgba(12,12,16,.72));}" +
        ".ncm-hidden{display:none;}" +
        ".ncm-hd{position:relative;z-index:1;display:flex;align-items:center;gap:8px;padding:11px 14px;background:rgba(18,18,24,.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.06);}" +
        ".ncm-hdTitle{font-weight:600;font-size:14px;flex:1;}" +
        ".ncm-close{cursor:pointer;border:none;background:transparent;color:inherit;font-size:16px;line-height:1;opacity:.7;}" +
        ".ncm-close:hover{opacity:1;}" +
        ".ncm-body{position:relative;z-index:1;overflow:auto;padding:14px;background:rgba(15,15,20,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}" +
        ".ncm-userrow{display:flex;align-items:center;gap:8px;margin-bottom:12px;}" +
        ".ncm-username{font-size:12px;opacity:.7;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-btn{cursor:pointer;border:1px solid var(--dsh-border,#52525b);background:transparent;color:var(--dsh-text,#e5e7eb);border-radius:8px;padding:4px 10px;font-size:12px;line-height:1.4;}" +
        ".ncm-btn:hover{background:rgba(128,128,128,.15);}" +
        ".ncm-btn:disabled{opacity:.4;cursor:default;}" +
        ".ncm-primary{background:#ec4141;border-color:#ec4141;color:#fff;}" +
        ".ncm-primary:hover{background:#d93434;}" +
        ".ncm-login{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 0;}" +
        ".ncm-qr{width:176px;height:176px;border-radius:12px;border:1px solid var(--dsh-border,#3f3f46);}" +
        ".ncm-msg{font-size:12px;opacity:.8;text-align:center;min-height:16px;}" +
        ".ncm-now{margin-bottom:12px;}" +
        ".ncm-nowGlass{position:relative;display:flex;flex-direction:column;gap:12px;padding:14px 16px;background:rgba(30,30,38,.35);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.1);border-radius:14px;}" +
        ".ncm-nowTop{display:flex;align-items:center;gap:12px;width:100%;}" +
        ".ncm-nowTitle{font-size:14px;font-weight:600;flex:0 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-progRow{flex:1;display:flex;align-items:center;gap:8px;min-width:0;}" +
        ".ncm-time{font-size:10px;opacity:.6;font-variant-numeric:tabular-nums;flex:0 0 auto;min-width:24px;text-align:center;}" +
        ".ncm-progress{flex:1;height:14px;position:relative;cursor:pointer;}" +
        ".ncm-progressTrack{position:absolute;left:0;right:0;top:50%;height:4px;transform:translateY(-50%);background:rgba(128,128,128,.28);border-radius:2px;}" +
        ".ncm-progressFill{position:absolute;left:0;top:50%;height:4px;transform:translateY(-50%);background:#ec4141;border-radius:2px;pointer-events:none;}" +
        ".ncm-progressThumb{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;background:#ec4141;transform:translate(-50%,-50%);box-shadow:0 1px 5px rgba(0,0,0,.35);pointer-events:none;}" +
        ".ncm-ctlRow{display:flex;align-items:center;justify-content:space-between;width:100%;}" +
        ".ncm-lyricBtn{cursor:pointer;background:transparent;border:none;color:inherit;font-size:11px;opacity:.85;padding:2px 6px;flex:0 0 auto;}" +
        ".ncm-lyricBtn:hover{opacity:1;}" +
        ".ncm-ctlLeft{display:flex;align-items:center;gap:2px;}" +
        ".ncm-kBtn{cursor:pointer;background:#ec4141;border:none;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;flex:0 0 auto;}" +
        ".ncm-kBtn:hover{background:#d93434;}" +
        ".ncm-muteBtn{cursor:pointer;background:transparent;border:1px solid var(--dsh-border,#52525b);color:inherit;font-size:10px;padding:1px 6px;border-radius:6px;flex:0 0 auto;opacity:.8;white-space:nowrap;}" +
        ".ncm-muteBtn:hover{opacity:1;background:rgba(128,128,128,.12);}" +
        ".ncm-muteBtn:disabled{opacity:.4;cursor:default;}" +
        ".ncm-addBtn{cursor:pointer;background:transparent;border:1px solid var(--dsh-border,#52525b);color:inherit;font-size:13px;width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;opacity:.75;line-height:1;}" +
        ".ncm-addBtn:hover{opacity:1;background:rgba(128,128,128,.12);}" +
        ".ncm-pickerOverlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}" +
        ".ncm-pickerPanel{background:var(--dsh-surface,#1f1f23);color:var(--dsh-text,#e5e7eb);border:1px solid var(--dsh-border,#3f3f46);border-radius:12px;width:300px;max-width:90vw;max-height:70vh;display:flex;flex-direction:column;padding:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);}" +
        ".ncm-pickerTitle{font-weight:600;font-size:14px;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-pickerList{max-height:260px;overflow:auto;margin-bottom:10px;}" +
        ".ncm-pickerItem{cursor:pointer;padding:8px 10px;border-radius:8px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-pickerItem:hover{background:rgba(128,128,128,.12);}" +
        ".ncm-pickerCreate{display:flex;gap:8px;align-items:center;}" +
        ".ncm-pickerCreate .ncm-input{flex:1;}" +
        ".ncm-ctlCenter{display:flex;align-items:center;gap:10px;}" +
        ".ncm-ctlBtn{cursor:pointer;background:transparent;border:none;color:inherit;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--dsh-text,#e5e7eb);}" +
        ".ncm-ctlBtn:hover{background:rgba(128,128,128,.12);}" +
        ".ncm-ctlMain{width:38px;height:38px;background:#ec4141;color:#fff;}" +
        ".ncm-ctlMain:hover{background:#d93434;}" +
        ".ncm-ctlBtn svg,.ncm-ctlMain svg{display:block;}" +
        ".ncm-mode{cursor:pointer;background:transparent;border:none;color:inherit;font-size:16px;width:24px;display:flex;align-items:center;justify-content:center;opacity:.85;}" +
        ".ncm-mode:hover{opacity:1;}" +
        ".ncm-volWrap{display:flex;align-items:center;gap:4px;}" +
        ".ncm-volIcon{display:flex;align-items:center;}" +
        ".ncm-vol{width:52px;accent-color:#ec4141;cursor:pointer;}" +
        ".ncm-lyricBox{height:130px;overflow:hidden;position:relative;margin-top:10px;border-top:1px solid var(--dsh-border,#3f3f46);}" +
        ".ncm-lyricInner{transition:transform .4s ease;padding:0 4px;}" +
        ".ncm-lyricLine{height:26px;line-height:26px;text-align:center;font-size:12px;opacity:.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-lyricLine.on{opacity:1;color:#ec4141;font-weight:600;}" +
        ".ncm-search{display:flex;gap:8px;margin-bottom:10px;}" +
        ".ncm-batchRow{display:flex;align-items:center;gap:10px;margin-bottom:10px;}" +
        ".ncm-batchInfo{font-size:11px;opacity:.7;}" +
        ".ncm-input{flex:1;min-width:0;border:1px solid var(--dsh-border,#52525b);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-size:13px;outline:none;}" +
        ".ncm-sectLabel{font-size:11px;opacity:.6;margin:10px 0 6px;}" +
        ".ncm-row{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;}" +
        ".ncm-pl{cursor:pointer;font-size:12px;border:1px solid var(--dsh-border,#52525b);border-radius:16px;padding:3px 10px;background:transparent;color:inherit;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-pl:hover{background:rgba(128,128,128,.15);}" +
        ".ncm-list{max-height:280px;overflow:auto;}" +
        ".ncm-song{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;cursor:pointer;}" +
        ".ncm-song:hover{background:rgba(128,128,128,.12);}" +
        ".ncm-song.on{background:rgba(236,65,65,.16);}" +
        ".ncm-songCover{width:34px;height:34px;border-radius:6px;object-fit:cover;flex:0 0 auto;background:rgba(128,128,128,.2);}" +
        ".ncm-songName{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-songArtist{flex:0 1 auto;max-width:34%;font-size:12px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-artistLink{cursor:pointer;}" +
        ".ncm-artistLink:hover{color:#ec4141;text-decoration:underline;}" +
        ".ncm-songDur{flex:0 0 auto;font-size:11px;opacity:.5;}" +
        ".ncm-notice{font-size:12px;color:#e8a23a;margin-top:8px;}";
      document.head.appendChild(tag);
    })();

    function api(path) {
      return fetch(API + path).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).catch(function (e) {
        if (e && e.message && e.message.indexOf("fetch") !== -1) throw new Error("无法连接本地音乐服务(3000)");
        throw e;
      });
    }

    function apiPost(path, body) {
      return fetch(API + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).catch(function (e) {
        if (e && e.message && e.message.indexOf("fetch") !== -1) throw new Error("无法连接本地音乐服务(3000)");
        throw e;
      });
    }

    function fmt(ms) {
      if (!ms) return "--:--";
      const total = Math.floor(ms / 1000);
      const m = Math.floor(total / 60);
      const s = total % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    }

    const ICONS = {
      play: "M8 5v14l11-7z",
      pause: "M6 5h4v14H6zM14 5h4v14h-4z",
      prev: "M6 6h2v12H6zM20 6v12L10 12z",
      next: "M16 6h2v12h-2zM4 6v12l10-6z",
      volume: "M3 9v6h4l5 5V4L7 9H3z",
    };
    function Icon(props) {
      return React.createElement("svg", { viewBox: "0 0 24 24", width: props.size || 22, height: props.size || 22, fill: "currentColor", "aria-hidden": true, style: { display: "block" } },
        React.createElement("path", { d: props.d }),
      );
    }

    function ProgressBar(props) {
      const pct = props.dur ? Math.min(100, Math.max(0, props.cur / props.dur * 100)) : 0;
      return React.createElement("div", { className: "ncm-progress", onClick: function (e) {
        if (!props.dur) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        props.onSeek(ratio * props.dur);
      } },
        React.createElement("div", { className: "ncm-progressTrack" }),
        React.createElement("div", { className: "ncm-progressFill", style: { width: pct + "%" } }),
        React.createElement("div", { className: "ncm-progressThumb", style: { left: pct + "%" } }),
      );
    }

    function Player() {
      const [cookie, setCookie] = useState("");
      const [profile, setProfile] = useState(null);
      const [showLogin, setShowLogin] = useState(false);
      const [qr, setQr] = useState(null);
      const [keyword, setKeyword] = useState("");
      const [busy, setBusy] = useState(false);
      const [queue, setQueue] = useState([]);
      const [idx, setIdx] = useState(-1);
      const [playing, setPlaying] = useState(false);
      const [cur, setCur] = useState(0);
      const [dur, setDur] = useState(0);
      const [volume, setVolume] = useState(1);
      const [mode, setMode] = useState("repeat-all");
      const [lyric, setLyric] = useState([]);
      const [lyricOpen, setLyricOpen] = useState(false);
      const [cachedIds, setCachedIds] = useState([]);
      const [processingId, setProcessingId] = useState(null);
      const [batchStatus, setBatchStatus] = useState(null);
      const [myPlaylists, setMyPlaylists] = useState([]);
      const [pickerSong, setPickerSong] = useState(null);
      const [creating, setCreating] = useState(false);
      const [createName, setCreateName] = useState("");
      const [artistView, setArtistView] = useState(null);
      const [pls, setPls] = useState([]);
      const [plsLabel, setPlsLabel] = useState("");
      const [notice, setNotice] = useState("");
      const audioRef = useRef(null);
      const qrTimer = useRef(null);
      const currentRef = useRef(null);
      const modeRef = useRef(mode);
      const batchTimerRef = useRef(null);
      const prevQueueRef = useRef([]);

      const current = idx >= 0 && queue[idx] ? queue[idx] : null;
      currentRef.current = current;
      modeRef.current = mode;

      function stopQr() {
        if (qrTimer.current) { clearInterval(qrTimer.current); qrTimer.current = null; }
      }

      async function loadProfile(ck, retries) {
        if (retries === undefined) retries = 2;
        try {
          const j = await api("/login/status?cookie=" + encodeURIComponent(cleanCookie(ck)) + "&timestamp=" + Date.now());
          const p = j.data && j.data.profile;
          if (p) { setProfile({ nickname: p.nickname || "用户", userId: (j.data.account && j.data.account.id) || "" }); return true; }
          if (retries > 0) { await new Promise(function (r) { setTimeout(r, 1200); }); return loadProfile(ck, retries - 1); }
          return false;
        } catch (e) {
          console.error("[ncm] loadProfile", e);
          return false;
        }
      }

      function pollQr(unikey) {
        stopQr();
        qrTimer.current = setInterval(function () {
          api("/login/qr/check?key=" + unikey + "&timestamp=" + Date.now())
            .then(function (j) {
              if (j.code === 800) {
                stopQr();
                setQr(function (q) { return Object.assign({}, q, { phase: "expired", msg: "二维码已过期，请重新获取" }); });
              } else if (j.code === 801) {
                setQr(function (q) { return Object.assign({}, q, { msg: "等待扫码…" }); });
              } else if (j.code === 802) {
                setQr(function (q) { return Object.assign({}, q, { msg: "已扫码，请在手机上确认登录" }); });
              } else if (j.code === 803) {
                stopQr();
                const ck = cleanCookie(j.cookie || "");
                setCookie(ck);
                saveCookie(ck);
                setQr(function (q) { return Object.assign({}, q, { phase: "done", msg: "登录成功 ✓" }); });
                loadProfile(ck);
              }
            })
            .catch(function () {});
        }, 2000);
      }

      async function beginLogin() {
        stopQr();
        setQr({ phase: "loading", msg: "正在生成二维码…" });
        try {
          const j = await api("/login/qr/key?timestamp=" + Date.now());
          const unikey = j.data && j.data.unikey;
          if (!unikey) throw new Error("未获取到二维码 key");
          const j2 = await api("/login/qr/create?key=" + unikey + "&qrimg=true&timestamp=" + Date.now());
          setQr({ phase: "ready", key: unikey, img: (j2.data && j2.data.qrimg) || "", msg: "请用「网易云音乐」App 扫码登录" });
          pollQr(unikey);
        } catch (e) {
          console.error("[ncm] beginLogin", e);
          setQr({ phase: "error", msg: "生成二维码失败：" + (e && e.message) });
        }
      }

      function logout() {
        stopQr();
        saveCookie("");
        setCookie(""); setProfile(null); setShowLogin(false); setPls([]); setPlsLabel("");
        setQueue([]); setIdx(-1); setPlaying(false); setQr(null); setNotice("");
        setNow(null, false);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute("src"); }
      }

      function normSong(s) {
        const ar = s.ar || s.artists || [];
        return {
          id: s.id,
          name: s.name,
          artists: ar.map(function (a) { return a.name; }).join(" / "),
          artistsArr: ar.map(function (a) { return { id: a.id, name: a.name }; }),
          duration: s.dt || s.duration || 0,
          picUrl: (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || "",
        };
      }

      async function doSearch() {
        const kw = keyword.trim();
        if (!kw) return;
        setBusy(true); setNotice("");
        try {
          const ts = Date.now();
          const [j1, j2] = await Promise.all([
            api("/cloudsearch?keywords=" + encodeURIComponent(kw) + "&type=1&limit=30&timestamp=" + ts),
            api("/search?keywords=" + encodeURIComponent(kw) + "&type=1000&limit=12&timestamp=" + ts),
          ]);
          const songs = (j1.result && j1.result.songs) || [];
          const plsRes = (j2.result && j2.result.playlists) || [];
          setQueue(songs.map(normSong));
          checkCached(songs.map(function (s) { return s.id; }));
          setPls(plsRes.map(function (p) { return { id: p.id, name: p.name, count: p.trackCount || 0 }; }));
          setPlsLabel(plsRes.length ? "相关歌单" : "");
          setIdx(-1);
          if (!songs.length && !plsRes.length) setNotice("没有搜到相关内容");
        } catch (e) {
          console.error("[ncm] doSearch", e);
          setNotice("搜索失败：" + (e && e.message));
        } finally {
          setBusy(false);
        }
      }

      async function loadMyPlaylists() {
        if (!profile) { setShowLogin(true); return; }
        setBusy(true); setNotice("");
        try {
          const j = await api("/user/playlist?uid=" + profile.userId + "&cookie=" + encodeURIComponent(cookie) + "&timestamp=" + Date.now());
          const list = (j.playlist || []).map(function (p) { return { id: p.id, name: p.name, count: p.trackCount || 0 }; });
          setMyPlaylists(list);
          setPls(list); setPlsLabel(list.length ? "我的歌单" : "");
          if (!list.length) setNotice("没有找到歌单");
        } catch (e) {
          console.error("[ncm] loadMyPlaylists", e);
          setNotice("获取歌单失败：" + (e && e.message));
        } finally {
          setBusy(false);
        }
      }

      async function loadTracks(pl) {
        setBusy(true); setNotice("");
        try {
          const j = await api("/playlist/track/all?id=" + pl.id + "&cookie=" + encodeURIComponent(cookie) + "&limit=200&timestamp=" + Date.now());
          const list = (j.songs || []).map(normSong);
          setQueue(list); setIdx(-1);
          checkCached(list.map(function (s) { return s.id; }));
          setPls([]); setPlsLabel("");
          if (!list.length) setNotice("歌单里没有歌曲");
          else setNotice("已加载「" + pl.name + "」" + list.length + " 首");
        } catch (e) {
          console.error("[ncm] loadTracks", e);
          setNotice("获取歌曲失败：" + (e && e.message));
        } finally {
          setBusy(false);
        }
      }

      async function loadLyric(id) {
        try {
          const j = await api("/lyric?id=" + id + "&timestamp=" + Date.now());
          setLyric(parseLyric(j.lrc && j.lrc.lyric));
        } catch (e) {
          setLyric([]);
        }
      }

      async function playAt(i) {
        if (i < 0 || i >= queue.length) return;
        const song = queue[i];
        setNotice("");
        try {
          const ck = cookie ? ("&cookie=" + encodeURIComponent(cookie)) : "";
          const j = await api("/song/url/v1?id=" + song.id + "&level=exhigh" + ck + "&timestamp=" + Date.now());
          const d = j.data && j.data[0];
          const u = d && d.url;
          if (!u) { setNotice("「" + song.name + "」暂时无法播放（无版权或需登录）"); return; }
          setIdx(i);
          setCur(0); setDur(song.duration ? song.duration / 1000 : 0);
          setNow(song, false);
          setLyric([]);
          loadLyric(song.id);
          const a = audioRef.current;
          if (a) {
            a.volume = volume;
            a.src = u;
            a.play().catch(function (err) { console.error("[ncm] play", err); setPlaying(false); setNow(song, false); setNotice("播放失败：" + (err && err.name)); });
          }
        } catch (e) {
          console.error("[ncm] playAt", e);
          setNotice("获取播放地址失败：" + (e && e.message));
        }
      }

      function togglePlay() {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); }
        else { a.play().catch(function (err) { console.error("[ncm] togglePlay", err); }); }
      }

      function seek(sec) {
        const a = audioRef.current;
        if (a && isFinite(sec)) { try { a.currentTime = sec; setCur(sec); } catch (e) {} }
      }

      function checkCached(ids) {
        if (!ids || !ids.length) { setCachedIds([]); return; }
        api("/karaoke/check?ids=" + ids.map(String).join(",") + "&timestamp=" + Date.now())
          .then(function (j) { setCachedIds((j && j.cached) || []); })
          .catch(function () {});
      }

      function playInstrumental(s, i) {
        setIdx(i);
        setNow(s, true);
        const a = audioRef.current;
        if (!a) return;
        a.src = API + "/karaoke/file/" + s.id + ".wav";
        a.play().catch(function () {});
        setNotice("");
      }

      async function generateInstrumental(s, i) {
        if (processingId) return;
        setProcessingId(s.id);
        setNotice("正在为「" + s.name + "」生成伴奏…");
        try {
          const ck = cookie ? ("&cookie=" + encodeURIComponent(cookie)) : "";
          const j = await api("/karaoke/prepare?id=" + s.id + ck + "&timestamp=" + Date.now());
          const url = j && j.url;
          if (!url) throw new Error("未获取到伴奏地址");
          setCachedIds(function (prev) { return prev.indexOf(String(s.id)) === -1 ? prev.concat([String(s.id)]) : prev; });
          setIdx(i);
          setNow(s, true);
          const a = audioRef.current;
          if (a) { a.src = API + url; a.play().catch(function () {}); }
          setNotice("");
        } catch (e) {
          console.error("[ncm] generateInstrumental", e);
          setNotice("生成伴奏失败：" + (e && e.message));
        } finally {
          setProcessingId(null);
        }
      }

      async function createPlaylist(name) {
        const j = await api("/playlist/create?name=" + encodeURIComponent(name) + "&cookie=" + encodeURIComponent(cookie) + "&timestamp=" + Date.now());
        const newId = j && (j.id || (j.playlist && j.playlist.id) || (j.data && j.data.id));
        if (!newId) throw new Error("创建失败");
        return { id: newId, name: name };
      }

      async function addToPlaylist(songId, pid) {
        const j = await api("/playlist/tracks?op=add&pid=" + pid + "&tracks=" + songId + "&cookie=" + encodeURIComponent(cookie) + "&timestamp=" + Date.now());
        console.log("[ncm] addToPlaylist response", j);
        const code = j && (j.code !== undefined ? j.code : (j.body && j.body.code));
        if (code === 200 || code === 502) return true;
        throw new Error((j && (j.message || j.msg)) || ("code " + code));
      }

      async function doAddToPlaylist(song, pl) {
        try {
          await addToPlaylist(song.id, pl.id);
          setPickerSong(null); setCreating(false); setCreateName("");
          setNotice("已加入「" + pl.name + "」");
        } catch (e) {
          console.error("[ncm] doAddToPlaylist", e);
          setPickerSong(null); setCreating(false); setCreateName("");
          setNotice("加入失败：" + (e && e.message));
        }
      }

      async function doCreateAndAdd(song) {
        const n = (createName || "").trim();
        if (!n) { setNotice("请输入歌单名称"); return; }
        try {
          const pl = await createPlaylist(n);
          if (song) { await addToPlaylist(song.id, pl.id); }
          setPickerSong(null); setCreating(false); setCreateName("");
          setNotice(song ? ("已创建「" + n + "」并加入歌曲") : ("已创建歌单「" + n + "」"));
          loadMyPlaylists();
        } catch (e) {
          console.error("[ncm] doCreateAndAdd", e);
          setPickerSong(null); setCreating(false); setCreateName("");
          setNotice("创建失败：" + (e && e.message));
        }
      }

      function openPicker(song) {
        setPickerSong(song);
        setCreating(false);
        setCreateName("");
      }

      async function loadArtistSongs(aid, aname) {
        setBusy(true); setNotice("");
        try {
          const j = await api("/artist/songs?id=" + aid + "&limit=50&timestamp=" + Date.now());
          const list = (j.songs || []).map(normSong);
          prevQueueRef.current = queue;
          setArtistView({ id: aid, name: aname });
          setQueue(list);
          setPls([]); setPlsLabel("");
          checkCached(list.map(function (s) { return s.id; }));
          setIdx(-1);
          if (!list.length) setNotice("该歌手暂无歌曲");
        } catch (e) {
          console.error("[ncm] loadArtistSongs", e);
          setNotice("加载歌手歌曲失败：" + (e && e.message));
        } finally {
          setBusy(false);
        }
      }

      function backFromArtist() {
        setQueue(prevQueueRef.current);
        setArtistView(null);
        setIdx(-1);
        setNotice("");
      }

      function pollBatch() {
        api("/karaoke/batch/status?timestamp=" + Date.now())
          .then(function (s) {
            setBatchStatus(s);
            if ((s.running || s.remaining > 0) && !batchTimerRef.current) {
              batchTimerRef.current = setInterval(function () {
                api("/karaoke/batch/status?timestamp=" + Date.now())
                  .then(function (s2) {
                    setBatchStatus(s2);
                    if (!s2.running && s2.remaining === 0) {
                      if (batchTimerRef.current) { clearInterval(batchTimerRef.current); batchTimerRef.current = null; }
                      checkCached(queue.map(function (x) { return x.id; }));
                    }
                  })
                  .catch(function () {});
              }, 3000);
            }
          })
          .catch(function () {});
      }

      function startBatch() {
        const ids = queue.map(function (s) { return s.id; });
        if (!ids.length) return;
        apiPost("/karaoke/batch/start", { ids: ids, cookie: cookie })
          .then(function (r) {
            if (r.queued) {
              setNotice("已加入 " + r.queued + " 首到离线处理队列");
              pollBatch();
            } else {
              setNotice("这些歌都已处理过，K歌直接可用");
              setBatchStatus({ total: 0, done: 0, remaining: 0, current: null, running: false });
            }
          })
          .catch(function (e) {
            console.error("[ncm] startBatch", e);
            setNotice("离线处理启动失败：" + (e && e.message));
          });
      }

      function changeVolume(v) {
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
      }

      function cycleMode() { setMode(nextMode(modeRef.current)); }

      function playPrev() {
        if (!queue.length) return;
        if (modeRef.current === "shuffle") {
          let r = idx;
          while (queue.length > 1 && r === idx) r = Math.floor(Math.random() * queue.length);
          playAt(r);
        } else {
          playAt((idx - 1 + queue.length) % queue.length);
        }
      }

      function playNext() {
        if (!queue.length) return;
        const m = modeRef.current;
        if (m === "repeat-one") { if (idx >= 0) playAt(idx); else playAt(0); return; }
        if (m === "shuffle") {
          let r = idx;
          while (queue.length > 1 && r === idx) r = Math.floor(Math.random() * queue.length);
          playAt(r);
          return;
        }
        const n = idx + 1;
        if (n >= queue.length) {
          if (m === "repeat-all") playAt(0);
          else { setPlaying(false); setNow(currentRef.current, false); if (audioRef.current) audioRef.current.pause(); }
        } else {
          playAt(n);
        }
      }

      // expose controls for the collapsed pill
      playerControls.toggle = togglePlay;
      playerControls.next = playNext;
      playerControls.prev = playPrev;

      useEffect(function () {
        return function () {
          stopQr();
          if (audioRef.current) audioRef.current.pause();
          if (batchTimerRef.current) { clearInterval(batchTimerRef.current); batchTimerRef.current = null; }
        };
      }, []);

      useEffect(function () {
        const saved = loadCookie();
        if (saved) { setCookie(saved); loadProfile(saved); }
      }, []);

      const hasQr = qr && qr.img && (qr.phase === "ready" || qr.phase === "expired" || qr.phase === "done");
      const btnLabel = qr && qr.phase === "loading" ? "生成中…" : (qr && (qr.phase === "ready" || qr.phase === "expired" || qr.phase === "error") ? "重新获取二维码" : "扫码登录");

      // lyric current line index
      let lyricIdx = -1;
      for (let k = 0; k < lyric.length; k++) { if (lyric[k].time <= cur) lyricIdx = k; else break; }
      const lyricOffset = lyricIdx >= 0 ? (65 - 13 - lyricIdx * 26) : 0;

      const userRow = profile ? React.createElement("div", { className: "ncm-userrow" },
        React.createElement("span", { className: "ncm-username" }, "👤 " + profile.nickname),
        React.createElement("button", { className: "ncm-btn", onClick: logout }, "退出"),
      ) : React.createElement("div", { className: "ncm-userrow" },
        React.createElement("span", { className: "ncm-username" }, "未登录（免登录可搜索播放）"),
        React.createElement("button", { className: "ncm-btn ncm-primary", onClick: function () { setShowLogin(true); } }, "登录"),
      );

      // login screen (when showLogin and not logged in)
      if (!profile && showLogin) {
        const kids = [];
        if (hasQr) kids.push(React.createElement("img", { key: "qr", className: "ncm-qr", src: qr.img, alt: "登录二维码" }));
        kids.push(React.createElement("button", { key: "b", className: "ncm-btn ncm-primary", onClick: beginLogin, disabled: qr && qr.phase === "loading" }, btnLabel));
        if (qr && qr.msg) kids.push(React.createElement("div", { key: "m", className: "ncm-msg" }, qr.msg));
        kids.push(React.createElement("button", { key: "back", className: "ncm-btn", onClick: function () { setShowLogin(false); } }, "返回"));
        return React.createElement("div", { className: "ncm-login" }, kids);
      }

      const nowEl = current ? React.createElement("div", { className: "ncm-now" },
        React.createElement("div", { className: "ncm-nowGlass" },
          React.createElement("div", { className: "ncm-nowTop" },
            React.createElement("div", { className: "ncm-nowTitle" }, current.name + (current.artists ? " · " + current.artists : "")),
            React.createElement("div", { className: "ncm-progRow" },
              React.createElement("span", { className: "ncm-time" }, fmt(cur * 1000)),
              React.createElement(ProgressBar, { cur: cur, dur: dur, onSeek: seek }),
              React.createElement("span", { className: "ncm-time" }, fmt(dur * 1000)),
            ),
          ),
          React.createElement("div", { className: "ncm-ctlRow" },
            React.createElement("div", { className: "ncm-ctlLeft" },
              React.createElement("button", { className: "ncm-lyricBtn", onClick: function () { setLyricOpen(!lyricOpen); } }, lyricOpen ? "歌词 ✕" : "📜 歌词"),
            ),
            React.createElement("div", { className: "ncm-ctlCenter" },
              React.createElement("button", { className: "ncm-mode", onClick: cycleMode, title: modeTitle(mode) }, modeIcon(mode)),
              React.createElement("button", { className: "ncm-ctlBtn", onClick: playPrev, title: "上一首" }, React.createElement(Icon, { d: ICONS.prev })),
              React.createElement("button", { className: "ncm-ctlBtn ncm-ctlMain", onClick: togglePlay, title: "播放/暂停" }, React.createElement(Icon, { d: playing ? ICONS.pause : ICONS.play, size: 22 })),
              React.createElement("button", { className: "ncm-ctlBtn", onClick: playNext, title: "下一首" }, React.createElement(Icon, { d: ICONS.next })),
            ),
            React.createElement("div", { className: "ncm-volWrap" },
              React.createElement("span", { className: "ncm-volIcon", style: { opacity: .7 } }, React.createElement(Icon, { d: ICONS.volume, size: 14 })),
              React.createElement("input", { type: "range", className: "ncm-vol", min: 0, max: 100, value: Math.round(volume * 100), onChange: function (e) { changeVolume(Number(e.target.value) / 100); } }),
            ),
          ),
        ),
      ) : null;

      const lyricEl = lyricOpen && lyric.length ? React.createElement("div", { className: "ncm-lyricBox" },
        React.createElement("div", { className: "ncm-lyricInner", style: { transform: "translateY(" + lyricOffset + "px)" } },
          lyric.map(function (l, i) {
            return React.createElement("div", { key: i, className: "ncm-lyricLine" + (i === lyricIdx ? " on" : "") }, l.text || "…");
          }),
        ),
      ) : (lyricOpen ? React.createElement("div", { className: "ncm-msg" }, "暂无歌词") : null);

      const searchRow = React.createElement("div", { className: "ncm-search" },
        React.createElement("input", { className: "ncm-input", value: keyword, placeholder: "搜索歌曲、歌手…", onChange: function (e) { setKeyword(e.target.value); }, onKeyDown: function (e) { if (e.key === "Enter") doSearch(); } }),
        React.createElement("button", { className: "ncm-btn ncm-primary", onClick: doSearch, disabled: busy }, busy ? "…" : "搜索"),
        React.createElement("button", { className: "ncm-btn", onClick: loadMyPlaylists, disabled: busy }, profile ? "我的歌单" : "登录后歌单"),
        React.createElement("button", { className: "ncm-btn", onClick: function () { if (!profile) { setShowLogin(true); return; } setPickerSong(null); setCreating(true); setCreateName(""); }, title: "新建歌单", disabled: busy }, "＋"),
      );

      const plEl = pls.length ? React.createElement("div", null,
        React.createElement("div", { className: "ncm-sectLabel" }, plsLabel),
        React.createElement("div", { className: "ncm-row" }, pls.map(function (pl) {
          return React.createElement("button", { key: pl.id, className: "ncm-pl", onClick: function () { loadTracks(pl); }, title: pl.name }, pl.name + " (" + pl.count + ")");
        })),
      ) : null;

      const artistBar = artistView ? React.createElement("div", { className: "ncm-batchRow" },
        React.createElement("button", { className: "ncm-btn", onClick: backFromArtist }, "← 返回"),
        React.createElement("span", { className: "ncm-batchInfo" }, "🎤 " + artistView.name + " 的歌曲"),
      ) : null;

      const batchBar = queue.length ? React.createElement("div", { className: "ncm-batchRow" },
        React.createElement("button", { className: "ncm-btn", onClick: startBatch, disabled: batchStatus && (batchStatus.running || batchStatus.remaining > 0) }, "🎵 离线处理歌单"),
        batchStatus && batchStatus.total > 0 ? React.createElement("span", { className: "ncm-batchInfo" },
          (batchStatus.running || batchStatus.remaining > 0) ? ("处理中 " + batchStatus.done + "/" + batchStatus.total) : ("已完成 " + batchStatus.done + " 首")
        ) : null,
      ) : null;

      const songList = queue.length ? React.createElement("div", { className: "ncm-list" }, queue.map(function (s, i) {
        const on = current && current.id === s.id;
        const cached = cachedIds.indexOf(String(s.id)) !== -1;
        const processing = processingId === s.id;
        const kBtn = cached
          ? React.createElement("button", { className: "ncm-kBtn", onClick: function (e) { e.stopPropagation(); playInstrumental(s, i); }, title: "播放伴奏" }, "K")
          : React.createElement("button", { className: "ncm-muteBtn", onClick: function (e) { e.stopPropagation(); generateInstrumental(s, i); }, disabled: processing, title: "生成并播放伴奏" }, processing ? "…" : "消音");
        const addBtn = React.createElement("button", { className: "ncm-addBtn", onClick: function (e) { e.stopPropagation(); if (!profile) { setShowLogin(true); return; } openPicker(s); }, title: "加入歌单" }, "＋");
        return React.createElement("div", { key: s.id + "-" + i, className: "ncm-song" + (on ? " on" : ""), onClick: function () { playAt(i); } },
          s.picUrl ? React.createElement("img", { className: "ncm-songCover", src: httpsUrl(s.picUrl), alt: "", onError: function (e) { e.currentTarget.style.visibility = "hidden"; } }) : React.createElement("div", { className: "ncm-songCover" }),
          React.createElement("div", { className: "ncm-songName" }, s.name),
          React.createElement("div", { className: "ncm-songArtist" },
            (s.artistsArr && s.artistsArr.length ? s.artistsArr : []).map(function (a, ai) {
              return React.createElement("span", { key: ai },
                ai > 0 ? " / " : null,
                React.createElement("span", { className: "ncm-artistLink", title: "查看 " + a.name + " 的歌曲", onClick: function (e) { e.stopPropagation(); loadArtistSongs(a.id, a.name); } }, a.name),
              );
            }),
          ),
          React.createElement("div", { className: "ncm-songDur" }, fmt(s.duration)),
          addBtn,
          kBtn,
        );
      })) : null;

      const noticeEl = notice ? React.createElement("div", { className: "ncm-notice" }, notice) : null;

      const pickerOpen = !!pickerSong || creating;
      const pickerEl = pickerOpen ? React.createElement("div", { className: "ncm-pickerOverlay", onClick: function () { setPickerSong(null); setCreating(false); setCreateName(""); } },
        React.createElement("div", { className: "ncm-pickerPanel", onClick: function (e) { e.stopPropagation(); } },
          React.createElement("div", { className: "ncm-pickerTitle" }, pickerSong ? ("加入歌单 · " + pickerSong.name) : "新建歌单"),
          creating
            ? React.createElement("div", { className: "ncm-pickerCreate" },
                React.createElement("input", { className: "ncm-input", value: createName, placeholder: "输入歌单名称", autoFocus: true, onChange: function (e) { setCreateName(e.target.value); }, onKeyDown: function (e) { if (e.key === "Enter") doCreateAndAdd(pickerSong); } }),
                React.createElement("button", { className: "ncm-btn ncm-primary", onClick: function () { doCreateAndAdd(pickerSong); } }, pickerSong ? "创建并加入" : "创建"),
                React.createElement("button", { className: "ncm-btn", onClick: function () { setCreating(false); if (!pickerSong) { setPickerSong(null); setCreateName(""); } } }, "取消"),
              )
            : React.createElement("div", null,
                React.createElement("div", { className: "ncm-pickerList" },
                  myPlaylists.length
                    ? myPlaylists.map(function (pl) {
                        return React.createElement("div", { key: pl.id, className: "ncm-pickerItem", onClick: function () { doAddToPlaylist(pickerSong, pl); } }, "♪ " + pl.name + " (" + pl.count + ")");
                      })
                    : React.createElement("div", { className: "ncm-msg" }, "还没有歌单，点下方新建"),
                ),
                React.createElement("button", { className: "ncm-btn", onClick: function () { setCreating(true); } }, "＋ 新建歌单"),
              ),
        ),
      ) : null;

      return React.createElement("div", null,
        userRow, nowEl, lyricEl, searchRow, plEl, artistBar, batchBar, songList, noticeEl, pickerEl,
        React.createElement("audio", {
          ref: audioRef, crossOrigin: "anonymous", style: { display: "none" },
          onPlay: function () { setPlaying(true); setNow(currentRef.current, true); },
          onPause: function () { setPlaying(false); setNow(currentRef.current, false); },
          onEnded: function () { playNext(); },
          onError: function (e) { console.error("[ncm] audio error", e); setPlaying(false); setNow(currentRef.current, false); },
          onTimeUpdate: function (e) { setCur(e.currentTarget.currentTime); },
          onLoadedMetadata: function (e) { setDur(e.currentTarget.duration); },
        }),
      );
    }

    function MusicWidget() {
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState({ top: 12, right: 76 });
      const movedRef = useRef(false);
      const dragRef = useRef(null);
      const now = useNow();

      function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

      function startDrag(e) {
        if (e.button !== 0) return;
        movedRef.current = false;
        dragRef.current = { sx: e.clientX, sy: e.clientY, top: pos.top, right: pos.right };
        const move = function (ev) {
          const s = dragRef.current;
          if (!s) return;
          const dx = ev.clientX - s.sx;
          const dy = ev.clientY - s.sy;
          if (!movedRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) movedRef.current = true;
          if (movedRef.current) setPos({ top: clamp(s.top + dy, 8, 460), right: clamp(s.right - dx, 8, 380) });
        };
        const up = function () {
          dragRef.current = null;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }

      function openPanel() {
        if (movedRef.current) { movedRef.current = false; return; }
        setOpen(true);
      }

      const posStyle = { top: pos.top + "px", right: pos.right + "px" };

      return React.createElement("div", { className: "ncm-widget", style: posStyle },
        open ? null : React.createElement("div", { className: "ncm-pill", onClick: openPanel, title: "网易云音乐（拖动⠿移动，点击展开）" },
          React.createElement("span", { className: "ncm-drag", onPointerDown: startDrag, title: "拖动" }, "⠿"),
          now.song && now.song.picUrl ? React.createElement("img", { className: "ncm-pillCover", src: httpsUrl(now.song.picUrl), alt: "", onError: function (e) { e.currentTarget.style.visibility = "hidden"; } }) : React.createElement("span", { className: "ncm-pillCover", style: { display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } }, "🎵"),
          React.createElement("span", { className: "ncm-pillText" }, now.song ? (now.song.name + " · " + now.song.artists) : "网易云音乐"),
          React.createElement("button", { className: "ncm-pillPlay", onClick: function (e) { e.stopPropagation(); if (now.song) { if (playerControls.toggle) playerControls.toggle(); } else { setOpen(true); } } }, now.playing ? "⏸" : "▶"),
          React.createElement("span", { className: "ncm-pillOpen" }, "⤢"),
        ),
        React.createElement("div", { className: "ncm-panel" + (open ? "" : " ncm-hidden") },
          now.song && now.song.picUrl ? React.createElement("div", { className: "ncm-panelBg", style: { backgroundImage: "url('" + httpsUrl(now.song.picUrl) + "')" } }) : null,
          now.song ? React.createElement("div", { className: "ncm-panelTint" }) : null,
          React.createElement("div", { className: "ncm-hd", onPointerDown: startDrag, title: "拖动移动窗口" },
            React.createElement("span", { className: "ncm-hdTitle" }, "🎵 网易云音乐"),
            React.createElement("button", { className: "ncm-close", onClick: function () { if (movedRef.current) { movedRef.current = false; return; } setOpen(false); }, title: "收起" }, "✕"),
          ),
          React.createElement("div", { className: "ncm-body" }, React.createElement(Player, null)),
        ),
      );
    }

    exports.name = "dsh-client-ui-music";
    exports.inject = ["slots"];
    exports.apply = (ctx) => {
      ctx.slots.inject("shell.overlay", () => ctx.slots.register({
        name: "shell.overlay",
        id: "music-player",
        order: 20,
        label: () => "网易云音乐",
      }, MusicWidget));
    };
    return module.exports;
  }
});
