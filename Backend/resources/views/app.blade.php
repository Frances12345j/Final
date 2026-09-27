<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/jpeg" href="{{ Vite::asset('resources/js/assets/logooos.jpg') }}">
    <title>NewMoon Lechon Manok & Liempo House</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/App.jsx'])
</head>
<body class="antialiased bg-[#FFF8ED]">
    <div id="root"></div>
</body>
</html>
