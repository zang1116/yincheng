import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")


BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173"
OUT_DIR = Path(__file__).resolve().parent.parent / "test-artifacts" / "mobile"


def assert_true(value, message):
    if not value:
        raise AssertionError(message)


def seed_page(page):
    page.evaluate(
        """() => {
          Store.update((st) => {
            st.settings.theme = 'paper';
            st.settings.apiKey = '';
            st.settings.notify = false;
            st.term = {
              week1: '2026-09-21',
              weeks: 20,
              title: '2026 秋季学期',
              periodPreset: 'jiaowu'
            };
            st.tasks = [
              { id: 't1', title: '高等数学 · 第三章习题', date: '2026-11-02', time: '09:30', endTime: '10:30', location: '图书馆 3F', category: 'study', done: false, note: '重点看极限与连续' },
              { id: 't2', title: 'Agent 开发：工具调用练习', date: '2026-11-02', time: '20:00', endTime: '21:00', location: '', category: 'study', done: false, note: '' },
              { id: 't3', title: '英语听力 30 分钟', date: '2026-11-02', time: '07:30', endTime: '08:00', location: '', category: 'personal', done: true, note: '' },
              { id: 't4', title: '小组项目碰头', date: '2026-11-02', time: '16:00', endTime: '17:00', location: '教 8-517', category: 'work', done: false, note: '' },
              { id: 't5', title: '整理本周错题', date: '2026-11-03', time: '19:30', endTime: '20:30', location: '', category: 'study', done: false, note: '' },
              { id: 't6', title: '预约周末球场', date: '2026-11-04', time: '', endTime: '', location: '', category: 'life', done: false, note: '' }
            ];
            st.courses = [
              { id: 'c1', name: '高等数学', weekday: 1, sectionStart: 1, sectionEnd: 2, startTime: '08:30', endTime: '10:10', weeksText: '1-16周', weeks: Array.from({length: 16}, (_, i) => i + 1), location: '教 8-517', teacher: '田老师', color: '#c5dff8' },
              { id: 'c2', name: '大学英语', weekday: 1, sectionStart: 5, sectionEnd: 6, startTime: '14:00', endTime: '15:40', weeksText: '1-16周', weeks: Array.from({length: 16}, (_, i) => i + 1), location: '外语楼 204', teacher: '李老师', color: '#ffd8a8' },
              { id: 'c3', name: '机器学习', weekday: 3, sectionStart: 3, sectionEnd: 4, startTime: '10:20', endTime: '12:00', weeksText: '1-15单周', weeks: [1,3,5,7,9,11,13,15], location: '东校区 教 3-201', teacher: '周老师', color: '#c8ebd6' },
              { id: 'c4', name: 'Agent 工程实践', weekday: 5, sectionStart: 7, sectionEnd: 8, startTime: '16:10', endTime: '17:50', weeksText: '2-16双周', weeks: [2,4,6,8,10,12,14,16], location: '创新中心 B302', teacher: '陈老师', color: '#e0d4f7' },
              { id: 'c5', name: '设计工作坊', weekday: 6, sectionStart: 3, sectionEnd: 4, startTime: '10:20', endTime: '12:00', weeksText: '4-12周', weeks: [4,5,6,7,8,9,10,11,12], location: '创客空间', teacher: '林老师', color: '#f0d0c8' }
            ];
            st.goals = [
              { id: 'g1', title: '本学期完成 Agent 项目', horizon: 'quarter', detail: '完成一个可演示的学习规划助手', progress: '原型和工具调用已经跑通', verdict: 'good', encouragement: '按现在的节奏走。' },
              { id: 'g2', title: '高数期末达到 85 分', horizon: 'month', detail: '每周完成一章习题并整理错题', progress: '已完成两章', verdict: 'dragging', encouragement: '别再攒错题了。' }
            ];
            st.checkins = ['2026-10-31', '2026-11-01', '2026-11-02'];
            st.memos = [{ id: 'm1', content: '周三前交实验报告', at: Date.now() }];
            st.diy.chat = [
              { id: 'mch1', role: 'assistant', content: '早上好。今天有 4 项安排，先处理 9:30 的高数习题。', at: new Date('2026-11-02T07:20:00+08:00').getTime() },
              { id: 'mch2', role: 'user', content: '帮我把 Agent 练习记到今晚八点，顺便提醒我带电脑。', at: new Date('2026-11-02T07:21:00+08:00').getTime() },
              { id: 'mch3', role: 'assistant', content: '已排进今晚 20:00–21:00，提醒设在开始前 10 分钟。电脑也写进备注了。', at: new Date('2026-11-02T07:21:10+08:00').getTime(), receipt: '已写入 1 项日程' }
            ];
            st.diy.goalRoastDay = '2026-11-02';
            st.diy.goalRoastText = '目标不是口号。高数错题还堆着，今晚先把最卡的一题解决；Agent 项目保持当前节奏。';
          });
        }"""
    )
    page.reload(wait_until="networkidle")
    page.wait_for_selector(".app")


def page_metrics(page):
    return page.evaluate(
        """() => {
          const main = document.querySelector('#main');
          const app = document.querySelector('.app');
          const visible = [...document.querySelectorAll('button, input, select, textarea')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
            })
            .map((el) => {
              const r = el.getBoundingClientRect();
              return {
                tag: el.tagName,
                text: (el.getAttribute('aria-label') || el.textContent || el.id || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
                width: Math.round(r.width),
                height: Math.round(r.height),
                x: Math.round(r.x),
                y: Math.round(r.y)
              };
            });
          return {
            viewport: { width: innerWidth, height: innerHeight },
            app: app ? { width: Math.round(app.getBoundingClientRect().width), height: Math.round(app.getBoundingClientRect().height) } : null,
            main: main ? { clientWidth: main.clientWidth, scrollWidth: main.scrollWidth, clientHeight: main.clientHeight, scrollHeight: main.scrollHeight } : null,
            documentOverflow: document.documentElement.scrollWidth - innerWidth,
            smallControls: visible.filter((el) => el.width < 40 || el.height < 40).slice(0, 30)
          };
        }"""
    )


def assert_touch_targets(page, selector, label):
    bad = page.evaluate(
        """(selector) => [...document.querySelectorAll(selector)]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              text: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
              width: Math.round(r.width),
              height: Math.round(r.height)
            };
          })
          .filter((el) => el.height < 44)""",
        selector,
    )
    assert_true(not bad, f"{label} has touch targets below 44px: {bad}")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    errors = []
    findings = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        )
        context = browser.new_context(
            viewport={"width": 360, "height": 800},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
        )
        page = context.new_page()
        page.on("console", lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
        page.on(
            "response",
            lambda response: errors.append(f"http {response.status}: {response.url}")
            if response.status >= 400
            else None,
        )
        page.goto(BASE_URL, wait_until="networkidle")
        seed_page(page)
        page.wait_for_timeout(350)

        for view in ("chat", "calendar", "goals", "settings"):
            page.locator(f'#tabs button[data-view="{view}"]').click()
            page.wait_for_timeout(300)
            if view == "calendar":
                top_display = page.locator("#top").evaluate("el => getComputedStyle(el).display")
                assert_true(top_display == "none", f"calendar header must not reserve hidden app header space, got display={top_display}")
            page.screenshot(path=str(OUT_DIR / f"360-{view}.png"), full_page=False)
            findings[view] = page_metrics(page)

        assert_touch_targets(page, "#main button", "main pages")

        page.evaluate("document.querySelector('#main').scrollTop = 300")
        page.locator('#tabs button[data-view="calendar"]').click()
        page.wait_for_timeout(200)
        switched_scroll = page.evaluate("document.querySelector('#main').scrollTop")
        assert_true(switched_scroll == 0, f"tab switch must start at top, got scrollTop={switched_scroll}")

        page.locator('[data-act="search-toggle"]').click()
        page.locator("#calQ").fill("田老师")
        page.wait_for_timeout(220)
        assert_true(page.locator(".event.course").count() == 1, "calendar search should find courses by teacher")
        assert_true("找到 1 项" in page.locator(".search-summary").inner_text(), "search should show a result count")
        page.screenshot(path=str(OUT_DIR / "360-calendar-search.png"), full_page=False)
        page.locator('[data-act="search-clear"]').click()
        page.wait_for_timeout(160)

        page.locator('#tabs button[data-view="calendar"]').click()
        page.locator('.fab').click()
        page.wait_for_timeout(250)
        assert_touch_targets(page, "#sheet button, #sheet input:not([type=radio]):not([type=checkbox]), #sheet select", "event sheet")
        radio_layout = page.locator(".radios label").evaluate_all(
            """els => els.map((el) => {
              const range = document.createRange();
              range.selectNodeContents(el.lastChild);
              const rects = [...range.getClientRects()];
              return {
                text: el.textContent.trim(),
                lines: rects.length,
                width: rects.length ? Math.round(rects[0].width) : 0
              };
            })"""
        )
        assert_true(
            all(item["lines"] == 1 and item["width"] >= 24 for item in radio_layout),
            f"reminder labels must stay on one line: {radio_layout}",
        )
        page.screenshot(path=str(OUT_DIR / "360-event-sheet.png"), full_page=False)
        findings["eventSheet"] = page_metrics(page)
        back_available = page.evaluate("!!(window.YinchengApp && window.YinchengApp.handleAndroidBack)")
        assert_true(back_available, "Android back handler must be exposed to the native shell")
        assert_true(page.evaluate("window.YinchengApp.handleAndroidBack()") is True, "back must close an open sheet")
        assert_true(page.locator("#mask").evaluate("el => el.hidden"), "back should hide the sheet")
        assert_true(page.evaluate("window.YinchengApp.handleAndroidBack()") is True, "back must leave a non-chat page")
        assert_true(
            page.locator("#main").get_attribute("data-view") == "chat",
            "back from calendar should return to chat",
        )
        page.locator('#tabs button[data-view="calendar"]').click()

        page.locator('[data-act="view-courses"]').click()
        page.wait_for_timeout(250)
        sheet_scroll_left = page.locator(".sheet").evaluate("el => el.scrollLeft")
        assert_true(sheet_scroll_left == 0, f"course sheet must open without horizontal offset, got {sheet_scroll_left}")
        board_scroll_left = page.locator(".tt-board").evaluate("el => el.scrollLeft")
        assert_true(board_scroll_left == 0, f"weekly board must open at Monday, got scrollLeft={board_scroll_left}")
        findings["courseBoardLayout"] = page.evaluate(
            """() => {
              const rect = (selector) => {
                const el = document.querySelector(selector);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {x: r.x, y: r.y, width: r.width, height: r.height};
              };
              return {
                pageScrollX: window.scrollX,
                sheetStyle: (() => {
                  const el = document.querySelector('.sheet');
                  const cs = getComputedStyle(el);
                  return {width: cs.width, minWidth: cs.minWidth, maxWidth: cs.maxWidth, overflowX: cs.overflowX};
                })(),
                mask: rect('.sheet-mask'),
                sheet: rect('.sheet'),
                topButton: rect('.ttb-top .icon-btn'),
                weekPill: rect('.ttb-week-pill'),
                board: rect('.tt-board')
              };
            }"""
        )
        layout = findings["courseBoardLayout"]
        assert_true(
            layout["sheet"]["x"] >= 0 and layout["sheet"]["width"] <= 360,
            f"course sheet should fit the viewport, got {layout}",
        )
        page.screenshot(path=str(OUT_DIR / "360-course-board.png"), full_page=False)
        findings["courseBoard"] = page_metrics(page)
        page.locator('[data-act="close-sheet"]').first.click()

        # Add a task through the visible form to verify the primary write flow.
        page.locator('.fab').click()
        page.locator('#evTitle').fill('完成移动端体验检查')
        page.locator('#evTime').fill('21:10')
        page.locator('[data-act="save-event"]').click()
        page.wait_for_timeout(300)
        findings["newTaskVisible"] = page.get_by_text("完成移动端体验检查", exact=True).count()
        assert_true(findings["newTaskVisible"] == 1, "new task should appear in the selected day")
        created_id = page.evaluate(
            "Store.get().tasks.find(t => t.title === '完成移动端体验检查' && t.time === '21:10').id"
        )
        page.locator(f'[data-act="open-task"][data-id="{created_id}"]').click()
        page.locator("#evLoc").fill("移动端验收")
        page.locator('[data-act="save-event"]').click()
        page.wait_for_timeout(200)
        assert_true(
            page.evaluate(f"Store.get().tasks.find(t => t.id === '{created_id}').location") == "移动端验收",
            "editing a task should save its location",
        )
        page.locator(f'[data-act="toggle-done"][data-id="{created_id}"]').click()
        assert_true(
            page.evaluate(f"Store.get().tasks.find(t => t.id === '{created_id}').done") is True,
            "task completion should persist",
        )

        page.set_viewport_size({"width": 412, "height": 915})
        page.locator('#tabs button[data-view="calendar"]').click()
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT_DIR / "412-calendar.png"), full_page=False)
        findings["412calendar"] = page_metrics(page)

        page.set_viewport_size({"width": 390, "height": 844})
        for view in ("chat", "calendar", "goals"):
            page.locator(f'#tabs button[data-view="{view}"]').click()
            page.wait_for_timeout(220)
            page.screenshot(path=str(OUT_DIR / f"390-{view}.png"), full_page=False)
        page.locator('#tabs button[data-view="calendar"]').click()
        page.locator('[data-act="view-courses"]').click()
        page.wait_for_timeout(220)
        page.screenshot(path=str(OUT_DIR / "390-timetable.png"), full_page=False)
        page.locator('[data-act="close-sheet"]').first.click()

        page.set_viewport_size({"width": 320, "height": 568})
        page.locator('#tabs button[data-view="chat"]').click()
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT_DIR / "320-chat.png"), full_page=False)
        findings["320chat"] = page_metrics(page)
        assert_true(findings["320chat"]["documentOverflow"] == 0, "320px layout must not overflow horizontally")
        page.locator('#tabs button[data-view="calendar"]').click()
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT_DIR / "320-calendar.png"), full_page=False)
        findings["320calendar"] = page_metrics(page)
        assert_true(findings["320calendar"]["documentOverflow"] == 0, "320px calendar must not overflow horizontally")
        page.locator('.fab').click()
        page.wait_for_timeout(180)
        assert_touch_targets(page, "#sheet button, #sheet input:not([type=radio]):not([type=checkbox]), #sheet select", "320px event sheet")
        page.screenshot(path=str(OUT_DIR / "320-event-sheet.png"), full_page=False)
        page.locator('[data-act="close-sheet"]').first.click()

        page.set_viewport_size({"width": 360, "height": 800})
        page.locator('#tabs button[data-view="settings"]').click()
        page.wait_for_timeout(180)
        page.locator('.theme-card[data-id="nailong"]').click()
        assert_true(page.locator("html").get_attribute("data-theme") == "nailong", "theme switch should apply immediately")
        page.locator('.theme-card[data-id="paper"]').click()
        assert_true(page.locator("html").get_attribute("data-theme") == "paper", "theme should switch back")

        browser.close()

    report = {"errors": errors, "findings": findings}
    (OUT_DIR / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
