<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withSchedule(function ($schedule) {
        //
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        // routes/web.php has no 'login' route, so the default guest redirect
        // would resolve route('login') and blow up with a RouteNotFoundException
        // (surfacing as 500) whenever an unauthenticated request omits the
        // 'Accept: application/json' header. Returning null leaves the
        // AuthenticationException without a redirect target, so it is rendered
        // as a 401 JSON response instead.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // This application is API-only: routes/web.php intentionally has no
        // 'login' route. Without this, an unauthenticated request that does not
        // send 'Accept: application/json' (curl, Postman, a browser hitting the
        // API directly) makes the auth middleware redirect to route('login'),
        // which throws RouteNotFoundException and surfaces as a 500 instead of
        // a 401. Render any /api/* failure as JSON.
        $exceptions->shouldRenderJsonWhen(
            fn ($request, $throwable) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();
