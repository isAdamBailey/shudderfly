<?php

namespace Tests;

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear permission cache
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // re-register all the roles and permissions (clears cache and reloads relations)
        $this->artisan('db:seed', ['--class' => RolesAndPermissionsSeeder::class]);
    }
}
