const SCREENS = {
  chat: {
    src: "assets/shots/01-chat.png",
    alt: "引程对话界面：今日安排与目标督查",
    caption: "说一句安排，日程就位。长按消息还能撤回或删除。",
  },
  calendar: {
    src: "assets/shots/02-calendar.png",
    alt: "引程日程界面：课程和事项按时间混排",
    caption: "课程、作业和临时安排放在同一条时间线上。",
  },
  timetable: {
    src: "assets/shots/03-timetable.png",
    alt: "引程周课表界面：按周次显示课程",
    caption: "单双周、节次、教室和教师都能保留，课表可以左右滑动。",
  },
  goals: {
    src: "assets/shots/04-goals.png",
    alt: "引程目标界面：每日督查和进度",
    caption: "每天对照相关日程检查目标，不让计划只停在首页。",
  },
};

const shot = document.querySelector("#phoneShot");
const caption = document.querySelector("#shotCaption");
const tabs = [...document.querySelectorAll("[data-shot]")];

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    const next = SCREENS[tab.dataset.shot];
    if (!next || !shot || !caption) return;
    shot.classList.add("is-changing");
    window.setTimeout(() => {
      shot.src = next.src;
      shot.alt = next.alt;
      caption.textContent = next.caption;
      shot.classList.remove("is-changing");
    }, 100);
    for (const item of tabs) {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    }
  });
}

const counterNodes = [...document.querySelectorAll("[data-download-count]")];
const numberFormat = new Intl.NumberFormat("zh-CN");

async function loadDownloadCount() {
  try {
    const response = await fetch("/api/download-count", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`counter ${response.status}`);
    const data = await response.json();
    const count = Number.isFinite(Number(data.count)) ? Math.max(0, Number(data.count)) : 0;
    for (const node of counterNodes) node.textContent = numberFormat.format(count);
  } catch {
    for (const node of counterNodes) {
      node.textContent = "—";
      node.title = "下载统计暂时不可用";
    }
  }
}

for (const link of document.querySelectorAll("[data-download]")) {
  link.addEventListener("click", () => {
    link.setAttribute("aria-busy", "true");
  });
}

document.querySelector("#year").textContent = String(new Date().getFullYear());
loadDownloadCount();
