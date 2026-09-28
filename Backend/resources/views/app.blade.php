<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Newmoon API</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            background: #0f172a;
            color: #e2e8f0;
        }
        .card {
            text-align: center;
            padding: 2.5rem 3.5rem;
            border-radius: 1rem;
            background: #1e293b;
            border: 1px solid #334155;
        }
        h1 {
            margin: 0 0 .25rem;
            font-size: 1.5rem;
            font-weight: 600;
        }
        .version {
            font-size: 3rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #fb923c;
            margin: .5rem 0;
        }
        .meta {
            margin-top: 1rem;
            font-size: .8125rem;
            color: #94a3b8;
        }
        code {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Newmoon API</h1>
        <div class="version">{{ app()->version() }}</div>
        <div class="meta">
            Laravel {{ app()->version() }} &middot; PHP {{ PHP_VERSION }}<br>
            <code>{{ config('app.env') }}</code>
        </div>
    </div>
</body>
</html>
