<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * The admin SPA now lives in Newmoon-Web and is served separately, so the
     * backend is API-only and does not serve any HTML.
     */
    public function test_the_application_does_not_serve_the_admin_spa(): void
    {
        $this->get('/')->assertNotFound();
    }
}
