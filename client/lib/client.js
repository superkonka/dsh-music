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
    function saveCookie(ck) { try { if (ck) localStorage.setItem(COOKIE_KEY, ck); else localStorage.removeItem(COOKIE_KEY); } catch (e) {} }
    function loadCookie() { try { return localStorage.getItem(COOKIE_KEY) || ""; } catch (e) { return ""; } }

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
    // Latest player controls, refreshed every render by Player so the pill can drive them.
    const playerControls = { toggle: null };

    (function injectStyles() {
      if (typeof document === "undefined") return;
      const id = "@deepseek-ai/dsh-client-ui-music/styles";
      if (document.querySelector('style[data-plugin-css="' + id + '"]')) return;
      const tag = document.createElement("style");
      tag.dataset.pluginCss = id;
      tag.textContent = "" +
        ".ncm-widget{position:fixed;z-index:9990;pointer-events:none;user-select:none;}" +
        ".ncm-pill{pointer-events:auto;display:flex;align-items:center;gap:7px;padding:5px 8px 5px 5px;border-radius:999px;border:1px solid var(--dsh-border,#3f3f46);background:var(--dsh-surface,#1f1f23);color:var(--dsh-text,#e5e7eb);box-shadow:0 4px 16px rgba(0,0,0,.28);cursor:pointer;max-width:340px;}" +
        ".ncm-drag{flex:0 0 auto;cursor:grab;opacity:.55;font-size:13px;padding:0 2px;touch-action:none;}" +
        ".ncm-drag:active{cursor:grabbing;}" +
        ".ncm-pillPlay{width:28px;height:28px;border-radius:50%;border:none;background:#ec4141;color:#fff;font-size:13px;cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;line-height:1;}" +
        ".ncm-pillPlay:hover{background:#d93434;}" +
        ".ncm-pillText{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}" +
        ".ncm-pillOpen{font-size:12px;opacity:.6;flex:0 0 auto;}" +
        ".ncm-panel{pointer-events:auto;width:360px;max-width:92vw;max-height:min(640px,88vh);background:var(--dsh-surface,#1f1f23);color:var(--dsh-text,#e5e7eb);border:1px solid var(--dsh-border,#3f3f46);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden;}" +
        ".ncm-hidden{display:none;}" +
        ".ncm-hd{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsh-border,#3f3f46);}" +
        ".ncm-hdTitle{font-weight:600;font-size:14px;flex:1;}" +
        ".ncm-close{cursor:pointer;border:none;background:transparent;color:inherit;font-size:16px;line-height:1;opacity:.7;}" +
        ".ncm-close:hover{opacity:1;}" +
        ".ncm-body{overflow:auto;padding:12px;}" +
        ".ncm-userrow{display:flex;align-items:center;gap:8px;margin-bottom:10px;}" +
        ".ncm-username{font-size:12px;opacity:.7;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-btn{cursor:pointer;border:1px solid var(--dsh-border,#52525b);background:transparent;color:var(--dsh-text,#e5e7eb);border-radius:8px;padding:4px 10px;font-size:12px;line-height:1.4;}" +
        ".ncm-btn:hover{background:rgba(128,128,128,.15);}" +
        ".ncm-btn:disabled{opacity:.4;cursor:default;}" +
        ".ncm-primary{background:#ec4141;border-color:#ec4141;color:#fff;}" +
        ".ncm-primary:hover{background:#d93434;}" +
        ".ncm-login{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0;}" +
        ".ncm-qr{width:170px;height:170px;border-radius:10px;border:1px solid var(--dsh-border,#3f3f46);}" +
        ".ncm-msg{font-size:12px;opacity:.8;text-align:center;min-height:16px;}" +
        ".ncm-search{display:flex;gap:8px;margin-bottom:10px;}" +
        ".ncm-input{flex:1;min-width:0;border:1px solid var(--dsh-border,#52525b);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-size:13px;outline:none;}" +
        ".ncm-now{margin-bottom:12px;padding:10px;border:1px solid var(--dsh-border,#3f3f46);border-radius:10px;}" +
        ".ncm-nowTitle{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-nowArtist{font-size:12px;opacity:.65;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-nowCtl{display:flex;align-items:center;gap:8px;margin-top:8px;}" +
        ".ncm-ctlBtn{cursor:pointer;background:transparent;border:1px solid var(--dsh-border,#52525b);color:inherit;border-radius:50%;width:30px;height:30px;font-size:13px;line-height:1;flex:0 0 auto;display:flex;align-items:center;justify-content:center;}" +
        ".ncm-ctlBtn:hover{background:rgba(128,128,128,.15);}" +
        ".ncm-ctlMain{background:#ec4141;border-color:#ec4141;color:#fff;width:36px;height:36px;font-size:15px;}" +
        ".ncm-ctlMain:hover{background:#d93434;}" +
        ".ncm-progress{flex:1;height:5px;background:rgba(128,128,128,.25);border-radius:3px;cursor:pointer;position:relative;}" +
        ".ncm-progressFill{position:absolute;left:0;top:0;bottom:0;background:#ec4141;border-radius:3px;pointer-events:none;}" +
        ".ncm-time{font-size:10px;opacity:.55;font-variant-numeric:tabular-nums;flex:0 0 auto;}" +
        ".ncm-sectLabel{font-size:11px;opacity:.6;margin:10px 0 6px;}" +
        ".ncm-row{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;}" +
        ".ncm-pl{cursor:pointer;font-size:12px;border:1px solid var(--dsh-border,#52525b);border-radius:16px;padding:3px 10px;background:transparent;color:inherit;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-pl:hover{background:rgba(128,128,128,.15);}" +
        ".ncm-list{max-height:260px;overflow:auto;}" +
        ".ncm-song{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;cursor:pointer;}" +
        ".ncm-song:hover{background:rgba(128,128,128,.12);}" +
        ".ncm-song.on{background:rgba(236,65,65,.18);}" +
        ".ncm-songName{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".ncm-songArtist{flex:0 1 auto;max-width:36%;font-size:12px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
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

    function fmt(ms) {
      if (!ms) return "--:--";
      const total = Math.floor(ms / 1000);
      const m = Math.floor(total / 60);
      const s = total % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function ProgressBar(props) {
      const pct = props.dur ? Math.min(100, Math.max(0, props.cur / props.dur * 100)) : 0;
      return React.createElement("div", { className: "ncm-progress", onClick: function (e) {
        if (!props.dur) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        props.onSeek(ratio * props.dur);
      } },
        React.createElement("div", { className: "ncm-progressFill", style: { width: pct + "%" } }),
      );
    }

    function Player() {
      const [cookie, setCookie] = useState("");
      const [profile, setProfile] = useState(null);
      const [qr, setQr] = useState(null);
      const [keyword, setKeyword] = useState("");
      const [busy, setBusy] = useState(false);
      const [queue, setQueue] = useState([]);
      const [idx, setIdx] = useState(-1);
      const [playing, setPlaying] = useState(false);
      const [cur, setCur] = useState(0);
      const [dur, setDur] = useState(0);
      const [pls, setPls] = useState([]);
      const [plsLabel, setPlsLabel] = useState("");
      const [notice, setNotice] = useState("");
      const audioRef = useRef(null);
      const qrTimer = useRef(null);
      const currentRef = useRef(null);

      const current = idx >= 0 && queue[idx] ? queue[idx] : null;
      currentRef.current = current;

      function stopQr() {
        if (qrTimer.current) { clearInterval(qrTimer.current); qrTimer.current = null; }
      }

      async function loadProfile(ck) {
        try {
          const j = await api("/login/status?cookie=" + encodeURIComponent(ck) + "&timestamp=" + Date.now());
          const p = j.data && j.data.profile;
          if (p) setProfile({ nickname: p.nickname || "用户", userId: (j.data.account && j.data.account.id) || "" });
        } catch (e) {}
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
                const ck = j.cookie || "";
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
        setCookie(""); setProfile(null); setPls([]); setPlsLabel("");
        setQueue([]); setIdx(-1); setPlaying(false); setQr(null); setNotice("");
        setNow(null, false);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute("src"); }
      }

      async function doSearch() {
        const kw = keyword.trim();
        if (!kw) return;
        setBusy(true); setNotice("");
        try {
          const ts = Date.now();
          const [j1, j2] = await Promise.all([
            api("/search?keywords=" + encodeURIComponent(kw) + "&type=1&limit=30&timestamp=" + ts),
            api("/search?keywords=" + encodeURIComponent(kw) + "&type=1000&limit=12&timestamp=" + ts),
          ]);
          const songs = (j1.result && j1.result.songs) || [];
          const plsRes = (j2.result && j2.result.playlists) || [];
          setQueue(songs.map(function (s) {
            return { id: s.id, name: s.name, artists: (s.artists || []).map(function (a) { return a.name; }).join(" / "), duration: s.duration || 0 };
          }));
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
        if (!profile) return;
        setBusy(true); setNotice("");
        try {
          const j = await api("/user/playlist?uid=" + profile.userId + "&cookie=" + encodeURIComponent(cookie) + "&timestamp=" + Date.now());
          const list = (j.playlist || []).map(function (p) { return { id: p.id, name: p.name, count: p.trackCount || 0 }; });
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
          const list = (j.songs || []).map(function (s) {
            return { id: s.id, name: s.name, artists: (s.ar || []).map(function (a) { return a.name; }).join(" / "), duration: s.dt || 0 };
          });
          setQueue(list); setIdx(-1);
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
          const a = audioRef.current;
          if (a) {
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

      function playPrev() { if (queue.length) playAt((idx - 1 + queue.length) % queue.length); }
      function playNext() { if (queue.length) playAt((idx + 1) % queue.length); }

      // expose latest toggle for the collapsed pill (never nulled; the Player lives as long as the plugin).
      playerControls.toggle = togglePlay;

      useEffect(function () {
        return function () {
          stopQr();
          if (audioRef.current) audioRef.current.pause();
        };
      }, []);

      useEffect(function () {
        const saved = loadCookie();
        if (saved) { setCookie(saved); loadProfile(saved); }
      }, []);

      const hasQr = qr && qr.img && (qr.phase === "ready" || qr.phase === "expired" || qr.phase === "done");
      const btnLabel = qr && qr.phase === "loading" ? "生成中…" : (qr && (qr.phase === "ready" || qr.phase === "expired" || qr.phase === "error") ? "重新获取二维码" : "扫码登录");

      const userRow = profile ? React.createElement("div", { className: "ncm-userrow" },
        React.createElement("span", { className: "ncm-username" }, "👤 " + profile.nickname),
        React.createElement("button", { className: "ncm-btn", onClick: logout }, "退出"),
      ) : null;

      let top = null;
      if (!profile) {
        const kids = [];
        if (hasQr) kids.push(React.createElement("img", { key: "qr", className: "ncm-qr", src: qr.img, alt: "登录二维码" }));
        kids.push(React.createElement("button", { key: "b", className: "ncm-btn ncm-primary", onClick: beginLogin, disabled: qr && qr.phase === "loading" }, btnLabel));
        if (qr && qr.msg) kids.push(React.createElement("div", { key: "m", className: "ncm-msg" }, qr.msg));
        top = React.createElement("div", { className: "ncm-login" }, kids);
      } else {
        top = React.createElement("div", null,
          React.createElement("div", { className: "ncm-search" },
            React.createElement("input", { className: "ncm-input", value: keyword, placeholder: "搜索歌曲、歌手…", onChange: function (e) { setKeyword(e.target.value); }, onKeyDown: function (e) { if (e.key === "Enter") doSearch(); } }),
            React.createElement("button", { className: "ncm-btn ncm-primary", onClick: doSearch, disabled: busy }, busy ? "…" : "搜索"),
            React.createElement("button", { className: "ncm-btn", onClick: loadMyPlaylists, disabled: busy }, "我的歌单"),
          ),
        );
      }

      const nowEl = current ? React.createElement("div", { className: "ncm-now" },
        React.createElement("div", { className: "ncm-nowTitle" }, current.name),
        React.createElement("div", { className: "ncm-nowArtist" }, current.artists),
        React.createElement("div", { className: "ncm-nowCtl" },
          React.createElement("button", { className: "ncm-ctlBtn", onClick: playPrev, title: "上一首" }, "⏮"),
          React.createElement("button", { className: "ncm-ctlBtn ncm-ctlMain", onClick: togglePlay, title: "播放/暂停" }, playing ? "⏸" : "▶"),
          React.createElement("button", { className: "ncm-ctlBtn", onClick: playNext, title: "下一首" }, "⏭"),
          React.createElement("span", { className: "ncm-time" }, fmt(cur * 1000)),
          React.createElement(ProgressBar, { cur: cur, dur: dur, onSeek: seek }),
          React.createElement("span", { className: "ncm-time" }, fmt(dur * 1000)),
        ),
      ) : null;

      const plEl = pls.length ? React.createElement("div", null,
        React.createElement("div", { className: "ncm-sectLabel" }, plsLabel),
        React.createElement("div", { className: "ncm-row" }, pls.map(function (pl) {
          return React.createElement("button", { key: pl.id, className: "ncm-pl", onClick: function () { loadTracks(pl); }, title: pl.name }, pl.name + " (" + pl.count + ")");
        })),
      ) : null;

      const songList = queue.length ? React.createElement("div", { className: "ncm-list" }, queue.map(function (s, i) {
        const on = current && current.id === s.id;
        return React.createElement("div", { key: s.id + "-" + i, className: "ncm-song" + (on ? " on" : ""), onClick: function () { playAt(i); } },
          React.createElement("div", { className: "ncm-songName" }, s.name),
          React.createElement("div", { className: "ncm-songArtist" }, s.artists),
          React.createElement("div", { className: "ncm-songDur" }, fmt(s.duration)),
        );
      })) : null;

      const noticeEl = notice ? React.createElement("div", { className: "ncm-notice" }, notice) : null;

      return React.createElement("div", null,
        userRow, top, plEl, nowEl, songList, noticeEl,
        React.createElement("audio", {
          ref: audioRef, style: { display: "none" },
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
          if (movedRef.current) setPos({ top: clamp(s.top + dy, 8, 460), right: clamp(s.right - dx, 8, 360) });
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
          React.createElement("button", { className: "ncm-pillPlay", onClick: function (e) { e.stopPropagation(); if (now.song) { if (playerControls.toggle) playerControls.toggle(); } else { setOpen(true); } } }, now.playing ? "⏸" : "▶"),
          React.createElement("span", { className: "ncm-pillText" }, now.song ? (now.song.name + " — " + now.song.artists) : "网易云音乐"),
          React.createElement("span", { className: "ncm-pillOpen" }, "⤢"),
        ),
        React.createElement("div", { className: "ncm-panel" + (open ? "" : " ncm-hidden") },
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
