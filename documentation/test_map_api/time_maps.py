"""
Measure map render time (navigation start → 'Done.') for each implementation.
Uses Firefox headless via Selenium. The HTML files set window.__mapDone via
performance.now() when rendering finishes; we poll for it via execute_script.

One Firefox instance is kept open per map to avoid repeated geckodriver startup
cost and to let the browser cache the 2.2 MB GeoJSON across runs (realistic).
Between runs the page is reset by navigating to about:blank.

Run: python3 time_maps.py
"""

import http.server, threading, time, statistics, json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

# ── Config ───────────────────────────────────────────────────────────────────

SERVE_DIR = Path(__file__).parent
PORT      = 18374
SCENARIOS = ['baseline', 'stress']
RUNS      = 3
TIMEOUT   = 300   # seconds per run
POLL      = 0.2   # polling interval

def _google_maps_available():
    """Return True if googlemaps/env exists and contains GOOGLE_MAPS_API_KEY."""
    env_file = SERVE_DIR / 'googlemaps' / 'env'
    if not env_file.exists():
        return False
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and line.startswith('GOOGLE_MAPS_API_KEY='):
            return bool(line.split('=', 1)[1].strip())
    return False

MAPS = [
    {'name': 'Google Maps', 'url': f'http://localhost:{PORT}/googlemaps/index.html'},
    {'name': 'Leaflet',     'url': f'http://localhost:{PORT}/leaflet/leaflet.html'},
    {'name': 'MapLibre GL', 'url': f'http://localhost:{PORT}/maplibre/index.html'},
]

# ── HTTP server ──────────────────────────────────────────────────────────────

class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(SERVE_DIR), **k)
    def log_message(self, *_):
        pass

def start_server():
    srv = http.server.HTTPServer(('localhost', PORT), _Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

# ── Driver ───────────────────────────────────────────────────────────────────

def make_driver():
    opts = Options()
    opts.add_argument('--headless')
    opts.binary_location = '/snap/firefox/current/usr/lib/firefox/firefox'
    return webdriver.Firefox(options=opts, service=Service(log_output='/dev/null'))

def quit_driver(driver):
    # snap Firefox geckodriver can't receive SIGTERM across the snap sandbox boundary,
    # so _terminate_process raises PermissionError and logs an error.  It also fires
    # from __del__ after our context closes, so log-level suppression isn't reliable.
    # Monkey-patch the instance to swallow OSError silently for the lifetime of the object.
    svc = driver.service
    proc = svc.process

    def _silent_terminate():
        for stream in (proc.stdin, proc.stdout, proc.stderr):
            try:
                if stream:
                    stream.close()
            except Exception:
                pass
        try:
            proc.terminate()
        except Exception:
            pass
        try:
            proc.wait(10)
        except Exception:
            pass

    svc._terminate_process = _silent_terminate
    try:
        driver.quit()
    except Exception:
        pass

# ── Timing ───────────────────────────────────────────────────────────────────

def time_one_run(driver, url, scenario):
    """Navigate to url?scenario=… and return seconds until window.__mapDone is set."""
    # Reset state from previous run
    driver.get('about:blank')
    driver.get(f'{url}?scenario={scenario}')
    deadline = time.perf_counter() + TIMEOUT
    while time.perf_counter() < deadline:
        done = driver.execute_script('return window.__mapDone ?? null')
        if done is not None:
            return round(done / 1000, 2)
        time.sleep(POLL)
    return None   # timeout

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f'Serving {SERVE_DIR} on :{PORT}')
    server = start_server()
    time.sleep(0.4)

    google_ok = _google_maps_available()
    if not google_ok:
        print('\nNote: googlemaps/env not found or missing GOOGLE_MAPS_API_KEY '
              '— Google Maps will be skipped.\n'
              'Create googlemaps/env with:\n  GOOGLE_MAPS_API_KEY=your_key_here\n')

    results = {}

    for scenario in SCENARIOS:
        results[scenario] = {}
        for m in MAPS:
            times = []
            if m['name'] == 'Google Maps' and not google_ok:
                results[scenario][m['name']] = None
                continue

            print(f'\n[{scenario}] {m["name"]}', flush=True)

            # One driver instance for all runs of this map — GeoJSON gets cached
            driver = make_driver()
            try:
                for run in range(1, RUNS + 1):
                    try:
                        elapsed = time_one_run(driver, m['url'], scenario)
                        if elapsed is None:
                            print(f'  run {run}: TIMEOUT', flush=True)
                        else:
                            print(f'  run {run}: {elapsed:.2f}s', flush=True)
                            times.append(elapsed)
                    except Exception as e:
                        print(f'  run {run}: ERROR – {e}', flush=True)
            finally:
                quit_driver(driver)

            results[scenario][m['name']] = {
                'min':  round(min(times), 2),
                'mean': round(statistics.mean(times), 2),
                'max':  round(max(times), 2),
                'runs': times,
            } if times else None

    server.shutdown()

    print('\n\n=== RESULTS ===')
    for scenario in SCENARIOS:
        print(f'\nScenario: {scenario}')
        for name, r in results[scenario].items():
            if r:
                print(f'  {name:14}  min={r["min"]}s  mean={r["mean"]}s  max={r["max"]}s')
            else:
                print(f'  {name:14}  FAILED / TIMEOUT')

    out_path = SERVE_DIR / 'timing_results.json'
    with open(out_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f'\nSaved → {out_path}')


if __name__ == '__main__':
    main()
