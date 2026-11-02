import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4191"
OUT = Path(__file__).resolve().parent.parent / "test-artifacts" / "agent-actions"
OUT.mkdir(parents=True, exist_ok=True)


def model_response(content):
    return json.dumps(
        {
            "choices": [
                {
                    "message": {"content": content},
                    "finish_reason": "stop",
                }
            ]
        },
        ensure_ascii=False,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    )
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
    )
    page = context.new_page()
    errors = []
    requests = []
    page.on("console", lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))

    first = {
        "reply": "已按章节排好：2026-11-03 起每天一小时。",
        "actions": [],
    }
    repaired = {
        "reply": "已写入第一章极限练习。",
        "actions": [
            {
                "type": "create_tasks",
                "tasks": [
                    {
                        "title": "高等数学：极限的计算",
                        "date": "2026-11-03",
                        "time": "20:00",
                        "endTime": "21:00",
                        "category": "study",
                    }
                ],
            }
        ],
    }
    responses = [first, repaired]

    def model_route(route):
        requests.append(json.loads(route.request.post_data or "{}"))
        content = responses[min(len(requests) - 1, len(responses) - 1)]
        route.fulfill(
            status=200,
            content_type="application/json",
            body=model_response(json.dumps(content, ensure_ascii=False)),
        )

    page.route("**/chat/completions", model_route)
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate(
        """() => Store.update((st) => {
          st.settings.apiKey = 'test-key';
          st.settings.baseUrl = 'https://api.example.test/v1';
          st.settings.model = 'test-model';
          st.tasks = [];
          st.diy.pending = null;
          st.diy.chat = [];
        })"""
    )
    page.reload(wait_until="networkidle")
    page.locator("#box").fill("开始")
    page.locator('[data-act="send"]').click()
    page.wait_for_timeout(1400)

    task_count = page.evaluate("Store.get().tasks.length")
    assistant_text = page.locator(".bubble.assistant").last.inner_text()
    page.screenshot(path=str(OUT / "repair-write.png"), full_page=False)

    assert len(requests) == 2, f"empty action must be repaired once, requests={len(requests)}"
    assert task_count == 1, f"repaired action must persist exactly one task, got {task_count}"
    assert "极限的计算" in assistant_text and "已写入" in assistant_text, assistant_text

    # If the repair also only returns prose, the UI must report failure rather than another fake success.
    requests.clear()
    responses[:] = [
        {"reply": "已按章节排好全部日程。", "actions": []},
        {"reply": "已经写入了 25 项日程。", "actions": []},
    ]
    page.evaluate("Store.update((st) => { st.tasks = []; st.diy.chat = []; })")
    page.reload(wait_until="networkidle")
    page.locator("#box").fill("重新执行")
    page.locator('[data-act="send"]').click()
    page.wait_for_timeout(1200)
    failure_text = page.locator(".bubble.assistant").last.inner_text()
    assert page.evaluate("Store.get().tasks.length") == 0, "failed repair must not create tasks"
    assert "没有真正写入" in failure_text, failure_text

    # A read-only summary such as “今天已有 2 项安排” is not a false write claim.
    requests.clear()
    responses[:] = [{"reply": "今天已有 2 项安排。", "actions": []}]
    page.evaluate("Store.update((st) => { st.diy.chat = []; })")
    page.reload(wait_until="networkidle")
    page.evaluate("window.Intent.interpret = () => ({ handled: false })")
    page.locator("#box").fill("帮我整理一下今天的完整情况")
    page.locator('[data-act="send"]').click()
    page.wait_for_timeout(700)
    assert len(requests) == 1, f"read-only summary should not trigger repair, requests={len(requests)}"

    # A structurally valid action can still be a no-op (for example, a duplicate).
    requests.clear()
    responses[:] = [
        {
            "reply": "已排入今晚的极限练习。",
            "actions": [
                {
                    "type": "create_tasks",
                    "tasks": [
                        {
                            "title": "高等数学：极限的计算",
                            "date": "2026-11-03",
                            "time": "20:00",
                            "category": "study",
                        }
                    ],
                }
            ],
        }
    ]
    page.evaluate(
        """() => Store.update((st) => {
          st.tasks = [{id:'existing', title:'高等数学：极限的计算', date:'2026-11-03', time:'20:00', category:'study', done:false}];
          st.diy.chat = [];
        })"""
    )
    page.reload(wait_until="networkidle")
    page.evaluate("window.Intent.interpret = () => ({ handled: false })")
    page.locator("#box").fill("把极限练习排到11月3日晚上八点")
    page.locator('[data-act="send"]').click()
    page.wait_for_timeout(700)
    no_op_text = page.locator(".bubble.assistant").last.inner_text()
    assert page.evaluate("Store.get().tasks.length") == 1, "duplicate action must not add another task"
    assert "没有产生新的写入" in no_op_text, no_op_text

    # A long single-subject study plan is handled locally, asks only for the missing end date,
    # and never turns “从明天开始” into a one-off task.
    requests.clear()
    page.evaluate(
        """() => Store.update((st) => {
          st.tasks = [];
          st.diy.chat = [];
          st.diy.pending = null;
        })"""
    )
    page.reload(wait_until="networkidle")
    page.locator("#box").fill("帮我安排高数，我要考数学二，每天一小时，每天晚上8:30到9:30，循序渐进，元旦不要排")
    page.locator('[data-act="send"]').click()
    page.wait_for_timeout(350)
    pending = page.evaluate("Store.get().diy.pending")
    assert pending and pending["type"] == "study_plan_draft", "math plan should create a structured draft"
    assert page.evaluate("Store.get().tasks.length") == 0, "incomplete plan must not create one wrong task"
    assert "排到哪一天" in page.locator(".bubble.assistant").last.inner_text(), "draft should ask one end-date question"

    page.locator("#box").fill("从明天开始")
    page.locator('[data-act="send"]').click()
    page.wait_for_timeout(350)
    pending = page.evaluate("Store.get().diy.pending")
    assert pending["plan"]["from"] == "2026-11-03", "relative start should update the draft"
    assert page.evaluate("Store.get().tasks.length") == 0, "start-only reply must not create a fake task"

    page.locator("#box").fill("排到2027年1月15日")
    page.locator('[data-act="send"]').click()
    page.wait_for_timeout(900)
    math_tasks = page.evaluate("Store.get().tasks")
    math_pending = page.evaluate("Store.get().diy.pending")
    math_reply = page.locator(".bubble.assistant").last.inner_text()
    assert len(math_tasks) > 60, f"math plan should create a full daily plan, got {len(math_tasks)}, pending={math_pending}, reply={math_reply}"
    assert all(task["time"] == "20:30" and task["endTime"] == "21:30" for task in math_tasks), "daily time must be preserved"
    assert all(task["title"].startswith("考研高数：") for task in math_tasks), "math tasks should use curriculum topics"
    assert not any(task["date"] == "2027-01-01" for task in math_tasks), "New Year must remain excluded"
    assert len({task["title"] for task in math_tasks}) == len(math_tasks), "daily topics must remain unique"
    assert len(requests) == 0, f"local study planner should not call the model, requests={len(requests)}"

    assert not errors, errors
    browser.close()

print("OK agent action repair")
