<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>PolyMirror — Open-Source Polymarket Copy Trading Bot</title>
  <meta name="description" content="PolyMirror is a free, open-source Polymarket copy trading bot that mirrors trades from selected wallets in real time. Built for transparency, safety, and developer control." />
  <style>
    :root{
      --bg:#0b1020;
      --card:#0f1733cc;
      --card2:#0f1733;
      --text:#eaf0ff;
      --muted:#b7c3e6;
      --muted2:#93a3d6;
      --brand:#7c5cff;
      --brand2:#2fe4ab;
      --border:rgba(255,255,255,.10);
      --shadow: 0 16px 50px rgba(0,0,0,.45);
      --radius:18px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:var(--sans);
      color:var(--text);
      background:
        radial-gradient(1000px 600px at 15% 10%, rgba(124,92,255,.35), transparent 55%),
        radial-gradient(900px 500px at 85% 0%, rgba(47,228,171,.22), transparent 60%),
        radial-gradient(800px 500px at 50% 110%, rgba(124,92,255,.18), transparent 55%),
        linear-gradient(180deg, #070a14 0%, #0b1020 100%);
      line-height:1.55;
    }
    a{color:inherit;text-decoration:none}
    .wrap{max-width:1100px;margin:0 auto;padding:32px 18px 60px}
    .topbar{
      display:flex;gap:12px;align-items:center;justify-content:space-between;
      padding:12px 14px;border:1px solid var(--border);
      background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
      border-radius:999px;box-shadow: 0 10px 30px rgba(0,0,0,.25);
      backdrop-filter: blur(10px);
      position:sticky; top:12px; z-index:10;
    }
    .brand{
      display:flex;gap:10px;align-items:center;font-weight:700;letter-spacing:.2px;
    }
    .logo{
      width:34px;height:34px;border-radius:10px;
      background:conic-gradient(from 210deg, var(--brand), var(--brand2), var(--brand));
      box-shadow: 0 0 0 2px rgba(255,255,255,.08) inset, 0 12px 30px rgba(124,92,255,.25);
    }
    .nav{
      display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end
    }
    .pill{
      font-size:13px;color:var(--muted);
      padding:7px 10px;border-radius:999px;
      border:1px solid var(--border);
      background:rgba(255,255,255,.03);
    }
    .pill:hover{color:var(--text);border-color:rgba(255,255,255,.18)}
    header.hero{
      margin-top:26px;
      padding:28px;
      border:1px solid var(--border);
      border-radius:var(--radius);
      background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03));
      box-shadow: var(--shadow);
      position:relative;
      overflow:hidden;
    }
    .glow{
      position:absolute;inset:-1px;
      background:
        radial-gradient(700px 250px at 10% 25%, rgba(124,92,255,.30), transparent 60%),
        radial-gradient(700px 250px at 90% 20%, rgba(47,228,171,.20), transparent 60%);
      pointer-events:none;
      filter:saturate(1.15);
    }
    .hero-grid{
      position:relative;
      display:grid;gap:18px;
      grid-template-columns: 1.1fr .9fr;
      align-items:start;
    }
    @media (max-width: 900px){ .hero-grid{grid-template-columns:1fr} }
    h1{margin:0;font-size:38px;line-height:1.15}
    .subtitle{margin:10px 0 0;color:var(--muted);font-size:16px;max-width:70ch}
    .badges{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
    .badge{
      font-size:12px;
      padding:6px 10px;border-radius:999px;
      border:1px solid rgba(255,255,255,.14);
      background:rgba(255,255,255,.04);
      color:var(--muted);
    }
    .badge strong{color:var(--text);font-weight:600}
    .cta{
      display:flex;gap:10px;flex-wrap:wrap;margin-top:18px
    }
    .btn{
      display:inline-flex;align-items:center;gap:10px;
      padding:10px 14px;border-radius:12px;
      border:1px solid rgba(255,255,255,.14);
      background:rgba(255,255,255,.04);
      color:var(--text);
      box-shadow: 0 12px 24px rgba(0,0,0,.20);
      font-weight:600;
    }
    .btn.primary{
      border-color: rgba(124,92,255,.45);
      background: linear-gradient(180deg, rgba(124,92,255,.35), rgba(124,92,255,.14));
    }
    .btn:hover{transform: translateY(-1px);transition:.15s ease}
    .card{
      border:1px solid var(--border);
      border-radius:var(--radius);
      background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
      box-shadow: 0 14px 40px rgba(0,0,0,.30);
      overflow:hidden;
    }
    .card .hd{
      padding:16px 18px;
      border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap
    }
    .card .hd h2{
      margin:0;font-size:16px;letter-spacing:.2px
    }
    .card .bd{padding:18px}
    .muted{color:var(--muted)}
    .grid{
      display:grid;gap:16px;margin-top:18px;
      grid-template-columns: repeat(12, 1fr);
    }
    .col-6{grid-column: span 6;}
    .col-12{grid-column: span 12;}
    @media (max-width: 900px){
      .col-6{grid-column: span 12;}
    }
    ul.clean{margin:10px 0 0;padding-left:18px;color:var(--muted)}
    ul.clean li{margin:6px 0}
    .kpi{
      display:grid;gap:10px;margin-top:10px;
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 700px){ .kpi{grid-template-columns:1fr} }
    .kpi .box{
      padding:14px;border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.03);
    }
    .kpi .box .t{font-size:12px;color:var(--muted2)}
    .
